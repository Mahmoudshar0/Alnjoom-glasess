import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, ArrowRight, XCircle } from 'lucide-react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/format';
import { Customer } from '../../types';

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  notes: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  address: '',
  notes: '',
};

export default function CustomersList() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers(search || undefined),
  });

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeModal(); },
    onError: (err: any) => {
      setApiError(err.response?.data?.message ?? 'Failed to create customer. Please try again.');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => updateCustomer(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeModal(); },
    onError: (err: any) => {
      setApiError(err.response?.data?.message ?? 'Failed to update customer. Please try again.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError('');
    setIsOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      fullName: c.name,
      phone: c.phone,
      email: c.email ?? '',
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    });
    setErrors({});
    setApiError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiError('');
  };

  const handleInputChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setApiError('');
    if (field === 'fullName' || field === 'phone') {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, notes: e.target.value }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');

    const payload: Partial<Customer> = {
      name: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete customer "${name}"? This cannot be undone.`)) {
      deleteMut.mutate(id);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Add Customer</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Activity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">No customers found</td>
              </tr>
            ) : (
              customers?.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <Link
                        to={`/customers/${c.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-sky-600 transition-colors"
                      >
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-slate-600">{c.phone}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-500">{c.email ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-slate-500">{formatDate(c.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span>{c._count?.orders ?? 0} orders</span>
                      <span>{c._count?.examinations ?? 0} exams</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        to={`/customers/${c.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="View profile"
                      >
                        <ArrowRight size={15} />
                      </Link>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        title="Delete"
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
          {customers?.length ?? 0} customer{customers?.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* API Error */}
          {apiError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="Ahmed Al-Kuwaiti"
              value={form.fullName}
              onChange={handleInputChange('fullName')}
              error={errors.fullName}
            />
            <Input
              label="Phone *"
              placeholder="+965 XXXX XXXX"
              value={form.phone}
              onChange={handleInputChange('phone')}
              error={errors.phone}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={handleInputChange('email')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleInputChange('dateOfBirth')}
            />
            <Input
              label="Address"
              placeholder="Block, Street, Area"
              value={form.address}
              onChange={handleInputChange('address')}
            />
          </div>
          <Textarea
            label="Notes"
            placeholder="Any additional notes..."
            value={form.notes}
            onChange={handleTextareaChange}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} className="flex-1">
              {editing ? 'Update' : 'Create'} Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
