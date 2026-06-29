import client from './client';

// ── Response Types ────────────────────────────────────────────────────────────

export interface SalesKpi {
  totalItemsSold: number;
  totalSalesRevenue: number;
  avgOrderValue: number;
  totalOrders: number;
  avgItemsPerOrder: number;
  uniqueProductsSold: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  qty: number;
}

export interface BrandRevenue {
  brand: string;
  revenue: number;
  qty: number;
  productCount: number;
}

export interface DayTrend {
  date: string;
  revenue: number;
  qty: number;
  orders: number;
}

export interface MonthTrend {
  month: string;
  revenue: number;
  qty: number;
  orders: number;
}

export interface TopProduct {
  rank: number;
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  type: string;
  qtySold: number;
  revenue: number;
  avgPrice: number;
  currentStock: number;
  lastSoldDate: string | null;
}

export interface SlowMovingProduct {
  id: string;
  name: string;
  sku: string | null;
  type: string;
  currentStock: number;
  qtySold: number;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
  revenueEstimate: number;
}

export interface LowStockBestSeller {
  id: string;
  name: string;
  sku: string | null;
  type: string;
  currentStock: number;
  qtySold: number;
  recommendedReorder: number;
}

export interface EmployeeSaleStat {
  employeeId: string;
  employeeName: string;
  totalOrders: number;
  itemsSold: number;
  revenue: number;
  avgOrderValue: number;
}

export interface CategorySummary {
  category: string;
  productCount: number;
  qtySold: number;
  revenue: number;
  avgPrice: number;
}

export interface BrandSummary {
  brand: string;
  revenue: number;
  unitsSold: number;
  productCount: number;
}

export interface SalesStatsResponse {
  kpi: SalesKpi;
  revenueByCategory: CategoryRevenue[];
  revenueByBrand: BrandRevenue[];
  dailyTrend: DayTrend[];
  monthlyTrend: MonthTrend[];
  topProducts: TopProduct[];
  slowMoving: SlowMovingProduct[];
  lowStockBestSellers: LowStockBestSeller[];
  employeeSales: EmployeeSaleStat[];
  categorySummary: CategorySummary[];
  brandSummary: BrandSummary[];
}

export interface SalesStatsParams {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  category?: string;
  brand?: string;
}

export const getSalesStats = (params?: SalesStatsParams) =>
  client.get<SalesStatsResponse>('/sales-stats', { params }).then(r => r.data);
