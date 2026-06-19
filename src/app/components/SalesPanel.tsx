import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { shareProduct } from "../utils/share";
import { getProducts, getClients } from "../utils/dataStore";
import { ClientFormDialog, Client } from "./ClientFormDialog";
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
  FileText,
  Download,
  Trash2,
  Plus,
  Minus,
  Search,
  Loader2,
  Package,
  UserPlus,
  Share2,
} from "lucide-react";
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

// Brand colors for the PDF
const GOLD: [number, number, number] = [201, 162, 39];
const DARK: [number, number, number] = [26, 29, 33];

export function SalesPanel() {
  const { accessToken, user } = useAuth();
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

  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const loadClients = async () => {
    const { items } = await getClients(accessToken);
    setClients(items);
  };

  const loadProducts = async () => {
    try {
      const { items } = await getProducts(accessToken);
      setProducts(items);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSaved = (client: Client) => {
    loadClients();
    setSelectedClientId(client.id);
  };

  const handleShare = async (product: Product) => {
    try {
      const result = await shareProduct(product);
      if (result === "copied") {
        toast.success("Datos del producto copiados al portapapeles", { id: "share" });
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast.error("No se pudo compartir el producto", { id: "share" });
      }
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

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
    // Reuse a single toast id so rapid adds update one notification.
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

  const calculateSubtotal = () =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    return subtotal - discountAmount + taxAmount;
  };

  const exportToPDF = async () => {
    if (!selectedClient) {
      toast.error("Selecciona un cliente para generar el presupuesto", { id: "export" });
      return;
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const money = (n: number) => `$${n.toFixed(2)}`;

    // ---- Header band ----
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, 32, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 32, pageW, 1.6, "F");

    try {
      const logoDataUrl = await loadImageAsDataUrl(logoImage);
      doc.addImage(logoDataUrl, "PNG", 14, 6, 20, 20);
    } catch {
      // Continue without the logo if it can't be loaded.
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("FERRE ALIANZA IMPORT, C.A.", 40, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("PRESUPUESTO / COTIZACIÓN", 40, 21);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text("RIF: J-50137897-5", 40, 27);

    // Document number + date (right aligned in the band)
    const docNumber = `N° ${new Date().getTime().toString().slice(-6)}`;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(docNumber, pageW - 14, 14, { align: "right" });
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text(
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      pageW - 14,
      21,
      { align: "right" },
    );

    // ---- Client / vendor info box ----
    let y = 44;
    doc.setDrawColor(225, 225, 225);
    doc.setFillColor(248, 248, 246);
    doc.roundedRect(14, y, pageW - 28, 30, 2, 2, "FD");

    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CLIENTE", 20, y + 7);
    doc.text("VENDEDOR", pageW / 2 + 6, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(selectedClient.name, 20, y + 14);
    doc.text(`RIF: ${selectedClient.rif}`, 20, y + 20);
    const address = doc.splitTextToSize(
      `Dirección: ${selectedClient.address}`,
      pageW / 2 - 26,
    );
    doc.text(address[0] || "", 20, y + 26);

    doc.text(user?.user_metadata?.name || "—", pageW / 2 + 6, y + 14);
    doc.text(
      `Fecha: ${new Date().toLocaleDateString("es-ES")}`,
      pageW / 2 + 6,
      y + 20,
    );

    // ---- Items table ----
    const tableData = cart.map((item) => [
      item.code,
      item.name,
      item.amountPerPackage || "-",
      String(item.quantity),
      money(item.price),
      money(item.price * item.quantity),
    ]);

    autoTable(doc, {
      startY: y + 38,
      head: [["Código", "Producto", "Cant/Paq", "Cant", "Precio", "Total"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [230, 230, 230] },
      headStyles: {
        fillColor: DARK,
        textColor: GOLD,
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: { fillColor: [250, 249, 246] },
      columnStyles: {
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // ---- Totals box ----
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * tax) / 100;
    const total = calculateTotal();

    let ty = (doc as any).lastAutoTable.finalY + 8;
    const boxX = pageW - 94;
    const boxW = 80;

    const row = (label: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, boxX, ty);
      doc.text(value, boxX + boxW, ty, { align: "right" });
      ty += 6;
    };

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    row("Subtotal:", money(subtotal));
    row(`Descuento (${discount}%):`, `-${money(discountAmount)}`);
    row(`Impuesto (${tax}%):`, `+${money(taxAmount)}`);

    // Total highlighted
    ty += 1;
    doc.setFillColor(...DARK);
    doc.roundedRect(boxX - 4, ty - 5, boxW + 8, 10, 1.5, 1.5, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL:", boxX, ty + 1.5);
    doc.text(money(total), boxX + boxW, ty + 1.5, { align: "right" });

    // ---- Footer ----
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Gracias por su preferencia · Ferre Alianza Import, C.A.",
      pageW / 2,
      pageH - 10,
      { align: "center" },
    );

    doc.save(`presupuesto-${selectedClient.name.replace(/\s+/g, "-")}-${Date.now()}.pdf`);
    toast.success("PDF generado exitosamente", { id: "export" });
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
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

    const pad = (precio: any, totalVal: any) =>
      ({
        Código: "",
        Producto: "",
        Categoría: "",
        "Cantidad por Paquete": "",
        Cantidad: "",
        Precio: precio,
        Total: totalVal,
      }) as any;

    data.push({} as any);
    data.push(pad("Subtotal:", subtotal));
    data.push(pad(`Descuento (${discount}%):`, -discountAmount));
    data.push(pad(`Impuesto (${tax}%):`, taxAmount));
    data.push(pad("TOTAL:", total));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presupuesto");
    XLSX.writeFile(wb, `presupuesto-${Date.now()}.xlsx`);
    toast.success("Excel generado exitosamente", { id: "export" });
  };

  const exportToText = () => {
    let text = "FERRE ALIANZA IMPORT, C.A.\n";
    text += "PRESUPUESTO\n";
    text += `Fecha: ${new Date().toLocaleDateString("es-ES")}\n`;
    text += `Vendedor: ${user?.user_metadata?.name || "—"}\n`;
    if (selectedClient) {
      text += `Cliente: ${selectedClient.name} (RIF: ${selectedClient.rif})\n`;
    }
    text += "\n" + "-".repeat(80) + "\n";
    text +=
      "CÓDIGO".padEnd(12) +
      "PRODUCTO".padEnd(28) +
      "CANT".padEnd(8) +
      "PRECIO".padEnd(12) +
      "TOTAL\n";
    text += "-".repeat(80) + "\n";

    cart.forEach((item) => {
      text +=
        item.code.padEnd(12) +
        item.name.substring(0, 27).padEnd(28) +
        item.quantity.toString().padEnd(8) +
        `$${item.price.toFixed(2)}`.padEnd(12) +
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
    a.download = `presupuesto-${Date.now()}.txt`;
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
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p>Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-center sm:justify-between">
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

        <Dialog open={cartOpen} onOpenChange={setCartOpen}>
          <DialogTrigger asChild>
            <Button className="relative w-full sm:w-auto">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ver carrito
              {totalItems > 0 && (
                <span className="ml-2 bg-amber-500 text-slate-900 font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center text-xs">
                  {totalItems}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Carrito · Generar presupuesto</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row sm:items-end gap-2 pb-3 border-b">
              <div className="flex-1 min-w-0">
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
              <ClientFormDialog
                accessToken={accessToken}
                open={clientDialogOpen}
                onOpenChange={setClientDialogOpen}
                onSaved={handleClientSaved}
                trigger={
                  <Button type="button" variant="outline" className="w-full sm:w-auto shrink-0">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuevo cliente
                  </Button>
                }
              />
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
                        onChange={(e) => setDiscount(Number(e.target.value))}
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
                    <Button onClick={exportToExcel} className="flex-1" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button onClick={exportToText} className="flex-1" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Texto
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
                  loading="lazy"
                  decoding="async"
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
              <button
                type="button"
                onClick={() => handleShare(product)}
                title="Compartir producto"
                className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white hover:text-amber-600 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
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
                <div className="flex gap-2">
                  <Button onClick={() => addToCart(product)} className="flex-1">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Añadir
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleShare(product)}
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
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
    </div>
  );
}
