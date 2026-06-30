import { createFileRoute } from "@tanstack/react-router";
import {
  IndianRupee, ShoppingBag, Package, Users, Clock, CheckCircle2, AlertTriangle, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppState } from "@/context/AppStateContext";
import { formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Kaka Furniture" }] }),
  component: Dashboard,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)"];
const STATUS_COLORS: Record<string, string> = {
  New: "var(--info)", Processing: "var(--warning)", Shipped: "var(--chart-4)",
  Delivered: "var(--success)", Cancelled: "var(--destructive)",
};

function statusBadge(s: string) {
  return <Badge style={{ backgroundColor: STATUS_COLORS[s], color: "white" }} className="border-0">{s}</Badge>;
}

function Dashboard() {
  const {
    orders,
    products,
    customers,
    summary,
    categories,
    dailySales,
    monthlySales,
    cityRevenue,
    orderStatus,
    activity,
  } = useAppState();

  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const recent = orders.slice(0, 6);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 6);
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const inventoryHealth = products.length > 0 ? Math.round((1 - (lowStock.length + outOfStock) / products.length) * 100) : 100;
  const avgOrderValue = summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Welcome back to Kaka</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's everything happening across the shop today.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatINR(summary.totalRevenue)} icon={IndianRupee} trend="+12.4% vs last month" tone="success" />
        <StatCard label="Total Orders" value={summary.totalOrders} icon={ShoppingBag} trend="+8 today" tone="info" />
        <StatCard label="Total Products" value={summary.totalProducts} icon={Package} tone="default" />
        <StatCard label="Total Customers" value={summary.totalCustomers.toLocaleString("en-IN")} icon={Users} trend="+56 this month" tone="info" />
        <StatCard label="Pending Orders" value={summary.pendingOrders} icon={Clock} tone="warning" />
        <StatCard label="Delivered Orders" value={summary.deliveredOrders} icon={CheckCircle2} tone="success" />
        <StatCard label="Low Stock" value={summary.lowStockProducts} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Monthly Profit" value={formatINR(summary.monthlyProfit)} icon={TrendingUp} trend="+18% MoM" tone="success" />
      </div>

      {/* Revenue trend + Category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">Revenue & Profit Trend</CardTitle>
            <CardDescription>Monthly performance over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatINR(v)} />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" stroke="var(--success)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Furniture by Category</CardTitle>
            <CardDescription>Stock distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {categories.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily sales + Order status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif">Daily Sales (this week)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {orderStatus.map((s, i) => (<Cell key={i} fill={STATUS_COLORS[s.name] ?? CHART_COLORS[i]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Best Selling + Recent Orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Best Selling Furniture</CardTitle>
            <CardDescription>Top 5 by units sold</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{p.sold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell className="text-right">{formatINR(o.amount)}</TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Inventory + Customer Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Inventory Health</CardTitle>
            <CardDescription>Stock status across {products.length} products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--success)" strokeWidth="3"
                    strokeDasharray={`${inventoryHealth}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif text-2xl font-bold">
                  {inventoryHealth}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Health Score</p>
                <p className="text-xs text-muted-foreground">Based on stock availability</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-serif text-xl font-bold">{products.length - lowStock.length - outOfStock}</p>
                <p className="text-xs text-muted-foreground">In stock</p>
              </div>
              <div className="rounded-lg bg-[color:var(--warning)]/15 p-3">
                <p className="font-serif text-xl font-bold text-[color:var(--warning)]">{lowStock.length}</p>
                <p className="text-xs text-muted-foreground">Low stock</p>
              </div>
              <div className="rounded-lg bg-destructive/15 p-3">
                <p className="font-serif text-xl font-bold text-destructive">{outOfStock}</p>
                <p className="text-xs text-muted-foreground">Out of stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Revenue by City</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="city" stroke="var(--muted-foreground)" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="revenue" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top customers + Business insights + Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                </div>
                <p className="text-sm font-semibold">{formatINR(c.totalSpent)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Business Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InsightRow label="Best Selling Category" value="Sofa" />
            <InsightRow label="Highest Revenue Product" value="L-Shape Sectional" />
            <InsightRow label="Lowest Performing" value="Lounge Chair" />
            <InsightRow label="Average Order Value" value={formatINR(avgOrderValue)} />
            <InsightRow label="Customer Satisfaction" value="94%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-border pl-4">
              {activity.map((a, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.42rem] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by category */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Revenue by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => formatINR(v)} />
              <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-serif text-sm font-bold">{value}</span>
    </div>
  );
}
