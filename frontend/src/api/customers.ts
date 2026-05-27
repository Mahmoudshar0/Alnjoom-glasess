import client from './client';
import { Customer, CustomerReport } from '../types';

export const getCustomers = (q?: string) =>
  client.get<Customer[]>('/customers', { params: q ? { q } : {} }).then(r => r.data);

export const getCustomer = (id: string) =>
  client.get<Customer & { examinations: any[]; orders: any[]; invoices: any[] }>(`/customers/${id}`).then(r => r.data);

export const createCustomer = (data: Partial<Customer>) =>
  client.post<Customer>('/customers', data).then(r => r.data);

export const updateCustomer = (id: string, data: Partial<Customer>) =>
  client.put<Customer>(`/customers/${id}`, data).then(r => r.data);

export const deleteCustomer = (id: string) =>
  client.delete(`/customers/${id}`).then(r => r.data);

export const getCustomerReport = (id: string) =>
  client.get<CustomerReport>(`/reports/customer/${id}`).then(r => r.data);

export const linkChild = (parentId: string, childId: string) =>
  client.post(`/customers/${parentId}/children`, { childId }).then(r => r.data);

export const unlinkChild = (parentId: string, childId: string) =>
  client.delete(`/customers/${parentId}/children/${childId}`).then(r => r.data);
