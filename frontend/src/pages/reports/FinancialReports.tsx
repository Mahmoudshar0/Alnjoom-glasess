import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { getFinancialReport } from '../../api/reports';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';

export default function FinancialReports() {
  const { data: report, isLoading } = useQuery({ queryKey: ['financial'], queryFn: getFinancialReport });

  if (isLoading) return <PageLoader />;
  if (!report) return null;

  const collectionRate = report.totalBilled > 0 ? (report.totalRevenue / report.totalBilled) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatKWD(report.totalRevenue)} icon={<TrendingUp size={20} />} color="emerald" />
        <StatCard label="Total Billed" value={formatKWD(report.totalBilled)} icon={<DollarSign size={20} />} color="sky" />
        <StatCard label="Outstanding" value={formatKWD(report.totalOutstanding)} icon={<AlertCircle size={20} />} color="red" />
        <StatCard label="Last 30 Days" value={formatKWD(report.recentRevenue)} icon={<TrendingUp size={20} />} color="violet" />
      </div>

      {/* Collection rate */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Collection Rate</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-100 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-900 w-12 text-right">{collectionRate.toFixed(1)}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {formatKWD(report.totalRevenue)} collected of {formatKWD(report.totalBilled)} billed
        </p>
      </Card>

      {/* Orders by status */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Orders by Status</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'NEW', label: 'New', color: 'bg-sky-50 text-sky-700 border-sky-200' },
            { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { key: 'READY', label: 'Ready', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { key: 'DELIVERED', label: 'Delivered', color: 'bg-slate-50 text-slate-600 border-slate-200' },
          ].map(({ key, label, color }) => (
            <div key={key} className={`${color} border rounded-xl p-4 text-center`}>
              <p className="text-3xl font-bold">{(report.ordersByStatus as Record<string, number>)?.[key] ?? 0}</p>
              <p className="text-xs font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Invoice list */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Invoices</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {report.invoices.slice(0, 20).map(inv => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{inv.customer?.name}</p>
                <p className="text-xs text-slate-500">{formatDate(inv.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{formatKWD(inv.totalAmount)}</p>
                {inv.paidAmount < inv.totalAmount && (
                  <p className="text-xs text-red-500">Rem: {formatKWD(inv.totalAmount - inv.paidAmount)}</p>
                )}
              </div>
              <InvoiceStatusBadge status={inv.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
