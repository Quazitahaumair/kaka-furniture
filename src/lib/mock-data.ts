export const summary = {
  totalRevenue: 1875000,
  totalOrders: 342,
  totalProducts: 186,
  totalCustomers: 1248,
  pendingOrders: 24,
  deliveredOrders: 286,
  lowStockProducts: 12,
  monthlyProfit: 425000,
};

export const categories = [
  { name: "Sofa", value: 42, revenue: 250000 },
  { name: "Bed", value: 36, revenue: 180000 },
  { name: "Dining Table", value: 28, revenue: 120000 },
  { name: "Chair", value: 48, revenue: 75000 },
  { name: "Wardrobe", value: 18, revenue: 95000 },
  { name: "Office", value: 14, revenue: 62000 },
];

export const dailySales = [
  { day: "Mon", sales: 32000, profit: 9000 },
  { day: "Tue", sales: 48000, profit: 14200 },
  { day: "Wed", sales: 41000, profit: 11800 },
  { day: "Thu", sales: 56000, profit: 16500 },
  { day: "Fri", sales: 72000, profit: 21000 },
  { day: "Sat", sales: 95000, profit: 28500 },
  { day: "Sun", sales: 84000, profit: 24800 },
];

export const monthlySales = [
  { month: "Jan", revenue: 142000, profit: 38000 },
  { month: "Feb", revenue: 168000, profit: 45000 },
  { month: "Mar", revenue: 195000, profit: 52000 },
  { month: "Apr", revenue: 178000, profit: 48000 },
  { month: "May", revenue: 215000, profit: 62000 },
  { month: "Jun", revenue: 248000, profit: 71000 },
  { month: "Jul", revenue: 232000, profit: 66000 },
  { month: "Aug", revenue: 268000, profit: 78000 },
  { month: "Sep", revenue: 285000, profit: 84000 },
  { month: "Oct", revenue: 312000, profit: 92000 },
  { month: "Nov", revenue: 298000, profit: 88000 },
  { month: "Dec", revenue: 342000, profit: 105000 },
];

export const products = [
  { id: "P001", name: "Royal Wooden Sofa", category: "Sofa", price: 25000, stock: 8, sold: 120, views: 1840 },
  { id: "P002", name: "King Size Bed", category: "Bed", price: 35000, stock: 5, sold: 95, views: 1620 },
  { id: "P003", name: "6-Seater Dining Set", category: "Dining Table", price: 42000, stock: 12, sold: 80, views: 1420 },
  { id: "P004", name: "Recliner Chair", category: "Chair", price: 18000, stock: 0, sold: 72, views: 1280 },
  { id: "P005", name: "3-Door Wardrobe", category: "Wardrobe", price: 28000, stock: 6, sold: 65, views: 980 },
  { id: "P006", name: "Executive Office Desk", category: "Office", price: 22000, stock: 3, sold: 58, views: 860 },
  { id: "P007", name: "L-Shape Sectional Sofa", category: "Sofa", price: 48000, stock: 4, sold: 52, views: 1540 },
  { id: "P008", name: "Queen Size Bed", category: "Bed", price: 28000, stock: 15, sold: 48, views: 920 },
  { id: "P009", name: "Glass Dining Table", category: "Dining Table", price: 32000, stock: 9, sold: 42, views: 780 },
  { id: "P010", name: "Ergonomic Office Chair", category: "Chair", price: 12000, stock: 22, sold: 38, views: 650 },
  { id: "P011", name: "2-Door Wardrobe", category: "Wardrobe", price: 18000, stock: 2, sold: 34, views: 540 },
  { id: "P012", name: "Lounge Chair", category: "Chair", price: 9500, stock: 18, sold: 28, views: 420 },
];

export const orders = [
  { id: "#1001", customer: "Rahul Sharma", product: "Royal Wooden Sofa", amount: 25000, status: "Delivered", date: "2026-06-15", city: "Pune" },
  { id: "#1002", customer: "Priya Patel", product: "King Size Bed", amount: 35000, status: "Shipped", date: "2026-06-16", city: "Mumbai" },
  { id: "#1003", customer: "Amit Kumar", product: "6-Seater Dining Set", amount: 42000, status: "Processing", date: "2026-06-17", city: "Nashik" },
  { id: "#1004", customer: "Sneha Joshi", product: "Recliner Chair", amount: 18000, status: "New", date: "2026-06-18", city: "Pune" },
  { id: "#1005", customer: "Vikram Singh", product: "3-Door Wardrobe", amount: 28000, status: "Delivered", date: "2026-06-14", city: "Mumbai" },
  { id: "#1006", customer: "Anjali Mehta", product: "L-Shape Sectional Sofa", amount: 48000, status: "Processing", date: "2026-06-18", city: "Pune" },
  { id: "#1007", customer: "Rohan Desai", product: "Queen Size Bed", amount: 28000, status: "Shipped", date: "2026-06-17", city: "Nagpur" },
  { id: "#1008", customer: "Kavita Iyer", product: "Glass Dining Table", amount: 32000, status: "Delivered", date: "2026-06-13", city: "Mumbai" },
  { id: "#1009", customer: "Suresh Reddy", product: "Executive Office Desk", amount: 22000, status: "Cancelled", date: "2026-06-12", city: "Pune" },
  { id: "#1010", customer: "Meera Nair", product: "Ergonomic Office Chair", amount: 12000, status: "New", date: "2026-06-19", city: "Nashik" },
  { id: "#1011", customer: "Arjun Kapoor", product: "Lounge Chair", amount: 9500, status: "Delivered", date: "2026-06-11", city: "Mumbai" },
  { id: "#1012", customer: "Divya Shah", product: "2-Door Wardrobe", amount: 18000, status: "Shipped", date: "2026-06-16", city: "Pune" },
];

export const customers = [
  { id: "C001", name: "Rahul Sharma", email: "rahul@example.com", phone: "+91 98765 43210", orders: 8, totalSpent: 184000, city: "Pune", since: "2024-03-12", returning: true },
  { id: "C002", name: "Priya Patel", email: "priya@example.com", phone: "+91 98123 45678", orders: 6, totalSpent: 156000, city: "Mumbai", since: "2024-05-22", returning: true },
  { id: "C003", name: "Amit Kumar", email: "amit@example.com", phone: "+91 97654 32109", orders: 5, totalSpent: 142000, city: "Nashik", since: "2024-08-04", returning: true },
  { id: "C004", name: "Sneha Joshi", email: "sneha@example.com", phone: "+91 96543 21098", orders: 4, totalSpent: 98000, city: "Pune", since: "2025-01-18", returning: true },
  { id: "C005", name: "Vikram Singh", email: "vikram@example.com", phone: "+91 95432 10987", orders: 3, totalSpent: 86000, city: "Mumbai", since: "2025-04-09", returning: true },
  { id: "C006", name: "Anjali Mehta", email: "anjali@example.com", phone: "+91 94321 09876", orders: 2, totalSpent: 72000, city: "Pune", since: "2026-02-14", returning: true },
  { id: "C007", name: "Rohan Desai", email: "rohan@example.com", phone: "+91 93210 98765", orders: 1, totalSpent: 28000, city: "Nagpur", since: "2026-06-01", returning: false },
  { id: "C008", name: "Kavita Iyer", email: "kavita@example.com", phone: "+91 92109 87654", orders: 1, totalSpent: 32000, city: "Mumbai", since: "2026-06-05", returning: false },
];

export const customerGrowth = [
  { month: "Jan", new: 22, returning: 48 },
  { month: "Feb", new: 28, returning: 52 },
  { month: "Mar", new: 34, returning: 58 },
  { month: "Apr", new: 30, returning: 62 },
  { month: "May", new: 42, returning: 70 },
  { month: "Jun", new: 56, returning: 84 },
];

export const cityRevenue = [
  { city: "Mumbai", revenue: 400000 },
  { city: "Pune", revenue: 250000 },
  { city: "Nashik", revenue: 120000 },
  { city: "Nagpur", revenue: 95000 },
  { city: "Aurangabad", revenue: 68000 },
];

export const orderStatus = [
  { name: "New", value: 18 },
  { name: "Processing", value: 24 },
  { name: "Shipped", value: 32 },
  { name: "Delivered", value: 286 },
  { name: "Cancelled", value: 8 },
];

export const activity = [
  { time: "2 min ago", text: "New order #1010 from Meera Nair" },
  { time: "18 min ago", text: "Recliner Chair stock is OUT" },
  { time: "1 hour ago", text: "Order #1002 marked as Shipped" },
  { time: "3 hours ago", text: "New customer registered: Rohan Desai" },
  { time: "5 hours ago", text: "Royal Wooden Sofa restocked (+12 units)" },
  { time: "Yesterday", text: "Monthly report generated for May 2026" },
];

export const formatINR = (n: number) =>
  "₹" + n.toLocaleString("en-IN");
