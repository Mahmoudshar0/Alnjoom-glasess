import * as XLSX from 'xlsx-js-style';
import { Invoice } from '../types';
import { formatDate } from './format';

const PERIOD_HEADER_STYLE = {
  font: { bold: true, sz: 12, },
  fill:{patternType: 'solid', fgColor: { rgb: 'c4bd97' } },
};
const PERIOD_HEADER_STYLE_SUMMARY = {
  font: { bold: true, sz: 12},
};

/** Rows 1–4 on Summary: title, From/To dates, invoice count */
const PERIOD_HEADER_CELLS = ['A1', 'A2', 'B2', 'A3', 'B3', 'A4', 'B4'] as const;
const PERIOD_HEADER_CELLS_SUMMARY = ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'J6', 'K6'] as const;

function applyPeriodHeaderStyles(ws: XLSX.WorkSheet) {
  for (const ref of PERIOD_HEADER_CELLS) {
    const cell = ws[ref];
    if (cell) cell.s = PERIOD_HEADER_STYLE;
  }

  for (const ref of PERIOD_HEADER_CELLS_SUMMARY) {
    const cell = ws[ref];
    if (cell) cell.s = PERIOD_HEADER_STYLE_SUMMARY;
  }
}

function itemName(item: Invoice['orders'][0]['items'][0]): string {
  if (item.inventoryItem) {
    return [item.inventoryItem.brand, item.inventoryItem.model].filter(Boolean).join(' ');
  }
  return item.customItemName || '—';
}

export function exportPeriodInvoicesToExcel(
  invoices: Invoice[],
  dateFrom: string,
  dateTo: string,
): void {
  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = totalBilled - totalCollected;

  const summaryRows: (string | number)[][] = [
    ['Period Invoice Report'],
    ['From', formatDate(dateFrom)],
    ['To', formatDate(dateTo)],
    ['Invoice Count', invoices.length],
    [],
    [
      'Invoice #',
      'Date',
      'Customer',
      'Phone',
      'Status',
      'Payment Method',
      'Total (KWD)',
      'Paid (KWD)',
      'Remaining (KWD)',
      'Orders',
      'Notes',
    ],
    ...invoices.map((inv, i) => [
      i + 1,
      formatDate(inv.createdAt),
      inv.customer?.name ?? '',
      inv.customer?.phone ?? '',
      inv.status,
      inv.paymentMethod ?? '',
      inv.totalAmount,
      inv.paidAmount,
      inv.totalAmount - inv.paidAmount,
      inv.orders?.length ?? 0,
      inv.notes ?? '',
    ]),
    [],
    ['', '', '', '', '', 'Period Totals', totalBilled, totalCollected, totalOutstanding, '', ''],
  ];

  const lineItemRows: (string | number)[][] = [
    [
      'Invoice #',
      'Invoice Date',
      'Customer',
      'Phone',
      'Order #',
      'Order Date',
      'Order Status',
      'Item',
      'Qty',
      'Unit Price (KWD)',
      'Line Total (KWD)',
    ],
  ];

  invoices.forEach((inv, invIdx) => {
    inv.orders?.forEach((order, orderIdx) => {
      order.items.forEach(item => {
        lineItemRows.push([
          invIdx + 1,
          formatDate(inv.createdAt),
          inv.customer?.name ?? '',
          inv.customer?.phone ?? '',
          orderIdx + 1,
          formatDate(order.createdAt),
          order.status,
          itemName(item),
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]);
      });
    });
  });

  const paymentRows: (string | number)[][] = [
    ['Invoice #', 'Invoice Date', 'Customer', 'Payment Date', 'Method', 'Amount (KWD)', 'Notes'],
  ];

  invoices.forEach((inv, invIdx) => {
    inv.payments?.forEach(p => {
      paymentRows.push([
        invIdx + 1,
        formatDate(inv.createdAt),
        inv.customer?.name ?? '',
        formatDate(p.date),
        p.method,
        p.amount,
        p.notes ?? '',
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  applyPeriodHeaderStyles(summarySheet);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lineItemRows), 'Line Items');
  if (paymentRows.length > 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paymentRows), 'Payments');
  }

  const filename = `invoices-${dateFrom}-to-${dateTo}.xlsx`;
  XLSX.writeFile(wb, filename);
}
