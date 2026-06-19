import { useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface Client {
  id: string;
  name: string;
  rif: string;
  address: string;
  vendorId: string;
  vendorName: string;
  createdAt?: string;
}

interface ClientFormDialogProps {
  accessToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits the client instead of creating one. */
  client?: Client | null;
  onSaved: (client: Client) => void;
  trigger?: ReactNode;
}

const empty = { name: '', rif: '', address: '' };

export function ClientFormDialog({
  accessToken,
  open,
  onOpenChange,
  client,
  onSaved,
  trigger,
}: ClientFormDialogProps) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = !!client;

  useEffect(() => {
    if (open) {
      setForm(client ? { name: client.name, rif: client.rif, address: client.address } : empty);
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiFetch(isEdit ? `/clients/${client!.id}` : '/clients', {
        method: isEdit ? 'PUT' : 'POST',
        accessToken,
        body: JSON.stringify(form),
      });
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente registrado', { id: 'client-save' });
      onOpenChange(false);
      onSaved(data.client);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar el cliente', { id: 'client-save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>RIF</Label>
            <Input
              value={form.rif}
              onChange={(e) => setForm({ ...form, rif: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar Cliente'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
