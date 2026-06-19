import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  LogOut,
  Package,
  Users,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Logo } from './Logo';

interface Product {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface Client {
  id: string;
  name: string;
  rif: string;
  address: string;
  vendorId: string;
  vendorName: string;
  createdAt: string;
}

export function AdminDashboard() {
  const { accessToken, signOut, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<'products' | 'clients'>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    amountPerPackage: '',
    price: '',
    imageUrl: '',
    stock: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await apiFetch('/clients', { accessToken });
      setClients(data.clients || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar clientes', { id: 'clients' });
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiFetch('/products', { accessToken });
      setProducts(data.products || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar productos', { id: 'products' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const data = await apiFetch('/upload-image', {
      method: 'POST',
      accessToken,
      body: formData,
    });
    return data.imageUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
      }

      const productData = { ...formData, imageUrl };

      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.code}`, {
          method: 'PUT',
          accessToken,
          body: JSON.stringify(productData),
        });
        toast.success('Producto actualizado exitosamente', { id: 'product-save' });
      } else {
        await apiFetch('/products', {
          method: 'POST',
          accessToken,
          body: JSON.stringify(productData),
        });
        toast.success('Producto creado exitosamente', { id: 'product-save' });
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast.error(error.message, { id: 'product-save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await apiFetch(`/products/${code}`, { method: 'DELETE', accessToken });
      toast.success('Producto eliminado exitosamente', { id: 'product-del' });
      loadProducts();
    } catch (error: any) {
      toast.error(error.message, { id: 'product-del' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category,
      amountPerPackage: product.amountPerPackage,
      price: product.price.toString(),
      imageUrl: product.imageUrl,
      stock: (product.stock ?? 0).toString()
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      category: '',
      amountPerPackage: '',
      price: '',
      imageUrl: '',
      stock: ''
    });
    setImageFile(null);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      for (const row of jsonData) {
        const productData = {
          code: row.codigo || row.code || '',
          name: row.nombre || row.name || '',
          category: row.categoria || row.category || '',
          amountPerPackage: row.cantidadPorPaquete || row.amountPerPackage || '',
          price: row.precio || row.price || 0,
          stock: row.stock || row.cantidadDisponible || 0,
          imageUrl: ''
        };

        await apiFetch('/products', {
          method: 'POST',
          accessToken,
          body: JSON.stringify(productData),
        }).catch(() => {
          // Skip rows that fail (e.g. duplicate code) and keep importing the rest.
        });
      }

      toast.success(`${jsonData.length} productos procesados desde Excel`, { id: 'import' });
      loadProducts();
    } catch (error) {
      toast.error('Error al importar productos desde Excel', { id: 'import' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p>Cargando panel...</p>
      </div>
    );
  }

  const tabBase =
    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b-2 border-amber-500 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 p-1.5 ring-1 ring-amber-500/30">
              <Logo className="h-10 object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Panel del Administrador
              </h1>
              <p className="text-xs text-amber-400/90">Inventario y clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-slate-300">
              {user?.user_metadata?.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="inline-flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            className={`${tabBase} ${view === 'products' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setView('products')}
          >
            <Package className="w-4 h-4" />
            Productos
          </button>
          <button
            className={`${tabBase} ${view === 'clients' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setView('clients')}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
        </div>

        {view === 'clients' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Todos los Clientes Registrados</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left bg-slate-50 text-slate-600">
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold">RIF</th>
                    <th className="p-3 font-semibold">Dirección</th>
                    <th className="p-3 font-semibold">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 text-slate-600">{client.rif}</td>
                      <td className="p-3 text-slate-600">{client.address}</td>
                      <td className="p-3 text-slate-600">{client.vendorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Users className="w-10 h-10" />
                  <p>No hay clientes registrados.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'products' && (
        <>
        <div className="flex flex-wrap gap-3 mb-6">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Producto</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad por Paquete</Label>
                  <Input
                    value={formData.amountPerPackage}
                    onChange={(e) => setFormData({ ...formData, amountPerPackage: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>Precio</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Imagen del Producto</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild disabled={importing}>
            <label className="cursor-pointer">
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              {importing ? 'Importando...' : 'Importar Excel'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
                disabled={importing}
              />
            </label>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.code} className="overflow-hidden border-slate-200 hover:shadow-lg transition-shadow p-0 gap-0">
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    (product.stock ?? 0) > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {(product.stock ?? 0) > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                </span>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-base leading-snug line-clamp-2">{product.name}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{product.code}</span>
                  </div>
                  <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                  {product.amountPerPackage && (
                    <p className="text-xs text-slate-500">Paquete: {product.amountPerPackage}</p>
                  )}
                  <p className="text-2xl font-bold text-amber-600">${product.price.toFixed(2)}</p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.code)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Package className="w-12 h-12" />
            <p>No hay productos registrados. Añade tu primer producto.</p>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
