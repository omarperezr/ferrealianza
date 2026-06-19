import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileSpreadsheet, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import { projectId } from '/utils/supabase/info';
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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/clients`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setClients(data.clients || []);
      } else {
        toast.error(data.error || 'Error al cargar clientes');
      }
    } catch (error) {
      toast.error('Error al cargar clientes');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
      } else {
        toast.error(data.error || 'Error al cargar productos');
      }
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/upload-image`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.imageUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
      }

      const productData = { ...formData, imageUrl };

      if (editingProduct) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products/${editingProduct.code}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(productData)
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success('Producto actualizado exitosamente');
      } else {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(productData)
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success('Producto creado exitosamente');
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products/${code}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Producto eliminado exitosamente');
      loadProducts();
    } catch (error: any) {
      toast.error(error.message);
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

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(productData)
          }
        );
      }

      toast.success(`${jsonData.length} productos importados exitosamente`);
      loadProducts();
    } catch (error) {
      toast.error('Error al importar productos desde Excel');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.user_metadata?.name}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${view === 'products' ? 'border-slate-800 font-semibold' : 'border-transparent text-slate-500'}`}
            onClick={() => setView('products')}
          >
            Productos
          </button>
          <button
            className={`px-4 py-2 -mb-px border-b-2 ${view === 'clients' ? 'border-slate-800 font-semibold' : 'border-transparent text-slate-500'}`}
            onClick={() => setView('clients')}
          >
            Clientes
          </button>
        </div>

        {view === 'clients' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Todos los Clientes Registrados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white rounded-lg shadow">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">RIF</th>
                    <th className="p-3">Dirección</th>
                    <th className="p-3">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100">
                      <td className="p-3">{client.name}</td>
                      <td className="p-3">{client.rif}</td>
                      <td className="p-3">{client.address}</td>
                      <td className="p-3">{client.vendorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No hay clientes registrados.
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'products' && (
        <>
        <div className="flex gap-4 mb-6">
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
                <div>
                  <Label>Nombre del Producto</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cantidad por Paquete</Label>
                  <Input
                    value={formData.amountPerPackage}
                    onChange={(e) => setFormData({ ...formData, amountPerPackage: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Precio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Cantidad Disponible (Stock)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Imagen del Producto</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
              />
            </label>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.code} className="overflow-hidden">
              <CardHeader className="p-0">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                )}
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <span className="text-sm text-slate-500">{product.code}</span>
                  </div>
                  <p className="text-sm text-slate-600">Categoría: {product.category}</p>
                  {product.amountPerPackage && (
                    <p className="text-sm text-slate-600">Cantidad: {product.amountPerPackage}</p>
                  )}
                  <p className="text-xl font-bold text-green-600">${product.price.toFixed(2)}</p>
                  <p className={`text-sm font-medium ${(product.stock ?? 0) > 0 ? 'text-slate-600' : 'text-red-600'}`}>
                    Stock disponible: {product.stock ?? 0}
                  </p>
                  <div className="flex gap-2 mt-4">
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
          <div className="text-center py-12 text-slate-500">
            No hay productos registrados. Añade tu primer producto.
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
