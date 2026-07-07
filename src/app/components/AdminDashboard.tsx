import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import {
  getProducts,
  getClients,
  getCachedProducts,
  getCachedClients,
  saveProduct,
  deleteProduct,
  deleteProducts,
  deleteClient,
  deleteClients,
  getVendors,
  setProductHidden,
  isOnline,
} from '../utils/dataStore';
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
  FileText,
  EyeOff,
  UserCog,
  Search,
  CheckSquare,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { ProfileButton } from './ProfileButton';
import { SalesPanel } from './SalesPanel';
import { ClientFormDialog, Client } from './ClientFormDialog';
import { ClientVendorsDialog } from './ClientVendorsDialog';
import { UserManagement } from './UserManagement';
import {
  SortOption,
  filterProducts,
  sortProducts,
} from '../utils/sortProducts';
import { ProductSortControl } from './ProductSortControl';
import { ClientSortControl, ClientFilterControl } from './ClientControls';
import {
  ClientSortOption,
  ClientFilters,
  EMPTY_CLIENT_FILTERS,
  filterClients,
  sortClients,
} from '../utils/sortClients';
import { usePersistentState } from '../utils/usePersistentState';

interface Product {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  imageUrl: string;
  stock: number;
  hidden?: boolean;
}

export function AdminDashboard() {
  const { accessToken, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<'products' | 'clients' | 'sales' | 'users'>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [clientForVendors, setClientForVendors] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = usePersistentState<SortOption[]>('admin-product-sort', ['name-asc']);
  // Bulk-delete mode: when active, product cards become selectable.
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Client bulk-delete
  const [clientDeleteMode, setClientDeleteMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [clientBulkDeleting, setClientBulkDeleting] = useState(false);
  const [importingClients, setImportingClients] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSortBy, setClientSortBy] = usePersistentState<ClientSortOption[]>('admin-client-sort', ['name-asc']);
  const [clientFilters, setClientFilters] = usePersistentState<ClientFilters>('admin-client-filters', EMPTY_CLIENT_FILTERS);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  // Show cached data instantly, then refresh from the network. Re-runs when the
  // access token is ready so everything appears on first load (no manual refresh).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cachedProducts, cachedClients] = await Promise.all([
        getCachedProducts(),
        getCachedClients(),
      ]);
      if (cancelled) return;
      if (cachedProducts.length) {
        setProducts(cachedProducts);
        setLoading(false);
      }
      if (cachedClients.length) setClients(cachedClients);

      getVendors(accessToken)
        .then((v) => !cancelled && setVendors(v))
        .catch(() => {});

      await Promise.all([loadProducts(), loadClients()]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const loadClients = async () => {
    const { items } = await getClients(accessToken);
    setClients(items);
  };

  const openNewClient = () => {
    setEditingClient(null);
    setClientDialogOpen(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setClientDialogOpen(true);
  };

  const openVendorsDialog = (client: Client) => {
    setClientForVendors(client);
    setVendorsDialogOpen(true);
  };

  const vendorSummary = (client: Client) => {
    if (client.allVendors) return 'Todos';
    const n = client.vendorIds?.length || 0;
    return n === 0 ? 'Ninguno' : `${n} vendedor${n === 1 ? '' : 'es'}`;
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`¿Eliminar al cliente "${client.name}"?`)) return;
    try {
      await deleteClient(accessToken, client.id);
      toast.success('Cliente eliminado', { id: 'client-del' });
      loadClients();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el cliente', { id: 'client-del' });
    }
  };

  const toggleClientDeleteMode = () => {
    setClientDeleteMode((prev) => !prev);
    setSelectedClientIds(new Set());
  };

  const toggleClientSelected = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClientBulkDelete = async () => {
    if (selectedClientIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedClientIds.size} cliente(s) seleccionado(s)?`)) return;
    setClientBulkDeleting(true);
    const ids = [...selectedClientIds];
    try {
      await deleteClients(accessToken, ids);
      toast.success(`${ids.length} cliente(s) eliminado(s)`, { id: 'client-del' });
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar los clientes', { id: 'client-del' });
    } finally {
      setClientBulkDeleting(false);
      setClientDeleteMode(false);
      setSelectedClientIds(new Set());
      loadClients();
    }
  };

  const handleClientExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingClients(true);
    try {
      toast.loading('Leyendo Excel de clientes...', { id: 'import-clients' });
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      // Find header row: look for a row containing 'Rif' or 'RIF' or 'rif'
      let headerIdx = -1;
      let headers: string[] = [];
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i].map((v: any) => String(v || '').trim());
        if (row.some((h) => /rif/i.test(h))) {
          headerIdx = i;
          headers = row;
          break;
        }
      }

      if (headerIdx === -1) {
        toast.error('No se encontró fila de encabezados con columna RIF', { id: 'import-clients' });
        return;
      }

      const col = (name: RegExp) => headers.findIndex((h) => name.test(h));
      const iName = col(/empresa|razon|nombre/i);
      const iRif = col(/rif/i);
      const iAddress = col(/direcci/i);
      const iPhone = col(/tel[eé]fono|tel\./i);
      const iEmail = col(/correo|email/i);

      const clients: any[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((v: any) => !v)) continue;
        const name = String(row[iName] || '').trim();
        const rif = String(row[iRif] || '').trim();
        if (!name || !rif) continue;
        clients.push({
          name,
          rif,
          address: iAddress >= 0 ? String(row[iAddress] || '').trim() : '',
          phone: iPhone >= 0 ? String(row[iPhone] || '').trim() : '',
          email: iEmail >= 0 ? String(row[iEmail] || '').trim() : '',
        });
      }

      if (clients.length === 0) {
        toast.error('No se encontraron clientes válidos en el Excel', { id: 'import-clients' });
        return;
      }

      toast.loading(`Importando ${clients.length} cliente(s)...`, { id: 'import-clients' });
      const result = await apiFetch('/clients/bulk', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ clients }),
      });
      toast.success(
        `Importación lista: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos`,
        { id: 'import-clients' },
      );
      loadClients();
    } catch (error: any) {
      toast.error(error?.message || 'Error al importar clientes', { id: 'import-clients' });
    } finally {
      setImportingClients(false);
      e.target.value = '';
    }
  };

  const loadProducts = async () => {
    try {
      const { items } = await getProducts(accessToken);
      setProducts(items);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // Upload the original file as-is. Re-encoding through a <canvas> stripped the
    // color profile of some images (e.g. CMYK JPEGs), producing a black image.
    const body = new FormData();
    body.append('file', file);

    const data = await apiFetch('/upload-image', { method: 'POST', accessToken, body });
    return data.imageUrl;
  };

  const toggleHidden = async (product: Product) => {
    const next = !product.hidden;
    // Optimistic update.
    setProducts((prev) =>
      prev.map((p) => (p.code === product.code ? { ...p, hidden: next } : p)),
    );
    try {
      await setProductHidden(accessToken, product.code, next);
    } catch (error: any) {
      setProducts((prev) =>
        prev.map((p) => (p.code === product.code ? { ...p, hidden: !next } : p)),
      );
      toast.error(error.message || 'No se pudo cambiar la visibilidad', { id: 'hide' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        if (!isOnline()) {
          toast.error('Sube imágenes con conexión a internet', { id: 'product-save' });
          setSaving(false);
          return;
        }
        imageUrl = await handleImageUpload(imageFile);
      }

      const productData = { ...formData, imageUrl };
      await saveProduct(accessToken, productData, editingProduct?.code);

      toast.success(
        !isOnline()
          ? 'Producto guardado localmente (se sincronizará al reconectar)'
          : editingProduct
            ? 'Producto actualizado exitosamente'
            : 'Producto creado exitosamente',
        { id: 'product-save' },
      );

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
      await deleteProduct(accessToken, code);
      toast.success('Producto eliminado exitosamente', { id: 'product-del' });
      loadProducts();
    } catch (error: any) {
      toast.error(error.message, { id: 'product-del' });
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setSelectedCodes(new Set());
  };

  const toggleSelected = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedCodes.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedCodes.size} producto(s) seleccionado(s)?`)) return;

    setBulkDeleting(true);
    const codes = [...selectedCodes];
    try {
      await deleteProducts(accessToken, codes);
      toast.success(`${codes.length} producto(s) eliminado(s)`, { id: 'product-del' });
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar los productos', { id: 'product-del' });
    } finally {
      setBulkDeleting(false);
      setDeleteMode(false);
      setSelectedCodes(new Set());
      loadProducts();
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

  // Shared create/update/skip pipeline used by both the Excel and PDF
  // imports. Sends every row in a single request — the server does the
  // create-vs-update-vs-skip diffing in one read + one upsert query, instead
  // of the client looping one create/update request per row.
  const bulkUpsertProducts = async (
    rows: any[],
  ): Promise<{ created: number; updated: number; skipped: number }> => {
    toast.loading(`Importando ${rows.length} producto(s)...`, { id: 'import' });
    const data = await apiFetch('/products/bulk', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ products: rows }),
    });
    return { created: data.created || 0, updated: data.updated || 0, skipped: data.skipped || 0 };
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      toast.loading('Leyendo Excel...', { id: 'import' });
      const { parseProductsFromExcel } = await import('../utils/excelImport');
      const parsed = await parseProductsFromExcel(file);

      if (parsed.length === 0) {
        toast.error('No se encontraron productos en el Excel', { id: 'import' });
        return;
      }

      // Upload each distinct embedded image once (rows can share artwork),
      // then map every product to its uploaded URL.
      const uniqueImages = new Map<string, Blob>();
      for (const p of parsed) {
        if (p.image && !uniqueImages.has(p.image.mediaPath)) {
          uniqueImages.set(p.image.mediaPath, p.image.blob);
        }
      }

      const urlByMedia = new Map<string, string>();
      if (uniqueImages.size > 0 && isOnline()) {
        const entries = [...uniqueImages.entries()];
        let uploaded = 0;
        const queue = [...entries];
        const uploadWorker = async () => {
          while (queue.length) {
            const [mediaPath, blob] = queue.shift()!;
            try {
              const body = new FormData();
              const ext = mediaPath.split('.').pop() || 'png';
              body.append('file', blob, `xlsx-image.${ext}`);
              const res = await apiFetch('/upload-image', { method: 'POST', accessToken, body });
              if (res?.imageUrl) urlByMedia.set(mediaPath, res.imageUrl);
            } catch {
              // Skip images that fail to upload; the product still imports.
            }
            uploaded++;
            toast.loading(`Subiendo imágenes ${uploaded}/${entries.length}...`, { id: 'import' });
          }
        };
        await Promise.all(Array.from({ length: 4 }, uploadWorker));
      }

      const products = parsed.map((p) => {
        const imageUrl = p.image ? urlByMedia.get(p.image.mediaPath) : undefined;
        return {
          code: p.code,
          name: p.name,
          category: p.category,
          amountPerPackage: p.amountPerPackage,
          price: p.price,
          // imageUrl is left undefined when the row had no picture, so the
          // server preserves the existing image on update.
          ...(imageUrl ? { imageUrl } : {}),
        };
      });

      const { created, updated, skipped } = await bulkUpsertProducts(products);

      toast.success(
        `Importación lista: ${created} creados, ${updated} actualizados, ${skipped} sin cambios`,
        { id: 'import' },
      );
      loadProducts();
    } catch (error: any) {
      toast.error(error?.message || 'Error al importar productos desde Excel', { id: 'import' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      toast.loading('Leyendo PDF...', { id: 'import' });
      const { parseProductsFromPdf } = await import('../utils/pdfImport');
      const parsed = await parseProductsFromPdf(file, (page, totalPages) => {
        toast.loading(`Leyendo PDF: página ${page}/${totalPages}...`, { id: 'import' });
      });

      if (parsed.length === 0) {
        toast.error('No se encontraron productos en el PDF', { id: 'import' });
        return;
      }

      // Upload each distinct image once (the same picture is often reused across
      // rows), then map every product to its uploaded URL.
      const uniqueImages = new Map<string, Blob>();
      for (const p of parsed) {
        if (p.image && !uniqueImages.has(p.image.hash)) {
          uniqueImages.set(p.image.hash, p.image.blob);
        }
      }

      const urlByHash = new Map<string, string>();
      if (uniqueImages.size > 0 && isOnline()) {
        const entries = [...uniqueImages.entries()];
        let uploaded = 0;
        const queue = [...entries];
        const uploadWorker = async () => {
          while (queue.length) {
            const [hash, blob] = queue.shift()!;
            try {
              const body = new FormData();
              body.append('file', blob, `${hash}.jpg`);
              const data = await apiFetch('/upload-image', { method: 'POST', accessToken, body });
              if (data?.imageUrl) urlByHash.set(hash, data.imageUrl);
            } catch {
              // Skip images that fail to upload; the product still imports.
            }
            uploaded++;
            toast.loading(`Subiendo imágenes ${uploaded}/${entries.length}...`, { id: 'import' });
          }
        };
        await Promise.all(Array.from({ length: 4 }, uploadWorker));
      }

      const products = parsed.map((p) => {
        const imageUrl = p.image ? urlByHash.get(p.image.hash) : undefined;
        return {
          code: p.code,
          name: p.name,
          category: p.category,
          amountPerPackage: p.amountPerPackage,
          price: p.price,
          // stock and imageUrl are left undefined when not provided, so the
          // server preserves the existing values on update (and defaults them
          // for new products).
          ...(imageUrl ? { imageUrl } : {}),
        };
      });

      const { created, updated, skipped } = await bulkUpsertProducts(products);

      toast.success(
        `PDF importado: ${created} creados, ${updated} actualizados, ${skipped} sin cambios`,
        { id: 'import' },
      );
      loadProducts();
    } catch (error: any) {
      toast.error(error?.message || 'Error al importar productos desde PDF', { id: 'import' });
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
    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';

  const visibleProducts = sortProducts(filterProducts(products, searchTerm), sortBy);
  const visibleClients = sortClients(
    filterClients(clients, clientSearchTerm, clientFilters),
    clientSortBy,
  );
  const allSelected =
    visibleProducts.length > 0 && visibleProducts.every((p) => selectedCodes.has(p.code));

  const toggleSelectAll = () => {
    setSelectedCodes(allSelected ? new Set() : new Set(visibleProducts.map((p) => p.code)));
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <header className="bg-slate-900 border-b-2 border-amber-500 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="rounded-xl bg-slate-800 p-1.5 ring-1 ring-amber-500/30 shrink-0">
              <Logo className="h-8 sm:h-10 object-contain" />
            </div>
            <div className="leading-tight min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                Panel del Administrador
              </h1>
              <p className="text-xs text-amber-400/90 truncate">Inventario y clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ProfileButton />
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 mb-6 bg-slate-100 p-1.5 rounded-xl">
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
          <button
            className={`${tabBase} ${view === 'sales' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setView('sales')}
          >
            <FileText className="w-4 h-4" />
            Presupuestos
          </button>
          <button
            className={`${tabBase} ${view === 'users' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setView('users')}
          >
            <UserCog className="w-4 h-4" />
            Usuarios
          </button>
        </div>

        {view === 'sales' && <SalesPanel />}

        {view === 'users' && <UserManagement />}

        {view === 'clients' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800 mr-auto">Clientes Registrados</h2>
              <Button onClick={openNewClient}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
              <Button variant="outline" asChild disabled={importingClients}>
                <label className="cursor-pointer">
                  {importingClients ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  {importingClients ? 'Importando...' : 'Importar clientes de excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleClientExcelImport}
                    disabled={importingClients}
                  />
                </label>
              </Button>
              {clientDeleteMode ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleClientBulkDelete}
                    disabled={selectedClientIds.size === 0 || clientBulkDeleting}
                  >
                    {clientBulkDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Eliminar ({selectedClientIds.size})
                  </Button>
                  <Button variant="outline" onClick={toggleClientDeleteMode} disabled={clientBulkDeleting}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={toggleClientDeleteMode}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Eliminar varios
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, RIF, correo o teléfono..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ClientSortControl
                value={clientSortBy}
                onChange={setClientSortBy}
                className="w-full sm:w-auto"
              />
              <ClientFilterControl
                value={clientFilters}
                onChange={setClientFilters}
                vendors={vendors}
                className="w-full sm:w-auto"
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left bg-slate-50 text-slate-600">
                    {clientDeleteMode && <th className="p-3 w-10"></th>}
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold">RIF</th>
                    <th className="p-3 font-semibold">Teléfono</th>
                    <th className="p-3 font-semibold">Correo</th>
                    <th className="p-3 font-semibold">Dirección</th>
                    <th className="p-3 font-semibold">Vendedores</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.map((client) => {
                    const selected = selectedClientIds.has(client.id);
                    return (
                    <tr
                      key={client.id}
                      onClick={clientDeleteMode ? () => toggleClientSelected(client.id) : undefined}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${clientDeleteMode ? 'cursor-pointer' : ''} ${selected ? 'bg-red-50' : ''}`}
                    >
                      {clientDeleteMode && (
                        <td className="p-3">
                          <span className={`inline-flex h-5 w-5 rounded border-2 items-center justify-center ${selected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'}`}>
                            {selected && <CheckSquare className="w-3 h-3" />}
                          </span>
                        </td>
                      )}
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 text-slate-600">{client.rif}</td>
                      <td className="p-3 text-slate-600">{client.phone || '—'}</td>
                      <td className="p-3 text-slate-600">{client.email || '—'}</td>
                      <td className="p-3 text-slate-600">{client.address}</td>
                      <td className="p-3 text-slate-600">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openVendorsDialog(client); }}
                          className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 hover:underline"
                        >
                          <UserCog className="w-4 h-4" />
                          {vendorSummary(client)}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className={`flex justify-end gap-2 ${clientDeleteMode ? 'pointer-events-none opacity-40' : ''}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openEditClient(client); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <Users className="w-10 h-10" />
                  <p>
                    {clients.length === 0
                      ? 'No hay clientes registrados.'
                      : 'No se encontraron clientes.'}
                  </p>
                </div>
              )}
            </div>

            <ClientFormDialog
              accessToken={accessToken}
              open={clientDialogOpen}
              onOpenChange={setClientDialogOpen}
              client={editingClient}
              onSaved={() => loadClients()}
            />

            <ClientVendorsDialog
              accessToken={accessToken}
              client={clientForVendors}
              open={vendorsDialogOpen}
              onOpenChange={setVendorsDialogOpen}
              onSaved={() => loadClients()}
            />
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

          <Button variant="outline" asChild disabled={importing}>
            <label className="cursor-pointer">
              {importing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {importing ? 'Importando...' : 'Importar de PDF'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handlePdfImport}
                disabled={importing}
              />
            </label>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Buscar por nombre, código o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <ProductSortControl value={sortBy} onChange={setSortBy} className="w-full sm:w-auto" />
          {deleteMode ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleSelectAll} disabled={bulkDeleting}>
                <CheckSquare className="w-4 h-4 mr-2" />
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedCodes.size === 0 || bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar ({selectedCodes.size})
              </Button>
              <Button variant="outline" onClick={toggleDeleteMode} disabled={bulkDeleting}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={toggleDeleteMode}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Eliminar varios
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {visibleProducts.map((product) => {
            const selected = selectedCodes.has(product.code);
            return (
            <Card
              key={product.code}
              onClick={deleteMode ? () => toggleSelected(product.code) : undefined}
              className={`overflow-hidden border-slate-200 hover:shadow-lg transition-shadow p-0 gap-0 ${product.hidden ? 'opacity-70' : ''} ${deleteMode ? 'cursor-pointer' : ''} ${selected ? 'ring-2 ring-red-500 border-red-500' : ''}`}
            >
              <div className="relative h-28 sm:h-36 bg-slate-100 overflow-hidden">
                {deleteMode && (
                  <span
                    className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-md flex items-center justify-center border-2 ${
                      selected ? 'bg-red-500 border-red-500 text-white' : 'bg-white/90 border-slate-300'
                    }`}
                  >
                    {selected && <CheckSquare className="w-4 h-4" />}
                  </span>
                )}
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
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
                {product.hidden && (
                  <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-white flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    Oculto
                  </span>
                )}
              </div>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2">{product.name}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{product.code}</span>
                  </div>
                  <span className="inline-block text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                  {product.amountPerPackage && (
                    <p className="text-sm text-slate-500">Paquete: {product.amountPerPackage}</p>
                  )}
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600">${product.price.toFixed(2)}</p>
                  <div className={`flex gap-2 pt-1 ${deleteMode ? 'pointer-events-none opacity-50' : ''}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="flex-1 h-9"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.code)}
                      className="flex-1 h-9"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                  <label className={`flex items-center gap-2 pt-1 text-sm text-slate-600 cursor-pointer select-none ${deleteMode ? 'pointer-events-none opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!product.hidden}
                      onChange={() => toggleHidden(product)}
                      className="h-4 w-4 rounded border-slate-300 accent-amber-600"
                    />
                    Ocultar a los vendedores
                  </label>
                </div>
              </CardContent>
            </Card>
            );
          })}
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
