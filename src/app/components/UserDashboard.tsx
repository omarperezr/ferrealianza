import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  LogOut,
  FileText,
  Download,
  Trash2,
  Plus,
  Minus,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { projectId } from "/utils/supabase/info";
import { Logo } from "./Logo";

interface Product {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  imageUrl: string;
}

interface CartItem extends Product {
  quantity: number;
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

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-745f9946/products`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      toast.error("Error al cargar productos");
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
    toast.success("Producto añadido al carrito");
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

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("FERRE ALIANZA IMPORT, C.A.", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Orden de Pedido", 105, 30, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 40);
    doc.text(`Cliente: ${user?.user_metadata?.name}`, 14, 46);

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
      startY: 55,
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
    toast.success("PDF generado exitosamente");
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
    toast.success("Excel generado exitosamente");
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
    toast.success("Archivo de texto generado exitosamente");
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <h1 className="text-2xl font-bold text-slate-800">
              Catálogo de Productos
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={cartOpen} onOpenChange={setCartOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      {cart.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Carrito de Compras</DialogTitle>
                </DialogHeader>

                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    El carrito está vacío
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.code}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-slate-600">{item.code}</p>
                          <p className="text-sm font-bold text-green-600">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.code, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.code, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.code)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm">Descuento (%)</label>
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
                        <div className="flex-1">
                          <label className="text-sm">Impuesto (%)</label>
                          <Input
                            type="number"
                            value={tax}
                            onChange={(e) => setTax(Number(e.target.value))}
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 text-right">
                        <p>Subtotal: ${calculateSubtotal().toFixed(2)}</p>
                        <p>
                          Descuento ({discount}%): -$
                          {((calculateSubtotal() * discount) / 100).toFixed(2)}
                        </p>
                        <p>
                          Impuesto ({tax}%): +$
                          {(
                            ((calculateSubtotal() -
                              (calculateSubtotal() * discount) / 100) *
                              tax) /
                            100
                          ).toFixed(2)}
                        </p>
                        <p className="text-xl font-bold">
                          Total: ${calculateTotal().toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-4">
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
            <span className="text-sm text-slate-600">
              {user?.user_metadata?.name}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Input
            type="search"
            placeholder="Buscar productos por nombre, código o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card
              key={product.code}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
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
                    <span className="text-xs text-slate-500">
                      {product.code}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{product.category}</p>
                  {product.amountPerPackage && (
                    <p className="text-xs text-slate-500">
                      Paquete: {product.amountPerPackage}
                    </p>
                  )}
                  <p className="text-xl font-bold text-green-600">
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
          <div className="text-center py-12 text-slate-500">
            No se encontraron productos
          </div>
        )}
      </main>
    </div>
  );
}
