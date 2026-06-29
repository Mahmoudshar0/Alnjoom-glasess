import client from './client';
import { FinancialReport } from '../types';

export const getFinancialReport = () =>
  client.get<FinancialReport>('/reports/financial').then(r => r.data);

export const getReportsSummary = () =>
  client.get<any>('/reports/summary').then(r => r.data);

export interface StaffInvoiceRow {
  id: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
}

export interface StaffDayData {
  date: string;
  orders: number;
  orderValue: number;
  invoices: number;
  billed: number;
  collected: number;
  invoiceRows: StaffInvoiceRow[];
}

export interface StaffMemberStat {
  user: { id: string; name: string; role: string };
  totalOrders: number;
  totalOrderValue: number;
  totalInvoices: number;
  totalBilled: number;
  totalCollected: number;
  daily: StaffDayData[];
}

export interface StaffReport {
  staffStats: StaffMemberStat[];
  totalUsers: number;
}

export const getStaffReport = (params?: { dateFrom?: string; dateTo?: string }) =>
  client.get<StaffReport>('/reports/staff', { params }).then(r => r.data);

