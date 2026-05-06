import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, ShoppingBag, FlaskConical, Package, AlertTriangle,
  TrendingUp, ArrowRight, CheckCircle
} from 'lucide-react';
import { getReportsSummary } from '../../api/reports';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Card from '../../components/ui/Card';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { formatKWD, formatDate } from '../../utils/format';

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reportsSummary'],
    queryFn: getReportsSummary,
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const orderStatuses = [
    { key: 'NEW', label: 'New', color: 'bg-sky-500' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-500' },
    { key: 'READY', label: 'Ready', color: 'bg-emerald-500' },
    { key: 'DELIVERED', label: 'Delivered', color: 'bg-slate-400' },
  ];
  const maxOrders = Math.max(...orderStatuses.map(s => data.ordersByStatus?.[s.key] ?? 0), 1);

  const collectionRate = data.totalBilled > 0
    ? Math.round((data.totalCollected / data.totalBilled) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-sky-50 rounded-xl"><Users size={18} className="text-sky-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customers</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.totalCustomers}</p>
          <p className="text-xs text-emerald-600 mt-1">+{data.newCustomersThisMonth} this month</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-50 rounded-xl"><ShoppingBag size={18} className="text-amber-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Orders</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.totalOrders}</p>
          <p className="text-xs text-emerald-600 mt-1">+{data.ordersThisMonth} this month</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-violet-50 rounded-xl"><FlaskConical size={18} className="text-violet-600" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Examinations</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.totalExaminations}</p>
          <p className="text-xs text-slate-400 mt-1">Total on record</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-red-50 rounded-xl"><AlertTriangle size={18} className="text-red-500" /></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Stock</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.lowStockItems?.length ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Items need restocking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Orders by Status</h3>
          <div className="space-y-4">
            {orderStatuses.map(({ key, label, color }) => {
              const count = data.ordersByStatus?.[key] ?? 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{count}</span>
                  </div>
                  <MiniBar value={count} max={maxOrders} color={color} />
                </div>
              );
            })}
          </div>
          <Link to="/orders" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 mt-4 transition-colors">
            View all orders <ArrowRight size={12} />
          </Link>
        </Card>

        {/* Collection Rate */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Billing & Collections</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-slate-600">Total Billed</span>
                <span className="text-sm font-bold text-slate-900">{formatKWD(data.totalBilled)}</span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-slate-600">Total Collected</span>
                <span className="text-sm font-bold text-emerald-700">{formatKWD(data.totalCollected)}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-sm text-slate-600">Outstanding</span>
                <span className="text-sm font-bold text-red-600">{formatKWD(data.totalBilled - data.totalCollected)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-12 text-right">{collectionRate}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Collection rate</p>
            </div>
          </div>
          <Link to="/invoices" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 mt-4 transition-colors">
            View all invoices <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Orders</h3>
          <Link to="/orders" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {data.recentOrders?.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">No orders yet</div>
          ) : (
            data.recentOrders?.map((order: any) => (
              <div key={order.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <ShoppingBag size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{order.customer?.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Low Stock Items */}
      {data.lowStockItems && data.lowStockItems.length > 0 && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-700">Low Stock Alerts</h3>
            </div>
            <Link to="/inventory" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 transition-colors">
              Manage inventory <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data.lowStockItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${item.quantity === 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <Package size={14} className={item.quantity === 0 ? 'text-red-500' : 'text-amber-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {[item.brand, item.model].filter(Boolean).join(' ') || item.category || '—'}
                  </p>
                  <p className="text-xs text-slate-500">{item.type}</p>
                </div>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                  item.quantity === 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.lowStockItems?.length === 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          <p className="text-sm text-emerald-800">All inventory items are adequately stocked.</p>
        </div>
      )}
    </div>
  );
}
