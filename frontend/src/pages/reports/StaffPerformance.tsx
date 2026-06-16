import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, ShoppingBag, FileText,
  ChevronDown, ChevronUp, Trophy, Award, Medal,
  Calendar, BarChart2,
} from 'lucide-react';
import { getStaffReport, StaffMemberStat } from '../../api/reports';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';

function toApiDate(dateStr: string, endOfDay = false) {
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy size={18} className="text-yellow-500" />;
  if (rank === 1) return <Award size={18} className="text-slate-400" />;
  if (rank === 2) return <Medal size={18} className="text-amber-600" />;
  return <span className="text-sm font-bold text-slate-400 w-[18px] text-center">{rank + 1}</span>;
}

function CollectionBar({ collected, billed }: { collected: number; billed: number }) {
  const pct = billed > 0 ? Math.min((collected / billed) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-500 w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

function StaffCard({
  stat,
  rank,
  expanded,
  onToggle,
}: {
  stat: StaffMemberStat;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const collectionRate = stat.totalBilled > 0
    ? (stat.totalCollected / stat.totalBilled) * 100
    : 0;

  const rankColors = [
    'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white',
    'border-slate-300 bg-gradient-to-br from-slate-50 to-white',
    'border-amber-300 bg-gradient-to-br from-amber-50 to-white',
  ];
  const cardClass = rankColors[rank] ?? 'border-slate-200 bg-white';

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${cardClass}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
        onClick={onToggle}
      >
        {/* Rank + avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <RankIcon rank={rank} />
          <div className="h-10 w-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {stat.user.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">{stat.user.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stat.user.role === 'ADMIN'
                ? 'bg-violet-100 text-violet-700'
                : 'bg-sky-100 text-sky-700'
            }`}>
              {stat.user.role === 'ADMIN' ? 'Admin' : 'Employee'}
            </span>
          </div>
          <div className="mt-1">
            <CollectionBar collected={stat.totalCollected} billed={stat.totalBilled} />
          </div>
        </div>

        {/* KPI grid */}
        <div className="hidden md:grid grid-cols-4 gap-6 text-right flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Orders</p>
            <p className="text-base font-bold text-slate-900">{stat.totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Invoices</p>
            <p className="text-base font-bold text-slate-900">{stat.totalInvoices}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Billed</p>
            <p className="text-base font-bold text-slate-900">{formatKWD(stat.totalBilled)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Collected</p>
            <p className="text-base font-bold text-emerald-600">{formatKWD(stat.totalCollected)}</p>
          </div>
        </div>

        {/* Mobile: just total */}
        <div className="md:hidden text-right flex-shrink-0">
          <p className="text-sm font-bold text-slate-900">{formatKWD(stat.totalBilled)}</p>
          <p className="text-xs text-emerald-600">{collectionRate.toFixed(0)}% collected</p>
        </div>

        {expanded
          ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </div>

      {/* Expanded daily table */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          {stat.daily.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No activity in this period</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar size={13} />
                Daily Breakdown ({stat.daily.length} day{stat.daily.length !== 1 ? 's' : ''})
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Date</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-500">Orders</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500 hidden sm:table-cell">Order Value</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-500">Invoices</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500">Billed</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500">Collected</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500 hidden sm:table-cell">Collection%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stat.daily.map(day => {
                      const dayPct = day.billed > 0 ? (day.collected / day.billed) * 100 : 0;
                      const pctColor = dayPct >= 90
                        ? 'text-emerald-600'
                        : dayPct >= 60
                        ? 'text-amber-600'
                        : day.billed > 0
                        ? 'text-red-500'
                        : 'text-slate-400';
                      return (
                        <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-medium text-slate-700">
                            {formatDate(day.date + 'T00:00:00')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {day.orders > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold">
                                {day.orders}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 hidden sm:table-cell">
                            {day.orderValue > 0 ? formatKWD(day.orderValue) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {day.invoices > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-bold">
                                {day.invoices}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {day.billed > 0 ? formatKWD(day.billed) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                            {day.collected > 0 ? formatKWD(day.collected) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className={`px-3 py-2 text-right font-bold hidden sm:table-cell ${pctColor}`}>
                            {day.billed > 0 ? `${dayPct.toFixed(0)}%` : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td className="px-3 py-2 font-semibold text-slate-300 text-xs">TOTAL</td>
                      <td className="px-3 py-2 text-center font-bold">{stat.totalOrders}</td>
                      <td className="px-3 py-2 text-right font-bold hidden sm:table-cell">{formatKWD(stat.totalOrderValue)}</td>
                      <td className="px-3 py-2 text-center font-bold">{stat.totalInvoices}</td>
                      <td className="px-3 py-2 text-right font-bold">{formatKWD(stat.totalBilled)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400">{formatKWD(stat.totalCollected)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-400 hidden sm:table-cell">
                        {collectionRate.toFixed(0)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffPerformance() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = (appliedFrom && appliedTo)
    ? { dateFrom: toApiDate(appliedFrom, false), dateTo: toApiDate(appliedTo, true) }
    : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['staffReport', appliedFrom, appliedTo],
    queryFn: () => getStaffReport(params),
  });

  const apply = () => {
    if (!dateFrom || !dateTo) return;
    if (dateFrom > dateTo) { alert('The "From" date must be on or before the "To" date.'); return; }
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setExpandedId(null);
  };

  const clear = () => {
    setDateFrom(''); setDateTo('');
    setAppliedFrom(''); setAppliedTo('');
    setExpandedId(null);
  };

  if (isLoading) return <PageLoader />;

  const stats = data?.staffStats ?? [];
  const totalBilled    = stats.reduce((s, x) => s + x.totalBilled, 0);
  const totalCollected = stats.reduce((s, x) => s + x.totalCollected, 0);
  const totalOrders    = stats.reduce((s, x) => s + x.totalOrders, 0);
  const totalInvoices  = stats.reduce((s, x) => s + x.totalInvoices, 0);

  return (
    <div className="space-y-5">

      {/* Date range filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
        <BarChart2 size={18} className="text-slate-400 self-center mb-0.5" />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <Button size="sm" onClick={apply} disabled={!dateFrom || !dateTo || isFetching}>
          {isFetching ? 'Loading...' : 'Apply'}
        </Button>
        {(appliedFrom || appliedTo) && (
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        )}
        {appliedFrom && appliedTo && (
          <p className="text-xs text-slate-500 self-center">
            Showing {formatDate(appliedFrom + 'T00:00:00')} — {formatDate(appliedTo + 'T00:00:00')}
          </p>
        )}
      </div>

      {/* Summary bar */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: String(totalOrders), icon: <ShoppingBag size={18} />, color: 'text-sky-600 bg-sky-50' },
            { label: 'Total Invoices', value: String(totalInvoices), icon: <FileText size={18} />, color: 'text-violet-600 bg-violet-50' },
            { label: 'Total Billed', value: formatKWD(totalBilled), icon: <TrendingUp size={18} />, color: 'text-slate-700 bg-slate-50' },
            { label: 'Total Collected', value: formatKWD(totalCollected), icon: <TrendingUp size={18} />, color: 'text-emerald-600 bg-emerald-50' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.color}`}>{item.icon}</div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff cards */}
      {stats.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Users size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No staff activity found</p>
          <p className="text-xs text-slate-400 mt-1">
            {appliedFrom ? 'Try adjusting the date range' : 'No orders or invoices have been created yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Trophy size={13} className="text-yellow-500" />
            {stats.length} staff member{stats.length !== 1 ? 's' : ''} · ranked by total billed
          </p>
          {stats.map((stat, i) => (
            <StaffCard
              key={stat.user.id}
              stat={stat}
              rank={i}
              expanded={expandedId === stat.user.id}
              onToggle={() => setExpandedId(expandedId === stat.user.id ? null : stat.user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
