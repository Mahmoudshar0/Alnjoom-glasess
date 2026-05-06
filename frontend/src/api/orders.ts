import client from './client';
import { Order, OrderStatus } from '../types';

export const getOrders = (params?: { status?: OrderStatus; customerId?: string }) =>
  client.get<Order[]>('/orders', { params }).then(r => r.data);

export const getOrder = (id: string) =>
  client.get<Order>(`/orders/${id}`).then(r => r.data);

export const createOrder = (data: any) =>
  client.post<Order>('/orders', data).then(r => r.data);

export const updateOrder = (id: string, data: any) =>
  client.put<Order>(`/orders/${id}`, data).then(r => r.data);

export const updateOrderStatus = (id: string, status: OrderStatus) =>
  client.patch<Order>(`/orders/${id}/status`, { status }).then(r => r.data);

export const deleteOrder = (id: string) =>
  client.delete(`/orders/${id}`).then(r => r.data);
