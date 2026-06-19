import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
        toast.success('¡Sesión iniciada exitosamente!');
      } else {
        await signUp(email, password, name, role);
        toast.success('¡Usuario registrado! Por favor inicia sesión.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <Logo className="h-24 object-contain" />
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Iniciar Sesión' : 'Registrar Usuario'}
          </CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestión de Inventario
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrar')}
            </Button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
