import React, { createContext, useContext, useState, useEffect } from "react";
import {
  orders as initialOrders,
  products as initialProducts,
  customers as initialCustomers,
  summary as initialSummary,
  categories as initialCategories,
  dailySales as initialDailySales,
  monthlySales as initialMonthlySales,
  cityRevenue as initialCityRevenue,
  orderStatus as initialOrderStatus,
  activity as initialActivity,
} from "@/lib/mock-data";

// Interfaces
export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: InvoiceItem[];
  discount: number;
  total: number;
  notes?: string;
  syncToLedger?: boolean;
  partyId?: string;
  ledgerEntryId?: string;
}

export interface Order {
  id: string;
  customer: string;
  product: string;
  amount: number;
  status: "New" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  date: string;
  city: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  views: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
  city: string;
  since: string;
  returning: boolean;
}

export interface Entry {
  id: string;
  date: string;
  type: "credit" | "debit";
  amount: number;
  note: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  entries: Entry[];
}

export interface Summary {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  deliveredOrders: number;
  lowStockProducts: number;
  monthlyProfit: number;
}

export interface DailySale {
  day: string;
  sales: number;
  profit: number;
}

export interface MonthlySale {
  month: string;
  revenue: number;
  profit: number;
}

export interface CityRevenue {
  city: string;
  revenue: number;
}

export interface Category {
  name: string;
  value: number;
  revenue: number;
}

export interface OrderStatusCount {
  name: string;
  value: number;
}

export interface ActivityItem {
  time: string;
  text: string;
}

// Initial Khaata data from khaata.tsx
const initialParties: Party[] = [
  {
    id: "K001",
    name: "Rajesh Carpentry",
    phone: "+91 98765 12345",
    entries: [
      { id: "e1", date: "2026-06-10", type: "debit", amount: 18000, note: "Wood supplies on credit" },
      { id: "e2", date: "2026-06-15", type: "credit", amount: 10000, note: "Cash payment received" },
    ],
  },
  {
    id: "K002",
    name: "Mohan Upholstery",
    phone: "+91 98101 22334",
    entries: [
      { id: "e3", date: "2026-06-08", type: "debit", amount: 42000, note: "Cushion fabric bulk order" },
      { id: "e4", date: "2026-06-12", type: "credit", amount: 25000, note: "Part payment via UPI" },
    ],
  },
  {
    id: "K003",
    name: "Sita Devi (Customer)",
    phone: "+91 90123 45678",
    entries: [
      { id: "e5", date: "2026-06-14", type: "debit", amount: 32000, note: "Dining set, balance pending" },
    ],
  },
];

const initialInvoices: Invoice[] = [
  {
    id: "INV-2026-0001",
    date: "2026-06-10",
    customerName: "Rajesh Carpentry",
    customerPhone: "+91 98765 12345",
    customerAddress: "Sector 15, Noida, UP",
    items: [
      { id: "i1", name: "Wood Planks (Teak)", quantity: 10, price: 1800 }
    ],
    discount: 0,
    total: 18000,
    notes: "Wood supplies delivered for framing.",
    syncToLedger: true,
    partyId: "K001",
    ledgerEntryId: "e1"
  },
  {
    id: "INV-2026-0002",
    date: "2026-06-14",
    customerName: "Sita Devi (Customer)",
    customerPhone: "+91 90123 45678",
    customerAddress: "Flat 402, Royal Apartments, Indiranagar, Bengaluru",
    items: [
      { id: "i2", name: "Premium Dining Table", quantity: 1, price: 25000 },
      { id: "i3", name: "Dining Chairs", quantity: 4, price: 2000 }
    ],
    discount: 1000,
    total: 32000,
    notes: "Dining set delivered. Glass top included.",
    syncToLedger: true,
    partyId: "K003",
    ledgerEntryId: "e5"
  }
];

interface AppStateContextProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  parties: Party[];
  invoices: Invoice[];
  summary: Summary;
  categories: Category[];
  dailySales: DailySale[];
  monthlySales: MonthlySale[];
  cityRevenue: CityRevenue[];
  orderStatus: OrderStatusCount[];
  activity: ActivityItem[];
  addOrder: (order: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    city: string;
    productId: string;
    amountPaid: number;
    date: string;
  }) => void;
  advanceOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
  adjustStock: (productId: string, delta: number) => void;
  addProduct: (product: Omit<Product, "sold" | "views">) => void;
  addParty: (name: string, phone: string) => string;
  deleteParty: (id: string) => void;
  addKhaataEntry: (partyId: string, type: "credit" | "debit", amount: number, note: string) => void;
  deleteKhaataEntry: (partyId: string, entryId: string) => void;
  addInvoice: (invoice: Omit<Invoice, "id">, syncToLedger?: boolean) => string;
  updateInvoice: (id: string, invoice: Invoice, syncToLedger?: boolean) => void;
  deleteInvoice: (id: string) => void;
}

const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders as Order[]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [dailySales, setDailySales] = useState<DailySale[]>(initialDailySales);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>(initialMonthlySales);
  const [cityRevenue, setCityRevenue] = useState<CityRevenue[]>(initialCityRevenue);
  const [orderStatus, setOrderStatus] = useState<OrderStatusCount[]>(initialOrderStatus);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem("kaka-orders-v1");
      const storedProducts = localStorage.getItem("kaka-products-v1");
      const storedCustomers = localStorage.getItem("kaka-customers-v1");
      const storedParties = localStorage.getItem("kaka-khaata-v1");
      const storedInvoices = localStorage.getItem("kaka-invoices-v1");
      const storedSummary = localStorage.getItem("kaka-summary-v1");
      const storedCategories = localStorage.getItem("kaka-categories-v1");
      const storedDailySales = localStorage.getItem("kaka-dailySales-v1");
      const storedMonthlySales = localStorage.getItem("kaka-monthlySales-v1");
      const storedCityRevenue = localStorage.getItem("kaka-cityRevenue-v1");
      const storedOrderStatus = localStorage.getItem("kaka-orderStatus-v1");
      const storedActivity = localStorage.getItem("kaka-activity-v1");

      if (storedOrders) setOrders(JSON.parse(storedOrders));
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
      if (storedParties) setParties(JSON.parse(storedParties));
      if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
      if (storedSummary) setSummary(JSON.parse(storedSummary));
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      if (storedDailySales) setDailySales(JSON.parse(storedDailySales));
      if (storedMonthlySales) setMonthlySales(JSON.parse(storedMonthlySales));
      if (storedCityRevenue) setCityRevenue(JSON.parse(storedCityRevenue));
      if (storedOrderStatus) setOrderStatus(JSON.parse(storedOrderStatus));
      if (storedActivity) setActivity(JSON.parse(storedActivity));
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("kaka-orders-v1", JSON.stringify(orders));
      localStorage.setItem("kaka-products-v1", JSON.stringify(products));
      localStorage.setItem("kaka-customers-v1", JSON.stringify(customers));
      localStorage.setItem("kaka-khaata-v1", JSON.stringify(parties));
      localStorage.setItem("kaka-invoices-v1", JSON.stringify(invoices));
      localStorage.setItem("kaka-summary-v1", JSON.stringify(summary));
      localStorage.setItem("kaka-categories-v1", JSON.stringify(categories));
      localStorage.setItem("kaka-dailySales-v1", JSON.stringify(dailySales));
      localStorage.setItem("kaka-monthlySales-v1", JSON.stringify(monthlySales));
      localStorage.setItem("kaka-cityRevenue-v1", JSON.stringify(cityRevenue));
      localStorage.setItem("kaka-orderStatus-v1", JSON.stringify(orderStatus));
      localStorage.setItem("kaka-activity-v1", JSON.stringify(activity));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [orders, products, customers, parties, invoices, summary, categories, dailySales, monthlySales, cityRevenue, orderStatus, activity, isLoaded]);

  const addOrder = (orderData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    city: string;
    productId: string;
    amountPaid: number;
    date: string;
  }) => {
    const { customerName, customerEmail, customerPhone, city, productId, amountPaid, date } = orderData;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // 1. Generate unique Order ID
    const nextNum = orders.length > 0
      ? Math.max(...orders.map((o) => parseInt(o.id.replace("#", ""), 10))) + 1
      : 1013;
    const newOrderId = `#${nextNum}`;

    // 2. Create Order
    const newOrder: Order = {
      id: newOrderId,
      customer: customerName,
      product: product.name,
      amount: product.price,
      status: "New",
      date,
      city,
    };

    setOrders((prev) => [newOrder, ...prev]);

    // 3. Decrement Product Stock & Increment Sold
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock - 1);
          return { ...p, stock: newStock, sold: p.sold + 1 };
        }
        return p;
      })
    );

    // 4. Update Customer List
    let isReturning = false;
    setCustomers((prev) => {
      const existing = prev.find(
        (c) =>
          c.name.toLowerCase() === customerName.toLowerCase() ||
          (customerPhone && c.phone === customerPhone)
      );

      if (existing) {
        isReturning = true;
        return prev.map((c) => {
          if (c.id === existing.id) {
            return {
              ...c,
              orders: c.orders + 1,
              totalSpent: c.totalSpent + product.price,
            };
          }
          return c;
        });
      } else {
        const newCust: Customer = {
          id: `C${String(Date.now()).slice(-4)}`,
          name: customerName,
          email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, "")}@example.com`,
          phone: customerPhone || "+91 99999 99999",
          orders: 1,
          totalSpent: product.price,
          city,
          since: date,
          returning: false,
        };
        return [newCust, ...prev];
      }
    });

    // 5. Update Khaata Parties & Ledger
    setParties((prev) => {
      const existingParty = prev.find(
        (p) =>
          p.name.toLowerCase() === customerName.toLowerCase() ||
          (customerPhone && p.phone === customerPhone)
      );

      const debitEntry: Entry = {
        id: `e-d-${Date.now()}`,
        date,
        type: "debit",
        amount: product.price,
        note: `Purchase: ${product.name} (${newOrderId})`,
      };

      const creditEntry: Entry | null =
        amountPaid > 0
          ? {
              id: `e-c-${Date.now() + 1}`,
              date,
              type: "credit",
              amount: amountPaid,
              note: `Payment for Order ${newOrderId}`,
            }
          : null;

      const entriesToAdd = creditEntry ? [creditEntry, debitEntry] : [debitEntry];

      if (existingParty) {
        return prev.map((p) => {
          if (p.id === existingParty.id) {
            return { ...p, entries: [...entriesToAdd, ...p.entries] };
          }
          return p;
        });
      } else {
        const newParty: Party = {
          id: `K${String(Date.now()).slice(-4)}`,
          name: customerName,
          phone: customerPhone || "",
          entries: entriesToAdd,
        };
        return [newParty, ...prev];
      }
    });

    // 6. Update Summary Metrics
    setSummary((prev) => {
      const lowStockCount = products.filter((p) => {
        // Adjust for current subtraction
        const adjStock = p.id === productId ? p.stock - 1 : p.stock;
        return adjStock > 0 && adjStock < 6;
      }).length;

      return {
        ...prev,
        totalRevenue: prev.totalRevenue + product.price,
        totalOrders: prev.totalOrders + 1,
        totalCustomers: prev.totalCustomers + (isReturning ? 0 : 1),
        pendingOrders: prev.pendingOrders + 1,
        lowStockProducts: lowStockCount,
        monthlyProfit: prev.monthlyProfit + Math.round(product.price * 0.23),
      };
    });

    // 7. Update Category Distribution
    setCategories((prev) =>
      prev.map((c) => {
        if (c.name.toLowerCase() === product.category.toLowerCase()) {
          return { ...c, value: c.value + 1, revenue: c.revenue + product.price };
        }
        return c;
      })
    );

    // 8. Update Daily & Monthly Trends
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeek = days[new Date(date).getDay()] || "Mon";
    setDailySales((prev) =>
      prev.map((d) => {
        if (d.day === dayOfWeek) {
          return {
            ...d,
            sales: d.sales + product.price,
            profit: d.profit + Math.round(product.price * 0.23),
          };
        }
        return d;
      })
    );

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[new Date(date).getMonth()] || "Jun";
    setMonthlySales((prev) =>
      prev.map((m) => {
        if (m.month === monthName) {
          return {
            ...m,
            revenue: m.revenue + product.price,
            profit: m.profit + Math.round(product.price * 0.23),
          };
        }
        return m;
      })
    );

    // 9. Update City Revenue
    setCityRevenue((prev) => {
      const exists = prev.some((c) => c.city.toLowerCase() === city.toLowerCase());
      if (exists) {
        return prev.map((c) => {
          if (c.city.toLowerCase() === city.toLowerCase()) {
            return { ...c, revenue: c.revenue + product.price };
          }
          return c;
        });
      } else {
        return [...prev, { city, revenue: product.price }];
      }
    });

    // 10. Update Order Status Chart Count
    setOrderStatus((prev) =>
      prev.map((st) => {
        if (st.name === "New") {
          return { ...st, value: st.value + 1 };
        }
        return st;
      })
    );

    // 11. Add Activity log
    setActivity((prev) => [
      { time: "Just now", text: `New order ${newOrderId} from ${customerName}` },
      ...prev,
    ]);
  };

  const advanceOrder = (id: string) => {
    let nextStatus: Order["status"] | "" = "";
    let prevStatus: Order["status"] | "" = "";

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const nextMap: Record<Order["status"], Order["status"]> = {
          New: "Processing",
          Processing: "Shipped",
          Shipped: "Delivered",
          Delivered: "Delivered",
          Cancelled: "Cancelled",
        };
        const ns = nextMap[o.status] ?? o.status;
        nextStatus = ns;
        prevStatus = o.status;
        return { ...o, status: ns };
      })
    );

    if (nextStatus && nextStatus !== prevStatus) {
      setSummary((prev) => {
        let pendingAdj = 0;
        let deliveredAdj = 0;
        if (nextStatus === "Delivered") {
          pendingAdj = -1;
          deliveredAdj = 1;
        }
        return {
          ...prev,
          pendingOrders: Math.max(0, prev.pendingOrders + pendingAdj),
          deliveredOrders: prev.deliveredOrders + deliveredAdj,
        };
      });

      setOrderStatus((prev) =>
        prev.map((st) => {
          if (st.name === prevStatus) return { ...st, value: Math.max(0, st.value - 1) };
          if (st.name === nextStatus) return { ...st, value: st.value + 1 };
          return st;
        })
      );

      setActivity((prev) => [
        { time: "Just now", text: `Order ${id} marked as ${nextStatus}` },
        ...prev,
      ]);
    }
  };

  const cancelOrder = (id: string) => {
    let prevStatus: Order["status"] | "" = "";

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          prevStatus = o.status;
          return { ...o, status: "Cancelled" };
        }
        return o;
      })
    );

    if (prevStatus && prevStatus !== "Cancelled") {
      setSummary((prev) => {
        const wasPending = ["New", "Processing", "Shipped"].includes(prevStatus);
        return {
          ...prev,
          pendingOrders: Math.max(0, prev.pendingOrders - (wasPending ? 1 : 0)),
        };
      });

      setOrderStatus((prev) =>
        prev.map((st) => {
          if (st.name === prevStatus) return { ...st, value: Math.max(0, st.value - 1) };
          if (st.name === "Cancelled") return { ...st, value: st.value + 1 };
          return st;
        })
      );

      setActivity((prev) => [
        { time: "Just now", text: `Order ${id} was Cancelled` },
        ...prev,
      ]);
    }
  };

  const adjustStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock + delta);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );

    setSummary((prev) => {
      const lowStockCount = products.filter((p) => {
        const adjStock = p.id === productId ? Math.max(0, p.stock + delta) : p.stock;
        return adjStock > 0 && adjStock < 6;
      }).length;
      return { ...prev, lowStockProducts: lowStockCount };
    });
  };

  const addProduct = (product: Omit<Product, "sold" | "views">) => {
    const newProduct: Product = {
      ...product,
      sold: 0,
      views: 0,
    };
    setProducts((prev) => [...prev, newProduct]);
    setSummary((prev) => ({
      ...prev,
      totalProducts: prev.totalProducts + 1,
    }));
  };

  const addParty = (name: string, phone: string) => {
    const newId = `K${String(Date.now()).slice(-4)}`;
    const newParty: Party = {
      id: newId,
      name,
      phone,
      entries: [],
    };
    setParties((prev) => [newParty, ...prev]);
    return newId;
  };

  const deleteParty = (id: string) => {
    setParties((prev) => prev.filter((p) => p.id !== id));
  };

  const addKhaataEntry = (partyId: string, type: "credit" | "debit", amount: number, note: string) => {
    const newEntry: Entry = {
      id: `e-${type}-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type,
      amount,
      note: note || (type === "debit" ? "You gave" : "You got"),
    };

    setParties((prev) =>
      prev.map((p) => {
        if (p.id === partyId) {
          return { ...p, entries: [newEntry, ...p.entries] };
        }
        return p;
      })
    );
  };

  const deleteKhaataEntry = (partyId: string, entryId: string) => {
    setParties((prev) =>
      prev.map((p) => {
        if (p.id === partyId) {
          return { ...p, entries: p.entries.filter((e) => e.id !== entryId) };
        }
        return p;
      })
    );
  };

  const addInvoice = (invoiceData: Omit<Invoice, "id">, syncToLedger: boolean = true) => {
    const nextNum = invoices.length > 0
      ? Math.max(...invoices.map((inv) => {
          const match = inv.id.match(/INV-\d+-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })) + 1
      : 3;
    const year = new Date().getFullYear();
    const newId = `INV-${year}-${String(nextNum).padStart(4, "0")}`;

    let ledgerEntryId = "";
    let partyId = invoiceData.partyId;

    if (syncToLedger && invoiceData.total > 0) {
      let finalPartyId = partyId;
      if (!finalPartyId) {
        const existing = parties.find(
          (p) => p.name.toLowerCase() === invoiceData.customerName.toLowerCase() ||
                 (invoiceData.customerPhone && p.phone === invoiceData.customerPhone)
        );
        if (existing) {
          finalPartyId = existing.id;
        } else {
          finalPartyId = addParty(invoiceData.customerName, invoiceData.customerPhone);
        }
      }
      partyId = finalPartyId;

      const entryId = `e-debit-${Date.now()}`;
      const newEntry = {
        id: entryId,
        date: invoiceData.date || new Date().toISOString().slice(0, 10),
        type: "debit" as const,
        amount: invoiceData.total,
        note: `Invoice ${newId} created`,
      };

      setParties((prev) =>
        prev.map((p) => {
          if (p.id === finalPartyId) {
            return { ...p, entries: [newEntry, ...p.entries] };
          }
          return p;
        })
      );
      ledgerEntryId = entryId;
    }

    const newInvoice: Invoice = {
      ...invoiceData,
      id: newId,
      partyId,
      ledgerEntryId: ledgerEntryId || undefined,
      syncToLedger,
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    return newId;
  };

  const updateInvoice = (id: string, updatedData: Invoice, syncToLedger: boolean = true) => {
    const existingInv = invoices.find((inv) => inv.id === id);
    if (!existingInv) return;

    let ledgerEntryId = updatedData.ledgerEntryId;
    let partyId = updatedData.partyId;

    if (existingInv.syncToLedger && existingInv.partyId && existingInv.ledgerEntryId) {
      setParties((prev) =>
        prev.map((p) => {
          if (p.id === existingInv.partyId) {
            return { ...p, entries: p.entries.filter((e) => e.id !== existingInv.ledgerEntryId) };
          }
          return p;
        })
      );
    }

    if (syncToLedger && updatedData.total > 0) {
      let finalPartyId = partyId;
      if (!finalPartyId) {
        const existing = parties.find(
          (p) => p.name.toLowerCase() === updatedData.customerName.toLowerCase() ||
                 (updatedData.customerPhone && p.phone === updatedData.customerPhone)
        );
        if (existing) {
          finalPartyId = existing.id;
        } else {
          finalPartyId = addParty(updatedData.customerName, updatedData.customerPhone);
        }
      }
      partyId = finalPartyId;

      const entryId = `e-debit-${Date.now()}`;
      const newEntry = {
        id: entryId,
        date: updatedData.date || new Date().toISOString().slice(0, 10),
        type: "debit" as const,
        amount: updatedData.total,
        note: `Invoice ${id} updated`,
      };

      setParties((prev) =>
        prev.map((p) => {
          if (p.id === finalPartyId) {
            return { ...p, entries: [newEntry, ...p.entries] };
          }
          return p;
        })
      );
      ledgerEntryId = entryId;
    } else {
      ledgerEntryId = undefined;
    }

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          return {
            ...updatedData,
            partyId,
            ledgerEntryId,
            syncToLedger,
          };
        }
        return inv;
      })
    );
  };

  const deleteInvoice = (id: string) => {
    const existingInv = invoices.find((inv) => inv.id === id);
    if (existingInv) {
      if (existingInv.syncToLedger && existingInv.partyId && existingInv.ledgerEntryId) {
        setParties((prev) =>
          prev.map((p) => {
            if (p.id === existingInv.partyId) {
              return { ...p, entries: p.entries.filter((e) => e.id !== existingInv.ledgerEntryId) };
            }
            return p;
          })
        );
      }
    }
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <AppStateContext.Provider
      value={{
        orders,
        products,
        customers,
        parties,
        invoices,
        summary,
        categories,
        dailySales,
        monthlySales,
        cityRevenue,
        orderStatus,
        activity,
        addOrder,
        advanceOrder,
        cancelOrder,
        adjustStock,
        addProduct,
        addParty,
        deleteParty,
        addKhaataEntry,
        deleteKhaataEntry,
        addInvoice,
        updateInvoice,
        deleteInvoice,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
};
