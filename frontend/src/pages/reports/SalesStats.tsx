import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingBag, TrendingUp, Package, Users, BarChart2,
  AlertTriangle, Star, ChevronUp, ChevronDown,
  Minus, ArrowUpRight, ArrowDownRight, Filter, RefreshCw,
} from 'lucide-react';
import { getSalesStats, SalesStatsParams } from '../../api/salesStats';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';

// ── Colour palette ─────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  FRAME:     '#0ea5e9',
  LENS:      '#8b5cf6',
  ACCESSORY: '#f59e0b',
};
const BRAND_COLORS = [
  '#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#a855f7','#84cc16','#fb923c','#e879f9',
  '#22d3ee','#4ade80','#facc15','#f87171','#c084fc',
];

// ── Date preset helpers ─────────────────────────────────────────────────────
type Preset = { label: string; from: string; to: string } | { label: 'Custom'; from: ''; to: '' };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function buildPresets(): Array<{ label: string; from: string; to: string }> {
  const now   = new Date();
  const today = isoDate(now);
  const yd    = new Date(now); yd.setDate(yd.getDate() - 1);
  const l7    = new Date(now); l7.setDate(l7.getDate() - 6);
  const l30   = new Date(now); l30.setDate(l30.getDate() - 29);
  const som   = new Date(now.getFullYear(), now.getMonth(), 1);
  const lmS   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmE   = new Date(now.getFullYear(), now.getMonth(), 0);
  const soy   = new Date(now.getFullYear(), 0, 1);
  return [
    { label: 'Today',      from: today,        to: today },
    { label: 'Yesterday',  from: isoDate(yd),  to: isoDate(yd) },
    { label: 'Last 7 Days',from: isoDate(l7),  to: today },
    { label: 'Last 30 Days',from: isoDate(l30),to: today },
    { label: 'This Month', from: isoDate(som), to: today },
    { label: 'Last Month', from: isoDate(lmS), to: isoDate(lmE) },
    { label: 'This Year',  from: isoDate(soy), to: today },
    { label: 'All Time',   from: '',           to: '' },
  ];
}

// ── Small reusable UI pieces ───────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, color = 'sky',
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color?: string;
}) {
  const colors: Record<string, string> = {
    sky:    'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald:'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-500',
    slate:  'bg-slate-100 text-slate-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>{icon}</div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-slate-400">{text}</div>
  );
}

// ── Custom Recharts tooltip ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, currency = true }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </span>
          <span className="font-bold text-slate-900">
            {currency && p.name?.toLowerCase().includes('revenue')
              ? formatKWD(p.value)
              : p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Sort state helper ──────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc';
function useSortable<T>(data: T[], defaultKey: keyof T, defaultDir: SortDir = 'desc') {
  const [key, setKey] = useState<keyof T>(defaultKey);
  const [dir, setDir] = useState<SortDir>(defaultDir);

  const toggle = (k: keyof T) => {
    if (k === key) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setKey(k); setDir('desc'); }
  };

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === 'asc' ? cmp : -cmp;
  }), [data, key, dir]);

  const Th = ({ col, label, className = '' }: { col: keyof T; label: string; className?: string }) => (
    <th
      className={`px-3 py-2.5 font-semibold text-slate-500 cursor-pointer hover:text-slate-800 select-none transition-colors ${className}`}
      onClick={() => toggle(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {key === col
          ? dir === 'desc'
            ? <ChevronDown size={12} />
            : <ChevronUp size={12} />
          : <Minus size={10} className="opacity-30" />}
      </span>
    </th>
  );

  return { sorted, Th, sortKey: key, sortDir: dir };
}

// ── Badge ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const cfg: Record<string, string> = {
    FRAME:     'bg-sky-100 text-sky-700',
    LENS:      'bg-violet-100 text-violet-700',
    ACCESSORY: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg[type] ?? 'bg-slate-100 text-slate-600'}`}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Out</span>;
  if (qty <= 5)  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{qty}</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{qty}</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function SalesStats() {
  const presets = buildPresets();
  const [preset, setPreset]       = useState('Last 30 Days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand,    setFilterBrand]    = useState('');

  // Build API params from active preset
  const activePreset = presets.find(p => p.label === preset);
  const params: SalesStatsParams = {};
  if (preset === 'Custom') {
    if (customFrom) params.dateFrom = `${customFrom}T00:00:00.000Z`;
    if (customTo)   params.dateTo   = `${customTo}T23:59:59.999Z`;
  } else if (activePreset && activePreset.from) {
    params.dateFrom = `${activePreset.from}T00:00:00.000Z`;
    params.dateTo   = `${activePreset.to}T23:59:59.999Z`;
  }
  if (filterEmployee) params.employeeId = filterEmployee;
  if (filterCategory) params.category   = filterCategory;
  if (filterBrand)    params.brand      = filterBrand;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['salesStats', params],
    queryFn:  () => getSalesStats(params),
    staleTime: 60_000,
  });

  // ── Sortable table state ─────────────────────────────────────────────────
  const topSort   = useSortable(data?.topProducts    ?? [], 'revenue');
  const slowSort  = useSortable(data?.slowMoving     ?? [], 'daysSinceLastSale', 'desc');
  const empSort   = useSortable(data?.employeeSales  ?? [], 'revenue');
  const brandSort = useSortable(data?.brandSummary   ?? [], 'revenue');

  if (isLoading) return <PageLoader />;

  const kpi = data?.kpi;

  // ── Month label formatter ──────────────────────────────────────────────
  const fmtMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };
  const fmtDay = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-6">

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Filter size={15} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">Period</span>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => { setPreset(p.label); setShowCustom(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p.label && !showCustom
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { setShowCustom(true); setPreset(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showCustom ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Custom
          </button>
          <button
            onClick={() => refetch()}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {showCustom && (
          <div className="flex flex-wrap items-end gap-3 mt-2 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            <option value="FRAME">Frames</option>
            <option value="LENS">Lenses</option>
            <option value="ACCESSORY">Accessories</option>
          </select>

          {filterCategory && (
            <button onClick={() => setFilterCategory('')}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">✕ category</button>
          )}
          {filterEmployee && (
            <button onClick={() => setFilterEmployee('')}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">✕ employee</button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Revenue"    value={formatKWD(kpi?.totalSalesRevenue ?? 0)} icon={<TrendingUp size={18}/>}  color="emerald" sub="from sold items" />
        <KpiCard label="Items Sold"       value={(kpi?.totalItemsSold ?? 0).toLocaleString()} icon={<ShoppingBag size={18}/>} color="sky"     sub="total units" />
        <KpiCard label="Total Orders"     value={(kpi?.totalOrders ?? 0).toLocaleString()} icon={<Package size={18}/>}    color="violet"  sub="with items" />
        <KpiCard label="Avg Order Value"  value={formatKWD(kpi?.avgOrderValue ?? 0)} icon={<BarChart2 size={18}/>}  color="amber"   sub="revenue ÷ orders" />
        <KpiCard label="Avg Items/Order"  value={(kpi?.avgItemsPerOrder ?? 0).toFixed(1)} icon={<Star size={18}/>}      color="slate"   sub="items per order" />
        <KpiCard label="Unique Products"  value={(kpi?.uniqueProductsSold ?? 0).toLocaleString()} icon={<Users size={18}/>} color="sky" sub="products with sales" />
      </div>

      {/* ── Revenue Trend (Area) + Category Donut ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart — spans 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader
            title="Revenue Over Time"
            sub={`${data?.dailyTrend?.length ?? 0} days with sales`}
          />
          {!data?.dailyTrend?.length ? <EmptyState text="No sales in selected period" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="qtyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v.toFixed(0)}`} />
                <YAxis yAxisId="qty" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue (KWD)" stroke="#0ea5e9" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
                <Area yAxisId="qty" type="monotone" dataKey="qty"     name="Items Sold"    stroke="#8b5cf6" fill="url(#qtyGrad)"    strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut chart — 1/3 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader title="Sales by Category" />
          {!data?.revenueByCategory?.length ? <EmptyState text="No data" /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.revenueByCategory}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3}
                  >
                    {data.revenueByCategory.map(d => (
                      <Cell key={d.category} fill={CAT_COLORS[d.category] ?? '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [formatKWD(Number(val)), String(name)]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {data.revenueByCategory.map(d => {
                  const total = data.revenueByCategory.reduce((s, x) => s + x.revenue, 0);
                  const pct   = total > 0 ? (d.revenue / total) * 100 : 0;
                  return (
                    <div key={d.category} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[d.category] ?? '#64748b' }} />
                      <span className="flex-1 text-slate-600">{d.category.charAt(0) + d.category.slice(1).toLowerCase()}</span>
                      <span className="text-slate-400">{d.qty} units</span>
                      <span className="font-semibold text-slate-800 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Monthly Bar + Brand Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader title="Monthly Revenue" sub="Revenue grouped by month" />
          {!data?.monthlyTrend?.length ? <EmptyState text="No monthly data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue (KWD)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders"  name="Orders"        fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top brands horizontal bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <SectionHeader title="Revenue by Brand" sub="Top 10 brands by revenue" />
          {!data?.revenueByBrand?.length ? <EmptyState text="No brand data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={data.revenueByBrand.slice(0, 10)}
                margin={{ top: 4, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="brand" width={80} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" name="Revenue (KWD)" radius={[0, 4, 4, 0]}>
                  {data.revenueByBrand.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Products Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Top Selling Products</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ranked by revenue — click column headers to sort</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {data?.topProducts?.length ?? 0} products
          </span>
        </div>
        {!data?.topProducts?.length ? <EmptyState text="No product sales in selected period" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-3 py-2.5 font-semibold text-slate-500 w-10">#</th>
                  <topSort.Th col="name"         label="Product"    className="text-left" />
                  <topSort.Th col="type"         label="Type"       className="text-left" />
                  <topSort.Th col="brand"        label="Brand"      className="text-left" />
                  <topSort.Th col="qtySold"      label="Qty Sold"   className="text-right" />
                  <topSort.Th col="revenue"      label="Revenue"    className="text-right" />
                  <topSort.Th col="avgPrice"     label="Avg Price"  className="text-right" />
                  <topSort.Th col="currentStock" label="In Stock"   className="text-right" />
                  <topSort.Th col="lastSoldDate" label="Last Sold"  className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topSort.sorted.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      {p.sku && <p className="text-slate-400 text-[10px] font-mono">{p.sku}</p>}
                    </td>
                    <td className="px-3 py-2.5"><TypeBadge type={p.type} /></td>
                    <td className="px-3 py-2.5 text-slate-600">{p.brand ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{p.qtySold}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{formatKWD(p.revenue)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{formatKWD(p.avgPrice)}</td>
                    <td className="px-3 py-2.5 text-right"><StockBadge qty={p.currentStock} /></td>
                    <td className="px-3 py-2.5 text-right text-slate-500">
                      {p.lastSoldDate ? formatDate(p.lastSoldDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Category Summary + Brand Summary ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Category Summary</h2>
          </div>
          {!data?.categorySummary?.length ? <EmptyState text="No data" /> : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Category</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Products</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Units</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Revenue</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Avg Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.categorySummary.map(c => {
                  const total = data.categorySummary.reduce((s, x) => s + x.revenue, 0);
                  const pct   = total > 0 ? (c.revenue / total) * 100 : 0;
                  return (
                    <tr key={c.category} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[c.category] ?? '#64748b' }} />
                          <TypeBadge type={c.category} />
                        </div>
                        <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1">
                          <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: CAT_COLORS[c.category] ?? '#64748b' }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{c.productCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{c.qtySold}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatKWD(c.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatKWD(c.avgPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Brand Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Brand Summary</h2>
            <p className="text-xs text-slate-400">Top 15 by revenue</p>
          </div>
          {!brandSort.sorted.length ? <EmptyState text="No brand data" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-2.5 font-semibold text-slate-500">#</th>
                    <brandSort.Th col="brand"        label="Brand"    className="text-left" />
                    <brandSort.Th col="productCount" label="Products" className="text-right" />
                    <brandSort.Th col="unitsSold"    label="Units"    className="text-right" />
                    <brandSort.Th col="revenue"      label="Revenue"  className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {brandSort.sorted.slice(0, 15).map((b, i) => (
                    <tr key={b.brand} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{b.brand}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{b.productCount}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{b.unitsSold}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatKWD(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Slow Moving Products ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Slow Moving Products</h2>
            <p className="text-xs text-slate-400 mt-0.5">Items with fewer than 3 sales — possible overstock or dead stock</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            {data?.slowMoving?.length ?? 0} items
          </span>
        </div>
        {!data?.slowMoving?.length ? (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-emerald-700">
            <ArrowUpRight size={16} className="text-emerald-500" /> All products are selling well in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <slowSort.Th col="name"              label="Product"           className="text-left" />
                  <slowSort.Th col="type"              label="Type"              className="text-left" />
                  <slowSort.Th col="lastSoldDate"      label="Last Sold"         className="text-left" />
                  <slowSort.Th col="daysSinceLastSale" label="Days Without Sale" className="text-right" />
                  <slowSort.Th col="currentStock"      label="In Stock"          className="text-right" />
                  <slowSort.Th col="qtySold"           label="Total Sold"        className="text-right" />
                  <slowSort.Th col="revenueEstimate"   label="Stock Value"       className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slowSort.sorted.map(p => (
                  <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      {p.sku && <p className="text-slate-400 text-[10px] font-mono">{p.sku}</p>}
                    </td>
                    <td className="px-3 py-2.5"><TypeBadge type={p.type} /></td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {p.lastSoldDate ? formatDate(p.lastSoldDate) : <span className="text-red-400 font-semibold">Never sold</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {p.daysSinceLastSale !== null
                        ? <span className={`font-bold ${p.daysSinceLastSale > 60 ? 'text-red-500' : p.daysSinceLastSale > 30 ? 'text-amber-500' : 'text-slate-700'}`}>{p.daysSinceLastSale}d</span>
                        : <span className="text-red-500 font-bold">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right"><StockBadge qty={p.currentStock} /></td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{p.qtySold}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{formatKWD(p.revenueEstimate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Low Stock Best Sellers ───────────────────────────────────────────── */}
      {(data?.lowStockBestSellers?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">⚠️ Low Stock Best Sellers</h2>
              <p className="text-xs text-slate-400 mt-0.5">Popular items running out — reorder recommended</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50 border-b border-red-100 text-left">
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Product</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">In Stock</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Units Sold</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Recommended Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {data!.lowStockBestSellers.map(p => (
                  <tr key={p.id} className="hover:bg-red-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.sku && <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>}
                        <TypeBadge type={p.type} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right"><StockBadge qty={p.currentStock} /></td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{p.qtySold}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-sky-600">
                        <ArrowUpRight size={12} /> {p.recommendedReorder} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Employee Sales Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Employee Sales by Items</h2>
          <p className="text-xs text-slate-400 mt-0.5">Orders & items sold per employee in selected period</p>
        </div>
        {!empSort.sorted.length ? <EmptyState text="No employee sales data" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 font-semibold text-slate-500 w-10">#</th>
                  <empSort.Th col="employeeName"  label="Employee"       className="text-left" />
                  <empSort.Th col="totalOrders"   label="Orders"         className="text-right" />
                  <empSort.Th col="itemsSold"     label="Items Sold"     className="text-right" />
                  <empSort.Th col="revenue"       label="Revenue"        className="text-right" />
                  <empSort.Th col="avgOrderValue" label="Avg Order Val." className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {empSort.sorted.map((e, i) => {
                  const maxRev = empSort.sorted[0]?.revenue ?? 1;
                  const pct    = maxRev > 0 ? (e.revenue / maxRev) * 100 : 0;
                  return (
                    <tr key={e.employeeId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                            {e.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{e.employeeName}</p>
                            <div className="w-24 bg-slate-100 rounded-full h-1 mt-1">
                              <div className="h-1 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{e.totalOrders}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{e.itemsSold}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatKWD(e.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatKWD(e.avgOrderValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
