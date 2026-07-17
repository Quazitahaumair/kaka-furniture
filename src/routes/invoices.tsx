import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
import { useAppState, Invoice, InvoiceItem } from "@/context/AppStateContext";
import {
  Receipt, Plus, Trash2, Search, Calendar, FileText, Download, Printer, Share2,
  Check, User, Phone, MapPin, Eye, FileEdit, MessageCircle, Mail, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { apiService, API_BASE_URL } from "@/lib/api";

const PREDEFINED_FURNITURE = [
  "Low back revolving chair",
  "Low back s type chair",
  "Net boom chair",
  "Net matrix chair",
  "Amazon chair",
  "Amazon hy chair",
  "Black beauty chair",
  "Samosa pattern chair",
];

function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const g = ["", "Thousand", "Lakh", "Crore"];

  const helper = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + helper(n % 100) : "");
  };

  let str = "";
  let temp = Math.floor(num);

  const parts: number[] = [];
  if (temp > 0) {
    parts.push(temp % 1000);
    temp = Math.floor(temp / 1000);
    while (temp > 0) {
      parts.push(temp % 100);
      temp = Math.floor(temp / 100);
    }
  }

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] !== 0) {
      let partWord = helper(parts[i]);
      if (i > 0) {
        partWord += " " + g[i];
      }
      str = partWord + (str !== "" ? " " + str : "");
    }
  }

  const paise = Math.round((num % 1) * 100);
  let paiseStr = "";
  if (paise > 0) {
    paiseStr = " and " + helper(paise) + " paise";
  }

  return "INR " + str + paiseStr + " Only";
}

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoice Generator — KSC SOFA ND CHAIR HOUSE" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const {
    parties,
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  } = useAppState();

  const getInvoiceBalanceDetails = (invoiceObj: Invoice) => {
    const party = parties.find((p) => p.id === invoiceObj.partyId);
    if (!party) {
      return {
        previousBalance: 0,
        currentBalance: invoiceObj.total,
      };
    }

    const ledgerBalance = party.entries.reduce((s, e) => s + (e.type === "debit" ? e.amount : -e.amount), 0);
    const isSavedInvoice = invoices.some((inv) => inv.id === invoiceObj.id);
    const isSynced = invoiceObj.syncToLedger && isSavedInvoice;

    if (isSynced) {
      const previous = ledgerBalance - invoiceObj.total;
      return {
        previousBalance: previous,
        currentBalance: ledgerBalance,
      };
    } else {
      return {
        previousBalance: ledgerBalance,
        currentBalance: ledgerBalance + invoiceObj.total,
      };
    }
  };

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("history");

  // Search & Filter State
  const [q, setQ] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Invoice Creator State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("manual");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [syncToLedger, setSyncToLedger] = useState(true);

  // New Item State (for adding rows to invoice)
  const [selectedFurniture, setSelectedFurniture] = useState<string>("manual");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");

  // View Modal State
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // WhatsApp Linkage State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);

  // Auto-calculated fields for creator
  const subtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }, [invoiceItems]);

  const discountVal = Number(discount) || 0;
  const cgstVal = 0;
  const sgstVal = 0;
  const totalBeforeRoundOff = subtotal - discountVal;
  const grandTotal = Math.round(Math.max(0, totalBeforeRoundOff));
  const roundOff = grandTotal - totalBeforeRoundOff;

  // Handle party (customer) selection change
  const handlePartyChange = (id: string) => {
    setSelectedPartyId(id);
    if (id === "manual") {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
    } else {
      const party = parties.find((p) => p.id === id);
      if (party) {
        setCustomerName(party.name);
        setCustomerPhone(party.phone);
        setCustomerAddress(party.address || "");
      }
    }
  };

  // Handle furniture selection change
  const handleFurnitureChange = (value: string) => {
    setSelectedFurniture(value);
    if (value !== "manual") {
      setItemName(value);
    } else {
      setItemName("");
    }
  };



  // Add item to invoice rows
  const handleAddItem = () => {
    if (!itemName.trim()) return toast.error("Enter item description");
    const qty = Number(itemQty);
    const price = Number(itemPrice);
    if (!qty || qty <= 0) return toast.error("Enter valid quantity");
    if (!price || price <= 0) return toast.error("Enter valid price");

    const newItem: InvoiceItem = {
      id: `ii-${Date.now()}`,
      name: itemName,
      quantity: qty,
      price: price
    };

    setInvoiceItems((prev) => [...prev, newItem]);
    setItemName("");
    setItemQty("1");
    setItemPrice("");
    setSelectedFurniture("manual");
    toast.success("Item added to list");
  };

  // Remove item from invoice rows
  const handleRemoveItem = (itemId: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Save Invoice (Create or Update)
  const handleSaveInvoice = async () => {
    if (!customerName.trim()) return toast.error("Customer name required");
    if (invoiceItems.length === 0) return toast.error("Add at least one item to invoice");

    const invoiceData = {
      date: invoiceDate,
      customerName,
      customerPhone,
      customerAddress,
      items: invoiceItems,
      discount: discountVal,
      total: grandTotal,
      notes: notes.trim() || undefined,
      partyId: selectedPartyId !== "manual" ? selectedPartyId : undefined,
    };

    try {
      if (editingId) {
        // Find original to get internal ledger entry references if they exist
        const original = invoices.find((inv) => inv.id === editingId);
        const updatedInvoice: Invoice = {
          ...invoiceData,
          id: editingId,
          ledgerEntryId: original?.ledgerEntryId,
        };
        await updateInvoice(editingId, updatedInvoice, syncToLedger);
        toast.success(`Invoice ${editingId} updated successfully`);
        setEditingId(null);
      } else {
        const newId = await addInvoice(invoiceData, syncToLedger);
        toast.success(`Invoice ${newId} generated successfully`);
      }

      // Reset Form
      handleResetForm();
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    }
  };

  // Reset Form State
  const handleResetForm = () => {
    setEditingId(null);
    setSelectedPartyId("manual");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceItems([]);
    setDiscount("");
    setNotes("");
    setSyncToLedger(true);
    setItemName("");
    setItemQty("1");
    setItemPrice("");
    setSelectedFurniture("manual");
  };

  // Load Invoice for Edit
  const handleEditInvoice = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setSelectedPartyId(invoice.partyId || "manual");
    setCustomerName(invoice.customerName);
    setCustomerPhone(invoice.customerPhone);
    setCustomerAddress(invoice.customerAddress);
    setInvoiceDate(invoice.date);
    setInvoiceItems(invoice.items);
    setDiscount(invoice.discount > 0 ? String(invoice.discount) : "");
    setNotes(invoice.notes || "");
    setSyncToLedger(!!invoice.syncToLedger);
    setActiveTab("create");
    toast.info(`Editing invoice ${invoice.id}`);
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete invoice ${id}? This will also remove any synced ledger entry.`)) {
      try {
        await deleteInvoice(id);
        toast.success(`Invoice ${id} deleted`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete invoice");
      }
    }
  };

  // Filtered Invoices for History Tab
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchQuery =
        !q ||
        inv.id.toLowerCase().includes(q.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(q.toLowerCase()) ||
        inv.customerPhone.includes(q);
      const matchDate = !filterDate || inv.date === filterDate;
      return matchQuery && matchDate;
    });
  }, [invoices, q, filterDate]);  // Open native browser print window
  const handlePrint = (invoice: Invoice) => {
    // Clean up any existing print elements from previous runs
    const oldContainer = document.getElementById("print-section");
    if (oldContainer) oldContainer.remove();
    const oldStyle = document.getElementById("print-media-style");
    if (oldStyle) oldStyle.remove();

    const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.price, 0);
    const totalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);
    const discount = invoice.discount || 0;
    const cgst = 0;
    const sgst = 0;
    const totalBeforeRoundOff = subtotal - discount;
    const grandTotal = Math.round(totalBeforeRoundOff);
    const roundOff = grandTotal - totalBeforeRoundOff;
    const { previousBalance, currentBalance } = getInvoiceBalanceDetails(invoice);

    const getItemUnit = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes("mtr") || n.includes("fabric") || n.includes("lace") || n.includes("curtain")) return "";
      return "PCS";
    };

    const formatQty = (qty: number, unit: string) => {
      if (unit === "PCS") return qty.toString();
      return qty.toFixed(2);
    };

    const hasMtr = invoice.items.some(item => getItemUnit(item.name) === "");
    const formattedTotalQty = hasMtr ? totalQty.toFixed(2) : totalQty.toString();

    const itemsRowsHtml = invoice.items
      .map((item, idx) => {
        const unit = getItemUnit(item.name);
        return `
          <tr style="font-size: 11px; vertical-align: top;">
            <td style="border-right: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
            <td style="border-right: 1px solid #000; padding: 4px; font-weight: bold;">${item.name}</td>
            <td style="border-right: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${formatQty(item.quantity, unit)}${unit ? ' ' + unit : ''}</td>
            <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${item.price.toFixed(2)}</td>
            <td style="padding: 4px; text-align: right; font-weight: bold;">${(item.quantity * item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      })
      .join("");

    const formatRupees = (val: number) => {
      return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const qrData = encodeURIComponent(`upi://pay?pa=08600200007446@BARB0NANDED.ifsc.npci&pn=KSC%20sofa%20and%20chair%20house&am=${grandTotal}&tn=Invoice%20${invoice.id}`);

    const printContainer = document.createElement("div");
    printContainer.id = "print-section";

    printContainer.innerHTML = `
      <div style="font-family: sans-serif; font-size: 11px; color: #000; width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #000; box-sizing: border-box; background: white;">
        
        <!-- Header -->
        <div style="text-align: center; font-weight: bold; border-bottom: 1px solid #000; padding: 6px 0; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">
          Invoice
        </div>

        <!-- Supplier & Invoice details -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
          <tr>
            <!-- Supplier Details -->
            <td style="width: 50%; border-right: 1px solid #000; vertical-align: top; padding: 8px;">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <div style="flex-shrink: 0; text-align: center; border: 1px solid #000; padding: 4px; border-radius: 4px; background-color: #fff; width: 65px; height: 65px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
                  <img src="/assets/logo.png" alt="KSC Logo" style="display: block; max-width: 100%; max-height: 100%; object-fit: contain;" />
                </div>
                <div>
                  <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">KSC SOFA AND CHAIR HOUSE</div>
                  <div style="font-size: 9px; line-height: 1.3; margin-top: 2px;">
                    MALTEKDI RAILWAY STATION ROAD,<br/>
                    NEAR RAILWAY UNDER BRIDGE, MAHBOOB NAGAR ROAD,<br/>
                    NANDED, MAHARASHTRA - 431601<br/>
                    State Name: Maharashtra, Code: 27<br/>
                    Contact: 9028887909
                  </div>
                </div>
              </div>
            </td>

            <!-- Invoice Details -->
            <td style="width: 50%; vertical-align: top; padding: 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #000;">
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Invoice No.</div>
                    <div style="font-weight: bold; font-size: 10px;">${invoice.id}</div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Dated</div>
                    <div style="font-weight: bold; font-size: 10px;">${invoice.date}</div>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #000;">
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Delivery Note</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Mode/Terms of Payment</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #000;">
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Supplier's Ref.</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Other Reference(s)</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #000;">
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Buyer's Order No.</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Dated</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #000;">
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Dispatch Doc No.</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Delivery Note Date</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                    <div style="font-size: 8px; color: #555;">Dispatched through</div>
                    <div style="font-weight: bold; font-size: 10px;"></div>
                  </td>
                  <td style="width: 50%; padding: 4px; vertical-align: top;">
                    <div style="font-size: 8px; color: #555;">Destination</div>
                    <div style="font-weight: bold; font-size: 10px;">${invoice.customerAddress ? "NANDED" : ""}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Buyer details -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; vertical-align: top; padding: 6px; min-height: 80px;">
              <div style="font-size: 8px; color: #555;">Buyer (Bill to)</div>
              <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; marginTop: 2px;">
                ${invoice.customerName || "Walk-in Customer"}
              </div>
              <div style="font-size: 9px; line-height: 1.3; margin-top: 2px;">
                ${invoice.customerAddress || "Nanded"}
                ${invoice.customerPhone ? `<br/>Mob: ${invoice.customerPhone}` : ""}
              </div>
              <div style="font-size: 9px; margin-top: 4px;">
                State Name: Maharashtra, Code: 27
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding: 6px; display: flex; flex-direction: column; justify-content: flex-end;">
              <div style="font-size: 9px; margin-bottom: 4px;">
                Place of Supply: Maharashtra
              </div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 8px; text-transform: uppercase; font-weight: bold; text-align: center; background-color: #f9f9f9;">
              <th style="width: 5%; border-right: 1px solid #000; padding: 4px;">Sl No.</th>
              <th style="width: 63%; border-right: 1px solid #000; padding: 4px; text-align: left;">Description of Goods</th>
              <th style="width: 12%; border-right: 1px solid #000; padding: 4px; text-align: right;">Quantity</th>
              <th style="width: 10%; border-right: 1px solid #000; padding: 4px; text-align: right;">Rate</th>
              <th style="width: 10%; padding: 4px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            <tr style="font-size: 10px; vertical-align: top;">
              <td style="border-right: 1px solid #000; padding: 4px; height: 110px;"></td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; font-style: italic;">
                <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100%; min-height: 90px; padding-bottom: 4px; line-height: 1.6;">
                  ${discount > 0 ? "<div>LESS: DISCOUNT</div>" : ""}
                  <div>ROUND OFF</div>
                </div>
              </td>
              <td style="border-right: 1px solid #000; padding: 4px;"></td>
              <td style="border-right: 1px solid #000; padding: 4px;"></td>
              <td style="padding: 4px; text-align: right; font-weight: bold;">
                <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100%; min-height: 90px; padding-bottom: 4px; line-height: 1.6;">
                  ${discount > 0 ? `<div style="color: #ef4444;">(-)${formatRupees(discount)}</div>` : ""}
                  <div>${roundOff >= 0 ? "" : "(-)"}${Math.abs(roundOff).toFixed(2)}</div>
                </div>
              </td>
            </tr>
            <tr style="border-top: 1px solid #000; font-size: 10px; font-weight: bold; backgroundColor: #f9f9f9;">
              <td style="border-right: 1px solid #000; padding: 4px;"></td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">Total</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${formattedTotalQty}</td>
              <td style="border-right: 1px solid #000; padding: 4px;"></td>
              <td style="padding: 4px; text-align: right; font-size: 11px; font-weight: 900;">₹ ${formatRupees(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Words and Balance details -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000; font-size: 10px;">
          <tr>
            <td style="padding: 6px; vertical-align: top;">
              <div style="color: #555; fontSize: 8px;">Amount Chargeable (in words)</div>
              <div style="font-weight: bold; margin-top: 2px; fontSize: 10px; text-transform: capitalize;">
                ${numberToWords(grandTotal)}
              </div>
            </td>
            <td style="width: 35%; border-left: 1px solid #000; padding: 6px; vertical-align: top; text-align: right;">
            </td>
          </tr>
        </table>

        <!-- Bank Details & Balance breakdown -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000; font-size: 10px;">
          <tr>
            <td style="width: 55%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                <div>
                  <div style="font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 1px; margin-bottom: 3px;">Company's Bank Details</div>
                  <div>Bank Name: &nbsp; &nbsp; &nbsp; &nbsp; <strong style="font-weight: bold;">Bank of Baroda</strong></div>
                  <div>A/c Name: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong style="font-weight: bold;">KSC sofa and chair house</strong></div>
                  <div>A/c No.: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<strong style="font-weight: bold;">08600200007446</strong></div>
                  <div>Branch & IFS Code: <strong style="font-weight: bold;">NANDED & BARB0NANDED</strong></div>
                </div>
              </div>
            </td>
            <td style="width: 45%; padding: 6px; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <tr>
                  <td style="padding: 1px 0; color: #555;">Party Previous Balance</td>
                  <td style="text-align: right; padding: 1px 0;">:</td>
                  <td style="text-align: right; padding: 1px 0; font-weight: bold;">${formatRupees(previousBalance)}</td>
                </tr>
                <tr>
                  <td style="padding: 1px 0; color: #555;">Current Bill</td>
                  <td style="text-align: right; padding: 1px 0;">:</td>
                  <td style="text-align: right; padding: 1px 0; font-weight: bold;">${formatRupees(grandTotal)}</td>
                </tr>
                <tr style="border-top: 1px solid #000;">
                  <td style="padding: 3px 0; font-weight: bold;">Total Amount</td>
                  <td style="text-align: right; padding: 3px 0;">:</td>
                  <td style="text-align: right; padding: 3px 0; font-weight: 900; font-size: 11px;">${formatRupees(currentBalance)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; font-size: 10px; height: 65px;">
          <tr>
            <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
              <div style="color: #555; fontSize: 8px;">Customer's Seal and Signature</div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top; text-align: right;">
              <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 55px;">
                <div style="font-style: italic; font-size: 9px;">for KSC SOFA AND CHAIR HOUSE</div>
                <div style="font-weight: bold; fontSize: 10px; padding-top: 25px;">Authorised Signatory</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Computer generated notice -->
        <div style="border-top: 1px solid #000; text-align: center; padding: 3px 0; font-size: 8px; color: #555; background-color: #f9f9f9;">
          This is a Computer Generated Invoice
        </div>

      </div>
    `;

    const styleEl = document.createElement("style");
    styleEl.id = "print-media-style";
    styleEl.innerHTML = `
      #print-section {
        display: none;
      }
      body.printing-active > *:not(#print-section) {
        display: none !important;
      }
      body.printing-active #print-section {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: white;
        z-index: 999999;
        padding: 0;
      }
    `;

    document.head.appendChild(styleEl);
    document.body.appendChild(printContainer);

    // Force style recalculation/reflow before printing
    printContainer.offsetHeight;

    // Apply active printing class directly to body
    document.body.classList.add("printing-active");

    const cleanup = () => {
      document.body.classList.remove("printing-active");
      const el = document.getElementById("print-section");
      if (el) el.remove();
      const st = document.getElementById("print-media-style");
      if (st) st.remove();
    };

    // Use a delayed cleanup of 3 seconds. This keeps the document styled for print on the screen
    // so that the asynchronous print preview capture on mobile can fetch the perfect styled layout,
    // and then cleanly restores the original screen view.
    setTimeout(cleanup, 3000);

    // Trigger browser print
    window.print();
  };

  // WhatsApp Web share URL trigger
  const handleShareWhatsApp = async (invoice: Invoice) => {
    const toastId = toast.loading("Generating Invoice PDF...");
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;

      // 1. Build the HTML content
      const subtotal = invoice.items.reduce((s, i) => s + i.quantity * i.price, 0);
      const totalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);
      const discount = invoice.discount || 0;
      const cgst = 0;
      const sgst = 0;
      const totalBeforeRoundOff = subtotal - discount;
      const grandTotal = Math.round(totalBeforeRoundOff);
      const roundOff = grandTotal - totalBeforeRoundOff;
      const { previousBalance, currentBalance } = getInvoiceBalanceDetails(invoice);

      const getItemUnit = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("mtr") || n.includes("fabric") || n.includes("lace") || n.includes("curtain")) return "";
        return "PCS";
      };

      const formatQty = (qty: number, unit: string) => {
        if (unit === "PCS") return qty.toString();
        return qty.toFixed(2);
      };

      const hasMtr = invoice.items.some(item => getItemUnit(item.name) === "");
      const formattedTotalQty = hasMtr ? totalQty.toFixed(2) : totalQty.toString();

      const itemsHtml = invoice.items
        .map((item, idx) => {
          const unit = getItemUnit(item.name);
          return `
            <tr style="font-size: 11px; vertical-align: top;">
              <td style="border-right: 1px solid #000; padding: 4px; text-align: center; border-bottom: 1px solid #000;">${idx + 1}</td>
              <td style="border-right: 1px solid #000; padding: 4px; font-weight: bold; border-bottom: 1px solid #000;">${item.name}</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; border-bottom: 1px solid #000;">${formatQty(item.quantity, unit)}${unit ? ' ' + unit : ''}</td>
              <td style="border-right: 1px solid #000; padding: 4px; text-align: right; border-bottom: 1px solid #000;">${item.price.toFixed(2)}</td>
              <td style="padding: 4px; text-align: right; font-weight: bold; border-bottom: 1px solid #000;">${(item.quantity * item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        })
        .join("");

      const formatRupees = (val: number) => {
        return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const qrData = encodeURIComponent(`upi://pay?pa=08600200007446@BARB0NANDED.ifsc.npci&pn=KSC%20sofa%20and%20chair%20house&am=${grandTotal}&tn=Invoice%20${invoice.id}`);

      const htmlContent = `
        <div style="width: 800px; margin: auto; background: #ffffff; font-family: sans-serif; color: #000; line-height: 1.5; padding: 20px;">
          <div style="border: 1px solid #000; box-sizing: border-box;">
            <div style="text-align: center; font-weight: bold; border-bottom: 1px solid #000; padding: 6px 0; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Invoice</div>
            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
              <tr>
                <td style="width: 50%; border-right: 1px solid #000; vertical-align: top; padding: 8px;">
                  <div style="display: flex; gap: 10px; align-items: flex-start;">
                    <div style="flex-shrink: 0; text-align: center; border: 1px solid #000; padding: 4px; border-radius: 4px; background-color: #fff; width: 65px; height: 65px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
                      <img src="/assets/logo.png" alt="KSC Logo" style="display: block; max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </div>
                    <div>
                      <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">KSC SOFA AND CHAIR HOUSE</div>
                      <div style="font-size: 9px; line-height: 1.3; margin-top: 2px;">
                        MALTEKDI RAILWAY STATION ROAD,<br/>
                        NEAR RAILWAY UNDER BRIDGE, MAHBOOB NAGAR ROAD,<br/>
                        NANDED, MAHARASHTRA - 431601<br/>
                        State Name: Maharashtra, Code: 27<br/>
                        Contact: 9028887909
                      </div>
                    </div>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding: 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Invoice No.</div>
                        <div style="font-weight: bold; font-size: 10px;">${invoice.id}</div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Dated</div>
                        <div style="font-weight: bold; font-size: 10px;">${invoice.date}</div>
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Delivery Note</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Mode/Terms of Payment</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Supplier's Ref.</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Other Reference(s)</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Buyer's Order No.</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Dated</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Dispatch Doc No.</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Delivery Note Date</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="width: 50%; border-right: 1px solid #000; padding: 4px; vertical-align: top; height: 35px;">
                        <div style="font-size: 8px; color: #555;">Dispatched through</div>
                        <div style="font-weight: bold; font-size: 10px;"></div>
                      </td>
                      <td style="width: 50%; padding: 4px; vertical-align: top;">
                        <div style="font-size: 8px; color: #555;">Destination</div>
                        <div style="font-weight: bold; font-size: 10px;">${invoice.customerAddress ? "NANDED" : ""}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
              <tr>
                <td style="width: 50%; border-right: 1px solid #000; vertical-align: top; padding: 6px; min-height: 80px;">
                  <div style="font-size: 8px; color: #555;">Buyer (Bill to)</div>
                  <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; marginTop: 2px;">
                    ${invoice.customerName || "Walk-in Customer"}
                  </div>
                  <div style="font-size: 9px; line-height: 1.3; margin-top: 2px;">
                    ${invoice.customerAddress || "Nanded"}
                    ${invoice.customerPhone ? `<br/>Mob: ${invoice.customerPhone}` : ""}
                  </div>
                  <div style="font-size: 9px; margin-top: 4px;">State Name: Maharashtra, Code: 27</div>
                </td>
                <td style="width: 50%; vertical-align: top; padding: 6px; display: flex; flex-direction: column; justify-content: flex-end;">
                  <div style="font-size: 9px; margin-bottom: 4px;">Place of Supply: Maharashtra</div>
                </td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000;">
              <thead>
                <tr style="border-bottom: 1px solid #000; font-size: 8px; text-transform: uppercase; font-weight: bold; text-align: center; background-color: #f9f9f9;">
                  <th style="width: 5%; border-right: 1px solid #000; padding: 4px;">Sl No.</th>
                  <th style="width: 63%; border-right: 1px solid #000; padding: 4px; text-align: left;">Description of Goods</th>
                  <th style="width: 12%; border-right: 1px solid #000; padding: 4px; text-align: right;">Quantity</th>
                  <th style="width: 10%; border-right: 1px solid #000; padding: 4px; text-align: right;">Rate</th>
                  <th style="width: 10%; padding: 4px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr style="font-size: 10px; vertical-align: top;">
                  <td style="border-right: 1px solid #000; padding: 4px; height: 110px;"></td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; font-style: italic;">
                    <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100%; min-height: 90px; padding-bottom: 4px; line-height: 1.6;">
                      ${discount > 0 ? "<div>LESS: DISCOUNT</div>" : ""}
                      <div>ROUND OFF</div>
                    </div>
                  </td>
                  <td style="border-right: 1px solid #000; padding: 4px;"></td>
                  <td style="border-right: 1px solid #000; padding: 4px;"></td>
                  <td style="padding: 4px; text-align: right; font-weight: bold;">
                    <div style="display: flex; flex-direction: column; justify-content: flex-end; height: 100%; min-height: 90px; padding-bottom: 4px; line-height: 1.6;">
                      ${discount > 0 ? `<div style="color: #ef4444;">(-)${formatRupees(discount)}</div>` : ""}
                      <div>${roundOff >= 0 ? "" : "(-)"}${Math.abs(roundOff).toFixed(2)}</div>
                    </div>
                  </td>
                </tr>
                <tr style="border-top: 1px solid #000; font-size: 10px; font-weight: bold; backgroundColor: #f9f9f9;">
                  <td style="border-right: 1px solid #000; padding: 4px;"></td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">Total</td>
                  <td style="border-right: 1px solid #000; padding: 4px; text-align: right;">${formattedTotalQty}</td>
                  <td style="border-right: 1px solid #000; padding: 4px;"></td>
                  <td style="padding: 4px; text-align: right; font-size: 11px; font-weight: 900;">₹ ${formatRupees(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000; font-size: 10px;">
              <tr>
                <td style="padding: 6px; vertical-align: top;">
                  <div style="color: #555; fontSize: 8px;">Amount Chargeable (in words)</div>
                  <div style="font-weight: bold; margin-top: 2px; fontSize: 10px; text-transform: capitalize;">${numberToWords(grandTotal)}</div>
                </td>
                <td style="width: 35%; border-left: 1px solid #000; padding: 6px; vertical-align: top; text-align: right;">
                </td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #000; font-size: 10px;">
              <tr>
                <td style="width: 55%; border-right: 1px solid #000; padding: 6px; vertical-align: top;">
                  <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <div>
                      <div style="font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 1px; margin-bottom: 3px;">Company's Bank Details</div>
                      <div>Bank Name: &nbsp; &nbsp; &nbsp; &nbsp; <strong style="font-weight: bold;">Bank of Baroda</strong></div>
                      <div>A/c Name: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong style="font-weight: bold;">KSC sofa and chair house</strong></div>
                      <div>A/c No.: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<strong style="font-weight: bold;">08600200007446</strong></div>
                      <div>Branch & IFS Code: <strong style="font-weight: bold;">NANDED & BARB0NANDED</strong></div>
                    </div>
                  </div>
                </td>
                <td style="width: 45%; padding: 6px; vertical-align: top;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <tr><td style="padding: 1px 0; color: #555;">Party Previous Balance</td><td style="text-align: right; padding: 1px 0;">:</td><td style="text-align: right; padding: 1px 0; font-weight: bold;">${formatRupees(previousBalance)}</td></tr>
                    <tr><td style="padding: 1px 0; color: #555;">Current Bill</td><td style="text-align: right; padding: 1px 0;">:</td><td style="text-align: right; padding: 1px 0; font-weight: bold;">${formatRupees(grandTotal)}</td></tr>
                    <tr style="border-top: 1px solid #000;"><td style="padding: 3px 0; font-weight: bold;">Total Amount</td><td style="text-align: right; padding: 3px 0;">:</td><td style="text-align: right; padding: 3px 0; font-weight: 900; font-size: 11px;">${formatRupees(currentBalance)}</td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000; font-size: 10px; height: 65px;">
              <tr>
                <td style="width: 50%; border-right: 1px solid #000; padding: 6px; vertical-align: top;"><div style="color: #555; fontSize: 8px;">Customer's Seal and Signature</div></td>
                <td style="width: 50%; padding: 6px; vertical-align: top; text-align: right;">
                  <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 55px;">
                    <div style="font-style: italic; font-size: 9px;">for KSC SOFA AND CHAIR HOUSE</div>
                    <div style="font-weight: bold; fontSize: 10px; padding-top: 25px;">Authorised Signatory</div>
                  </div>
                </td>
              </tr>
            </table>
            <div style="border-top: 1px solid #000; text-align: center; padding: 3px 0; font-size: 8px; color: #555; background-color: #f9f9f9;">This is a Computer Generated Invoice</div>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Invoice-${invoice.id}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.90 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 800,
          width: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      const pdfBlob = await html2pdf().from(htmlContent).set(opt).outputPdf('blob');
      const fileName = `Invoice-${invoice.id}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      let sharedLocally = false;
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: fileName,
            text: `Invoice #${invoice.id} from KSC SOFA AND CHAIR HOUSE`
          });
          sharedLocally = true;
          toast.success("Invoice shared successfully!", { id: toastId });
          return;
        } catch (shareErr) {
          console.log("Share failed, falling back.", shareErr);
        }
      }

      if (!sharedLocally) {
        const fileURL = window.URL.createObjectURL(pdfBlob);
        const fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.setAttribute('download', fileName);
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();

        const blobToBase64 = (blob: Blob): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };
        const base64Data = await blobToBase64(pdfBlob);

        toast.loading("Uploading PDF to server...", { id: toastId });

        const uploadResult = await apiService.uploadInvoicePdf(fileName, base64Data, invoice.customerPhone, "", false);
        let cleanedPhone = (invoice.customerPhone || "").replace(/[^0-9]/g, "");
        if (cleanedPhone.length === 10) cleanedPhone = "91" + cleanedPhone;

        const shareText = `Dear ${invoice.customerName}, thank you for choosing KSC SOFA AND CHAIR HOUSE. Here is your invoice: ${uploadResult.absoluteUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank");

        toast.success("PDF downloaded!", { id: toastId, duration: 7000 });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send PDF.", { id: toastId });
    }
  };

  useEffect(() => {
    if (!qrModalOpen) return;
    let isSubscribed = true;
    const checkStatus = async () => {
      try {
        const status = await apiService.getWhatsAppStatus();
        if (!isSubscribed) return;
        setQrCodeUrl(status.qr);
        if (status.connected) {
          setQrModalOpen(false);
          toast.success("WhatsApp connected!");
          if (pendingInvoice) {
            handleShareWhatsApp(pendingInvoice);
            setPendingInvoice(null);
          }
        }
      } catch (err) { console.error(err); }
    };
    checkStatus();
    const intervalId = setInterval(checkStatus, 3000);
    return () => { isSubscribed = false; clearInterval(intervalId); };
  }, [qrModalOpen, pendingInvoice]);

  const handleShareEmail = (invoice: Invoice) => {
    const subject = encodeURIComponent(`Invoice ${invoice.id} from KSC SOFA AND CHAIR HOUSE`);
    const body = encodeURIComponent(
      `Dear ${invoice.customerName},\n\n` +
      `Thank you for shopping at KSC SOFA AND CHAIR HOUSE. Here is your invoice summary:\n\n` +
      `Invoice #: ${invoice.id}\n` +
      `Date: ${invoice.date}\n` +
      `Grand Total: ₹${invoice.total.toLocaleString("en-IN")}\n\n` +
      `Notes: ${invoice.notes || "None"}\n\n` +
      `Best regards,\nKSC SOFA AND CHAIR HOUSE`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Generator"
        subtitle="Create, print, download, and manage professional invoices for your furniture shop."
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "create" && !editingId) handleResetForm(); }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> Invoice History
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-1">
            {editingId ? <><FileEdit className="h-4 w-4" /> Edit Invoice ({editingId})</> : <><Plus className="h-4 w-4" /> Create Invoice</>}
          </TabsTrigger>
        </TabsList>

        {/* INVOICE HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif">Invoice Ledger</CardTitle>
              <CardDescription>Search and filter previously generated invoices.</CardDescription>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice number, customer..."
                    className="pl-9"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <div className="relative w-full sm:w-[200px]">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                {(q || filterDate) && (
                  <Button variant="ghost" onClick={() => { setQ(""); setFilterDate(""); }} className="text-xs">
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Ledger Sync</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-bold text-slate-800">{inv.id}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                        <TableCell className="font-medium">{inv.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.customerPhone || "—"}</TableCell>
                        <TableCell className="text-right font-serif font-bold text-slate-900">{formatINR(inv.total)}</TableCell>
                        <TableCell>
                          {inv.syncToLedger ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex w-fit items-center gap-1">
                              <Check className="h-3 w-3" /> Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Off</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => setPreviewInvoice(inv)}
                              title="Preview Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleEditInvoice(inv)}
                              title="Edit Invoice"
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={() => handlePrint(inv)}
                              title="Print / Save PDF"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/5"
                              onClick={() => handleDeleteInvoice(inv.id)}
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Receipt className="mx-auto h-12 w-12 opacity-20 mb-2" />
                          <p>No invoices found matching criteria.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREATE INVOICE TAB */}
        <TabsContent value="create" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Customer Details</CardTitle>
                <CardDescription>Select an existing ledger customer or enter new details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="party-select">Khatabook Party Link</Label>
                    <Select value={selectedPartyId} onValueChange={handlePartyChange}>
                      <SelectTrigger id="party-select">
                        <SelectValue placeholder="Select Ledger Party" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Enter Details Manually</SelectItem>
                        {parties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.phone || "No phone"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invoice-date">Invoice Date</Label>
                    <Input
                      type="date"
                      id="invoice-date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-name" className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-muted-foreground" /> Customer Name</Label>
                    <Input
                      id="cust-name"
                      placeholder="e.g. Suresh Kumar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={selectedPartyId !== "manual"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> Mobile Number</Label>
                    <Input
                      id="cust-phone"
                      placeholder="e.g. +91 98989 00000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      disabled={selectedPartyId !== "manual"}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-addr" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Delivery Address</Label>
                  <Input
                    id="cust-addr"
                    placeholder="Enter customer's physical/billing address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Furniture Items Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Furniture Items</CardTitle>
                <CardDescription>Add furniture items and specify quantity and price.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Row inputs to add new item */}
                <div className="rounded-lg border bg-slate-50/50 p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-6 space-y-1.5">
                      <Label htmlFor="furniture-select">Furniture Product</Label>
                      <Select value={selectedFurniture} onValueChange={handleFurnitureChange}>
                        <SelectTrigger id="furniture-select">
                          <SelectValue placeholder="Select Furniture Item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Enter Manually</SelectItem>
                          {PREDEFINED_FURNITURE.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-6 space-y-1.5">
                      <Label htmlFor="item-desc">Item Description</Label>
                      <Input
                        id="item-desc"
                        placeholder="e.g. Solid Wood Sheesham Sofa Set"
                        value={itemName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemName(val);
                          if (!PREDEFINED_FURNITURE.includes(val)) {
                            setSelectedFurniture("manual");
                          } else {
                            setSelectedFurniture(val);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
                    <div className="sm:col-span-4 space-y-1.5">
                      <Label htmlFor="item-qty">Quantity</Label>
                      <Input
                        type="number"
                        id="item-qty"
                        placeholder="1"
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="sm:col-span-5 space-y-1.5">
                      <Label htmlFor="item-price">Unit Price (₹)</Label>
                      <Input
                        type="number"
                        id="item-price"
                        placeholder="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Button onClick={handleAddItem} className="w-full flex items-center justify-center gap-1.5">
                        <Plus className="h-4 w-4" /> Add Row
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Table of added items */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow>
                        <TableHead>Item Details</TableHead>
                        <TableHead className="w-[80px] text-right">Qty</TableHead>
                        <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatINR(item.price)}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {formatINR(item.quantity * item.price)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/5"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {invoiceItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                            No items added to invoice yet. Add an item above to populate the ledger.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing breakdown summary */}
          <div className="space-y-6">
            <Card className="border-slate-300 shadow-sm bg-slate-50/30">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <CardTitle className="font-serif text-xl">Invoice Summary</CardTitle>
                <CardDescription>Check calculated invoice totals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatINR(subtotal)}</span>
                  </div>



                  <div className="space-y-1.5">
                    <Label htmlFor="disc-input" className="text-xs text-muted-foreground">Apply Cash Discount (₹)</Label>
                    <Input
                      type="number"
                      id="disc-input"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      min="0"
                      className="bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Round Off:</span>
                    <span className="font-semibold text-slate-800">{roundOff >= 0 ? "+" : ""}{roundOff.toFixed(2)}</span>
                  </div>

                  <div className="border-t pt-3.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Grand Total:</span>
                    <span className="font-serif text-2xl font-black text-slate-900">{formatINR(grandTotal)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inv-notes" className="text-xs">Invoice Notes (Prints on PDF)</Label>
                  <Textarea
                    id="inv-notes"
                    placeholder="Enter any warranty details, delivery notes or payment terms here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white h-20"
                  />
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sync-ledger-chk"
                      checked={syncToLedger}
                      onChange={(e) => setSyncToLedger(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="sync-ledger-chk" className="font-medium text-slate-800 cursor-pointer flex items-center gap-1.5">
                      Sync with Khatabook Ledger
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                    When enabled, this invoice total of <strong>{formatINR(grandTotal)}</strong> will automatically record as a debit entry in <strong>{customerName || "the customer's"}</strong> ledger account.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleSaveInvoice} size="lg" className="w-full font-semibold">
                    {editingId ? "Update Invoice" : "Generate & Save Invoice"}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={handleResetForm} className="w-full">
                      Cancel Editing
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* INVOICE PREVIEW MODAL */}
      <Dialog open={previewInvoice !== null} onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-slate-300">
          {previewInvoice && (
            <>
              <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <DialogTitle className="font-serif text-xl flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-indigo-600" /> Invoice {previewInvoice.id}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">Generated on {previewInvoice.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start">
                    <Button
                      onClick={() => handlePrint(previewInvoice)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-slate-700 border-slate-300"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                    </Button>
                    <Button
                      onClick={() => handleShareWhatsApp(previewInvoice)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                    </Button>
                    <Button
                      onClick={() => handleShareEmail(previewInvoice)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-sky-700 border-sky-200 hover:bg-sky-50"
                    >
                      <Mail className="h-3.5 w-3.5 text-sky-500" /> Email
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Styled Invoice Layout (A4 format preview) */}
              <div className="p-4 bg-white text-black font-sans leading-normal text-xs" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>

                {/* Outer Invoice Box */}
                <div style={{ border: '1px solid #000', boxSizing: 'border-box' }}>

                  {/*Invoice Header */}
                  <div style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #000', padding: '6px 0', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>
                    Invoice
                  </div>

                  {/* Seller & Invoice Details Grid */}
                  <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #000' }}>

                    {/* Left Column: Seller Details */}
                    <div style={{ borderRight: '1px solid #000', padding: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {/* Logo Container */}
                      <div style={{ flexShrink: 0, textAlign: 'center', border: '1px solid #000', padding: '4px', borderRadius: '4px', backgroundColor: '#fff', width: '65px', height: '65px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/assets/logo.png" alt="KSC Logo" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>

                      {/* Company Info */}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#000' }}>KSC SOFA AND CHAIR HOUSE</div>
                        <div style={{ fontSize: '9px', lineHeight: '1.3', marginTop: '2px', color: '#000' }}>
                          MALTEKDI RAILWAY STATION ROAD,<br />
                          NEAR RAILWAY UNDER BRIDGE, MAHBOOB NAGAR ROAD,<br />
                          NANDED, MAHARASHTRA - 431601<br />
                          State Name: Maharashtra, Code: 27<br />
                          Contact: 9028887909
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Invoice Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 0 }}>
                      <div style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Invoice No.</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{previewInvoice.id}</div>
                      </div>
                      <div style={{ borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Dated</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{previewInvoice.date}</div>
                      </div>
                      <div style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Delivery Note</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Mode/Terms of Payment</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Supplier's Ref.</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Other Reference(s)</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Buyer's Order No.</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Dated</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Dispatch Doc No.</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderBottom: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Delivery Note Date</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ borderRight: '1px solid #000', padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Dispatched through</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}></div>
                      </div>
                      <div style={{ padding: '4px', minHeight: '35px' }}>
                        <div style={{ fontSize: '8px', color: '#555' }}>Destination</div>
                        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{previewInvoice.customerAddress ? "NANDED" : ""}</div>
                      </div>
                    </div>
                  </div>

                  {/* Buyer & Place of Supply */}
                  <div className="grid grid-cols-2" style={{ borderBottom: '1px solid #000', minHeight: '80px' }}>
                    <div style={{ borderRight: '1px solid #000', padding: '6px' }}>
                      <div style={{ fontSize: '8px', color: '#555' }}>Buyer (Bill to)</div>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', marginTop: '2px' }}>
                        {previewInvoice.customerName || "Walk-in Customer"}
                      </div>
                      <div style={{ fontSize: '9px', lineHeight: '1.3', marginTop: '2px' }}>
                        {previewInvoice.customerAddress || "Nanded"}
                        {previewInvoice.customerPhone && <><br />Mob: {previewInvoice.customerPhone}</>}
                      </div>
                      <div style={{ fontSize: '9px', marginTop: '4px' }}>
                        State Name: Maharashtra, Code: 27
                      </div>
                    </div>
                    <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '9px', marginBottom: '4px' }}>
                        Place of Supply: Maharashtra
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000', fontSize: '8px', textTransform: 'uppercase', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                        <th style={{ width: '5%', borderRight: '1px solid #000', padding: '4px' }}>Sl No.</th>
                        <th style={{ width: '63%', borderRight: '1px solid #000', padding: '4px', textAlign: 'left' }}>Description of Goods</th>
                        <th style={{ width: '12%', borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>Quantity</th>
                        <th style={{ width: '10%', borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>Rate</th>
                        <th style={{ width: '10%', padding: '4px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Dynamically calculated values for existing previewInvoice */}
                      {(() => {
                        const subtotal = previewInvoice.items.reduce((s, i) => s + i.quantity * i.price, 0);
                        const totalQty = previewInvoice.items.reduce((s, i) => s + i.quantity, 0);
                        const discount = previewInvoice.discount || 0;
                        const cgst = 0;
                        const sgst = 0;
                        const totalBeforeRoundOff = subtotal - discount;
                        const grandTotal = Math.round(totalBeforeRoundOff);
                        const roundOff = grandTotal - totalBeforeRoundOff;

                        const getItemUnit = (name: string) => {
                          const n = name.toLowerCase();
                          if (n.includes("mtr") || n.includes("fabric") || n.includes("lace") || n.includes("curtain")) return "";
                          return "PCS";
                        };

                        const formatQty = (qty: number, unit: string) => {
                          if (unit === "PCS") return qty.toString();
                          return qty.toFixed(2);
                        };

                        const hasMtr = previewInvoice.items.some(item => getItemUnit(item.name) === "");
                        const formattedTotalQty = hasMtr ? totalQty.toFixed(2) : totalQty.toString();

                        return (
                          <>
                            {previewInvoice.items.map((item, idx) => {
                              const unit = getItemUnit(item.name);
                              return (
                                <tr key={item.id} style={{ fontSize: '10px', verticalAlign: 'top' }}>
                                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                                  <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{item.name}</td>
                                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{formatQty(item.quantity, unit)}{unit ? ' ' + unit : ''}</td>
                                  <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{item.price.toFixed(2)}</td>
                                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{formatINR(item.quantity * item.price)}</td>
                                </tr>
                              );
                            })}

                            {/* Discount, Round-Off inside Description of Goods */}
                            <tr style={{ fontSize: '10px', verticalAlign: 'top' }}>
                              <td style={{ borderRight: '1px solid #000', padding: '4px', height: '110px' }}></td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', fontStyle: 'italic' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: '90px', paddingBottom: '4px', lineHeight: '1.6' }}>
                                  {discount > 0 && <div>LESS: DISCOUNT</div>}
                                  <div>ROUND OFF</div>
                                </div>
                              </td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                              <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: '90px', paddingBottom: '4px', lineHeight: '1.6' }}>
                                  {discount > 0 && <div style={{ color: '#ef4444' }}>(-){formatINR(discount)}</div>}
                                  <div>{roundOff >= 0 ? "" : "(-)"}{Math.abs(roundOff).toFixed(2)}</div>
                                </div>
                              </td>
                            </tr>

                            {/* Total Row */}
                            <tr style={{ borderTop: '1px solid #000', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>Total</td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formattedTotalQty}</td>
                              <td style={{ borderRight: '1px solid #000', padding: '4px' }}></td>
                              <td style={{ padding: '4px', textAlign: 'right', fontSize: '11px', fontWeight: '900' }}>₹ {formatINR(grandTotal)}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>

                  {/* Words, Balance & E. & O.E. */}
                  {(() => {
                    const subtotal = previewInvoice.items.reduce((s, i) => s + i.quantity * i.price, 0);
                    const discount = previewInvoice.discount || 0;
                    const grandTotal = Math.round(subtotal - discount);
                    const { previousBalance, currentBalance } = getInvoiceBalanceDetails(previewInvoice);
                    
                    return (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000', fontSize: '10px' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '6px', verticalAlign: 'top' }}>
                                <div style={{ color: '#555', fontSize: '8px' }}>Amount Chargeable (in words)</div>
                                <div style={{ fontWeight: 'bold', marginTop: '2px', fontSize: '10px', textTransform: 'capitalize' }}>
                                  {numberToWords(grandTotal)}
                                </div>
                              </td>
                              <td style={{ width: '35%', borderLeft: '1px solid #000', padding: '6px', verticalAlign: 'top', textAlign: 'right' }}>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Bank Details & Signature Section */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000', fontSize: '10px' }}>
                          <tbody>
                            <tr>
                              {/* Bank Info Left */}
                              <td style={{ width: '55%', borderRight: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontWeight: 'bold', borderBottom: '1px dashed #000', paddingBottom: '1px', marginBottom: '3px' }}>Company's Bank Details</div>
                                    <div>Bank Name: &nbsp; &nbsp; &nbsp; &nbsp; <strong style={{ fontWeight: 'bold' }}>Bank of Baroda</strong></div>
                                    <div>A/c Name: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong style={{ fontWeight: 'bold' }}>KSC sofa and chair house</strong></div>
                                    <div>A/c No.: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<strong style={{ fontWeight: 'bold' }}>08600200007446</strong></div>
                                    <div>Branch & IFS Code: <strong style={{ fontWeight: 'bold' }}>NANDED & BARB0NANDED</strong></div>
                                  </div>
                                </div>
                              </td>

                              {/* Balance Details Right */}
                              <td style={{ width: '45%', padding: '6px', verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: '1px 0', color: '#555' }}>Party Previous Balance</td>
                                      <td style={{ textAlign: 'right', padding: '1px 0' }}>:</td>
                                      <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold' }}>{formatINR(previousBalance)}</td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: '1px 0', color: '#555' }}>Current Bill</td>
                                      <td style={{ textAlign: 'right', padding: '1px 0' }}>:</td>
                                      <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 'bold' }}>{formatINR(grandTotal)}</td>
                                    </tr>
                                    <tr style={{ borderTop: '1px solid #000' }}>
                                      <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Total Amount</td>
                                      <td style={{ textAlign: 'right', padding: '3px 0' }}>:</td>
                                      <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: '900', fontSize: '11px' }}>{formatINR(currentBalance)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Signatures */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000', fontSize: '10px', height: '65px' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '50%', borderRight: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                                <div style={{ color: '#555', fontSize: '8px' }}>Customer's Seal and Signature</div>
                              </td>
                              <td style={{ width: '50%', padding: '6px', verticalAlign: 'top', textAlign: 'right', height: '65px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '55px' }}>
                                  <div style={{ fontStyle: 'italic', fontSize: '9px' }}>for KSC SOFA AND CHAIR HOUSE</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Authorised Signatory</div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    );
                  })()}

                  {/* Computer Generated Notice */}
                  <div style={{ borderTop: '1px solid #000', textAlign: 'center', padding: '3px 0', fontSize: '8px', color: '#555', backgroundColor: '#f9f9f9' }}>
                    This is a Computer Generated Invoice
                  </div>

                </div>

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* WHATSAPP CONNECTION MODAL */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md p-6 border-slate-300">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl font-serif">
              <MessageCircle className="h-6 w-6 text-emerald-600" /> Link WhatsApp
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Scan this barcode/QR code using WhatsApp on your phone to link your account and send invoices.
            </p>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {qrCodeUrl ? (
              <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center">
                <img
                  src={qrCodeUrl}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 object-contain animate-fade-in"
                />
                <span className="text-[11px] text-slate-400 mt-2 font-sans">QR Code updates periodically.</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 w-64 border rounded-lg bg-slate-50/50 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="text-sm font-medium text-slate-500 font-sans">Generating barcode...</span>
                <span className="text-xs text-slate-400 text-center px-4 font-sans font-light">This might take a moment if the backend is initializing.</span>
              </div>
            )}

            <div className="text-sm text-slate-600 space-y-2 max-w-sm font-sans">
              <p className="font-semibold text-slate-800">Steps to connect:</p>
              <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600 font-light">
                <li>Open <strong>WhatsApp</strong> on your phone.</li>
                <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.</li>
                <li>Tap <strong>Link a Device</strong> and point your camera to this screen to scan the barcode.</li>
              </ol>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3 font-sans font-normal leading-relaxed">
                <strong>Note for mobile users:</strong> If you are on a mobile screen, please take a screenshot/photo of this QR code and scan it with another phone, or open this system on a PC/laptop screen.
              </p>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setQrModalOpen(false)} className="w-full">
              Close / Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
