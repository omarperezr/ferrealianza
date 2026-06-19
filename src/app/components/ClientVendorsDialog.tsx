import { useEffect, useState } from 'react';
import { getVendors, setClientVendors, Client } from '../utils/dataStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  email: string;
}

interface Props {
  accessToken: string | null;
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (client: Client) => void;
}

export function ClientVendorsDialog({ accessToken, client, open, onOpenChange, onSaved }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allVendors, setAllVendors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(client?.vendorIds || []));
    setAllVendors(!!client?.allVendors);
    setLoading(true);
    getVendors(accessToken)
      .then(setVendors)
      .catch((e) => toast.error(e.message || 'Error al cargar vendedores', { id: 'vendors' }))
      .finally(() => setLoading(false));
  }, [open, client, accessToken]);

  const toggleVendor = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const saved = await setClientVendors(accessToken, client.id, {
        vendorIds: Array.from(selected),
        allVendors,
      });
      toast.success('Asociaciones actualizadas', { id: 'vendors' });
      onOpenChange(false);
      onSaved(saved);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar asociaciones', { id: 'vendors' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vendedores de {client?.name}</DialogTitle>
        </DialogHeader>

        <label className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allVendors}
            onChange={(e) => setAllVendors(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-amber-600"
          />
          <span className="text-sm font-medium text-slate-800">Todos los vendedores</span>
        </label>

        {allVendors ? (
          <p className="text-sm text-slate-500 py-2">
            Este cliente estará disponible para todos los vendedores actuales y futuros.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <Users className="w-8 h-8" />
            <p className="text-sm">No hay vendedores registrados.</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 py-1">
            {vendors.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  onChange={() => toggleVendor(v.id)}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-600"
                />
                <span className="text-sm text-slate-700">
                  {v.name} <span className="text-slate-400">· {v.email}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
