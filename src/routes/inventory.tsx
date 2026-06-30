import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/mock-data";
import { useAppState } from "@/context/AppStateContext";
import { Package, AlertTriangle, XCircle, Eye, Plus, Minus, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Kaka Furniture" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products: items, adjustStock, addProduct } = useAppState();
  const [q, setQ] = useState("");

  // Add Product Form State
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const filtered = useMemo(
    () => items.filter((p) => !q || `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  const totalStock = items.reduce((s, p) => s + p.stock, 0);
  const outOfStock = items.filter((p) => p.stock === 0).length;
  const lowStock = items.filter((p) => p.stock > 0 && p.stock < 6).length;
  const mostViewed = [...items].sort((a, b) => b.views - a.views)[0] || { name: "N/A" };

  const adjust = (id: string, delta: number) => {
    adjustStock(id, delta);
    toast.success(delta > 0 ? "Stock added" : "Stock removed");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    const parsedStock = Number(stock);
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      toast.error("Please enter a valid stock quantity");
      return;
    }

    const nextNum = items.length > 0
      ? Math.max(...items.map((item) => {
          const num = parseInt(item.id.replace("P", ""), 10);
          return isNaN(num) ? 0 : num;
        })) + 1
      : 13;
    const newProductId = `P${String(nextNum).padStart(3, '0')}`;

    addProduct({
      id: newProductId,
      name,
      category,
      price: parsedPrice,
      stock: parsedStock,
    });

    toast.success(`Product ${newProductId} added successfully!`);

    setName("");
    setCategory("");
    setPrice("");
    setStock("");
    setOpen(false);
  };

  const status = (n: number) =>
    n === 0
      ? <Badge variant="destructive">Out of stock</Badge>
      : n < 6
      ? <Badge style={{ backgroundColor: "var(--warning)", color: "white" }} className="border-0">Low</Badge>
      : <Badge style={{ backgroundColor: "var(--success)", color: "white" }} className="border-0">In stock</Badge>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Track stock for every piece in the shop"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Product</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prod-name">Product Name</Label>
              <Input
                id="prod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Luxury Leather Sofa"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="prod-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="prod-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {["Sofa", "Bed", "Dining Table", "Chair", "Wardrobe", "Office"].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="prod-price">Price (₹)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-stock">Initial Stock</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Stock"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Package className="h-5 w-5" /></div>
            <div><p className="font-serif text-xl font-bold">{totalStock}</p><p className="text-xs text-muted-foreground">Total stock</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[color:var(--warning)]/15 p-2 text-[color:var(--warning)]"><AlertTriangle className="h-5 w-5" /></div>
            <div><p className="font-serif text-xl font-bold">{lowStock}</p><p className="text-xs text-muted-foreground">Low stock</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/15 p-2 text-destructive"><XCircle className="h-5 w-5" /></div>
            <div><p className="font-serif text-xl font-bold">{outOfStock}</p><p className="text-xs text-muted-foreground">Out of stock</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[color:var(--info)]/15 p-2 text-[color:var(--info)]"><Eye className="h-5 w-5" /></div>
            <div><p className="truncate font-serif text-sm font-bold">{mostViewed.name}</p><p className="text-xs text-muted-foreground">Most viewed</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-serif">Product Catalog</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                    <TableCell className="text-right">{formatINR(p.price)}</TableCell>
                    <TableCell className="text-right font-semibold">{p.stock}</TableCell>
                    <TableCell className="text-right">{p.sold}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.views}</TableCell>
                    <TableCell>{status(p.stock)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => adjust(p.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => adjust(p.id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
