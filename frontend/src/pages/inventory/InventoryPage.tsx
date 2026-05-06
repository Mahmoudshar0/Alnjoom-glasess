import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, Loader2 } from 'lucide-react';
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  checkSkuAvailability,
  generateSku,
} from '../../api/inventory';
import { InventoryItem, ItemType } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { ItemTypeBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatKWD, formatDate } from '../../utils/format';

const tabs: { key: ItemType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Items' },
  { key: 'FRAME', label: 'Frames' },
  { key: 'LENS', label: 'Lenses' },
  { key: 'ACCESSORY', label: 'Accessories' },
];

export default function InventoryPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ItemType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>('FRAME');

  // SKU validation state
  const [skuError, setSkuError] = useState<string | null>(null);
  const [skuChecking, setSkuChecking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', activeTab, search],
    queryFn: () => getInventory(activeTab !== 'ALL' ? activeTab : undefined, search || undefined),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<any>();

  const watchedType = (watch('type') || selectedType) as ItemType;
  const watchedSku = watch('sku') as string | undefined;

  // Debounced SKU uniqueness check
  useEffect(() => {
    const sku = watchedSku?.trim() ?? '';

    if (!sku) {
      setSkuError(null);
      setSkuChecking(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setSkuChecking(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSkuAvailability(sku, editing?.id);
        setSkuError(available ? null : 'This SKU already exists. Please choose another SKU.');
      } catch {
        setSkuError(null); // Don't block submission if the check itself fails
      } finally {
        setSkuChecking(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watchedSku, editing?.id]);

  const createMut = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateInventoryItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      closeModal();
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const openModal = (item?: InventoryItem) => {
    setSkuError(null);
    setFormError(null);
    if (item) {
      setEditing(item);
      reset({
        ...item,
        lensIndex: item.lensIndex?.toString() ?? '',
        price: item.price.toString(),
        quantity: item.quantity.toString(),
      });
      setSelectedType(item.type);
    } else {
      setEditing(null);
      reset({ type: 'FRAME', quantity: '0', price: '0' });
      setSelectedType('FRAME');
    }
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditing(null);
    setSkuError(null);
    setFormError(null);
    reset({});
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const onSubmit = async (data: any) => {
    setFormError(null);

    // If SKU check is still running, wait for it
    if (skuChecking) return;

    // Block if there's a known SKU error
    if (skuError) return;

    let sku = data.sku?.trim() || '';

    // Auto-generate SKU when left empty
    if (!sku) {
      try {
        const result = await generateSku(data.type as ItemType);
        sku = result.sku;
      } catch {
        // Proceed without SKU if generation fails; backend will accept null
      }
    }

    const payload = {
      ...data,
      sku: sku || undefined,
      price: parseFloat(data.price) || 0,
      quantity: parseInt(data.quantity) || 0,
      lensIndex: data.lensIndex ? parseFloat(data.lensIndex) : null,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
    } catch (err: any) {
      const body = err?.response?.data;
      if (body?.field === 'sku') {
        setSkuError(body.message ?? 'This SKU already exists. Please choose another SKU.');
      } else {
        setFormError(body?.message ?? 'An error occurred. Please try again.');
      }
      // Modal stays open so the user can correct the error
    }
  };

  const saveDisabled = isSubmitting || !!skuError || skuChecking;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Tabs + Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === t.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search brand/model..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-48"
            />
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={() => openModal()}>
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Details</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No items found
                </td>
              </tr>
            ) : (
              items?.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Package size={14} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.brand || '—'} {item.model || ''}
                        </p>
                        {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ItemTypeBadge type={item.type} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-slate-500">
                      {item.type === 'FRAME' && [item.color, item.material].filter(Boolean).join(' · ')}
                      {item.type === 'LENS' &&
                        [item.lensType, item.coating, item.lensIndex ? `n=${item.lensIndex}` : '']
                          .filter(Boolean)
                          .join(' · ')}
                      {item.type === 'ACCESSORY' && item.category}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-slate-900">{formatKWD(item.price)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        item.quantity <= 5
                          ? 'text-red-600'
                          : item.quantity <= 15
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this item?')) deleteMut.mutate(item.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          {items?.length ?? 0} items
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Edit Item' : 'New Inventory Item'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Type *"
            {...register('type', { required: true })}
            onChange={e => {
              setValue('type', e.target.value);
              setSelectedType(e.target.value as ItemType);
            }}
          >
            <option value="FRAME">Frame</option>
            <option value="LENS">Lens</option>
            <option value="ACCESSORY">Accessory</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Brand" placeholder="Ray-Ban, Essilor..." {...register('brand')} />
            {watchedType !== 'ACCESSORY' && (
              <Input label="Model" placeholder="Wayfarer, Varilux..." {...register('model')} />
            )}
            {watchedType === 'ACCESSORY' && (
              <Input label="Category" placeholder="Case, Cloth, Solution..." {...register('category')} />
            )}
          </div>

          {watchedType === 'FRAME' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Color" placeholder="Black, Gold, Tortoise..." {...register('color')} />
              <Input label="Material" placeholder="Metal, Acetate, TR90..." {...register('material')} />
            </div>
          )}

          {watchedType === 'LENS' && (
            <div className="grid grid-cols-3 gap-4">
              <Select label="Lens Type" {...register('lensType')}>
                <option value="">Select type</option>
                <option value="Single Vision">Single Vision</option>
                <option value="Bifocal">Bifocal</option>
                <option value="Progressive">Progressive</option>
                <option value="Reading">Reading</option>
              </Select>
              <Input label="Coating" placeholder="AR, UV, Blue Cut..." {...register('coating')} />
              <Input
                label="Index"
                type="number"
                step="0.01"
                placeholder="1.50, 1.67..."
                {...register('lensIndex')}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Price (KWD) *"
              type="number"
              step="0.001"
              placeholder="0.000"
              {...register('price', { required: true })}
              error={errors.price ? 'Price is required' : undefined}
            />
            <Input
              label="Quantity *"
              type="number"
              min="0"
              {...register('quantity', { required: true })}
              error={errors.quantity ? 'Quantity is required' : undefined}
            />
            {/* SKU field with inline validation */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">SKU</label>
              <div className="relative">
                <input
                  placeholder="Auto-generated if empty"
                  {...register('sku')}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400
                    focus:outline-none focus:ring-2 transition-colors pr-8
                    ${skuError
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-sky-500 focus:border-transparent'
                    }`}
                />
                {skuChecking && (
                  <Loader2
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                  />
                )}
              </div>
              {skuError && <p className="text-xs text-red-600">{skuError}</p>}
              {!skuError && !skuChecking && !watchedSku && (
                <p className="text-xs text-slate-400">Leave empty to auto-generate</p>
              )}
              {skuChecking && <p className="text-xs text-slate-400">Checking availability...</p>}
            </div>
          </div>

          <Textarea label="Notes" {...register('notes')} />

          {/* General form error */}
          {formError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={saveDisabled}
              className="flex-1"
            >
              {editing ? 'Update' : 'Add'} Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
