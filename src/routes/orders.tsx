import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/mock-data";
import { Search, Plus, Package, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/context/AppStateContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — Kaka Furniture" }] }),
  component: OrdersPage,
});

const STATUS = ["All", "New", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
const COLORS: Record<string, string> = {
  New: "var(--info)", Processing: "var(--warning)", Shipped: "var(--chart-4)",
  Delivered: "var(--success)", Cancelled: "var(--destructive)",
};

function OrdersPage() {
  const {
    orders,
    products,
    customers,
    addOrder,
    advanceOrder,
    cancelOrder,
  } = useAppState();

  const [tab, setTab] = useState<(typeof STATUS)[number]>("All");
  const [q, setQ] = useState("");

  // Form states
  const [open, setOpen] = useState(false);
  const [custType, setCustType] = useState<"new" | "existing">("new");
  const [selectedCustId, setSelectedCustId] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custCity, setCustCity] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [paidAmt, setPaidAmt] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab !== "All" && o.status !== tab) return false;
      if (q && !`${o.id} ${o.customer} ${o.product}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, tab, q]);

  const counts = {
    New: orders.filter((o) => o.status === "New").length,
    Processing: orders.filter((o) => o.status === "Processing").length,
    Shipped: orders.filter((o) => o.status === "Shipped").length,
    Delivered: orders.filter((o) => o.status === "Delivered").length,
    Cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };

  const advance = (id: string) => {
    advanceOrder(id);
  };

  const cancel = (id: string) => {
    cancelOrder(id);
  };

  const handleCustChange = (val: string) => {
    setSelectedCustId(val);
    const c = customers.find((x) => x.id === val);
    if (c) {
      setCustName(c.name);
      setCustPhone(c.phone);
      setCustEmail(c.email);
      setCustCity(c.city);
    }
  };

  const handleSubmit = () => {
    if (!custName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const parsedPaid = Number(paidAmt);
    if (isNaN(parsedPaid) || parsedPaid < 0) {
      toast.error("Please enter a valid paid amount");
      return;
    }

    addOrder({
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      city: custCity || "Pune",
      productId: selectedProductId,
      amountPaid: parsedPaid,
      date: orderDate,
    });

    toast.success("Order added successfully!");
    
    setCustType("new");
    setSelectedCustId("");
    setCustName("");
    setCustPhone("");
    setCustEmail("");
    setCustCity("");
    setSelectedProductId("");
    setPaidAmt("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="Manage every order across the shop"
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> New Order</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create New Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={custType === "new" ? "default" : "outline"}
                onClick={() => {
                  setCustType("new");
                  setSelectedCustId("");
                  setCustName("");
                  setCustPhone("");
                  setCustEmail("");
                  setCustCity("");
                }}
              >
                New Customer
              </Button>
              <Button
                type="button"
                variant={custType === "existing" ? "default" : "outline"}
                onClick={() => setCustType("existing")}
              >
                Existing Customer
              </Button>
            </div>

            {custType === "existing" && (
              <div className="grid gap-2">
                <Label htmlFor="existing-cust">Select Customer</Label>
                <Select value={selectedCustId} onValueChange={handleCustChange}>
                  <SelectTrigger id="existing-cust">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cust-name">Customer Name</Label>
                <Input
                  id="cust-name"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  disabled={custType === "existing"}
                  placeholder="Name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input
                  id="cust-phone"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  disabled={custType === "existing"}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cust-email">Email</Label>
                <Input
                  id="cust-email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  disabled={custType === "existing"}
                  placeholder="Email address"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cust-city">City</Label>
                <Input
                  id="cust-city"
                  value={custCity}
                  onChange={(e) => setCustCity(e.target.value)}
                  disabled={custType === "existing"}
                  placeholder="City"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="order-product">Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={(val) => {
                  setSelectedProductId(val);
                  const p = products.find((x) => x.id === val);
                  if (p) {
                    setPaidAmt(String(p.price));
                  }
                }}
              >
                <SelectTrigger id="order-product">
                  <SelectValue placeholder="Select a furniture piece..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name} - {formatINR(p.price)} ({p.stock} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="paid-amt">Amount Paid (₹)</Label>
                <Input
                  id="paid-amt"
                  type="number"
                  value={paidAmt}
                  onChange={(e) => setPaidAmt(e.target.value)}
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order-date">Order Date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "New", value: counts.New, icon: Clock, color: COLORS.New },
          { label: "Processing", value: counts.Processing, icon: Package, color: COLORS.Processing },
          { label: "Shipped", value: counts.Shipped, icon: Truck, color: COLORS.Shipped },
          { label: "Delivered", value: counts.Delivered, icon: CheckCircle2, color: COLORS.Delivered },
          { label: "Cancelled", value: counts.Cancelled, icon: XCircle, color: COLORS.Cancelled },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${s.color} 15%, transparent)`, color: s.color }}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-serif">All Orders</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search orders..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
            <TabsList>
              {STATUS.map((s) => (<TabsTrigger key={s} value={s}>{s}</TabsTrigger>))}
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell className="font-medium">{o.customer}</TableCell>
                    <TableCell>{o.product}</TableCell>
                    <TableCell>{o.city}</TableCell>
                    <TableCell className="text-muted-foreground">{o.date}</TableCell>
                    <TableCell className="text-right font-semibold">{formatINR(o.amount)}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: COLORS[o.status], color: "white" }} className="border-0">{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={["Delivered", "Cancelled"].includes(o.status)} onClick={() => advance(o.id)}>Advance</Button>
                        <Button size="sm" variant="ghost" disabled={["Delivered", "Cancelled"].includes(o.status)} onClick={() => cancel(o.id)}>Cancel</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
