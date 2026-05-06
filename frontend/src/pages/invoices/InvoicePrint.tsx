import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { getInvoice } from '../../api/invoices';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { formatKWD, formatDate } from '../../utils/format';

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!invoice) return (
    <div className="p-8 text-center text-slate-500">
      Invoice not found. <Link to="/invoices" className="text-sky-600 hover:underline">Back to invoices</Link>
    </div>
  );

  const orderItems = invoice.order?.items ?? [];
  const balance = invoice.totalAmount - invoice.paidAmount;

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <Button leftIcon={<Printer size={15} />} onClick={() => window.print()}>
          Print Invoice
        </Button>
      </div>

      {/* Printable invoice */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-3xl mx-auto print:border-none print:rounded-none print:shadow-none print:p-0 print:max-w-none">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-900">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">OptiVision</h1>
            <p className="text-sm text-slate-500 mt-1">Optical Shop Management System</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">INVOICE</p>
            <p className="text-sm text-slate-500 font-mono mt-1">{invoice.id.slice(0, 8).toUpperCase()}</p>
            <div className="mt-2">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Bill to + Invoice details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bill To</p>
            <p className="text-base font-semibold text-slate-900">{invoice.customer?.name ?? '—'}</p>
            {invoice.customer?.phone && (
              <p className="text-sm text-slate-600 mt-0.5">{invoice.customer.phone}</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-end gap-6">
                <span className="text-slate-500">Invoice Date</span>
                <span className="font-medium text-slate-900 w-32 text-right">{formatDate(invoice.createdAt)}</span>
              </div>
              {invoice.paymentMethod && (
                <div className="flex justify-end gap-6">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-medium text-slate-900 w-32 text-right">{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="text-left py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wide">Description</th>
                <th className="text-center py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wide w-20">Qty</th>
                <th className="text-right py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wide w-28">Unit Price</th>
                <th className="text-right py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wide w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length > 0 ? (
                orderItems.map((item, i) => {
                  const name = item.inventoryItem
                    ? [item.inventoryItem.brand, item.inventoryItem.model].filter(Boolean).join(' ')
                    : item.customItemName || '—';
                  return (
                    <tr key={item.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="py-3 text-slate-900 font-medium">
                        {name}
                        {item.notes && <p className="text-xs text-slate-500 font-normal mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700">{formatKWD(item.price)}</td>
                      <td className="py-3 text-right font-medium text-slate-900">{formatKWD(item.price * item.quantity)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400 text-xs italic">No line items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Total Amount</span>
              <span className="font-bold text-slate-900">{formatKWD(invoice.totalAmount)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid</span>
                <span className="font-medium">{formatKWD(invoice.paidAmount)}</span>
              </div>
            )}
            <div className={`flex justify-between pt-2 border-t-2 ${balance > 0 ? 'border-red-300 text-red-700' : 'border-emerald-300 text-emerald-700'}`}>
              <span className="font-bold text-base">Balance Due</span>
              <span className="font-bold text-base">{formatKWD(balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mb-6 bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Payment History</p>
            <div className="space-y-1.5">
              {invoice.payments.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{formatDate(p.date)} · {p.method}</span>
                  <span className="font-medium text-emerald-700">{formatKWD(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 text-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-slate-700">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
          <p>OptiVision — Optical Shop Management System</p>
          <p>Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
