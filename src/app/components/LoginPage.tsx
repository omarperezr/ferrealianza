import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('¡Sesión iniciada exitosamente!', { id: 'auth' });
      } else {
        await signUp(email, password, name, role);
        toast.success('¡Cuenta creada! Ahora inicia sesión.', { id: 'auth' });
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
      toast.error(error.message, { id: 'auth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 relative overflow-hidden">
      {/* Decorative gold glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

      <Card className="w-full max-w-md shadow-2xl border-slate-200/60 backdrop-blur relative">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-slate-900 p-4 shadow-lg ring-1 ring-amber-500/30">
              <Logo className="h-20 object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center tracking-tight">
            {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
          </CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestión · FerreAlianza Import, C.A.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Juan Pérez"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="user">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Registrar'}
            </Button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
