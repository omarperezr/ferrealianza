import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info'
import { apiFetch } from '../utils/api'

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
    role: 'admin' | 'user';
  };
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  // Lets a logged-in user change their own password directly (no email).
  updatePassword: (newPassword: string) => Promise<void>;
  isAdmin: boolean;
  // Admin-only user management (sellers and admins). These never touch products.
  listUsers: () => Promise<ManagedUser[]>;
  createUser: (email: string, password: string, name: string, role: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // One client for the provider's whole lifetime. Created once (not per render)
  // so its background auto-refresh timer and the auth listener below live on the
  // same instance.
  const [supabase] = useState(() =>
    createClient(`https://${projectId}.supabase.co`, publicAnonKey),
  );

  useEffect(() => {
    checkSession();

    // supabase-js refreshes the access token in the background (~hourly). Without
    // this listener the refreshed token never reaches React state, so apiFetch
    // keeps sending the expired one and every write fails with "token inválido"
    // until a manual reload. Sync state on refresh / sign-in / sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user as User);
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setUser(session.user as User);
        setAccessToken(session.access_token);
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await apiFetch('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Establish the session on the Supabase client so that profile updates
    // (e.g. changing the display name) and session persistence work.
    if (data.session?.access_token && data.session?.refresh_token) {
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } catch {
        // Non-fatal: we still keep the token in state below.
      }
    }

    setUser(data.user);
    setAccessToken(data.session.access_token);
  };

  const updateName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('El nombre no puede estar vacío');

    const { data, error } = await supabase.auth.updateUser({
      data: { name: trimmed },
    });
    if (error) throw new Error(error.message);
    if (data.user) setUser(data.user as User);
  };

  // Lets a logged-in user change their own password using their active
  // session — no email/OTP round-trip required.
  const updatePassword = async (newPassword: string) => {
    if (newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  };

  const signOut = async () => {
    if (accessToken) {
      try {
        await apiFetch('/auth/signout', { method: 'POST', accessToken });
      } catch {
        // Ignore sign-out errors on the server; we still clear the local session.
      }
    }
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  };

  // --- Admin user management ---

  const listUsers = async (): Promise<ManagedUser[]> => {
    const data = await apiFetch('/users', { accessToken });
    return data.users as ManagedUser[];
  };

  const createUser = async (
    email: string,
    password: string,
    name: string,
    role: string,
  ) => {
    await apiFetch('/users', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ email, password, name, role }),
    });
  };

  const deleteUser = async (id: string) => {
    await apiFetch(`/users/${id}`, { method: 'DELETE', accessToken });
  };

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, signIn, signUp, signOut, updateName, updatePassword, isAdmin, listUsers, createUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
