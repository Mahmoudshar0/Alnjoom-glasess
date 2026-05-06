import client from './client';
import { Invoice, InvoiceStatus } from '../types';

export const getInvoices = (params?: { status?: InvoiceStatus; customerId?: string }) =>
  client.get<Invoice[]>('/invoices', { params }).then(r => r.data);

export const getInvoice = (id: string) =>
  client.get<Invoice>(`/invoices/${id}`).then(r => r.data);

export const createInvoice = (data: Partial<Invoice>) =>
  client.post<Invoice>('/invoices', data).then(r => r.data);

export const updateInvoice = (id: string, data: Partial<Invoice>) =>
  client.put<Invoice>(`/invoices/${id}`, data).then(r => r.data);

export const addPayment = (invoiceId: string, data: { amount: number; method: string; notes?: string }) =>
  client.post(`/invoices/${invoiceId}/payments`, data).then(r => r.data);
