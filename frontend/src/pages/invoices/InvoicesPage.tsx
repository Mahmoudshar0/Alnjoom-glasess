import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { getInvoices, createInvoice, addPayment } from '../../api/invoices';
import { getOrders } from '../../api/orders';
import { Invoice, InvoiceStatus } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';

const tabs: { key: InvoiceStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNPAID', label: 'Unpaid' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'PAID', label: 'Paid' },
];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', activeTab],
    queryFn: () => getInvoices(activeTab !== 'ALL' ? { status: activeTab } : undefined),
  });
  const { data: orders } = useQuery({
    queryKey: ['orders', 'no-invoice'],
    queryFn: () => getOrders(),
    select: (data) => data.filter(o => !o.invoice),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, watch: watchCreate, setValue: setCreateValue, formState: { isSubmitting: isCreating } } = useForm<any>();
  const { register: regPay, handleSubmit: handlePay, reset: resetPay, formState: { isSubmitting: isPaying } } = useForm<any>();

  const watchOrderId = watchCreate('orderId');

  const createMut = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['orders'] }); setIsCreateOpen(false); resetCreate({}); },
  });

  const paymentMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => addPayment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setPaymentInvoice(null); resetPay({}); },
  });

  const handleOrderSelect = (orderId: string) => {
    const order = orders?.find(o => o.id === orderId);
    if (order) {
      const total = order.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      setCreateValue('totalAmount', total.toFixed(3));
    }
  };

  const onCreateSubmit = (data: any) => {
    const order = orders?.find(o => o.id === data.orderId);
    createMut.mutate({
      orderId: data.orderId,
      customerId: order?.customerId || data.customerId,
      totalAmount: parseFloat(data.totalAmount),
      paidAmount: parseFloat(data.paidAmount) || 0,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
  };

  const onPaySubmit = (data: any) => {
    if (!paymentInvoice) return;
    paymentMut.mutate({
      id: paymentInvoice.id,
      data: { amount: parseFloat(data.amount), method: data.method, notes: data.notes },
    });
  };

  if (isLoading) return <PageLoader />;

  const totalOutstanding = invoices?.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Billed</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatKWD(invoices?.reduce((s, i) => s + i.totalAmount, 0) ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Collected</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatKWD(invoices?.reduce((s, i) => s + i.paidAmount, 0) ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatKWD(totalOutstanding)}</p>
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

      {/* Invoices list */}
      <div className="space-y-3">
        {invoices?.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-sm text-slate-500">No invoices found</div>
        ) : (
          invoices?.map(inv => (
            <div key={inv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{inv.customer?.name}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(inv.createdAt)} · {inv.paymentMethod || 'No payment method'}</p>
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
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-xs text-slate-500">Total</p><p className="font-medium">{formatKWD(inv.totalAmount)}</p></div>
                    <div><p className="text-xs text-slate-500">Paid</p><p className="font-medium text-emerald-600">{formatKWD(inv.paidAmount)}</p></div>
                    <div><p className="text-xs text-slate-500">Remaining</p><p className="font-medium text-red-600">{formatKWD(inv.totalAmount - inv.paidAmount)}</p></div>
                  </div>

                  {inv.payments && inv.payments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Payment History</p>
                      {inv.payments.map(p => (
                        <div key={p.id} className="flex justify-between text-sm py-1">
                          <span className="text-slate-600">{formatDate(p.date)} · {p.method}</span>
                          <span className="font-medium text-emerald-600">{formatKWD(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {inv.status !== 'PAID' && (
                      <Button size="sm" variant="secondary" leftIcon={<DollarSign size={14} />} onClick={() => setPaymentInvoice(inv)}>
                        Add Payment
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" leftIcon={<Printer size={14} />} onClick={() => navigate(`/invoices/${inv.id}/print`)}>
                      Print Invoice
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetCreate({}); }} title="New Invoice">
        <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-4">
          <Select label="Order *" {...regCreate('orderId', { required: true })}
            onChange={(e) => { regCreate('orderId').onChange(e); handleOrderSelect(e.target.value); }}>
            <option value="">Select order...</option>
            {orders?.map(o => <option key={o.id} value={o.id}>{o.customer?.name} — {formatDate(o.createdAt)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total Amount (KWD) *" type="number" step="0.001" placeholder="0.000" {...regCreate('totalAmount', { required: true })} />
            <Input label="Initial Payment (KWD)" type="number" step="0.001" placeholder="0.000" {...regCreate('paidAmount')} />
          </div>
          <Select label="Payment Method" {...regCreate('paymentMethod')}>
            <option value="">Select...</option>
            <option value="Cash">Cash</option>
            <option value="KNET">KNET</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </Select>
          <Textarea label="Notes" {...regCreate('notes')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setIsCreateOpen(false); resetCreate({}); }} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={isCreating} className="flex-1">Create Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Add Payment Modal */}
      <Modal isOpen={!!paymentInvoice} onClose={() => { setPaymentInvoice(null); resetPay({}); }} title="Add Payment">
        {paymentInvoice && (
          <form onSubmit={handlePay(onPaySubmit)} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{paymentInvoice.customer?.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Remaining</span><span className="font-medium text-red-600">{formatKWD(paymentInvoice.totalAmount - paymentInvoice.paidAmount)}</span></div>
            </div>
            <Input label="Amount (KWD) *" type="number" step="0.001" placeholder="0.000"
              defaultValue={(paymentInvoice.totalAmount - paymentInvoice.paidAmount).toFixed(3)}
              {...regPay('amount', { required: true })} />
            <Select label="Method *" {...regPay('method', { required: true })}>
              <option value="">Select...</option>
              <option value="Cash">Cash</option>
              <option value="KNET">KNET</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </Select>
            <Input label="Notes" {...regPay('notes')} />
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
