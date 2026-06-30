import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, Languages } from 'lucide-react';
import { getInvoice } from '../../api/invoices';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { InvoiceStatusBadge } from '../../components/ui/Badge';
import { formatKWD } from '../../utils/format';

type PrintLang = 'en' | 'ar';

function formatPrintDate(dateStr: string, lang: PrintLang): string {
  return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-KW' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const PAYMENT_METHOD_AR: Record<string, string> = {
  Cash: 'نقدي',
  KNET: 'كي نت',
  'Credit Card': 'بطاقة ائتمان',
  'Bank Transfer': 'تحويل بنكي',
};

function paymentMethodLabel(method: string, lang: PrintLang): string {
  if (lang === 'en') return method;
  return PAYMENT_METHOD_AR[method] ?? method;
}

const COPY: Record<
  PrintLang,
  {
    back: string;
    print: string;
    switchToAr: string;
    switchToEn: string;
    invoiceTitle: string;
    billTo: string;
    invoiceDate: string;
    orders: string;
    paymentMethod: string;
    createdBy: string;
    order: string;
    description: string;
    qty: string;
    unitPrice: string;
    amount: string;
    orderSubtotal: string;
    grandTotal: string;
    amountPaid: string;
    balanceDue: string;
    paymentHistory: string;
    noPayments: string;
    notes: string;
    footerShop: string;
    printed: string;
    noLineItems: string;
    notFound: string;
    notFoundLink: string;
  }
> = {
  en: {
    back: 'Back',
    print: 'Print Invoice',
    switchToAr: 'العربية',
    switchToEn: 'English',
    invoiceTitle: 'INVOICE',
    billTo: 'Bill To',
    invoiceDate: 'Invoice Date',
    orders: 'Orders',
    paymentMethod: 'Payment Method',
    createdBy: 'Prepared by',
    order: 'Order',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    orderSubtotal: 'Order subtotal',
    grandTotal: 'Grand Total',
    amountPaid: 'Amount Paid',
    balanceDue: 'Balance Due',
    paymentHistory: 'Payment History',
    noPayments: 'No payments have been made yet.',
    notes: 'Notes',
    footerShop: 'Al Najoom — +965 50127250',
    printed: 'Printed:',
    noLineItems: 'No line items',
    notFound: 'Invoice not found.',
    notFoundLink: 'Back to invoices',
  },
  ar: {
    back: 'رجوع',
    print: 'طباعة الفاتورة',
    switchToAr: 'العربية',
    switchToEn: 'English',
    invoiceTitle: 'فاتورة',
    billTo: 'العميل:',
    invoiceDate: 'تاريخ الفاتورة:',
    orders: 'الطلبات:',
    paymentMethod: 'طريقة الدفع:',
    createdBy: 'حررها',
    order: 'طلب :',
    description: 'الوصف',
    qty: 'الكمية',
    unitPrice: 'سعر الوحدة',
    amount: 'المبلغ',
    orderSubtotal: 'مجموع الطلب',
    grandTotal: 'الإجمالي',
    amountPaid: 'المدفوع',
    balanceDue: 'المستحق',
    paymentHistory: 'سجل المدفوعات',
    noPayments: 'لم يتم سداد أي مبلغ حتى الآن.',
    notes: 'ملاحظات',
    footerShop: 'النجوم — ',
    printed: 'تاريخ الطباعة:',
    noLineItems: 'لا توجد بنود',
    notFound: 'الفاتورة غير موجودة.',
    notFoundLink: 'العودة إلى الفواتير',
  },
};

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lang, setLang] = useState<PrintLang>('en');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const t = COPY[lang];

  const isRtl = lang === 'ar';
  console.log(isRtl)
  const headerAlign = isRtl ? 'text-left' : 'text-right';
  const detailsAlign = isRtl ? 'text-left' : 'text-right';
  const flexRowReverse = isRtl ? 'flex-row-reverse' : '';

  if (isLoading) return <PageLoader />;
  if (!invoice) {
    return (
      <div className={`p-8 text-center text-slate-500 ${isRtl ? 'font-[Tahoma,Segoe_UI,sans-serif]' : ''}`} dir={isRtl ? 'rtl' : 'ltr'} lang={lang}>
        {t.notFound}{' '}
        <Link to="/invoices" className="text-sky-600 hover:underline">
          {t.notFoundLink}
        </Link>
      </div>
    );
  }

  const balance = invoice.totalAmount - invoice.paidAmount;

  return (
    <div
      className={isRtl ? "font-[Tahoma,Segoe_UI,sans-serif]" : ""}
      dir={isRtl ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* Screen-only toolbar */}
      <div className="no-print flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} className={isRtl ? "rotate-180" : ""} /> {t.back}
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Languages size={15} />}
            onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
          >
            {lang === "en" ? t.switchToAr : t.switchToEn}
          </Button>
          <Button
            leftIcon={<Printer size={15} />}
            onClick={() => window.print()}
          >
            {t.print}
          </Button>
        </div>
      </div>

      {/* Printable invoice */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-3xl mx-auto print:border-none print:rounded-none print:shadow-none print:p-0 print:max-w-none">
        {/* Header */}
        <div
          className={`flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-900 ${isRtl ? "flex-row-reverse" : ""}`}
        >
          <div className={isRtl ? "text-right" : ""}>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Al Najoom
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isRtl ? "50127250 +965" : "+965 50127250"}
            </p>
          </div>
          <div className={headerAlign}>
            <p className="text-2xl font-bold text-slate-900">
              {t.invoiceTitle}
            </p>
            <p className="text-sm text-slate-500 font-mono mt-1">
              {invoice.id.slice(0, 8).toUpperCase()}
            </p>
            <div className={`mt-2 ${isRtl ? "flex justify-end" : ""}`}>
              <InvoiceStatusBadge status={invoice.status} locale={lang} />
            </div>
          </div>
        </div>

        {/* Bill to + Invoice details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className={isRtl ? "text-right" : ""}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {t.billTo}
            </p>
            <p className="text-base font-semibold text-slate-900">
              {invoice.customer?.name ?? "—"}
            </p>
            {invoice.customer?.phone && (
              <p className="text-sm text-slate-600 mt-0.5">
                {invoice.customer.phone}
              </p>
            )}
          </div>
          <div className={detailsAlign}>
            <div className="space-y-1.5 text-sm">
              <div
                className={`flex gap-6  ${isRtl ? "justify-start" : "justify-end"}`}
              >
                <span className="text-slate-500">{t.invoiceDate}</span>
                <span
                  className={`font-medium text-slate-900 w-32 ${detailsAlign}`}
                >
                  {formatPrintDate(invoice.createdAt, lang)}
                </span>
              </div>
              <div
                className={`flex gap-6  ${isRtl ? "justify-start" : "justify-end"}`}
              >
                <span className="text-slate-500">{t.orders}</span>
                <span
                  className={`font-medium text-slate-900 w-32 ${detailsAlign}`}
                >
                  {invoice.orders?.length ?? 0}
                </span>
              </div>
              {invoice.paymentMethod && (
                <div
                  className={`flex gap-6  ${isRtl ? "justify-start" : "justify-end"}`}
                >
                  <span className="text-slate-500">{t.paymentMethod}</span>
                  <span
                    className={`font-medium text-slate-900 w-32 ${detailsAlign}`}
                  >
                    {paymentMethodLabel(invoice.paymentMethod, lang)}
                  </span>
                </div>
              )}
              {invoice.createdBy && (
                <div
                  className={`flex gap-6  ${isRtl ? "justify-start" : "justify-end"}`}
                >
                  <span className="text-slate-500">{t.createdBy}</span>
                  <span
                    className={`font-medium text-slate-900 w-32 ${detailsAlign}`}
                  >
                    {invoice.createdBy.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders & Items */}
        <div className="mb-6">
          {invoice.orders && invoice.orders.length > 0 ? (
            invoice.orders.map((order, oi) => (
              <div key={order.id} className={oi > 0 ? "mt-6" : ""}>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {t.order} {oi + 1} —{" "}
                    {formatPrintDate(order.createdAt, lang)}
                  </p>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th
                        className={`py-2 text-xs font-bold text-slate-600 uppercase tracking-wide ${isRtl ? "text-right" : "text-left"}`}
                      >
                        {t.description}
                      </th>
                      <th className="text-center py-2 text-xs font-bold text-slate-600 uppercase tracking-wide w-16">
                        {t.qty}
                      </th>
                      <th
                        className={`py-2 text-xs font-bold text-slate-600 uppercase tracking-wide w-28 ${isRtl ? "text-left" : "text-right"}`}
                      >
                        {t.unitPrice}
                      </th>
                      <th
                        className={`py-2 text-xs font-bold text-slate-600 uppercase tracking-wide w-28 ${isRtl ? "text-left" : "text-right"}`}
                      >
                        {t.amount}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => {
                      const name = item.inventoryItem
                        ? [item.inventoryItem.brand, item.inventoryItem.model]
                            .filter(Boolean)
                            .join(" ")
                        : item.customItemName || "—";
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                        >
                          <td
                            className={`py-2.5 text-slate-900 font-medium ${isRtl ? "text-right" : "text-left"}`}
                          >
                            {name}
                            {item.notes && (
                              <p className="text-xs text-slate-500 font-normal mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 text-center text-slate-700">
                            {item.quantity}
                          </td>
                          <td
                            className={`py-2.5 text-slate-700 ${isRtl ? "text-left" : "text-right"}`}
                          >
                            {formatKWD(item.price)}
                          </td>
                          <td
                            className={`py-2.5 font-medium text-slate-900 ${isRtl ? "text-left" : "text-right"}`}
                          >
                            {formatKWD(item.price * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        className={`py-2 text-xs text-slate-500 pr-2 ${isRtl ? "text-left pl-2 pr-0" : "text-right"}`}
                      >
                        {t.orderSubtotal}
                      </td>
                      <td
                        className={`py-2 font-semibold text-slate-900 ${isRtl ? "text-left" : "text-right"}`}
                      >
                        {formatKWD(
                          order.items.reduce(
                            (s, i) => s + i.price * i.quantity,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-4">
              {t.noLineItems}
            </p>
          )}
        </div>

        {/* Grand Totals */}
        <div className={`flex mb-6 ${isRtl ? "justify-start" : "justify-end"}`}>
          <div className="w-64 space-y-2 text-sm">
            <div
              className={`flex justify-between border-b border-slate-200 pb-2 `}
            >
              <span className="text-slate-500">{t.grandTotal}</span>
              <span className="font-bold text-slate-900">
                {formatKWD(invoice.totalAmount)}
              </span>
            </div>
            {invoice.paidAmount > 0 && (
              <div
                className={`flex justify-between text-emerald-700`}
              >
                <span>{t.amountPaid}</span>
                <span className="font-medium">
                  {formatKWD(invoice.paidAmount)}
                </span>
              </div>
            )}
            <div
              className={`flex justify-between pt-2 border-t-2 ${balance > 0 ? "border-red-300 text-red-700" : "border-emerald-300 text-emerald-700"} `}
            >
              <span className="font-bold text-base">{t.balanceDue}</span>
              <span className="font-bold text-base">{formatKWD(balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="mb-6 bg-slate-50 rounded-lg p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            {t.paymentHistory}
          </p>
          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="space-y-1.5">
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className={`flex justify-between text-sm ${isRtl ? "flex-row-reverse" : ""}`}
                >
                  <span className="text-slate-600">
                    {formatPrintDate(p.date, lang)} ·{" "}
                    {paymentMethodLabel(p.method, lang)}
                  </span>
                  <span className="font-medium text-emerald-700">
                    {formatKWD(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-slate-400 italic ${isRtl ? "text-right" : ""}`}>
              {t.noPayments}
            </p>
          )}
        </div>

        {invoice.notes && (
          <div className="mb-6 text-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              {t.notes}
            </p>
            <p className="text-slate-700">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div
          className={`mt-8 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400 ${isRtl ? "flex-row-reverse" : ""}`}
        >
          <p>{t.footerShop}</p>
          <p>
            {t.printed}{" "}
            {new Date().toLocaleDateString(lang === "ar" ? "ar-KW" : "en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
