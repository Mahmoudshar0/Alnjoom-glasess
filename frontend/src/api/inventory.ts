import client from './client';
import { InventoryItem, ItemType } from '../types';

export const getInventory = (type?: ItemType, q?: string) =>
  client.get<InventoryItem[]>('/inventory', { params: { ...(type && { type }), ...(q && { q }) } }).then(r => r.data);

export const getInventoryItem = (id: string) =>
  client.get<InventoryItem>(`/inventory/${id}`).then(r => r.data);

export const createInventoryItem = (data: Partial<InventoryItem>) =>
  client.post<InventoryItem>('/inventory', data).then(r => r.data);

export const updateInventoryItem = (id: string, data: Partial<InventoryItem>) =>
  client.put<InventoryItem>(`/inventory/${id}`, data).then(r => r.data);

export const deleteInventoryItem = (id: string) =>
  client.delete(`/inventory/${id}`).then(r => r.data);

export const checkSkuAvailability = (sku: string, excludeId?: string): Promise<{ available: boolean }> =>
  client.get('/inventory/check-sku', { params: { sku, ...(excludeId && { excludeId }) } }).then(r => r.data);

export const generateSku = (type: ItemType): Promise<{ sku: string }> =>
  client.get('/inventory/generate-sku', { params: { type } }).then(r => r.data);
