import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Invoice } from '../../types';
import Button from '../../components/ui/Button';
import { InvoiceStatusBadge, OrderStatusBadge } from '../../components/ui/Badge';
import { formatKWD, formatDate } from '../../utils/format';
import { exportPeriodInvoicesToExcel } from '../../utils/exportPeriodInvoicesExcel';

function orderTotal(order: Invoice['orders'][0]): number {
  return order.items.reduce((s, i) => s + i.price * i.quantity, 0);
}

interface Props {
  invoices: Invoice[];
  dateFrom: string;
  dateTo: string;
  showToolbar?: boolean;
}

export default function PeriodCollectiveReport({
  invoices,
  dateFrom,
  dateTo,
  showToolbar = true,
}: Props) {
  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = totalBilled - totalCollected;

  return (
    <div className="space-y-4">
      {showToolbar && (
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FileSpreadsheet size={14} />}
            onClick={() => exportPeriodInvoicesToExcel(invoices, dateFrom, dateTo)}
            disabled={invoices.length === 0}
          >
            Download Excel
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="px-6 py-5 border-b-2 border-slate-900 bg-slate-50/50">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Period Invoice Summary</h2>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-medium">from</span> {formatDate(dateFrom)}
                <span className="mx-2 text-slate-400">—</span>
                <span className="font-medium">to</span> {formatDate(dateTo)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} in this period
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Grand Total</p>
              <p className="text-2xl font-bold text-slate-900">{formatKWD(totalBilled)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
          <div className="bg-white px-5 py-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Billed</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{formatKWD(totalBilled)}</p>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Collected</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{formatKWD(totalCollected)}</p>
          </div>
          <div className="bg-white px-5 py-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-red-600 mt-1">{formatKWD(totalOutstanding)}</p>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {invoices.map((inv, idx) => {
            const balance = inv.totalAmount - inv.paidAmount;
            return (
              <div key={inv.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Invoice {idx + 1} of {invoices.length}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-slate-900">{inv.customer?.name ?? '—'}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(inv.createdAt)}
                      {inv.customer?.phone ? ` · ${inv.customer.phone}` : ''}
                      {inv.paymentMethod ? ` · ${inv.paymentMethod}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-slate-500">
                      Total <span className="font-bold text-slate-900 ml-2">{formatKWD(inv.totalAmount)}</span>
                    </p>
                    <p className="text-emerald-600">
                      Paid <span className="font-medium ml-2">{formatKWD(inv.paidAmount)}</span>
                    </p>
                    {balance > 0 && (
                      <p className="text-red-600">
                        Remaining <span className="font-medium ml-2">{formatKWD(balance)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {inv.orders?.map((order, oi) => (
                  <div key={order.id} className={oi > 0 ? 'mt-4' : ''}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Order {oi + 1} — {formatDate(order.createdAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-xs font-bold text-slate-900">{formatKWD(orderTotal(order))}</span>
                      </div>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="text-left py-1.5 font-semibold">Item</th>
                          <th className="text-center py-1.5 font-semibold w-12">Qty</th>
                          <th className="text-right py-1.5 font-semibold w-24">Price</th>
                          <th className="text-right py-1.5 font-semibold w-24">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map(item => {
                          const name = item.inventoryItem
                            ? [item.inventoryItem.brand, item.inventoryItem.model].filter(Boolean).join(' ')
                            : item.customItemName || '—';
                          return (
                            <tr key={item.id} className="border-b border-slate-50">
                              <td className="py-1.5 text-slate-800">{name}</td>
                              <td className="py-1.5 text-center text-slate-600">{item.quantity}</td>
                              <td className="py-1.5 text-right text-slate-600">{formatKWD(item.price)}</td>
                              <td className="py-1.5 text-right font-medium text-slate-900">
                                {formatKWD(item.price * item.quantity)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}

                {inv.payments && inv.payments.length > 0 && (
                  <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Payments</p>
                    {inv.payments.map(p => (
                      <div key={p.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-600">{formatDate(p.date)} · {p.method}</span>
                        <span className="font-medium text-emerald-600">{formatKWD(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {inv.notes && (
                  <p className="mt-2 text-xs text-slate-500 italic">Note: {inv.notes}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <span className="text-sm font-medium">Period Grand Total</span>
          <div className="text-right">
            <p className="text-lg font-bold">{formatKWD(totalBilled)}</p>
            <p className="text-xs text-slate-300">
              Collected: {formatKWD(totalCollected)} · Outstanding: {formatKWD(totalOutstanding)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
