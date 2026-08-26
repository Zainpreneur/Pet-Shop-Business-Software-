export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  _count?: { products: number; purchaseOrders: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  reorderLevel: number;
  active: boolean;
  categoryId?: string | null;
  category?: Category | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  pets?: Pet[];
  _count?: { sales: number; appointments: number };
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  sex?: string | null;
  dob?: string | null;
  weightKg?: number | null;
  notes?: string | null;
  customerId: string;
  customer?: Customer;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMin: number;
  active: boolean;
}

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface Appointment {
  id: string;
  customerId: string;
  customer?: Customer;
  petId: string;
  pet?: Pet;
  serviceId: string;
  service?: Service;
  staffId?: string | null;
  staff?: User | null;
  startAt: string;
  status: AppointmentStatus;
  notes?: string | null;
}

export type PaymentMethod = "CASH" | "CARD" | "ONLINE" | "STORE_CREDIT";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "VOID";

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  customerId?: string | null;
  customer?: Customer | null;
  userId: string;
  user?: User;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  items: SaleItem[];
}

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  orderDate: string;
  receivedAt?: string | null;
  notes?: string | null;
  items: PurchaseOrderItem[];
}

export interface DashboardStats {
  todayRevenue: number;
  todaySalesCount: number;
  monthRevenue: number;
  monthSalesCount: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  inventoryValue: number;
  upcomingAppointments: Appointment[];
  recentSales: Sale[];
}
