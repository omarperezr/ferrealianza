import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info'

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
    role: 'admin' | 'user';
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
  );

  useEffect(() => {
    checkSession();
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
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/auth/signin`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión');

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

  const signUp = async (email: string, password: string, name: string, role: string) => {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/auth/signup`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name, role })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al registrar usuario');
  };

  const signOut = async () => {
    if (accessToken) {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/auth/signout`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
    }
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  };

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, signIn, signUp, signOut, updateName, isAdmin }}>
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
