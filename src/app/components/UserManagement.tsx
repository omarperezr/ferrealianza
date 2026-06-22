import { useState, useEffect } from 'react';
import { useAuth, ManagedUser } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Loader2,
  Shield,
  Tag,
  UserCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * Admin-only panel to manage the system's users: create sellers ("vendedores")
 * and other administrators, and delete existing users. This operates solely on
 * Supabase Auth accounts and never touches products or any other data.
 */
export function UserManagement() {
  const { user, listUsers, createUser, deleteUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const items = await listUsers();
      setUsers(items);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar usuarios', { id: 'users-load' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'user' });
    setShowPass(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(form.email, form.password, form.name, form.role);
      toast.success('Usuario creado exitosamente', { id: 'user-save' });
      setDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario', { id: 'user-save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!confirm(`¿Eliminar al usuario "${u.name}"?`)) return;
    try {
      await deleteUser(u.id);
      toast.success('Usuario eliminado', { id: 'user-del' });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario', { id: 'user-del' });
    }
  };

  const roleLabel = (role: string) =>
    role === 'admin' ? 'Administrador' : 'Vendedor';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Usuarios del Sistema</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="user">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left bg-slate-50 text-slate-600">
              <th className="p-3 font-semibold">Nombre</th>
              <th className="p-3 font-semibold">Correo</th>
              <th className="p-3 font-semibold">Rol</th>
              <th className="p-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="p-3 font-medium">
                  <span className="flex items-center gap-2">
                    {u.name}
                    {u.id === user?.id && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        Tú
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {u.role === 'admin' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <Tag className="w-3 h-3" />
                    )}
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end">
                    {u.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <UserCircle className="w-10 h-10" />
            <p>No hay usuarios registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
