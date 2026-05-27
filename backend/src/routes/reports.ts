import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticate);

router.get('/customer/:customerId', async (req: AuthRequest, res: Response) => {
  const familySelect = { id: true, name: true, phone: true, dateOfBirth: true };

  const customer = await prisma.customer.findUnique({
    where: { id: req.params.customerId },
    include: {
      parent: { select: familySelect },
      children: { select: familySelect, orderBy: { name: 'asc' } },
      examinations: { orderBy: { date: 'desc' } },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { inventoryItem: true } },
          invoice: { include: { payments: true } },
          examination: true,
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: { payments: true },
      },
    },
  });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });

  const totalBilled = customer.invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = customer.invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;

  return res.json({ ...customer, summary: { totalBilled, totalPaid, outstanding } });
});

router.get('/summary', async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalCustomers,
    newCustomersThisMonth,
    totalOrders,
    ordersThisMonth,
    ordersByStatus,
    totalExaminations,
    lowStockItems,
    invoiceStats,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.examination.count(),
    prisma.inventoryItem.findMany({
      where: { quantity: { lte: 10 } },
      orderBy: { quantity: 'asc' },
      take: 10,
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
    }),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true } },
      invoice: true,
    },
  });

  const byStatus: Record<string, number> = {};
  ordersByStatus.forEach((o) => { byStatus[o.status] = o._count.id; });

  return res.json({
    totalCustomers,
    newCustomersThisMonth,
    totalOrders,
    ordersThisMonth,
    totalExaminations,
    ordersByStatus: byStatus,
    lowStockItems,
    totalBilled: invoiceStats._sum.totalAmount ?? 0,
    totalCollected: invoiceStats._sum.paidAmount ?? 0,
    recentOrders,
  });
});

router.get('/financial', requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const [invoices, orders] = await Promise.all([
    prisma.invoice.findMany({
      include: { customer: { select: { name: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  const totalRevenue = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);

  const byStatus: Record<string, number> = {};
  orders.forEach((o) => { byStatus[o.status] = o._count.id; });

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentInvoices = invoices.filter((i) => new Date(i.createdAt) >= last30Days);
  const recentRevenue = recentInvoices.reduce((s, i) => s + i.paidAmount, 0);

  return res.json({
    totalRevenue,
    totalOutstanding,
    totalBilled,
    recentRevenue,
    ordersByStatus: byStatus,
    invoices: invoices.slice(0, 50),
  });
});

export default router;
