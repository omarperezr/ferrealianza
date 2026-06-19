import { AuthProvider, useAuth } from './components/AuthContext';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { Toaster } from 'sonner';
import { Logo } from './components/Logo';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Logo className="h-24 mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}