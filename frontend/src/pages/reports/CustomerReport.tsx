import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft } from 'lucide-react';
import { getCustomerReport } from '../../api/customers';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { OrderStatusBadge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { formatKWD, formatDate, signedFloat, formatAxis } from '../../utils/format';

export default function CustomerReport() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading } = useQuery({
    queryKey: ['customerReport', id],
    queryFn: () => getCustomerReport(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;
  if (!report) return null;

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="no-print flex items-center justify-between mb-6">
        <Link to={`/customers/${id}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
          <ArrowLeft size={16} /> Back to Profile
        </Link>
        <Button leftIcon={<Printer size={15} />} onClick={() => window.print()}>Print Report</Button>
      </div>

      {/* Printable content */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-4xl mx-auto print:border-none print:rounded-none print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">OptiVision</h1>
            <p className="text-sm text-slate-500">Optical Shop Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Report generated</p>
            <p className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Customer Information</h2>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-medium ml-2">{report.name}</span></div>
            <div><span className="text-slate-500">Phone:</span> <span className="font-medium ml-2">{report.phone}</span></div>
            {report.email && <div><span className="text-slate-500">Email:</span> <span className="font-medium ml-2">{report.email}</span></div>}
            {report.address && <div><span className="text-slate-500">Address:</span> <span className="font-medium ml-2">{report.address}</span></div>}
            {report.dateOfBirth && <div><span className="text-slate-500">DOB:</span> <span className="font-medium ml-2">{formatDate(report.dateOfBirth)}</span></div>}
            <div><span className="text-slate-500">Customer since:</span> <span className="font-medium ml-2">{formatDate(report.createdAt)}</span></div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Financial Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Billed</p>
              <p className="text-lg font-bold text-slate-900">{formatKWD(report.summary.totalBilled)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Paid</p>
              <p className="text-lg font-bold text-emerald-700">{formatKWD(report.summary.totalPaid)}</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${report.summary.outstanding > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-xs text-slate-500 mb-1">Outstanding</p>
              <p className={`text-lg font-bold ${report.summary.outstanding > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {formatKWD(report.summary.outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Examination History */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Examination History</h2>
          {report.examinations.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No examinations on record</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 border border-slate-200 text-xs font-semibold text-slate-600">Date</th>
                  <th className="text-left p-2 border border-slate-200 text-xs font-semibold text-slate-600">Doctor</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OD SPH</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OD CYL</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OD Axis</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OS SPH</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OS CYL</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">OS Axis</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">ADD</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">IPD</th>
                </tr>
              </thead>
              <tbody>
                {report.examinations.map((exam, i) => (
                  <tr key={exam.id} className={i === 0 ? 'bg-sky-50 font-medium' : ''}>
                    <td className="p-2 border border-slate-200">{formatDate(exam.date)}{i === 0 && ' ★'}</td>
                    <td className="p-2 border border-slate-200">{exam.doctor || '—'}</td>
                    <td className="p-2 border border-slate-200 text-center">{signedFloat(exam.rightSph)}</td>
                    <td className="p-2 border border-slate-200 text-center">{signedFloat(exam.rightCyl)}</td>
                    <td className="p-2 border border-slate-200 text-center">{formatAxis(exam.rightAxis)}</td>
                    <td className="p-2 border border-slate-200 text-center">{signedFloat(exam.leftSph)}</td>
                    <td className="p-2 border border-slate-200 text-center">{signedFloat(exam.leftCyl)}</td>
                    <td className="p-2 border border-slate-200 text-center">{formatAxis(exam.leftAxis)}</td>
                    <td className="p-2 border border-slate-200 text-center">{signedFloat(exam.add)}</td>
                    <td className="p-2 border border-slate-200 text-center">{exam.ipd ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order History */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Order History</h2>
          {report.orders.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No orders on record</p>
          ) : (
            <div className="space-y-3">
              {report.orders.map(order => (
                <div key={order.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">{formatDate(order.createdAt)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-slate-600 py-0.5">
                      <span>{item.inventoryItem ? `${item.inventoryItem.brand || ''} ${item.inventoryItem.model || ''}`.trim() : item.customItemName}</span>
                      <span>{formatKWD(item.price)} × {item.quantity} = {formatKWD(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice History */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Invoice History</h2>
          {report.invoices.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No invoices on record</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 border border-slate-200 text-xs font-semibold text-slate-600">Date</th>
                  <th className="text-right p-2 border border-slate-200 text-xs font-semibold text-slate-600">Total</th>
                  <th className="text-right p-2 border border-slate-200 text-xs font-semibold text-slate-600">Paid</th>
                  <th className="text-right p-2 border border-slate-200 text-xs font-semibold text-slate-600">Remaining</th>
                  <th className="text-center p-2 border border-slate-200 text-xs font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="p-2 border border-slate-200">{formatDate(inv.createdAt)}</td>
                    <td className="p-2 border border-slate-200 text-right">{formatKWD(inv.totalAmount)}</td>
                    <td className="p-2 border border-slate-200 text-right text-emerald-700">{formatKWD(inv.paidAmount)}</td>
                    <td className="p-2 border border-slate-200 text-right text-red-700">{formatKWD(inv.totalAmount - inv.paidAmount)}</td>
                    <td className="p-2 border border-slate-200 text-center"><InvoiceStatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>OptiVision — Optical Shop Management System · Confidential Customer Record</p>
        </div>
      </div>
    </div>
  );
}
