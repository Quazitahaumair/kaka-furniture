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
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/mock-data";
import { useAppState, Party } from "@/context/AppStateContext";
import { 
  BookOpen, TrendingUp, TrendingDown, Wallet, Plus, Trash2, ArrowUpRight, 
  ArrowDownLeft, UserPlus, Search, Calendar, Printer, Share2, MessageSquare, Phone, MapPin 
} from "lucide-react";
import { toast } from "sonner";

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
  
  // Custom states for new party creation
  const [newParty, setNewParty] = useState({ name: "", phone: "", address: "", openingBalance: "" });
  
  // Custom states for new entry addition
  const [entry, setEntry] = useState<{ type: "credit" | "debit"; amount: string; note: string }>({ type: "debit", amount: "", note: "" });
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));

  // Date filters for ledger statement
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const filteredParties = useMemo(
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

  // Add party with address and opening balance
  const addParty = () => {
    if (!newParty.name.trim()) return toast.error("Name required");
    const opBal = Number(newParty.openingBalance) || 0;
    const newId = appAddParty(newParty.name, newParty.phone, newParty.address, opBal);
    setActiveId(newId);
    setNewParty({ name: "", phone: "", address: "", openingBalance: "" });
    setAddPartyOpen(false);
    toast.success("Customer added to ledger");
  };

  // Add ledger entry
  const addEntry = () => {
    const amt = Number(entry.amount);
    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    if (!active) return;
    addKhaataEntry(active.id, entry.type, amt, entry.note, entryDate);
    setEntry({ type: "debit", amount: "", note: "" });
    setEntryDate(new Date().toISOString().slice(0, 10));
    toast.success(entry.type === "debit" ? "Udhaar added" : "Payment / Advance recorded");
  };

  // Delete entry
  const deleteEntry = (eid: string) => {
    if (!active) return;
    deleteKhaataEntry(active.id, eid);
    toast.success("Entry deleted");
  };

  // Delete party
  const deleteParty = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer ledger account? This will delete all their transaction entries permanently.")) {
      appDeleteParty(id);
      if (activeId === id && parties.length > 1) {
        const remaining = parties.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
        }
      }
      toast.success("Customer ledger deleted");
    }
  };

  // Chronologically compute running balances for active customer's entries
  const sortedEntriesWithRunningBalance = useMemo(() => {
    if (!active) return [];
    let bal = 0;
    // Sort chronologically (oldest first)
    const sorted = [...active.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map((e) => {
      if (e.type === "debit") {
        bal += e.amount;
      } else {
        bal -= e.amount;
      }
      return { ...e, runningBalance: bal };
    });
  }, [active]);

  // Apply date filters to displaying entries and reverse so newest show first
  const displayedEntries = useMemo(() => {
    let result = [...sortedEntriesWithRunningBalance];
    if (filterStartDate) {
      result = result.filter((e) => e.date >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter((e) => e.date <= filterEndDate);
    }
    return result.reverse();
  }, [sortedEntriesWithRunningBalance, filterStartDate, filterEndDate]);

  // WhatsApp balance reminder logic (sending to customer, preconfigured contact is admin)
  const handleSendReminder = () => {
    if (!active) return;
    const bal = balance(active);
    if (bal <= 0) {
      return toast.info("No outstanding balance due for this customer.");
    }

    const text = encodeURIComponent(
      `*Kaka Furniture — Ledger Account Balance Reminder*\n\n` +
      `Dear ${active.name},\n\n` +
      `This is a friendly reminder that you have an outstanding balance of *₹${bal.toLocaleString("en-IN")}* in your ledger account with Kaka Furniture.\n\n` +
      `Kindly arrange to settle this balance. If you have already paid or have queries, please contact our administrator at *+91 7875992293*.\n\n` +
      `Thank you for your business!`
    );

    const phoneClean = active.phone.replace(/[^0-9]/g, "");
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  // Print/Save PDF Ledger Statement Helper
  const handlePrintStatement = () => {
    if (!active) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return toast.error("Pop-up blocked. Please enable pop-ups.");

    const bal = balance(active);
    let tempBal = 0;
    
    // Sort oldest first for statement report
    const sorted = [...active.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const printRows = sorted.map((e) => {
      if (e.type === "debit") tempBal += e.amount;
      else tempBal -= e.amount;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${e.date}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${e.note}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #ef4444; font-weight: 600; font-size: 13px;">
            ${e.type === "debit" ? `₹${e.amount.toLocaleString("en-IN")}` : "—"}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #10b981; font-weight: 600; font-size: 13px;">
            ${e.type === "credit" ? `₹${e.amount.toLocaleString("en-IN")}` : "—"}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 13px; color: ${tempBal >= 0 ? "#1e293b" : "#ef4444"};">
            ₹${Math.abs(tempBal).toLocaleString("en-IN")} ${tempBal >= 0 ? "Dr" : "Cr"}
          </td>
        </tr>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <title>Ledger Statement - ${active.name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
            .statement-box { max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .company-logo { font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .statement-title { font-size: 24px; font-weight: 800; text-align: right; color: #0f172a; margin: 0; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details-table td { width: 50%; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; padding: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; }
            .totals-box { width: 50%; margin-left: 50%; margin-bottom: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .totals-row.grand { border-top: 2px solid #0f172a; font-size: 16px; font-weight: 700; color: #0f172a; padding-top: 10px; margin-top: 6px; }
            .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="statement-box">
            <div class="header">
              <div>
                <div class="company-logo">KAKA FURNITURE CO.</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Premium Wooden & Home Furniture</div>
                <div style="font-size: 12px; color: #64748b;">Noida, India | Mob: +91 7875992293</div>
              </div>
              <div class="invoice-info">
                <h1 class="statement-title">ACCOUNT STATEMENT</h1>
                <div style="font-size: 12px; color: #64748b; margin-top: 5px;">As of: ${new Date().toISOString().slice(0, 10)}</div>
              </div>
            </div>
            
            <table class="details-table">
              <tr>
                <td>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px;">Customer Profile:</div>
                  <div style="font-weight: 700; font-size: 15px; color: #0f172a;">${active.name}</div>
                  ${active.phone ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">Phone: ${active.phone}</div>` : ""}
                  ${active.address ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">Address: ${active.address}</div>` : ""}
                </td>
                <td style="text-align: right;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px;">Ledger Summary:</div>
                  <div style="font-size: 13px; color: #475569;">Opening Balance: ₹${(active.openingBalance || 0).toLocaleString("en-IN")}</div>
                  <div style="font-size: 13px; color: #475569; margin-top: 2px; font-weight: 700;">
                    Outstanding Balance: ₹${Math.abs(bal).toLocaleString("en-IN")} ${bal >= 0 ? "(Receivable)" : "(Payable/Credit)"}
                  </div>
                </td>
              </tr>
            </table>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Details</th>
                  <th style="text-align: right; width: 130px;">Debit (+)</th>
                  <th style="text-align: right; width: 130px;">Credit (-)</th>
                  <th style="text-align: right; width: 150px;">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                ${printRows}
              </tbody>
            </table>
            
            <div class="totals-box">
              <div class="totals-row">
                <span>Total Debit (Udhaar):</span>
                <span>₹${active.entries.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0).toLocaleString("en-IN")}</span>
              </div>
              <div class="totals-row">
                <span>Total Credit (Paid):</span>
                <span>₹${active.entries.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0).toLocaleString("en-IN")}</span>
              </div>
              <div class="totals-row grand">
                <span>Net Balance Due:</span>
                <span>₹${Math.abs(bal).toLocaleString("en-IN")} ${bal >= 0 ? "Dr" : "Cr"}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>For any queries regarding this statement, please contact us at +91 7875992293.</p>
              <p style="font-size: 9px; color: #cbd5e1; margin-top: 20px;">Kaka Furniture Ledger Management Console</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khaata Book Ledger"
        subtitle="Manage customer profiles, record debits (udhaar) and credits (payments / advances), and review running balances."
        actions={
          <Dialog open={addPartyOpen} onOpenChange={setAddPartyOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" /> Add Ledger Party
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Add New Ledger Account</DialogTitle>
                <CardDescription>Create a customer ledger profile for tracking payments.</CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name">Full Name</Label>
                  <Input 
                    id="cust-name" 
                    value={newParty.name} 
                    onChange={(e) => setNewParty({ ...newParty, name: e.target.value })} 
                    placeholder="e.g. Suresh Carpentry" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone">Mobile Number</Label>
                  <Input 
                    id="cust-phone" 
                    value={newParty.phone} 
                    onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })} 
                    placeholder="e.g. +91 98765 43210" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-addr">Billing Address</Label>
                  <Input 
                    id="cust-addr" 
                    value={newParty.address} 
                    onChange={(e) => setNewParty({ ...newParty, address: e.target.value })} 
                    placeholder="e.g. Sector 62, Noida, UP" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-bal">Opening Balance (₹, Optional)</Label>
                  <Input 
                    type="number" 
                    id="cust-bal" 
                    value={newParty.openingBalance} 
                    onChange={(e) => setNewParty({ ...newParty, openingBalance: e.target.value })} 
                    placeholder="0" 
                    min="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addParty} className="w-full">Create Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Outstanding Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Receivable (You Will Get)</p>
              <p className="font-serif text-2xl font-bold text-emerald-600">{formatINR(totalReceivable)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-red-500/10 p-3 text-red-500">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Payable (You Will Give)</p>
              <p className="font-serif text-2xl font-bold text-red-500">{formatINR(totalPayable)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net Balance</p>
              <p className={"font-serif text-2xl font-bold " + (netBalance >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatINR(Math.abs(netBalance))} {netBalance >= 0 ? "↗" : "↘"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Parties List */}
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" /> Customers
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search name, phone..." 
                className="pl-9" 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-2 max-h-[500px] overflow-y-auto">
            {filteredParties.map((p) => {
              const bal = balance(p);
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={"w-full rounded-lg border p-3 text-left transition hover:bg-slate-50 " + (isActive ? "border-indigo-600 bg-indigo-50/20" : "border-transparent")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                    </div>
                    <div className="text-right">
                      <p className={"font-serif text-sm font-bold " + (bal > 0 ? "text-emerald-600" : bal < 0 ? "text-red-500" : "text-muted-foreground")}>
                        {formatINR(Math.abs(bal))}
                      </p>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{bal > 0 ? "to get" : bal < 0 ? "to give" : "settled"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredParties.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No parties found.</p>}
          </CardContent>
        </Card>

        {/* Active Ledger Detail */}
        <Card className="lg:col-span-2">
          {active ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4 border-b">
                <div className="space-y-1">
                  <CardTitle className="font-serif text-2xl text-slate-900">{active.name}</CardTitle>
                  {active.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {active.phone}
                    </p>
                  )}
                  {active.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {active.address}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-1.5">
                    <Badge variant="secondary" className="font-serif text-sm px-2.5 py-0.5">
                      Due Balance: <span className={"ml-1 font-bold " + (balance(active) > 0 ? "text-emerald-600" : balance(active) < 0 ? "text-red-500" : "")}>
                        {formatINR(Math.abs(balance(active)))}
                      </span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({balance(active) > 0 ? "they owe you" : balance(active) < 0 ? "you owe them (advance)" : "settled"})
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {balance(active) > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSendReminder}
                        className="flex items-center gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Send Reminder
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrintStatement}
                      className="flex items-center gap-1.5 text-slate-700 border-slate-300"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print Statement
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteParty(active.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="entries" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="entries">Transaction History</TabsTrigger>
                    <TabsTrigger value="add">Add Transaction</TabsTrigger>
                  </TabsList>

                  {/* TRANSACTION LIST VIEW */}
                  <TabsContent value="entries" className="space-y-4">
                    {/* Date Filters */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2 flex-1">
                        <Label htmlFor="date-start" className="text-xs shrink-0 font-semibold text-slate-500">From:</Label>
                        <Input 
                          type="date" 
                          id="date-start" 
                          value={filterStartDate} 
                          onChange={(e) => setFilterStartDate(e.target.value)} 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Label htmlFor="date-end" className="text-xs shrink-0 font-semibold text-slate-500">To:</Label>
                        <Input 
                          type="date" 
                          id="date-end" 
                          value={filterEndDate} 
                          onChange={(e) => setFilterEndDate(e.target.value)} 
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      {(filterStartDate || filterEndDate) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }}
                          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="overflow-x-auto border rounded-md">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead>Note / Details</TableHead>
                            <TableHead className="text-right w-[110px]">Debit (You Gave)</TableHead>
                            <TableHead className="text-right w-[110px]">Credit (You Got)</TableHead>
                            <TableHead className="text-right w-[130px]">Running Balance</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedEntries.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                              <TableCell className="font-medium text-slate-800">{e.note}</TableCell>
                              <TableCell className="text-right font-semibold text-red-500">
                                {e.type === "debit" ? formatINR(e.amount) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                {e.type === "credit" ? formatINR(e.amount) : "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-slate-900">
                                {formatINR(Math.abs(e.runningBalance))}
                                <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
                                  {e.runningBalance >= 0 ? " Dr" : " Cr"}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/5" onClick={() => deleteEntry(e.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {displayedEntries.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                                No ledger entries found in this range.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* ADD TRANSACTION FORM */}
                  <TabsContent value="add" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="entry-type">Transaction Type</Label>
                        <Select value={entry.type} onValueChange={(v) => setEntry({ ...entry, type: v as "credit" | "debit" })}>
                          <SelectTrigger id="entry-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">You Gave (Udhaar / Sales Debit)</SelectItem>
                            <SelectItem value="credit">You Got (Payment Received / Advance Credit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="entry-date">Transaction Date</Label>
                        <Input 
                          type="date" 
                          id="entry-date" 
                          value={entryDate} 
                          onChange={(e) => setEntryDate(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
                      <div className="space-y-1.5">
                        <Label htmlFor="entry-amount">Amount (₹)</Label>
                        <Input 
                          type="number" 
                          id="entry-amount" 
                          value={entry.amount} 
                          onChange={(e) => setEntry({ ...entry, amount: e.target.value })} 
                          placeholder="0" 
                          min="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="entry-note">Description / Reference Note</Label>
                        <Input 
                          id="entry-note" 
                          value={entry.note} 
                          onChange={(e) => setEntry({ ...entry, note: e.target.value })} 
                          placeholder="e.g. UPI Payment, Advance for Bed, Cash deposit" 
                        />
                      </div>
                    </div>

                    <Button onClick={addEntry} className="w-full flex items-center justify-center gap-1.5">
                      {entry.type === "debit" ? (
                        <>
                          <ArrowUpRight className="h-4 w-4" /> Add Debit (Owed By Customer)
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="h-4 w-4" /> Add Credit (Paid By Customer)
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
              <div className="text-center">
                <BookOpen className="mx-auto h-12 w-12 opacity-30" />
                <p className="mt-3">Select or add a ledger customer account to begin.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
