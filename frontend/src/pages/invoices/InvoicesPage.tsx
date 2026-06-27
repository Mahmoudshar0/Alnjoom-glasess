import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, Printer, ChevronDown, ChevronUp, Trash2, ShoppingBag, Edit2, Search, X } from 'lucide-react';
import PeriodCollectiveReport from './PeriodCollectiveReport';
import { getInvoices, createInvoice, addPayment, deleteInvoice, updateInvoice, CreateInvoicePayload } from '../../api/invoices';
import { getOrders } from '../../api/orders';
import { getCustomers } from '../../api/customers';
import { Invoice, InvoiceStatus, Order } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { InvoiceStatusBadge, OrderStatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';

const tabs: { key: InvoiceStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNPAID', label: 'Unpaid' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'PAID', label: 'Paid' },
];

function toApiDateRange(from: string, to: string) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

function orderTotal(order: Order): number {
  return order.items.reduce((s, i) => s + i.price * i.quantity, 0);
}

export default function InvoicesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [appliedPeriod, setAppliedPeriod] = useState<{ from: string; to: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState('');

  const periodActive = !!appliedPeriod;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', activeTab, appliedPeriod?.from, appliedPeriod?.to],
    queryFn: () =>
      getInvoices({
        ...(activeTab !== 'ALL' ? { status: activeTab } : {}),
        ...(appliedPeriod ? toApiDateRange(appliedPeriod.from, appliedPeriod.to) : {}),
      }),
  });

  const applyPeriod = () => {
    if (!dateFromInput || !dateToInput) return;
    if (dateFromInput > dateToInput) {
      alert('The "From" date must be on or before the "To" date.');
      return;
    }
    setAppliedPeriod({ from: dateFromInput, to: dateToInput });
  };

  const clearPeriod = () => {
    setDateFromInput('');
    setDateToInput('');
    setAppliedPeriod(null);
  };

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() });

  // Load all orders for the selected customer (uninvoiced only)
  const { data: customerOrders } = useQuery({
    queryKey: ['orders', 'customer', selectedCustomerId],
    queryFn: () => getOrders({ customerId: selectedCustomerId }),
    enabled: !!selectedCustomerId,
    select: (data) => data.filter(o => !o.invoiceId),
  });

  const { register: regPay, handleSubmit: handlePay, reset: resetPay, formState: { isSubmitting: isPaying } } = useForm<any>();
  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { isSubmitting: isCreating } } = useForm<any>({
    defaultValues: { paidAmount: '0' },
  });
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<any>();

  const createMut = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      closeCreate();
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message ?? 'Failed to create invoice. Please try again.');
    },
  });

  const paymentMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => addPayment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setPaymentInvoice(null); resetPay({}); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { paymentMethod?: string; notes?: string; status?: InvoiceStatus; totalAmount?: number; paidAmount?: number };
    }) => updateInvoice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setEditingInvoice(null);
    },
  });

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    resetEdit({
      paymentMethod: inv.paymentMethod ?? '',
      notes:         inv.notes         ?? '',
      status:        inv.status,
      totalAmount:   inv.totalAmount.toFixed(3),
      paidAmount:    inv.paidAmount.toFixed(3),
    });
  };

  const onEditSubmit = (data: any) => {
    if (!editingInvoice) return;
    const totalAmount = parseFloat(data.totalAmount);
    const paidAmount  = parseFloat(data.paidAmount);
    if (isNaN(totalAmount) || isNaN(paidAmount) || totalAmount < 0 || paidAmount < 0) return;
    updateMut.mutate({
      id: editingInvoice.id,
      data: {
        paymentMethod: data.paymentMethod || undefined,
        notes:         data.notes         || undefined,
        status:        data.status        as InvoiceStatus,
        totalAmount,
        paidAmount,
      },
    });
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setSelectedCustomerId('');
    setSelectedOrderIds(new Set());
    setCreateError('');
    resetCreate({ paidAmount: '0' });
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectedTotal = useMemo(() => {
    if (!customerOrders) return 0;
    return customerOrders
      .filter(o => selectedOrderIds.has(o.id))
      .reduce((sum, o) => sum + orderTotal(o), 0);
  }, [customerOrders, selectedOrderIds]);

  const onCreateSubmit = (data: any) => {
    if (!selectedCustomerId) { setCreateError('Please select a customer.'); return; }
    if (selectedOrderIds.size === 0) { setCreateError('Please select at least one order.'); return; }
    setCreateError('');
    const paidAmount = parseFloat(data.paidAmount) || 0;
    createMut.mutate({
      customerId: selectedCustomerId,
      orderIds: Array.from(selectedOrderIds),
      paidAmount,
      paymentMethod: data.paymentMethod || undefined,
      notes: data.notes || undefined,
    });
  };

  const onPaySubmit = (data: any) => {
    if (!paymentInvoice) return;
    paymentMut.mutate({
      id: paymentInvoice.id,
      data: { amount: parseFloat(data.amount), method: data.method, date: data.date || undefined, notes: data.notes || undefined },
    });
  };

  if (isLoading) return <PageLoader />;

  const filteredInvoices = (invoices ?? []).filter(inv => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.customer?.phone?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = filteredInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  // For employees: compute today-only, self-only stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMyInvoices = !isAdmin
    ? (invoices ?? []).filter(inv => {
        const isToday = new Date(inv.createdAt) >= todayStart;
        const isMine  = inv.createdBy?.id === user?.id;
        return isToday && isMine;
      })
    : [];

  const summaryInvoices  = isAdmin ? filteredInvoices : todayMyInvoices;
  const summaryBilled    = summaryInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const summaryCollected = summaryInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const summaryOutstanding = summaryInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            {isAdmin ? 'Total Billed' : "Today's Billed"}
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatKWD(summaryBilled)}</p>
          {!isAdmin && <p className="text-xs text-slate-400 mt-0.5">Your sales today</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            {isAdmin ? 'Total Collected' : "Today's Collected"}
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatKWD(summaryCollected)}</p>
          {!isAdmin && <p className="text-xs text-slate-400 mt-0.5">Payments received today</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            {isAdmin ? 'Outstanding' : "Today's Outstanding"}
          </p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatKWD(summaryOutstanding)}</p>
          {!isAdmin && <p className="text-xs text-slate-400 mt-0.5">{todayMyInvoices.length} invoice{todayMyInvoices.length !== 1 ? 's' : ''} today</p>}
        </div>
      </div>

      {/* Tabs + Add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>New Invoice</Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          id="invoice-search"
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by customer name or phone..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Period: من — إلى */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">from</label>
          <input
            type="date"
            value={dateFromInput}
            onChange={e => setDateFromInput(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">to</label>
          <input
            type="date"
            value={dateToInput}
            onChange={e => setDateToInput(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <Button size="sm" onClick={applyPeriod} disabled={!dateFromInput || !dateToInput}>
          Show Period
        </Button>
        {periodActive && (
          <Button size="sm" variant="ghost" onClick={clearPeriod}>
            Clear Period
          </Button>
        )}
      </div>

      {periodActive && appliedPeriod ? (
        filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-sm text-slate-500">
            No invoices found for this period
          </div>
        ) : (
          <PeriodCollectiveReport
            invoices={filteredInvoices}
            dateFrom={appliedPeriod.from}
            dateTo={appliedPeriod.to}
          />
        )
      ) : (
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            {searchQuery ? (
              <>
                <Search size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No results for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-1">Try searching by a different name or phone number</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No invoices found</p>
            )}
          </div>
        ) : (
          filteredInvoices.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{inv.customer?.name}</p>
                    <InvoiceStatusBadge status={inv.status} />
                    <span className="text-xs text-slate-400">{inv.orders?.length ?? 0} order{(inv.orders?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(inv.createdAt)} · {inv.paymentMethod || 'No payment method'}{inv.createdBy ? ` · By: ${inv.createdBy.name}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatKWD(inv.totalAmount)}</p>
                  {inv.status !== 'PAID' && (
                    <p className="text-xs text-red-600">Rem: {formatKWD(inv.totalAmount - inv.paidAmount)}</p>
                  )}
                </div>
                {expanded === inv.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>

              {expanded === inv.id && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {/* Included orders */}
                  {inv.orders && inv.orders.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Orders Included</p>
                      <div className="space-y-2">
                        {inv.orders.map(order => (
                          <div key={order.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <ShoppingBag size={13} className="text-slate-400" />
                                <span className="text-xs font-medium text-slate-700">{formatDate(order.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <OrderStatusBadge status={order.status} />
                                <span className="text-xs font-bold text-slate-900">{formatKWD(orderTotal(order))}</span>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              {order.items.map(item => (
                                <div key={item.id} className="flex justify-between text-xs text-slate-500">
                                  <span>{item.inventoryItem ? `${item.inventoryItem.brand || ''} ${item.inventoryItem.model || ''}`.trim() : item.customItemName}</span>
                                  <span>{formatKWD(item.price)} × {item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment summary */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-xs text-slate-500">Total</p><p className="font-medium">{formatKWD(inv.totalAmount)}</p></div>
                    <div><p className="text-xs text-slate-500">Paid</p><p className="font-medium text-emerald-600">{formatKWD(inv.paidAmount)}</p></div>
                    <div><p className="text-xs text-slate-500">Remaining</p><p className="font-medium text-red-600">{formatKWD(inv.totalAmount - inv.paidAmount)}</p></div>
                  </div>

                  {/* Created by */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-600">Created by:</span>
                    <span>{inv.createdBy?.name ?? 'Unknown'}</span>
                  </div>

                  {/* Payment history */}
                  {inv.payments && inv.payments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment History ({inv.payments.length})</p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-3 py-2 text-left font-semibold text-slate-500 w-8">#</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">Date</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">Method</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-500">Notes</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-500">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {inv.payments.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-400 font-medium">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-700 font-medium">{formatDate(p.date)}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                                    {p.method}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-400 italic">{p.notes || '—'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{formatKWD(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                              <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-emerald-700">Total Paid</td>
                              <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700">{formatKWD(inv.paidAmount)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {inv.status !== 'PAID' && (
                      <Button size="sm" variant="secondary" leftIcon={<DollarSign size={14} />} onClick={() => setPaymentInvoice(inv)}>
                        Add Payment
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<Printer size={14} />} onClick={() => navigate(`/invoices/${inv.id}/print`)}>
                      Print
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" leftIcon={<Edit2 size={14} />} onClick={() => openEdit(inv)}>
                        Edit
                      </Button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => { if (confirm('Delete this invoice? Orders will be unlinked and can be re-invoiced.')) deleteMut.mutate(inv.id); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors px-2 py-1 rounded hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {/* ── Create Invoice Modal ── */}
      <Modal isOpen={isCreateOpen} onClose={closeCreate} title="New Invoice" size="xl">
        <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-5">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
          )}

          {/* Customer selection */}
          <SearchableSelect
            label="Customer"
            placeholder="Select customer..."
            searchPlaceholder="Search by name or phone..."
            options={(customers ?? []).map(c => ({ value: c.id, label: c.name, sublabel: c.phone }))}
            value={selectedCustomerId}
            onChange={val => { setSelectedCustomerId(val); setSelectedOrderIds(new Set()); setCreateError(''); }}
            required
          />

          {/* Order selection */}
          {selectedCustomerId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Select Orders to Include *</p>
                {customerOrders && customerOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOrderIds.size === customerOrders.length) setSelectedOrderIds(new Set());
                      else setSelectedOrderIds(new Set(customerOrders.map(o => o.id)));
                    }}
                    className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    {selectedOrderIds.size === customerOrders?.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {!customerOrders || customerOrders.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  No uninvoiced orders for this customer
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customerOrders.map(order => {
                    const total = orderTotal(order);
                    const checked = selectedOrderIds.has(order.id);
                    return (
                      <label
                        key={order.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOrder(order.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-900">{formatDate(order.createdAt)}</span>
                            <div className="flex items-center gap-2">
                              <OrderStatusBadge status={order.status} />
                              <span className="text-sm font-bold text-slate-900">{formatKWD(total)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''} ·{' '}
                            {order.items.map(i => i.inventoryItem ? `${i.inventoryItem.brand || ''} ${i.inventoryItem.model || ''}`.trim() : i.customItemName).filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Running total */}
              {selectedOrderIds.size > 0 && (
                <div className="mt-3 flex items-center justify-between p-3 bg-slate-900 text-white rounded-lg">
                  <span className="text-sm font-medium">{selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''} selected</span>
                  <span className="text-base font-bold">{formatKWD(selectedTotal)}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment section */}
          {selectedOrderIds.size > 0 && (
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <p className="text-sm font-medium text-slate-700">Payment (optional — for partial or full payment now)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Initial Payment (KWD)"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...regCreate('paidAmount')}
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave as 0 to pay later</p>
                </div>
                <Select label="Payment Method" {...regCreate('paymentMethod')}>
                  <option value="">Select...</option>
                  <option value="Cash">Cash</option>
                  <option value="KNET">KNET</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </Select>
              </div>
              <Textarea label="Notes" placeholder="Any notes..." {...regCreate('notes')} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreate} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              isLoading={isCreating || createMut.isPending}
              disabled={selectedOrderIds.size === 0}
              className="flex-1"
            >
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Invoice Modal ── */}
      <Modal isOpen={!!editingInvoice} onClose={() => setEditingInvoice(null)} title="Edit Invoice">
        {editingInvoice && (
          <form onSubmit={handleEdit(onEditSubmit)} className="space-y-4">
            {/* Read-only context */}
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center">
              <span className="font-medium text-slate-900">{editingInvoice.customer?.name}</span>
              <span className="text-slate-500">{formatDate(editingInvoice.createdAt)}</span>
            </div>

            {/* Financial amounts */}
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
              Editing amounts is a direct override. It does <strong>not</strong> add a payment history record — use "Add Payment" for that.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total Amount (KWD)"
                type="number"
                step="0.001"
                min="0"
                {...regEdit('totalAmount', { required: true, min: 0 })}
              />
              <Input
                label="Paid Amount (KWD)"
                type="number"
                step="0.001"
                min="0"
                {...regEdit('paidAmount', { required: true, min: 0 })}
              />
            </div>

            {/* Status override */}
            <Select label="Status" {...regEdit('status')}>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </Select>
            <p className="text-xs text-slate-400 -mt-3">
              If you change the amounts above, status will be overridden by whatever is selected here.
            </p>

            {/* Payment method & notes */}
            <Select label="Payment Method" {...regEdit('paymentMethod')}>
              <option value="">None</option>
              <option value="Cash">Cash</option>
              <option value="KNET">KNET</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </Select>
            <Textarea label="Notes" placeholder="Any notes..." {...regEdit('notes')} />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditingInvoice(null)} className="flex-1">Cancel</Button>
              <Button type="submit" isLoading={updateMut.isPending} className="flex-1">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add Payment Modal ── */}
      <Modal isOpen={!!paymentInvoice} onClose={() => { setPaymentInvoice(null); resetPay({}); }} title="Add Payment">
        {paymentInvoice && (
          <form onSubmit={handlePay(onPaySubmit)} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{paymentInvoice.customer?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-medium">{formatKWD(paymentInvoice.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><span className="font-medium text-emerald-600">{formatKWD(paymentInvoice.paidAmount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-slate-500 font-medium">Remaining</span><span className="font-bold text-red-600">{formatKWD(paymentInvoice.totalAmount - paymentInvoice.paidAmount)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount (KWD) *"
                type="number"
                step="0.001"
                placeholder="0.000"
                defaultValue={(paymentInvoice.totalAmount - paymentInvoice.paidAmount).toFixed(3)}
                {...regPay('amount', { required: true })}
              />
              <Input
                label="Payment Date *"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                {...regPay('date', { required: true })}
              />
            </div>
            <Select label="Method *" {...regPay('method', { required: true })}>
              <option value="">Select...</option>
              <option value="Cash">Cash</option>
              <option value="KNET">KNET</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </Select>
            <Input label="Notes" placeholder="Optional notes..." {...regPay('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setPaymentInvoice(null); resetPay({}); }} className="flex-1">Cancel</Button>
              <Button type="submit" isLoading={isPaying} className="flex-1">Record Payment</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
