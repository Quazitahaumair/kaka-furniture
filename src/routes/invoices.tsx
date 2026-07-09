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
  "Low back revolving",
  "Low back s type",
  "Net boom chair",
  "Net matrix",
  "Amazon chair",
  "Amazon hy",
  "Black beauty",
  "Samosa pattern",
];

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
  const grandTotal = Math.max(0, subtotal - discountVal);

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
        setCustomerAddress(""); // default blank as ledger might not track address
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
  }, [invoices, q, filterDate]);

  // Open native browser print window
  const handlePrint = (invoice: Invoice) => {
    // Clean up any existing print elements from previous runs
    const oldContainer = document.getElementById("print-section");
    if (oldContainer) oldContainer.remove();
    const oldStyle = document.getElementById("print-media-style");
    if (oldStyle) oldStyle.remove();

    const itemsHtml = invoice.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">₹${(item.quantity * item.price).toLocaleString("en-IN")}</td>
        </tr>
      `
      )
      .join("");

    const printContainer = document.createElement("div");
    printContainer.id = "print-section";

    printContainer.innerHTML = `
      <div class="invoice-box">
        <div class="header">
          <div>
            <div class="company-logo">KSC SOFA ND CHAIR HOUSE</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Premium Wooden & Home Furniture</div>
            <div style="font-size: 12px; color: #64748b;">Maltekdi Railway Station Road Nanded | Mob: +91 9028887909</div>
          </div>
          <div class="invoice-info">
            <h1 class="invoice-title">INVOICE</h1>
            <div style="font-size: 15px; font-weight: 700; margin-top: 5px;">#${invoice.id}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Date: ${invoice.date}</div>
          </div>
        </div>
        
        <table class="details-table">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px;">Billed To:</div>
              <div style="font-weight: 700; font-size: 15px; color: #0f172a;">${invoice.customerName}</div>
              ${invoice.customerPhone ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">Phone: ${invoice.customerPhone}</div>` : ""}
              ${invoice.customerAddress ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">Address: ${invoice.customerAddress}</div>` : ""}
            </td>
            <td style="text-align: right;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 5px;">Payment Details:</div>
              <div style="font-size: 13px; color: #475569;">Payment Method: Udhaar / Ledger Synced</div>
              <div style="font-size: 13px; color: #475569; margin-top: 2px;">Status: Saved in Ledger</div>
            </td>
          </tr>
        </table>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Furniture Item</th>
              <th style="text-align: right; width: 80px;">Qty</th>
              <th style="text-align: right; width: 120px;">Unit Price</th>
              <th style="text-align: right; width: 130px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="totals-box">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>₹${invoice.items.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString("en-IN")}</span>
          </div>
          ${invoice.discount > 0
        ? `
          <div class="totals-row" style="color: #ef4444;">
            <span>Discount:</span>
            <span>- ₹${invoice.discount.toLocaleString("en-IN")}</span>
          </div>
          `
        : ""
      }
          <div class="totals-row grand">
            <span>Grand Total:</span>
            <span>₹${invoice.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
        
        ${invoice.notes
        ? `
        <div class="notes-section">
          <div style="font-weight: 700; margin-bottom: 4px; color: #475569; font-size: 12px;">Notes / Special Terms:</div>
          <div>${invoice.notes}</div>
        </div>
        `
        : ""
      }
        
        <div class="footer">
          <p>Thank you for choosing KSC SOFA ND CHAIR HOUSE!</p>
          <p style="font-size: 9px; color: #cbd5e1; margin-top: 20px;">This is a system generated document.</p>
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
        font-family: system-ui, -apple-system, sans-serif;
        color: #1e293b;
        padding: 40px;
        margin: 0;
        line-height: 1.5;
        background: white;
        z-index: 999999;
      }
      body.printing-active #print-section .invoice-box { max-width: 800px; margin: auto; }
      body.printing-active #print-section .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
      body.printing-active #print-section .company-logo { font-size: 24px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
      body.printing-active #print-section .invoice-title { font-size: 28px; font-weight: 800; text-align: right; color: #0f172a; margin: 0; line-height: 1.1; }
      body.printing-active #print-section .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      body.printing-active #print-section .details-table td { width: 50%; vertical-align: top; }
      body.printing-active #print-section .invoice-info { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
      body.printing-active #print-section .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      body.printing-active #print-section .items-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; padding: 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; }
      body.printing-active #print-section .totals-box { width: 40%; margin-left: 60%; margin-bottom: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      body.printing-active #print-section .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
      body.printing-active #print-section .totals-row.grand { border-top: 2px solid #0f172a; font-size: 18px; font-weight: 700; color: #0f172a; padding-top: 10px; margin-top: 6px; }
      body.printing-active #print-section .notes-section { font-size: 12px; color: #64748b; border-top: 1px dashed #e2e8f0; padding-top: 20px; margin-top: 20px; }
      body.printing-active #print-section .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
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

      // Detect if user is on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

      // 1. Build the HTML content
      const itemsHtml = invoice.items
        .map(
          (item, idx) => `
          <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
            <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; color: #334155;">${item.name}</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #334155;">${item.quantity}</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #334155;">₹${item.price.toLocaleString("en-IN")}</td>
            <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #0f172a; font-weight: 600;">₹${(item.quantity * item.price).toLocaleString("en-IN")}</td>
          </tr>
        `
        )
        .join("");

      const htmlContent = `
        <div style="width: 800px; margin: auto; background: #ffffff; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.5; border-top: 8px solid #059669;">
          <div style="padding: 45px;">
            
            <!-- Header Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9;">
              <tr>
                <td style="vertical-align: top; padding-bottom: 30px; text-align: left;">
                  <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.2;">KSC SOFA ND CHAIR HOUSE</div>
                  <div style="font-size: 11px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Premium Wooden & Home Furniture</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 8px; line-height: 1.4;">
                    Maltekdi Railway Station Road Nanded<br>
                    Mob: +91 9028887909 
                  </div>
                </td>
                <td style="vertical-align: top; padding-bottom: 30px; text-align: right;">
                  <h1 style="font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin: 0; line-height: 1;">INVOICE</h1>
                  <div style="margin-top: 15px; font-size: 13px; color: #475569; line-height: 1.4;">
                    <div><span style="color: #64748b;">Invoice No:</span> <strong style="color: #0f172a;">#${invoice.id}</strong></div>
                    <div style="margin-top: 4px;"><span style="color: #64748b;">Date:</span> <strong style="color: #0f172a;">${invoice.date}</strong></div>
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- Details Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; min-height: 120px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Billed To</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">${invoice.customerName}</div>
                    ${invoice.customerPhone ? `<div style="font-size: 13px; color: #475569; margin-bottom: 4px;"><strong>Phone:</strong> ${invoice.customerPhone}</div>` : ""}
                    ${invoice.customerAddress ? `<div style="font-size: 13px; color: #475569;"><strong>Address:</strong> ${invoice.customerAddress}</div>` : ""}
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; min-height: 120px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Payment Details</div>
                    <div style="font-size: 13px; color: #475569; margin-bottom: 4px;"><strong>Payment Method:</strong> Udhaar / Ledger Synced</div>
                    <div style="font-size: 13px; color: #475569;"><strong>Payment Status:</strong> Saved in Ledger</div>
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px;">
              <thead>
                <tr style="background: #0f172a; color: #ffffff;">
                  <th style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 14px; text-align: left; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">Furniture Item</th>
                  <th style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 14px; text-align: right; width: 80px;">Qty</th>
                  <th style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 14px; text-align: right; width: 120px;">Unit Price</th>
                  <th style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 14px; text-align: right; width: 130px; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <!-- Totals Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 45px;">
              <tr>
                <td style="width: 55%; vertical-align: top; padding-right: 20px; text-align: left;">
                  ${invoice.notes
          ? `
                    <div style="border-left: 3px solid #059669; background: #f0fdf4; padding: 15px 20px; border-radius: 4px; font-size: 12px; color: #1e293b; text-align: left;">
                      <div style="font-weight: 700; color: #047857; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Notes & Special Terms</div>
                      <div>${invoice.notes}</div>
                    </div>
                    `
          : ""
        }
                </td>
                <td style="width: 45%; vertical-align: top;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569;">
                      <span>Subtotal:</span>
                      <span>₹${invoice.items.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString("en-IN")}</span>
                    </div>
                    ${invoice.discount > 0
          ? `
                      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #ef4444;">
                        <span>Discount:</span>
                        <span>- ₹${invoice.discount.toLocaleString("en-IN")}</span>
                      </div>
                      `
          : ""
        }
                    <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #0f172a; padding-top: 10px; margin-top: 8px; font-size: 17px; font-weight: 800; color: #0f172a;">
                      <span>Grand Total:</span>
                      <span>₹${invoice.total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            
            <!-- Signatures Section -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 40px;">
              <tr>
                <td style="width: 50%; text-align: center; vertical-align: bottom;">
                  <div style="width: 200px; border-bottom: 1.5px solid #94a3b8; margin: 0 auto 10px auto; height: 45px;"></div>
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Customer Signature</div>
                </td>
                <td style="width: 50%; text-align: center; vertical-align: bottom;">
                  <div style="width: 200px; border-bottom: 1.5px solid #94a3b8; margin: 0 auto 10px auto; height: 45px;"></div>
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Authorized Signatory</div>
                </td>
              </tr>
            </table>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 60px; border-top: 1.5px dashed #e2e8f0; padding-top: 25px; font-size: 11px; color: #94a3b8;">
              <div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-bottom: 4px;">Thank you for choosing KSC SOFA ND CHAIR HOUSE!</div>
              <div>This is a computer generated document and does not require a physical signature unless signed above.</div>
            </div>
            
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Invoice-${invoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.90 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 800,
          width: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate the PDF blob
      // @ts-ignore
      const pdfBlob = await html2pdf().from(htmlContent).set(opt).outputPdf('blob');

      const fileName = `Invoice-${invoice.id}.pdf`;

      // Check if navigator.share supports file sharing (primarily mobile viewports)
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      let sharedLocally = false;
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: fileName,
            text: `Invoice #${invoice.id} from KSC SOFA ND CHAIR HOUSE`
          });
          sharedLocally = true;
          toast.success("Invoice shared successfully!", { id: toastId });
          return;
        } catch (shareErr) {
          console.log("User cancelled share or share failed, falling back to download/link.", shareErr);
        }
      }

      // Fallback for PC/Laptop (or if share failed)
      if (!sharedLocally) {
        // 1. Download the PDF file locally on their computer
        const fileURL = window.URL.createObjectURL(pdfBlob);
        const fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.setAttribute('download', fileName);
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();

        // 2. Convert Blob to base64 and upload to server to get shareable absoluteUrl (if they still want to copy the link)
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

        const uploadResult = await apiService.uploadInvoicePdf(
          fileName,
          base64Data,
          invoice.customerPhone,
          "",
          false // sendDirectWhatsApp = false
        );

        // 3. Open WhatsApp Web directly to the customer's chat
        let cleanedPhone = (invoice.customerPhone || "").replace(/[^0-9]/g, "");
        if (cleanedPhone.length === 10) {
          cleanedPhone = "91" + cleanedPhone; // default to India
        }

        const shareText = `Dear ${invoice.customerName}, thank you for choosing KSC SOFA ND CHAIR HOUSE. Here is your invoice: ${uploadResult.absoluteUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(shareText)}`;

        // Open WhatsApp sharing link in a new tab
        window.open(whatsappUrl, "_blank");

        toast.success("PDF downloaded! Drag the file from the download bar into the WhatsApp window to send.", {
          id: toastId,
          duration: 7000
        });
      }
    } catch (err: any) {
      console.error("PDF generation/sharing error:", err);
      toast.error(err.message || "Failed to send PDF via WhatsApp.", { id: toastId });
    }
  };

  // Poll WhatsApp status when QR Modal is open
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
          toast.success("WhatsApp connected successfully! Sending invoice...");
          if (pendingInvoice) {
            handleShareWhatsApp(pendingInvoice);
            setPendingInvoice(null);
          }
        }
      } catch (err) {
        console.error("Error checking WhatsApp status:", err);
      }
    };

    // Initial check
    checkStatus();

    const intervalId = setInterval(checkStatus, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [qrModalOpen, pendingInvoice]);

  // Mailto link trigger
  const handleShareEmail = (invoice: Invoice) => {
    const subject = encodeURIComponent(`Invoice ${invoice.id} from KSC SOFA ND CHAIR HOUSE`);
    const body = encodeURIComponent(
      `Dear ${invoice.customerName},\n\n` +
      `Thank you for shopping at KSC SOFA ND CHAIR HOUSE. Here is your invoice summary:\n\n` +
      `Invoice #: ${invoice.id}\n` +
      `Date: ${invoice.date}\n` +
      `Grand Total: ₹${invoice.total.toLocaleString("en-IN")}\n\n` +
      `Notes: ${invoice.notes || "None"}\n\n` +
      `If you have any questions, feel free to reply to this email.\n\n` +
      `Best regards,\nKSC SOFA ND CHAIR HOUSE`
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
              <div className="p-8 bg-white text-slate-800 space-y-6 md:p-12 font-sans">
                {/* Invoice Letterhead */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 border-b pb-6 border-slate-100">
                  <div>
                    <span className="font-serif text-2xl font-extrabold tracking-tight text-slate-900">
                      KSC SOFA ND CHAIR HOUSE
                    </span>
                    <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mt-1">
                      Premium Wooden & Home Furniture
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Maltekdi Railway Station Road Nanded<br />
                      Mob: +91 9028887909
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-3xl font-black tracking-tight text-indigo-900">
                      INVOICE
                    </span>
                    <p className="font-mono text-sm font-bold text-slate-800 mt-1">
                      #{previewInvoice.id}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Date: {previewInvoice.date}
                    </p>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6 border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Billed To:
                    </span>
                    <p className="text-base font-extrabold text-slate-900">
                      {previewInvoice.customerName}
                    </p>
                    {previewInvoice.customerPhone && (
                      <p className="text-xs text-slate-600 mt-1">
                        Mob: {previewInvoice.customerPhone}
                      </p>
                    )}
                    {previewInvoice.customerAddress && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm">
                        {previewInvoice.customerAddress}
                      </p>
                    )}
                  </div>
                  <div className="md:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Payment Context:
                    </span>
                    <p className="text-xs text-slate-600">
                      Payment Account: Synced to Khatabook
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Ledger Sync: {previewInvoice.syncToLedger ? "Enabled (Debit Recorded)" : "Disabled"}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-md border border-slate-100 overflow-hidden">
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-3 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">Item Details</th>
                        <th className="p-3 font-semibold text-slate-600 uppercase text-[10px] tracking-wider text-right w-[60px]">Qty</th>
                        <th className="p-3 font-semibold text-slate-600 uppercase text-[10px] tracking-wider text-right w-[110px]">Price</th>
                        <th className="p-3 font-semibold text-slate-600 uppercase text-[10px] tracking-wider text-right w-[120px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewInvoice.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="p-3 font-medium text-slate-800">{item.name}</td>
                          <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">₹{item.price.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right font-semibold text-slate-900">
                            ₹{(item.quantity * item.price).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Note */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                  <div className="flex-1 max-w-sm">
                    {previewInvoice.notes ? (
                      <div className="rounded-lg bg-slate-50/50 p-4 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Terms & Notes:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                          {previewInvoice.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        No custom notes printed on this invoice.
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-[240px] space-y-2 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-semibold">
                        ₹{previewInvoice.items.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {previewInvoice.discount > 0 && (
                      <div className="flex justify-between text-xs text-red-500 font-medium">
                        <span>Discount:</span>
                        <span>- ₹{previewInvoice.discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-sm font-bold text-slate-900">Total:</span>
                      <span className="font-serif text-lg font-black text-slate-950">
                        ₹{previewInvoice.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-between items-end pt-12 text-xs">
                  <div className="text-slate-400">
                    Thank you for your business!
                  </div>
                  <div className="text-center w-[160px] border-t border-slate-300 pt-1.5 font-medium text-slate-500">
                    Authorized Signatory
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
