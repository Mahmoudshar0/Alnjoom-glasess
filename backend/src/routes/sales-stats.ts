import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();
router.use(authenticate);

// ── GET /api/sales-stats ─────────────────────────────────────────────────────
// Admin-only: full item-level sales analytics
router.get('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const dateFrom   = req.query.dateFrom   as string | undefined;
  const dateTo     = req.query.dateTo     as string | undefined;
  const employeeId = req.query.employeeId as string | undefined;
  const category   = req.query.category   as string | undefined;
  const brand      = req.query.brand      as string | undefined;

  const orderDateFilter: Record<string, any> = {};
  if (dateFrom) orderDateFilter.gte = new Date(dateFrom);
  if (dateTo)   orderDateFilter.lte = new Date(dateTo);

  // ── Fetch all OrderItems in scope ─────────────────────────────────────────
  const rawItems = await prisma.orderItem.findMany({
    where: {
      inventoryItemId: { not: null },
      order: {
        ...(Object.keys(orderDateFilter).length ? { createdAt: orderDateFilter } : {}),
        ...(employeeId ? { createdById: employeeId } : {}),
      },
      ...(category || brand
        ? {
            inventoryItem: {
              ...(category ? { type: category as 'FRAME' | 'LENS' | 'ACCESSORY' } : {}),
              ...(brand    ? { brand: { equals: brand, mode: 'insensitive' } }       : {}),
            },
          }
        : {}),
    },
    include: {
      inventoryItem: true,
      order: {
        select: {
          id: true,
          createdAt: true,
          createdById: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  // ── Fetch all inventory items (for slow-moving / low-stock analysis) ──────
  const allInventory = await prisma.inventoryItem.findMany({
    where: {
      ...(category ? { type: category as 'FRAME' | 'LENS' | 'ACCESSORY' } : {}),
      ...(brand    ? { brand: { equals: brand, mode: 'insensitive' } }      : {}),
    },
  });

  // ── KPI aggregation ──────────────────────────────────────────────────────
  let totalItemsSold = 0;
  let totalSalesRevenue = 0;
  const orderIds = new Set<string>();
  const productIds = new Set<string>();

  for (const item of rawItems) {
    totalItemsSold    += item.quantity;
    totalSalesRevenue += item.price * item.quantity;
    orderIds.add(item.order.id);
    if (item.inventoryItemId) productIds.add(item.inventoryItemId);
  }

  const totalOrders      = orderIds.size;
  const avgOrderValue    = totalOrders > 0 ? totalSalesRevenue / totalOrders : 0;
  const avgItemsPerOrder = totalOrders > 0 ? totalItemsSold / totalOrders    : 0;

  // ── Revenue by Category (donut) ──────────────────────────────────────────
  const catMap: Record<string, { revenue: number; qty: number }> = {};
  for (const item of rawItems) {
    const type = item.inventoryItem?.type ?? 'UNKNOWN';
    if (!catMap[type]) catMap[type] = { revenue: 0, qty: 0 };
    catMap[type].revenue += item.price * item.quantity;
    catMap[type].qty     += item.quantity;
  }
  const revenueByCategory = Object.entries(catMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Revenue by Brand (horizontal bar) ────────────────────────────────────
  const brandMap: Record<string, { revenue: number; qty: number; productIds: Set<string> }> = {};
  for (const item of rawItems) {
    const b = item.inventoryItem?.brand ?? '(No Brand)';
    if (!brandMap[b]) brandMap[b] = { revenue: 0, qty: 0, productIds: new Set() };
    brandMap[b].revenue += item.price * item.quantity;
    brandMap[b].qty     += item.quantity;
    if (item.inventoryItemId) brandMap[b].productIds.add(item.inventoryItemId);
  }
  const revenueByBrand = Object.entries(brandMap)
    .map(([brand, v]) => ({ brand, revenue: v.revenue, qty: v.qty, productCount: v.productIds.size }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  // ── Daily Trend (area chart) ─────────────────────────────────────────────
  const dailyMap: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const item of rawItems) {
    const d = item.order.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!dailyMap[key]) dailyMap[key] = { revenue: 0, qty: 0, orders: new Set() };
    dailyMap[key].revenue += item.price * item.quantity;
    dailyMap[key].qty     += item.quantity;
    dailyMap[key].orders.add(item.order.id);
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: v.revenue, qty: v.qty, orders: v.orders.size }));

  // ── Monthly Trend (bar chart) ─────────────────────────────────────────────
  const monthMap: Record<string, { revenue: number; qty: number; orders: Set<string> }> = {};
  for (const item of rawItems) {
    const d = item.order.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!monthMap[key]) monthMap[key] = { revenue: 0, qty: 0, orders: new Set() };
    monthMap[key].revenue += item.price * item.quantity;
    monthMap[key].qty     += item.quantity;
    monthMap[key].orders.add(item.order.id);
  }
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, revenue: v.revenue, qty: v.qty, orders: v.orders.size }));

  // ── Per-product aggregation ───────────────────────────────────────────────
  type ProdStat = {
    id: string;
    name: string;
    sku: string | null;
    brand: string | null;
    type: string;
    qtySold: number;
    revenue: number;
    lastSoldDate: Date | null;
    price: number; // catalogue price
  };
  const prodMap: Record<string, ProdStat> = {};

  for (const item of rawItems) {
    if (!item.inventoryItemId || !item.inventoryItem) continue;
    const inv = item.inventoryItem;
    const name = [inv.brand, inv.model].filter(Boolean).join(' ') || inv.type;
    if (!prodMap[inv.id]) {
      prodMap[inv.id] = {
        id: inv.id,
        name,
        sku: inv.sku ?? null,
        brand: inv.brand ?? null,
        type: inv.type,
        qtySold: 0,
        revenue: 0,
        lastSoldDate: null,
        price: inv.price,
      };
    }
    prodMap[inv.id].qtySold  += item.quantity;
    prodMap[inv.id].revenue  += item.price * item.quantity;
    const d = item.order.createdAt;
    if (!prodMap[inv.id].lastSoldDate || d > prodMap[inv.id].lastSoldDate!) {
      prodMap[inv.id].lastSoldDate = d;
    }
  }

  // Build inventory lookup for currentStock
  const stockLookup: Record<string, number> = {};
  for (const inv of allInventory) stockLookup[inv.id] = inv.quantity;

  // ── Top Products ─────────────────────────────────────────────────────────
  const topProducts = Object.values(prodMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      type: p.type,
      qtySold: p.qtySold,
      revenue: p.revenue,
      avgPrice: p.qtySold > 0 ? p.revenue / p.qtySold : 0,
      currentStock: stockLookup[p.id] ?? 0,
      lastSoldDate: p.lastSoldDate?.toISOString() ?? null,
    }));

  // ── Slow Moving Products ─────────────────────────────────────────────────
  // Items in inventory that have few/no sales in the selected period
  const now = new Date();
  const slowMoving = allInventory
    .map(inv => {
      const sold = prodMap[inv.id];
      const lastSold = sold?.lastSoldDate ?? null;
      const daysSinceLastSale = lastSold
        ? Math.floor((now.getTime() - lastSold.getTime()) / 86_400_000)
        : null;
      return {
        id: inv.id,
        name: [inv.brand, inv.model].filter(Boolean).join(' ') || inv.type,
        sku: inv.sku ?? null,
        type: inv.type,
        currentStock: inv.quantity,
        qtySold: sold?.qtySold ?? 0,
        lastSoldDate: lastSold?.toISOString() ?? null,
        daysSinceLastSale,
        revenueEstimate: inv.quantity * inv.price,
      };
    })
    .filter(p => p.qtySold < 3 && p.currentStock > 0)
    .sort((a, b) => {
      // never sold → top; then sort by days without sale descending
      if (a.daysSinceLastSale === null && b.daysSinceLastSale === null) return b.currentStock - a.currentStock;
      if (a.daysSinceLastSale === null) return -1;
      if (b.daysSinceLastSale === null) return 1;
      return b.daysSinceLastSale - a.daysSinceLastSale;
    })
    .slice(0, 15);

  // ── Low Stock Best Sellers ────────────────────────────────────────────────
  const lowStockBestSellers = Object.values(prodMap)
    .filter(p => (stockLookup[p.id] ?? 0) <= 5 && p.qtySold >= 3)
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      type: p.type,
      currentStock: stockLookup[p.id] ?? 0,
      qtySold: p.qtySold,
      recommendedReorder: Math.ceil(p.qtySold * 1.5),
    }));

  // ── Employee Sales ────────────────────────────────────────────────────────
  const empMap: Record<string, {
    id: string; name: string;
    totalOrders: Set<string>; itemsSold: number; revenue: number;
  }> = {};
  for (const item of rawItems) {
    if (!item.order.createdById || !item.order.createdBy) continue;
    const { id, name } = item.order.createdBy;
    if (!empMap[id]) empMap[id] = { id, name, totalOrders: new Set(), itemsSold: 0, revenue: 0 };
    empMap[id].totalOrders.add(item.order.id);
    empMap[id].itemsSold += item.quantity;
    empMap[id].revenue   += item.price * item.quantity;
  }
  const employeeSales = Object.values(empMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map(e => ({
      employeeId: e.id,
      employeeName: e.name,
      totalOrders: e.totalOrders.size,
      itemsSold: e.itemsSold,
      revenue: e.revenue,
      avgOrderValue: e.totalOrders.size > 0 ? e.revenue / e.totalOrders.size : 0,
    }));

  // ── Category Summary ──────────────────────────────────────────────────────
  const catSummaryMap: Record<string, {
    productIds: Set<string>; qtySold: number; revenue: number; prices: number[];
  }> = {};
  for (const item of rawItems) {
    const type = item.inventoryItem?.type ?? 'UNKNOWN';
    if (!catSummaryMap[type]) catSummaryMap[type] = { productIds: new Set(), qtySold: 0, revenue: 0, prices: [] };
    catSummaryMap[type].qtySold  += item.quantity;
    catSummaryMap[type].revenue  += item.price * item.quantity;
    if (item.inventoryItemId) catSummaryMap[type].productIds.add(item.inventoryItemId);
    catSummaryMap[type].prices.push(item.price);
  }
  const categorySummary = Object.entries(catSummaryMap).map(([category, v]) => ({
    category,
    productCount: v.productIds.size,
    qtySold: v.qtySold,
    revenue: v.revenue,
    avgPrice: v.prices.length > 0 ? v.prices.reduce((a, b) => a + b, 0) / v.prices.length : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // ── Brand Summary ─────────────────────────────────────────────────────────
  const brandSummary = Object.entries(brandMap)
    .map(([brand, v]) => ({ brand, revenue: v.revenue, unitsSold: v.qty, productCount: v.productIds.size }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  return res.json({
    kpi: {
      totalItemsSold,
      totalSalesRevenue,
      avgOrderValue,
      totalOrders,
      avgItemsPerOrder: parseFloat(avgItemsPerOrder.toFixed(1)),
      uniqueProductsSold: productIds.size,
    },
    revenueByCategory,
    revenueByBrand,
    dailyTrend,
    monthlyTrend,
    topProducts,
    slowMoving,
    lowStockBestSellers,
    employeeSales,
    categorySummary,
    brandSummary,
  });
});

export default router;
