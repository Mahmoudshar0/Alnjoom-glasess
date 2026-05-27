import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import examinationRoutes from './routes/examinations';
import inventoryRoutes from './routes/inventory';
import orderRoutes from './routes/orders';
import invoiceRoutes from './routes/invoices';
import employeeRoutes from './routes/employees';
import reportRoutes from './routes/reports';
import backupRoutes, { initAutoBackup } from './routes/backup';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.5' }));

// Global error handler — catches Prisma constraint errors and any unhandled throws
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err?.code ?? err?.message ?? err);
  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'This SKU already exists. Please choose another SKU.', field: 'sku' });
  }
  if (err?.code === 'P2003') {
    return res.status(400).json({ message: 'Cannot complete: a related record is missing.' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.' });
  }
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

initAutoBackup();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OptiVision API running on port ${PORT}`);
});

export default app;
