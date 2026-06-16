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

// ── Staff Performance Report (Admin only) ──────────────────────────────────
router.get('/staff', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo   = req.query.dateTo   as string | undefined;

  const dateFilter = (dateFrom || dateTo) ? {
    createdAt: {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
    },
  } : {};

  // Fetch all invoices and orders in range, with createdBy
  const [invoices, orders, allUsers] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...dateFilter, createdById: { not: null } },
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        paidAmount: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { ...dateFilter, createdById: { not: null } },
      select: {
        id: true,
        createdAt: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, role: true } },
        items: { select: { price: true, quantity: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Helper: get YYYY-MM-DD string in local date
  const toDateStr = (d: Date) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Build per-user aggregation
  type DayData = { orders: number; orderValue: number; invoices: number; billed: number; collected: number };
  type UserStat = {
    user: { id: string; name: string; role: string };
    totalOrders: number;
    totalOrderValue: number;
    totalInvoices: number;
    totalBilled: number;
    totalCollected: number;
    daily: Record<string, DayData>;
  };

  const statsMap: Record<string, UserStat> = {};

  const getUser = (id: string, user: { id: string; name: string; role: string } | null) => {
    if (!id) return;
    if (!statsMap[id]) {
      statsMap[id] = {
        user: user ?? { id, name: 'Unknown', role: 'EMPLOYEE' },
        totalOrders: 0,
        totalOrderValue: 0,
        totalInvoices: 0,
        totalBilled: 0,
        totalCollected: 0,
        daily: {},
      };
    }
    return statsMap[id];
  };

  const getDay = (stat: UserStat, dateStr: string): DayData => {
    if (!stat.daily[dateStr]) {
      stat.daily[dateStr] = { orders: 0, orderValue: 0, invoices: 0, billed: 0, collected: 0 };
    }
    return stat.daily[dateStr];
  };

  // Aggregate orders
  for (const order of orders) {
    if (!order.createdById) continue;
    const stat = getUser(order.createdById, order.createdBy as any);
    if (!stat) continue;
    const value = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const day = getDay(stat, toDateStr(order.createdAt));
    stat.totalOrders++;
    stat.totalOrderValue += value;
    day.orders++;
    day.orderValue += value;
  }

  // Aggregate invoices
  for (const inv of invoices) {
    if (!inv.createdById) continue;
    const stat = getUser(inv.createdById, inv.createdBy as any);
    if (!stat) continue;
    const day = getDay(stat, toDateStr(inv.createdAt));
    stat.totalInvoices++;
    stat.totalBilled   += inv.totalAmount;
    stat.totalCollected += inv.paidAmount;
    day.invoices++;
    day.billed    += inv.totalAmount;
    day.collected += inv.paidAmount;
  }

  // Convert to sorted array (highest billed first)
  const staffStats = Object.values(statsMap)
    .sort((a, b) => b.totalBilled - a.totalBilled)
    .map(s => ({
      ...s,
      daily: Object.entries(s.daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
    }));

  return res.json({ staffStats, totalUsers: allUsers.length });
});

export default router;
