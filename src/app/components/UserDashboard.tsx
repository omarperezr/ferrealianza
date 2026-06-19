import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShoppingCart,
  LogOut,
  FileText,
  Download,
  Trash2,
  Plus,
  Minus,
  Search,
  Loader2,
  Package,
  UserPlus,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Logo } from "./Logo";
import logoImage from "../../imports/image.png";

const loadImageAsDataUrl = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });

interface Product {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Client {
  id: string;
  name: string;
  rif: string;
  address: string;
  vendorId: string;
  vendorName: string;
}

export function UserDashboard() {
  const { accessToken, signOut, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", rif: "", address: "" });

  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const loadClients = async () => {
    try {
      const data = await apiFetch("/clients", { accessToken });
      setClients(data.clients || []);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar clientes", { id: "clients" });
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      const data = await apiFetch("/clients", {
        method: "POST",
        accessToken,
        body: JSON.stringify(clientForm),
      });

      toast.success("Cliente registrado exitosamente", { id: "client-save" });
      setClientForm({ name: "", rif: "", address: "" });
      setClientDialogOpen(false);
      await loadClients();
      setSelectedClientId(data.client.id);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar cliente", { id: "client-save" });
    } finally {
      setSavingClient(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const loadProducts = async () => {
    try {
      const data = await apiFetch("/products", { accessToken });
      setProducts(data.products || []);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar productos", { id: "products" });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.code === product.code);
      if (existing) {
        return prev.map((item) =>
          item.code === product.code
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Reuse a single toast id so rapid adds update one notification
    // instead of stacking many.
    toast.success(`${product.name} agregado al carrito`, { id: "cart-add" });
  };

  const updateQuantity = (code: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.code === code
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (code: string) => {
    setCart((prev) => prev.filter((item) => item.code !== code));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    return subtotal - discountAmount + taxAmount;
  };

  const exportToPDF = async () => {
    if (!selectedClient) {
      toast.error("Selecciona un cliente para generar el presupuesto", {
        id: "export",
      });
      return;
    }

    const doc = new jsPDF();

    try {
      const logoDataUrl = await loadImageAsDataUrl(logoImage);
      doc.addImage(logoDataUrl, "PNG", 14, 10, 24, 24);
    } catch (error) {
      // If the logo can't be loaded, continue generating the PDF without it
    }

    doc.setFontSize(18);
    doc.text("FERRE ALIANZA IMPORT, C.A.", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Presupuesto", 105, 30, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 42);
    doc.text(`Vendedor: ${user?.user_metadata?.name}`, 14, 48);
    doc.text(`Cliente: ${selectedClient.name}`, 14, 56);
    doc.text(`RIF: ${selectedClient.rif}`, 14, 62);
    doc.text(`Dirección: ${selectedClient.address}`, 14, 68);

    const tableData = cart.map((item) => [
      item.code,
      item.name,
      item.category,
      item.amountPerPackage,
      item.quantity,
      `$${item.price.toFixed(2)}`,
      `$${(item.price * item.quantity).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 75,
      head: [
        [
          "Código",
          "Producto",
          "Categoría",
          "Cant/Paq",
          "Cant",
          "Precio",
          "Total",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [214, 158, 46] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = calculateTotal();

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 14, finalY);
    doc.text(
      `Descuento (${discount}%): -$${discountAmount.toFixed(2)}`,
      14,
      finalY + 6,
    );
    doc.text(`Impuesto (${tax}%): +$${taxAmount.toFixed(2)}`, 14, finalY + 12);
    doc.setFontSize(12);
    doc.text(`TOTAL: $${total.toFixed(2)}`, 14, finalY + 22);

    doc.save(`orden-${Date.now()}.pdf`);
    toast.success("PDF generado exitosamente", { id: "export" });
  };

  const exportToExcel = () => {
    const data = cart.map((item) => ({
      Código: item.code,
      Producto: item.name,
      Categoría: item.category,
      "Cantidad por Paquete": item.amountPerPackage,
      Cantidad: item.quantity,
      Precio: item.price,
      Total: item.price * item.quantity,
    }));

    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = calculateTotal();

    data.push({} as any);
    data.push({
      Código: "",
      Producto: "",
      Categoría: "",
      "Cantidad por Paquete": "",
      Cantidad: "",
      Precio: "Subtotal:",
      Total: subtotal,
    } as any);
    data.push({
      Código: "",
      Producto: "",
      Categoría: "",
      "Cantidad por Paquete": "",
      Cantidad: "",
      Precio: `Descuento (${discount}%):`,
      Total: -discountAmount,
    } as any);
    data.push({
      Código: "",
      Producto: "",
      Categoría: "",
      "Cantidad por Paquete": "",
      Cantidad: "",
      Precio: `Impuesto (${tax}%):`,
      Total: taxAmount,
    } as any);
    data.push({
      Código: "",
      Producto: "",
      Categoría: "",
      "Cantidad por Paquete": "",
      Cantidad: "",
      Precio: "TOTAL:",
      Total: total,
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orden");
    XLSX.writeFile(wb, `orden-${Date.now()}.xlsx`);
    toast.success("Excel generado exitosamente", { id: "export" });
  };

  const exportToText = () => {
    let text = "FERRE ALIANZA IMPORT, C.A.\n";
    text += "ORDEN DE PEDIDO\n";
    text += `Fecha: ${new Date().toLocaleDateString("es-ES")}\n`;
    text += `Cliente: ${user?.user_metadata?.name}\n\n`;
    text += "-".repeat(80) + "\n";
    text +=
      "CÓDIGO".padEnd(12) +
      "PRODUCTO".padEnd(25) +
      "CATEGORÍA".padEnd(15) +
      "CANT".padEnd(8) +
      "PRECIO".padEnd(10) +
      "TOTAL\n";
    text += "-".repeat(80) + "\n";

    cart.forEach((item) => {
      text +=
        item.code.padEnd(12) +
        item.name.substring(0, 24).padEnd(25) +
        item.category.substring(0, 14).padEnd(15) +
        item.quantity.toString().padEnd(8) +
        `$${item.price.toFixed(2)}`.padEnd(10) +
        `$${(item.price * item.quantity).toFixed(2)}\n`;
    });

    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = calculateTotal();

    text += "-".repeat(80) + "\n";
    text += `Subtotal: $${subtotal.toFixed(2)}\n`;
    text += `Descuento (${discount}%): -$${discountAmount.toFixed(2)}\n`;
    text += `Impuesto (${tax}%): +$${taxAmount.toFixed(2)}\n`;
    text += `TOTAL: $${total.toFixed(2)}\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orden-${Date.now()}.txt`;
    a.click();
    toast.success("Archivo de texto generado exitosamente", { id: "export" });
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p>Cargando catálogo...</p>
      </div>
    );
  }

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
                Panel del Vendedor
              </h1>
              <p className="text-xs text-amber-400/90">Catálogo y presupuestos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={cartOpen} onOpenChange={setCartOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="relative bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center text-xs">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Carrito de Compras</DialogTitle>
                </DialogHeader>

                <div className="flex items-end gap-2 pb-3 border-b">
                  <div className="flex-1">
                    <Label className="text-sm">Cliente</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - {c.rif}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateClient} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nombre</Label>
                          <Input
                            value={clientForm.name}
                            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>RIF</Label>
                          <Input
                            value={clientForm.rif}
                            onChange={(e) => setClientForm({ ...clientForm, rif: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dirección</Label>
                          <Input
                            value={clientForm.address}
                            onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={savingClient}>
                          {savingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {savingClient ? "Guardando..." : "Registrar Cliente"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                    <ShoppingCart className="w-12 h-12" />
                    <p>El carrito está vacío</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          <p className="text-xs text-slate-500">{item.code}</p>
                          <p className="text-sm font-bold text-amber-600">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.code, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-10 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.code, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right min-w-[90px]">
                          <p className="font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.code)}
                            className="text-red-500 hover:text-red-700 h-7 px-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                          <Label className="text-sm">Descuento (%)</Label>
                          <Input
                            type="number"
                            value={discount}
                            onChange={(e) =>
                              setDiscount(Number(e.target.value))
                            }
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-sm">Impuesto (%)</Label>
                          <Input
                            type="number"
                            value={tax}
                            onChange={(e) => setTax(Number(e.target.value))}
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 text-right bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-sm text-slate-600">
                          Subtotal: ${calculateSubtotal().toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Descuento ({discount}%): -$
                          {((calculateSubtotal() * discount) / 100).toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Impuesto ({tax}%): +$
                          {(
                            ((calculateSubtotal() -
                              (calculateSubtotal() * discount) / 100) *
                              tax) /
                            100
                          ).toFixed(2)}
                        </p>
                        <p className="text-2xl font-bold text-slate-900 pt-1">
                          Total: ${calculateTotal().toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button onClick={exportToPDF} className="flex-1">
                          <FileText className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          onClick={exportToExcel}
                          className="flex-1"
                          variant="outline"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Excel
                        </Button>
                        <Button
                          onClick={exportToText}
                          className="flex-1"
                          variant="outline"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Texto
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.code}
              className="group overflow-hidden border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all p-0 gap-0"
            >
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur">
                  {product.code}
                </span>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                  <h3 className="font-semibold text-base leading-snug line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  {product.amountPerPackage && (
                    <p className="text-xs text-slate-500">
                      Paquete: {product.amountPerPackage}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-amber-600">
                    ${product.price.toFixed(2)}
                  </p>
                  <Button onClick={() => addToCart(product)} className="w-full">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Añadir al Carrito
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Package className="w-12 h-12" />
            <p>No se encontraron productos</p>
          </div>
        )}
      </main>
    </div>
  );
}
