import client from './client';
import { Examination } from '../types';

export interface ExaminationWithCustomer extends Examination {
  customer?: { id: string; name: string; phone: string };
}

export const getAllExaminations = (q?: string) =>
  client.get<ExaminationWithCustomer[]>('/examinations', { params: q ? { q } : {} }).then(r => r.data);

export const getExaminations = (customerId: string) =>
  client.get<Examination[]>(`/examinations/customer/${customerId}`).then(r => r.data);

export const getExamination = (id: string) =>
  client.get<Examination>(`/examinations/${id}`).then(r => r.data);

export const createExamination = (data: Partial<Examination>) =>
  client.post<ExaminationWithCustomer>('/examinations', data).then(r => r.data);

export const updateExamination = (id: string, data: Partial<Examination>) =>
  client.put<ExaminationWithCustomer>(`/examinations/${id}`, data).then(r => r.data);

export const deleteExamination = (id: string) =>
  client.delete(`/examinations/${id}`).then(r => r.data);
