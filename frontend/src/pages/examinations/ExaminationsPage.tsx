import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, ArrowRight, FlaskConical, XCircle } from 'lucide-react';
import { getAllExaminations, createExamination, updateExamination, deleteExamination, ExaminationWithCustomer } from '../../api/examinations';
import { getCustomers } from '../../api/customers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate, signedFloat, formatAxis } from '../../utils/format';

const examSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  doctor: z.string().optional(),
  date: z.string().optional(),
  rightSph: z.string().optional(),
  rightCyl: z.string().optional(),
  rightAxis: z.string().optional(),
  leftSph: z.string().optional(),
  leftCyl: z.string().optional(),
  leftAxis: z.string().optional(),
  add: z.string().optional(),
  ipd: z.string().optional(),
  height: z.string().optional(),
  notes: z.string().optional(),
});
type ExamForm = z.infer<typeof examSchema>;

function parseNum(s?: string) {
  if (!s || s.trim() === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function parseIntOrNull(s?: string) {
  if (!s || s.trim() === '') return null;
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

export default function ExaminationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ExaminationWithCustomer | null>(null);
  const [apiError, setApiError] = useState('');

  const { data: exams, isLoading } = useQuery({
    queryKey: ['examinations', search],
    queryFn: () => getAllExaminations(search || undefined),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
  });

  const close = () => {
    setIsOpen(false);
    setEditing(null);
    setApiError('');
    reset({});
  };

  const createMut = useMutation({
    mutationFn: (data: any) => createExamination(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['examinations'] }); close(); },
    onError: (err: any) => {
      setApiError(err.response?.data?.message ?? 'Failed to save examination. Please try again.');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateExamination(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['examinations'] }); close(); },
    onError: (err: any) => {
      setApiError(err.response?.data?.message ?? 'Failed to update examination. Please try again.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteExamination,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examinations'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setApiError('');
    reset({ date: new Date().toISOString().slice(0, 10) });
    setIsOpen(true);
  };

  const openEdit = (exam: ExaminationWithCustomer) => {
    setEditing(exam);
    setApiError('');
    reset({
      customerId: exam.customerId,
      doctor: exam.doctor ?? '',
      date: exam.date.slice(0, 10),
      rightSph: exam.rightSph?.toString() ?? '',
      rightCyl: exam.rightCyl?.toString() ?? '',
      rightAxis: exam.rightAxis?.toString() ?? '',
      leftSph: exam.leftSph?.toString() ?? '',
      leftCyl: exam.leftCyl?.toString() ?? '',
      leftAxis: exam.leftAxis?.toString() ?? '',
      add: exam.add?.toString() ?? '',
      ipd: exam.ipd?.toString() ?? '',
      height: exam.height?.toString() ?? '',
      notes: exam.notes ?? '',
    });
    setIsOpen(true);
  };

  const onSubmit = (data: ExamForm) => {
    setApiError('');
    const payload = {
      customerId: data.customerId,
      doctor: data.doctor || undefined,
      date: data.date || undefined,
      rightSph: parseNum(data.rightSph),
      rightCyl: parseNum(data.rightCyl),
      rightAxis: parseIntOrNull(data.rightAxis),
      leftSph: parseNum(data.leftSph),
      leftCyl: parseNum(data.leftCyl),
      leftAxis: parseIntOrNull(data.leftAxis),
      add: parseNum(data.add),
      ipd: parseNum(data.ipd),
      height: parseNum(data.height),
      notes: data.notes || undefined,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>New Examination</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell" colSpan={3}>Right Eye (OD)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell" colSpan={3}>Left Eye (OS)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">IPD</th>
              <th className="px-4 py-3" />
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50 hidden md:table-row">
              <th className="px-4 py-1" /><th className="px-4 py-1" />
              {['SPH', 'CYL', 'Axis'].map(h => (
                <th key={`od-${h}`} className="text-center px-2 py-1 text-xs font-medium text-slate-400">{h}</th>
              ))}
              {['SPH', 'CYL', 'Axis'].map(h => (
                <th key={`os-${h}`} className="text-center px-2 py-1 text-xs font-medium text-slate-400">{h}</th>
              ))}
              <th className="px-4 py-1" /><th className="px-4 py-1" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {exams?.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                  No examinations found. Create one with the button above.
                </td>
              </tr>
            ) : (
              exams?.map(exam => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-50 rounded-lg flex-shrink-0">
                        <FlaskConical size={14} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{exam.customer?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{exam.customer?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div>
                      <p className="text-sm text-slate-700">{formatDate(exam.date)}</p>
                      {exam.doctor && <p className="text-xs text-slate-400">Dr. {exam.doctor}</p>}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{signedFloat(exam.rightSph)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{signedFloat(exam.rightCyl)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{formatAxis(exam.rightAxis)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{signedFloat(exam.leftSph)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{signedFloat(exam.leftCyl)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden md:table-cell">{formatAxis(exam.leftAxis)}</td>
                  <td className="px-2 py-3 text-center text-sm text-slate-700 hidden lg:table-cell">{exam.ipd ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {exam.customer && (
                        <Link
                          to={`/customers/${exam.customerId}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          title="View customer"
                        >
                          <ArrowRight size={15} />
                        </Link>
                      )}
                      <button
                        onClick={() => openEdit(exam)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this examination?')) deleteMut.mutate(exam.id);
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
          {exams?.length ?? 0} examination{exams?.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Edit Examination' : 'New Examination'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {apiError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select label="Customer *" {...register('customerId')} error={errors.customerId?.message}>
              <option value="">Select customer...</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </Select>
            <Input label="Doctor" placeholder="Dr. Name (optional)" {...register('doctor')} />
          </div>
          <Input label="Examination Date" type="date" {...register('date')} />

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Right Eye (OD)</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="SPH" type="number" step="0.25" placeholder="e.g. -1.50" {...register('rightSph')} />
              <Input label="CYL" type="number" step="0.25" placeholder="e.g. -0.75" {...register('rightCyl')} />
              <Input label="Axis" type="number" min="0" max="180" placeholder="0–180" {...register('rightAxis')} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Left Eye (OS)</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="SPH" type="number" step="0.25" placeholder="e.g. -1.25" {...register('leftSph')} />
              <Input label="CYL" type="number" step="0.25" placeholder="e.g. -0.50" {...register('leftCyl')} />
              <Input label="Axis" type="number" min="0" max="180" placeholder="0–180" {...register('leftAxis')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="ADD" type="number" step="0.25" placeholder="e.g. +2.00" {...register('add')} />
            <Input label="IPD (mm)" type="number" step="0.5" placeholder="e.g. 63.5" {...register('ipd')} />
            <Input label="Height (mm)" type="number" step="0.5" placeholder="e.g. 18" {...register('height')} />
          </div>

          <Textarea label="Notes" placeholder="Any additional observations..." {...register('notes')} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={isSaving} className="flex-1">
              {editing ? 'Update Examination' : 'Save Examination'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
