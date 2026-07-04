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
import { apiService } from "@/lib/api";

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
  address?: string;
  openingBalance?: number;
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
const initialParties: Party[] = [];

const initialInvoices: Invoice[] = [];


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
  addParty: (name: string, phone: string, address?: string, openingBalance?: number) => Promise<string>;
  deleteParty: (id: string) => Promise<void>;
  addKhaataEntry: (partyId: string, type: "credit" | "debit", amount: number, note: string, date?: string) => Promise<void>;
  deleteKhaataEntry: (partyId: string, entryId: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, "id">, syncToLedger?: boolean) => Promise<string>;
  updateInvoice: (id: string, invoice: Invoice, syncToLedger?: boolean) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
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

  // Load from local storage & database
  useEffect(() => {
    try {
      const storedOrders = localStorage.getItem("kaka-orders-v2");
      const storedProducts = localStorage.getItem("kaka-products-v2");
      const storedCustomers = localStorage.getItem("kaka-customers-v2");
      const storedSummary = localStorage.getItem("kaka-summary-v2");
      const storedCategories = localStorage.getItem("kaka-categories-v2");
      const storedDailySales = localStorage.getItem("kaka-dailySales-v2");
      const storedMonthlySales = localStorage.getItem("kaka-monthlySales-v2");
      const storedCityRevenue = localStorage.getItem("kaka-cityRevenue-v2");
      const storedOrderStatus = localStorage.getItem("kaka-orderStatus-v2");
      const storedActivity = localStorage.getItem("kaka-activity-v2");

      if (storedOrders) setOrders(JSON.parse(storedOrders));
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
      if (storedSummary) setSummary(JSON.parse(storedSummary));
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      if (storedDailySales) setDailySales(JSON.parse(storedDailySales));
      if (storedMonthlySales) setMonthlySales(JSON.parse(storedMonthlySales));
      if (storedCityRevenue) setCityRevenue(JSON.parse(storedCityRevenue));
      if (storedOrderStatus) setOrderStatus(JSON.parse(storedOrderStatus));
      if (storedActivity) setActivity(JSON.parse(storedActivity));
    } catch (e) {
      console.error("Failed to load local state from localStorage", e);
    }

    // Connect and fetch data from MongoDB Atlas backend
    const syncWithBackend = async () => {
      try {
        console.log("Fetching parties from MongoDB Atlas...");
        const dbParties = await apiService.getParties();
        setParties(dbParties);
      } catch (err) {
        console.warn("Could not load parties from database backend, using fallback:", err);
      }

      try {
        console.log("Fetching invoices from MongoDB Atlas...");
        const dbInvoices = await apiService.getInvoices();
        setInvoices(dbInvoices);
      } catch (err) {
        console.warn("Could not load invoices from database backend, using fallback:", err);
      }
    };

    syncWithBackend();
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("kaka-orders-v2", JSON.stringify(orders));
      localStorage.setItem("kaka-products-v2", JSON.stringify(products));
      localStorage.setItem("kaka-customers-v2", JSON.stringify(customers));
      localStorage.setItem("kaka-khaata-v2", JSON.stringify(parties));
      localStorage.setItem("kaka-invoices-v2", JSON.stringify(invoices));
      localStorage.setItem("kaka-summary-v2", JSON.stringify(summary));
      localStorage.setItem("kaka-categories-v2", JSON.stringify(categories));
      localStorage.setItem("kaka-dailySales-v2", JSON.stringify(dailySales));
      localStorage.setItem("kaka-monthlySales-v2", JSON.stringify(monthlySales));
      localStorage.setItem("kaka-cityRevenue-v2", JSON.stringify(cityRevenue));
      localStorage.setItem("kaka-orderStatus-v2", JSON.stringify(orderStatus));
      localStorage.setItem("kaka-activity-v2", JSON.stringify(activity));
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

  const addParty = async (name: string, phone: string, address?: string, openingBalance?: number): Promise<string> => {
    try {
      const savedParty = await apiService.createParty({ name, phone, address, openingBalance });
      setParties((prev) => [savedParty, ...prev]);
      return savedParty.id;
    } catch (e: any) {
      console.error("Failed to create party on backend:", e);
      throw e;
    }
  };

  const deleteParty = async (id: string): Promise<void> => {
    try {
      await apiService.deleteParty(id);
      setParties((prev) => prev.filter((p) => p.id !== id));
      
      // Clean up synced invoices locally by refreshing from backend
      const updatedInvoices = await apiService.getInvoices();
      setInvoices(updatedInvoices);
    } catch (e: any) {
      console.error("Failed to delete party from backend:", e);
      throw e;
    }
  };

  const addKhaataEntry = async (partyId: string, type: "credit" | "debit", amount: number, note: string, date?: string): Promise<void> => {
    try {
      const entry = await apiService.addLedgerEntry(partyId, { type, amount, note, date });
      setParties((prev) =>
        prev.map((p) => {
          if (p.id === partyId) {
            return { ...p, entries: [entry, ...p.entries] };
          }
          return p;
        })
      );
    } catch (e: any) {
      console.error("Failed to add entry on backend:", e);
      throw e;
    }
  };

  const deleteKhaataEntry = async (partyId: string, entryId: string): Promise<void> => {
    try {
      await apiService.deleteLedgerEntry(partyId, entryId);
      setParties((prev) =>
        prev.map((p) => {
          if (p.id === partyId) {
            return { ...p, entries: p.entries.filter((e) => e.id !== entryId) };
          }
          return p;
        })
      );
      
      // Refresh invoices as removal of entries turns sync status off on backend
      const updatedInvoices = await apiService.getInvoices();
      setInvoices(updatedInvoices);
    } catch (e: any) {
      console.error("Failed to delete entry from backend:", e);
      throw e;
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, "id">, syncToLedger: boolean = true): Promise<string> => {
    try {
      const savedInvoice = await apiService.createInvoice(invoiceData, syncToLedger);
      setInvoices((prev) => [savedInvoice, ...prev]);

      if (syncToLedger) {
        const updatedParties = await apiService.getParties();
        setParties(updatedParties);
      }
      return savedInvoice.id;
    } catch (e: any) {
      console.error("Failed to generate invoice on backend:", e);
      throw e;
    }
  };

  const updateInvoice = async (id: string, updatedData: Invoice, syncToLedger: boolean = true): Promise<void> => {
    try {
      const savedInvoice = await apiService.updateInvoice(id, updatedData, syncToLedger);
      setInvoices((prev) => prev.map((inv) => inv.id === id ? savedInvoice : inv));

      const updatedParties = await apiService.getParties();
      setParties(updatedParties);
    } catch (e: any) {
      console.error("Failed to update invoice on backend:", e);
      throw e;
    }
  };

  const deleteInvoice = async (id: string): Promise<void> => {
    try {
      await apiService.deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));

      const updatedParties = await apiService.getParties();
      setParties(updatedParties);
    } catch (e: any) {
      console.error("Failed to delete invoice from backend:", e);
      throw e;
    }
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
