import React from 'react';
import { OrderStatus, InvoiceStatus, ItemType } from '../../types';

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-sky-100 text-sky-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  READY: { label: 'Ready', className: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: 'Delivered', className: 'bg-slate-100 text-slate-600' },
};

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  UNPAID: { label: 'Unpaid', className: 'bg-red-100 text-red-700' },
  PARTIAL: { label: 'Partial', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
};

const itemTypeConfig: Record<ItemType, { label: string; className: string }> = {
  FRAME: { label: 'Frame', className: 'bg-violet-100 text-violet-700' },
  LENS: { label: 'Lens', className: 'bg-sky-100 text-sky-700' },
  ACCESSORY: { label: 'Accessory', className: 'bg-slate-100 text-slate-600' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = orderStatusConfig[status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = invoiceStatusConfig[status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  const cfg = itemTypeConfig[type];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role === 'ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
      {role === 'ADMIN' ? 'Admin' : 'Employee'}
    </span>
  );
}
