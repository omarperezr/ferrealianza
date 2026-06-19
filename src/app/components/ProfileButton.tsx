import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserCircle, Loader2 } from 'lucide-react';

/**
 * Header control that shows the current user's display name and lets them edit
 * it. This name is the one used as the vendor/seller name (e.g. in budgets).
 */
export function ProfileButton() {
  const { user, updateName } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const currentName = user?.user_metadata?.name || '';

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateName(name);
      toast.success('Nombre actualizado', { id: 'profile' });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar el nombre', { id: 'profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
        title="Editar mi nombre"
      >
        <UserCircle className="w-4 h-4 text-amber-400" />
        <span className="max-w-[140px] truncate">
          {currentName || 'Configurar nombre'}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mi perfil</DialogTitle>
            <DialogDescription>
              Este nombre se usará como nombre del vendedor (por ejemplo, en los presupuestos).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del usuario</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
                autoFocus
              />
            </div>
            {user?.email && (
              <p className="text-xs text-slate-500">
                Sesión: {user.email}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
