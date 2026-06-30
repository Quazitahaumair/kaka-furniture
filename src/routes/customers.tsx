import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { formatINR, customerGrowth } from "@/lib/mock-data";
import { useAppState } from "@/context/AppStateContext";
import { Users, UserPlus, Repeat, Crown, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Kaka Furniture" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers: seed } = useAppState();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => seed.filter((c) => !q || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q.toLowerCase())),
    [seed, q]
  );

  const total = seed.length;
  const returning = seed.filter((c) => c.returning).length;
  const newThisMonth = seed.filter((c) => c.since.startsWith("2026-06")).length;
  const top = [...seed].sort((a, b) => b.totalSpent - a.totalSpent)[0] || { name: "N/A", totalSpent: 0 };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Know who's shopping at Kaka" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-5 w-5" /></div>
          <div><p className="font-serif text-xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total customers</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--info)]/15 p-2 text-[color:var(--info)]"><UserPlus className="h-5 w-5" /></div>
          <div><p className="font-serif text-xl font-bold">{newThisMonth}</p><p className="text-xs text-muted-foreground">New this month</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-[color:var(--success)]/15 p-2 text-[color:var(--success)]"><Repeat className="h-5 w-5" /></div>
          <div><p className="font-serif text-xl font-bold">{returning}</p><p className="text-xs text-muted-foreground">Returning</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-accent/20 p-2 text-accent-foreground"><Crown className="h-5 w-5" /></div>
          <div><p className="truncate font-serif text-sm font-bold">{top.name}</p><p className="text-xs text-muted-foreground">Top customer</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-serif">Customer Growth</CardTitle><CardDescription>New vs returning monthly</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="new" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returning" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif">Total Customer Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={customerGrowth.map((m) => ({ month: m.month, total: m.new + m.returning }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-serif">Customer Directory</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">Since {c.since}</p></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{c.email}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </TableCell>
                    <TableCell>{c.city}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right font-semibold">{formatINR(c.totalSpent)}</TableCell>
                    <TableCell>
                      {c.returning
                        ? <Badge style={{ backgroundColor: "var(--success)", color: "white" }} className="border-0">Returning</Badge>
                        : <Badge variant="secondary">New</Badge>}
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
