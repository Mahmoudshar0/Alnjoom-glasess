import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { getOrders, createOrder, updateOrderStatus, deleteOrder } from '../../api/orders';
import { getCustomers } from '../../api/customers';
import { getExaminations } from '../../api/examinations';
import { getInventory } from '../../api/inventory';
import { Order, OrderStatus } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { OrderStatusBadge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';
import SearchableSelect from '../../components/ui/SearchableSelect';

const statusTabs: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'READY', label: 'Ready' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function OrdersPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSelectValue, setCustomerSelectValue] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => getOrders(activeTab !== 'ALL' ? { status: activeTab } : undefined),
  });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => getCustomers() });
  const { data: examinations } = useQuery({
    queryKey: ['examinations', selectedCustomer],
    queryFn: () => getExaminations(selectedCustomer),
    enabled: !!selectedCustomer,
  });
  const { data: inventory } = useQuery({ queryKey: ['inventory'], queryFn: () => getInventory() });

  const { register, handleSubmit, control, watch, reset, setValue, formState: { isSubmitting } } = useForm<any>({
    defaultValues: { items: [{ inventoryItemId: null, customItemName: '', quantity: 1, price: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchCustomer = watch('customerId');

  const createMut = useMutation({
    mutationFn: createOrder,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); setIsOpen(false); reset({}); setSelectedCustomer(''); },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
  const deleteMut = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const openCreate = () => {
    reset({ items: [{ inventoryItemId: null, customItemName: '', quantity: 1, price: '' }] });
    setSelectedCustomer('');
    setCustomerSelectValue('');
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      examinationId: data.examinationId || null,
      items: data.items.map((item: any) => ({
        inventoryItemId: item.inventoryItemId || null,
        customItemName: item.customItemName || null,
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        notes: item.notes || undefined,
      })),
    };
    createMut.mutate(payload);
  };

  const handleInventorySelect = (index: number, itemId: string) => {
    setValue(`items.${index}.inventoryItemId`, itemId || null);
    const invItem = inventory?.find(i => i.id === itemId);
    if (invItem) {
      setValue(`items.${index}.price`, invItem.price.toFixed(3));
      setValue(`items.${index}.customItemName`, `${invItem.brand || ''} ${invItem.model || ''}`.trim());
    }
  };

  if (isLoading) return <PageLoader />;

  const orderTotal = (order: Order) => order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const filteredOrders = (orders ?? []).filter(order => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.customer?.name?.toLowerCase().includes(q) ||
      order.customer?.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Tabs + Add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {statusTabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label} {t.key !== 'ALL' && <span className="ml-1 text-xs text-slate-400">({orders?.filter(o => o.status === t.key).length ?? 0})</span>}
            </button>
          ))}
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>New Order</Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          id="order-search"
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

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            {searchQuery ? (
              <>
                <Search size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">No results for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-1">Try searching by a different name or phone number</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No orders found</p>
            )}
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{order.customer?.name}</p>
                    <OrderStatusBadge status={order.status} />
                    {order.invoice && <InvoiceStatusBadge status={order.invoice.status} />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{order.customer?.phone} · {formatDate(order.createdAt)} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}{order.createdBy ? ` · By: ${order.createdBy.name}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatKWD(orderTotal(order))}</p>
                </div>
                {expanded === order.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>

              {expanded === order.id && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-2">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.inventoryItem ? `${item.inventoryItem.brand || ''} ${item.inventoryItem.model || ''}`.trim() : item.customItemName}
                          </p>
                          {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-slate-900">{formatKWD(item.price)} × {item.quantity}</p>
                          <p className="text-xs text-slate-500">{formatKWD(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">Notes: {order.notes}</p>}

                  {/* Created by */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-600">Created by:</span>
                    <span>{order.createdBy?.name ?? 'Unknown'}</span>
                  </div>

                  {/* Status update */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <Select
                      className="w-auto text-xs py-1"
                      value={order.status}
                      onChange={(e) => statusMut.mutate({ id: order.id, status: e.target.value as OrderStatus })}
                    >
                      <option value="NEW">New</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="READY">Ready</option>
                      <option value="DELIVERED">Delivered</option>
                    </Select>
                    <div className="flex-1" />
                    <button onClick={() => { if (confirm('Delete this order?')) deleteMut.mutate(order.id); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors px-2 py-1 rounded hover:bg-red-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset({}); setSelectedCustomer(''); }} title="New Order" size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              label="Customer *"
              placeholder="Select customer..."
              searchPlaceholder="Search by name or phone..."
              options={(customers ?? []).map(c => ({ value: c.id, label: c.name, sublabel: c.phone }))}
              value={customerSelectValue}
              onChange={val => {
                setCustomerSelectValue(val);
                setSelectedCustomer(val);
                setValue('customerId', val);
                setValue('examinationId', '');
              }}
              required
            />
            <Select label="Examination" {...register('examinationId')} disabled={!watchCustomer}>
              <option value="">No examination</option>
              {examinations?.map(e => <option key={e.id} value={e.id}>{formatDate(e.date)}{e.doctor ? ` — Dr. ${e.doctor}` : ''}</option>)}
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Order Items</p>
              <Button type="button" variant="ghost" size="sm" leftIcon={<Plus size={14} />}
                onClick={() => append({ inventoryItemId: null, customItemName: '', quantity: 1, price: '' })}>
                Add Item
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-slate-50 p-3 rounded-lg">
                <div className="col-span-4">
                  <Select label={index === 0 ? 'From Inventory' : undefined}
                    onChange={(e) => handleInventorySelect(index, e.target.value)}>
                    <option value="">Custom item</option>
                    {inventory?.map(i => <option key={i.id} value={i.id}>{i.brand} {i.model} — {formatKWD(i.price)}</option>)}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input label={index === 0 ? 'Item Name' : undefined} placeholder="Description" {...register(`items.${index}.customItemName`)} />
                </div>
                <div className="col-span-2">
                  <Input label={index === 0 ? 'Price' : undefined} type="number" step="0.001" placeholder="0.000" {...register(`items.${index}.price`, { required: true })} />
                </div>
                <div className="col-span-2">
                  <Input label={index === 0 ? 'Qty' : undefined} type="number" min="1" {...register(`items.${index}.quantity`)} />
                </div>
                <div className={`col-span-1 flex ${index === 0 ? 'mt-6' : 'mt-0'} justify-center`}>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Select label="Status" {...register('status')}>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </Select>
          <Textarea label="Notes" placeholder="Special instructions..." {...register('notes')} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setIsOpen(false); reset({}); setSelectedCustomer(''); setCustomerSelectValue(''); }} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">Create Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
