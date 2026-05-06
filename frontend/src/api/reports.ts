import client from './client';
import { FinancialReport } from '../types';

export const getFinancialReport = () =>
  client.get<FinancialReport>('/reports/financial').then(r => r.data);

export const getReportsSummary = () =>
  client.get<any>('/reports/summary').then(r => r.data);
