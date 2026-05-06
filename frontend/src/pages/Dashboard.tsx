import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, FileText, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { getCustomers } from '../api/customers';
import { getOrders } from '../api/orders';
import { getInvoices } from '../api/invoices';
import { getFinancialReport } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { OrderStatusBadge, InvoiceStatusBadge } from '../components/ui/Badge';
import { formatKWD, formatDate } from '../utils/format';
import { PageLoader } from '../components/ui/LoadingSpinner';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() });
  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => getOrders() });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: () => getInvoices() });
  const { data: financial } = useQuery({
    queryKey: ['financial'],
    queryFn: getFinancialReport,
    enabled: isAdmin,
  });

  if (isLoading) return <PageLoader />;

  const activeOrders = orders?.filter(o => o.status !== 'DELIVERED').length ?? 0;
  const unpaidInvoices = invoices?.filter(i => i.status !== 'PAID').length ?? 0;
  const recentOrders = orders?.slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={String(customers?.length ?? 0)}
          icon={<Users size={20} />}
          color="sky"
        />
        <StatCard
          label="Active Orders"
          value={String(activeOrders)}
          icon={<ShoppingBag size={20} />}
          color="amber"
        />
        <StatCard
          label="Unpaid Invoices"
          value={String(unpaidInvoices)}
          icon={<FileText size={20} />}
          color="red"
        />
        {isAdmin && financial ? (
          <StatCard
            label="Revenue (30d)"
            value={formatKWD(financial.recentRevenue)}
            icon={<TrendingUp size={20} />}
            color="emerald"
          />
        ) : (
          <StatCard
            label="Total Invoices"
            value={String(invoices?.length ?? 0)}
            icon={<FileText size={20} />}
            color="violet"
          />
        )}
      </div>

      {isAdmin && financial && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Billed</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatKWD(financial.totalBilled)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Collected</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatKWD(financial.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Outstanding</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatKWD(financial.totalOutstanding)}</p>
          </div>
        </div>
      )}

      {/* Order Status Overview */}
      {isAdmin && financial && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Orders by Status</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'NEW', label: 'New', color: 'bg-sky-50 text-sky-700' },
              { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
              { key: 'READY', label: 'Ready', color: 'bg-emerald-50 text-emerald-700' },
              { key: 'DELIVERED', label: 'Delivered', color: 'bg-slate-50 text-slate-600' },
            ].map(({ key, label, color }) => (
              <div key={key} className={`${color} rounded-lg p-3 text-center`}>
                <p className="text-2xl font-bold">{(financial.ordersByStatus as Record<string, number>)?.[key] ?? 0}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Orders */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Orders</h3>
          <Link to="/orders" className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 cursor-pointer transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">No orders yet</div>
          ) : (
            recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/orders`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                  <Clock size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{order.customer?.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  {order.invoice && <InvoiceStatusBadge status={order.invoice.status} />}
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
