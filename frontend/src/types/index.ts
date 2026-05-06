export type Role = 'ADMIN' | 'EMPLOYEE';
export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type ItemType = 'FRAME' | 'LENS' | 'ACCESSORY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  _count?: { orders: number; examinations: number };
}

export interface Examination {
  id: string;
  customerId: string;
  doctor?: string;
  date: string;
  rightSph?: number | null;
  rightCyl?: number | null;
  rightAxis?: number | null;
  leftSph?: number | null;
  leftCyl?: number | null;
  leftAxis?: number | null;
  add?: number | null;
  ipd?: number | null;
  height?: number | null;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  type: ItemType;
  brand?: string;
  model?: string;
  color?: string;
  material?: string;
  lensType?: string;
  coating?: string;
  lensIndex?: number | null;
  category?: string;
  price: number;
  quantity: number;
  sku?: string;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  inventoryItemId?: string;
  inventoryItem?: InventoryItem;
  customItemName?: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  examinationId?: string;
  examination?: Examination;
  status: OrderStatus;
  notes?: string;
  items: OrderItem[];
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  date: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerId: string;
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>;
  order?: Order;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  status: InvoiceStatus;
  notes?: string;
  payments: Payment[];
  createdAt: string;
}

export interface CustomerReport extends Customer {
  examinations: Examination[];
  orders: Order[];
  invoices: Invoice[];
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
  };
}

export interface FinancialReport {
  totalRevenue: number;
  totalOutstanding: number;
  totalBilled: number;
  recentRevenue: number;
  ordersByStatus: Record<string, number>;
  invoices: Invoice[];
}
