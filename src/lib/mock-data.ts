export const summary = {
  totalRevenue: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
  lowStockProducts: 0,
  monthlyProfit: 0,
};

export const categories = [];
export const dailySales = [];
export const monthlySales = [];
export const products = [];
export const orders = [];
export const customers = [];
export const customerGrowth = [];
export const cityRevenue = [];
export const orderStatus = [];
export const activity = [];

export const formatINR = (n?: number) =>
  "₹" + (n ?? 0).toLocaleString("en-IN");

