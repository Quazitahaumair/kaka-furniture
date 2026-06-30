import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/mock-data";
import { useAppState } from "@/context/AppStateContext";
import { BookOpen, TrendingUp, TrendingDown, Wallet, Plus, Trash2, ArrowUpRight, ArrowDownLeft, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Party } from "@/context/AppStateContext";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Kaka Khaata Book — Ledger" }] }),
  component: KhaataPage,
});

function KhaataPage() {
  const {
    parties,
    addParty: appAddParty,
    deleteParty: appDeleteParty,
    addKhaataEntry,
    deleteKhaataEntry,
  } = useAppState();

  const [activeId, setActiveId] = useState<string>("K001");
  const [q, setQ] = useState("");
  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [newParty, setNewParty] = useState({ name: "", phone: "" });
  const [entry, setEntry] = useState<{ type: "credit" | "debit"; amount: string; note: string }>({ type: "debit", amount: "", note: "" });

  const filtered = useMemo(
    () => parties.filter((p) => !q || `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())),
    [parties, q]
  );

  const active = parties.find((p) => p.id === activeId) ?? parties[0];
  const balance = (p?: Party) => {
    if (!p) return 0;
    return p.entries.reduce((s, e) => s + (e.type === "debit" ? e.amount : -e.amount), 0);
  };

  const totalReceivable = parties.reduce((s, p) => s + Math.max(0, balance(p)), 0);
  const totalPayable = parties.reduce((s, p) => s + Math.max(0, -balance(p)), 0);
  const netBalance = totalReceivable - totalPayable;

  const addParty = () => {
    if (!newParty.name.trim()) return toast.error("Name required");
    const newId = appAddParty(newParty.name, newParty.phone);
    setActiveId(newId);
    setNewParty({ name: "", phone: "" });
    setAddPartyOpen(false);
    toast.success("Party added");
  };

  const addEntry = () => {
    const amt = Number(entry.amount);
    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    if (!active) return;
    addKhaataEntry(active.id, entry.type, amt, entry.note);
    setEntry({ type: "debit", amount: "", note: "" });
    toast.success(entry.type === "debit" ? "Udhaar added" : "Payment recorded");
  };

  const deleteEntry = (eid: string) => {
    if (!active) return;
    deleteKhaataEntry(active.id, eid);
    toast.success("Entry deleted");
  };

  const deleteParty = (id: string) => {
    appDeleteParty(id);
    if (activeId === id && parties.length > 1) {
      const remaining = parties.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
      }
    }
    toast.success("Party removed");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khaata Book"
        subtitle="Track who owes you and who you owe — just like the classic ledger"
        actions={
          <Dialog open={addPartyOpen} onOpenChange={setAddPartyOpen}>
            <DialogTrigger asChild><Button><UserPlus className="mr-1 h-4 w-4" /> Add Party</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif">Add a new party</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={newParty.name} onChange={(e) => setNewParty({ ...newParty, name: e.target.value })} placeholder="e.g. Suresh Furnishing" /></div>
                <div><Label>Phone</Label><Input value={newParty.phone} onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })} placeholder="+91 ..." /></div>
              </div>
              <DialogFooter><Button onClick={addParty}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="rounded-lg bg-[color:var(--success)]/15 p-3 text-[color:var(--success)]"><TrendingUp className="h-6 w-6" /></div>
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">You will get</p>
            <p className="font-serif text-2xl font-bold text-[color:var(--success)]">{formatINR(totalReceivable)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="rounded-lg bg-destructive/15 p-3 text-destructive"><TrendingDown className="h-6 w-6" /></div>
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">You will give</p>
            <p className="font-serif text-2xl font-bold text-destructive">{formatINR(totalPayable)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary"><Wallet className="h-6 w-6" /></div>
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Net balance</p>
            <p className={"font-serif text-2xl font-bold " + (netBalance >= 0 ? "text-[color:var(--success)]" : "text-destructive")}>
              {formatINR(Math.abs(netBalance))} {netBalance >= 0 ? "↗" : "↘"}
            </p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Parties list */}
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3">
            <CardTitle className="font-serif flex items-center gap-2"><BookOpen className="h-4 w-4" /> Parties</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-2 max-h-[520px] overflow-y-auto">
            {filtered.map((p) => {
              const bal = balance(p);
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={"w-full rounded-lg border p-3 text-left transition hover:bg-muted/60 " + (isActive ? "border-primary bg-muted/70" : "border-transparent")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                    </div>
                    <div className="text-right">
                      <p className={"font-serif text-sm font-bold " + (bal > 0 ? "text-[color:var(--success)]" : bal < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {formatINR(Math.abs(bal))}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">{bal > 0 ? "to get" : bal < 0 ? "to give" : "settled"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No parties</p>}
          </CardContent>
        </Card>

        {/* Active ledger */}
        <Card className="lg:col-span-2">
          {active ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-2xl">{active.name}</CardTitle>
                  <CardDescription>{active.phone || "No phone"}</CardDescription>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="font-serif text-base">
                      Balance: <span className={"ml-1 font-bold " + (balance(active) > 0 ? "text-[color:var(--success)]" : balance(active) < 0 ? "text-destructive" : "")}>
                        {formatINR(Math.abs(balance(active)))}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {balance(active) > 0 ? "they owe you" : balance(active) < 0 ? "you owe them" : "settled"}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteParty(active.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="entries" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="entries">Entries</TabsTrigger>
                    <TabsTrigger value="add">Add Entry</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entries">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead className="text-right">You Gave</TableHead>
                            <TableHead className="text-right">You Got</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {active.entries.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-muted-foreground">{e.date}</TableCell>
                              <TableCell>{e.note}</TableCell>
                              <TableCell className="text-right font-semibold text-destructive">
                                {e.type === "debit" ? formatINR(e.amount) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-[color:var(--success)]">
                                {e.type === "credit" ? formatINR(e.amount) : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteEntry(e.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {active.entries.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="add">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <Label>Type</Label>
                        <Select value={entry.type} onValueChange={(v) => setEntry({ ...entry, type: v as "credit" | "debit" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">You Gave (Udhaar)</SelectItem>
                            <SelectItem value="credit">You Got (Payment)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Amount (₹)</Label>
                        <Input type="number" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} placeholder="0" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Note</Label>
                        <Input value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} placeholder="What's this entry for?" />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <Button onClick={addEntry} className="flex-1">
                          {entry.type === "debit"
                            ? <><ArrowUpRight className="mr-1 h-4 w-4" /> Add Udhaar</>
                            : <><ArrowDownLeft className="mr-1 h-4 w-4" /> Record Payment</>}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="mx-auto h-12 w-12 opacity-40" />
                <p className="mt-3">Add a party to start your khaata</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
