import client from './client';
import { User } from '../types';

export const getEmployees = () =>
  client.get<User[]>('/employees').then(r => r.data);

export const createEmployee = (data: { name: string; email: string; password: string; role: string }) =>
  client.post<User>('/employees', data).then(r => r.data);

export const updateEmployee = (id: string, data: Partial<User> & { password?: string }) =>
  client.put<User>(`/employees/${id}`, data).then(r => r.data);

export const deleteEmployee = (id: string) =>
  client.delete(`/employees/${id}`).then(r => r.data);
