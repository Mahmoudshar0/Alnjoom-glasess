import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, TrendingUp, ShoppingBag, FileText,
  ChevronDown, ChevronUp, Trophy, Award, Medal,
  Calendar, BarChart2, ExternalLink,
  X, CreditCard, Package, Printer, User,
  CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import { getStaffReport, StaffMemberStat } from '../../api/reports';
import { getInvoice } from '../../api/invoices';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';
import { Invoice, InvoiceStatus } from '../../types';

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

/* ─────────────────────────── Invoice Detail Modal ─────────────────────────── */

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; icon: React.ReactNode; cls: string; bg: string }> = {
  PAID:    { label: 'Paid',    icon: <CheckCircle size={14} />, cls: 'text-emerald-700', bg: 'bg-emerald-100' },
  PARTIAL: { label: 'Partial', icon: <Clock size={14} />,       cls: 'text-amber-700',   bg: 'bg-amber-100'   },
  UNPAID:  { label: 'Unpaid',  icon: <AlertCircle size={14} />, cls: 'text-red-700',     bg: 'bg-red-100'     },
};

function InvoiceDetailModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const handlePrint = () => {
    window.open(`/invoices/${invoiceId}/print`, '_blank');
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Invoice Details</h2>
              {invoice && (
                <p className="text-xs text-slate-400 font-mono">#{invoice.id.slice(-8).toUpperCase()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-600 hover:bg-sky-50 border border-sky-200 transition-colors"
                title="Print invoice"
              >
                <Printer size={13} />
                Print
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading invoice…</p>
            </div>
          ) : !invoice ? (
            <p className="text-sm text-slate-400 text-center py-10">Invoice not found.</p>
          ) : (
            <>
              {/* ── Meta row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Customer */}
                <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5">
                  <User size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Customer</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{invoice.customer?.name ?? '—'}</p>
                    {invoice.customer?.phone && (
                      <p className="text-xs text-slate-500">{invoice.customer.phone}</p>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5">
                  <Calendar size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Date</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5 col-span-2 sm:col-span-1">
                  <CreditCard size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Status</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${STATUS_CONFIG[invoice.status].bg} ${STATUS_CONFIG[invoice.status].cls}`}>
                      {STATUS_CONFIG[invoice.status].icon}
                      {STATUS_CONFIG[invoice.status].label}
                    </span>
                    {invoice.paymentMethod && (
                      <p className="text-xs text-slate-500 mt-0.5">{invoice.paymentMethod}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Orders & Items ── */}
              {invoice.orders && invoice.orders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <ShoppingBag size={12} />
                    Orders ({invoice.orders.length})
                  </p>
                  <div className="space-y-2">
                    {invoice.orders.map((order, oi) => (
                      <div key={order.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Order header */}
                        <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Package size={13} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700">Order #{oi + 1}</span>
                            <span className="text-xs text-slate-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'READY'     ? 'bg-sky-100 text-sky-700' :
                            order.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Items table */}
                        {order.items && order.items.length > 0 && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-3 py-1.5 text-left font-medium text-slate-400">Item</th>
                                <th className="px-3 py-1.5 text-center font-medium text-slate-400">Qty</th>
                                <th className="px-3 py-1.5 text-right font-medium text-slate-400">Unit Price</th>
                                <th className="px-3 py-1.5 text-right font-medium text-slate-400">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {order.items.map((item) => {
                                const name = item.inventoryItem
                                  ? [item.inventoryItem.brand, item.inventoryItem.model].filter(Boolean).join(' ') || item.inventoryItem.type
                                  : item.customItemName || 'Custom Item';
                                const typeLabel = item.inventoryItem
                                  ? item.inventoryItem.type.charAt(0) + item.inventoryItem.type.slice(1).toLowerCase()
                                  : null;
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2">
                                      <p className="font-medium text-slate-800">{name}</p>
                                      {typeLabel && (
                                        <p className="text-slate-400 text-[10px]">{typeLabel}{item.inventoryItem?.sku ? ` · ${item.inventoryItem.sku}` : ''}</p>
                                      )}
                                      {item.notes && <p className="text-slate-400 text-[10px] italic">{item.notes}</p>}
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                                    <td className="px-3 py-2 text-right text-slate-600">{formatKWD(item.price)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatKWD(item.price * item.quantity)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        {order.notes && (
                          <p className="px-3 py-2 text-xs text-slate-400 italic border-t border-slate-100">Note: {order.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Payment History ── */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <CreditCard size={12} />
                  Payment History ({invoice.payments?.length ?? 0})
                </p>
                {(invoice.payments?.length ?? 0) === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl px-4 py-6 text-center">
                    <p className="text-xs text-slate-400">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Date</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Method</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoice.payments.map((pmt, idx) => (
                          <tr key={pmt.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2 text-slate-700">{formatDate(pmt.date)}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium text-[11px]">
                                {pmt.method}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-600">{formatKWD(pmt.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {invoice.payments[0]?.notes && (
                      <p className="px-3 py-2 text-xs text-slate-400 italic border-t border-slate-100">
                        Note: {invoice.payments[0].notes}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Financial Summary ── */}
              <div className="rounded-xl bg-slate-900 text-white px-5 py-4 space-y-2.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Summary</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Billed</span>
                  <span className="text-sm font-bold">{formatKWD(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Collected</span>
                  <span className="text-sm font-bold text-emerald-400">{formatKWD(invoice.paidAmount)}</span>
                </div>
                {invoice.totalAmount - invoice.paidAmount > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                    <span className="text-sm text-slate-300">Outstanding Balance</span>
                    <span className="text-sm font-bold text-red-400">{formatKWD(invoice.totalAmount - invoice.paidAmount)}</span>
                  </div>
                )}
                {/* Collection progress bar */}
                <div className="pt-1">
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        invoice.status === 'PAID' ? 'bg-emerald-400' :
                        invoice.status === 'PARTIAL' ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{
                        width: invoice.totalAmount > 0
                          ? `${Math.min((invoice.paidAmount / invoice.totalAmount) * 100, 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-right">
                    {invoice.totalAmount > 0
                      ? `${((invoice.paidAmount / invoice.totalAmount) * 100).toFixed(0)}% collected`
                      : '0% collected'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
                  <p className="text-sm text-amber-800">{invoice.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Staff Card ─────────────────────────── */

function StaffCard({
  stat,
  rank,
  expanded,
  onToggle,
  onInvoiceClick,
}: {
  stat: StaffMemberStat;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  onInvoiceClick: (id: string) => void;
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
                  <div key={day.date} className="mb-4 last:mb-0">
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400" />
                        {formatDate(day.date + 'T00:00:00')}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {day.orders > 0 && (
                          <span className="flex items-center gap-1">
                            <ShoppingBag size={11} />{day.orders} order{day.orders !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`font-bold ${pctColor}`}>
                          {day.billed > 0 ? `${dayPct.toFixed(0)}% collected` : 'no invoices'}
                        </span>
                      </div>
                    </div>

                    {/* Invoice rows for this day */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Customer</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-500">Billed</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-500">Collected</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-500 hidden sm:table-cell">Balance</th>
                            <th className="px-3 py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(day.invoiceRows ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-3 text-center text-slate-300">No invoices</td>
                            </tr>
                          ) : (
                            (day.invoiceRows ?? []).map(inv => {
                              const balance = inv.totalAmount - inv.paidAmount;
                              return (
                                <tr
                                  key={inv.id}
                                  className="hover:bg-sky-50 transition-colors group cursor-pointer"
                                  onClick={() => onInvoiceClick(inv.id)}
                                  title="Click to view full invoice details"
                                >
                                  <td className="px-3 py-2 font-medium text-slate-800 group-hover:text-sky-700 transition-colors">
                                    {inv.customerName}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-700">
                                    {formatKWD(inv.totalAmount)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                                    {formatKWD(inv.paidAmount)}
                                  </td>
                                  <td className="px-3 py-2 text-right hidden sm:table-cell">
                                    <span className={balance > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}>
                                      {balance > 0 ? formatKWD(balance) : '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-300 group-hover:text-sky-600 group-hover:bg-sky-100 transition-colors">
                                      <ExternalLink size={12} />
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {/* Day totals footer */}
                        <tfoot>
                          <tr className="bg-slate-800 text-white">
                            <td className="px-3 py-1.5 text-slate-400 text-xs">Day Total</td>
                            <td className="px-3 py-1.5 text-right font-bold">{formatKWD(day.billed)}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-emerald-400">{formatKWD(day.collected)}</td>
                            <td className="px-3 py-1.5 text-right hidden sm:table-cell">
                              <span className={dayPct >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                                {dayPct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-3 py-1.5" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Grand total footer */}
              <div className="mt-4 rounded-lg bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wide">Total</span>
                <div className="flex items-center gap-6">
                  <span><span className="text-slate-400">Orders: </span><strong>{stat.totalOrders}</strong></span>
                  <span><span className="text-slate-400">Invoices: </span><strong>{stat.totalInvoices}</strong></span>
                  <span><span className="text-slate-400">Billed: </span><strong>{formatKWD(stat.totalBilled)}</strong></span>
                  <span><span className="text-slate-400">Collected: </span><strong className="text-emerald-400">{formatKWD(stat.totalCollected)}</strong></span>
                  <span className={`font-bold ${collectionRate >= 90 ? 'text-emerald-400' : collectionRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {collectionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────── */

export default function StaffPerformance() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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

      {/* Invoice detail modal */}
      {selectedInvoiceId && (
        <InvoiceDetailModal
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

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
              onInvoiceClick={(id) => setSelectedInvoiceId(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
