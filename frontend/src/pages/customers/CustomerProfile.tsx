import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Plus, Printer, Phone, Mail, MapPin, Calendar,
  Eye, ShoppingBag, FileText, Trash2, Edit2, Star, XCircle,
  Users, Search, UserPlus, Link2, Unlink, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getCustomerReport, getCustomers, linkChild, unlinkChild, createCustomer } from '../../api/customers';
import { createExamination, updateExamination, deleteExamination } from '../../api/examinations';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { OrderStatusBadge, InvoiceStatusBadge } from '../../components/ui/Badge';
import { formatKWD, formatDate, signedFloat, formatAxis } from '../../utils/format';
import { Examination, Customer } from '../../types';

const examSchema = z.object({
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

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [examOpen, setExamOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [examError, setExamError] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Family members state
  const [familyOpen, setFamilyOpen] = useState(false);
  const [familyTab, setFamilyTab] = useState<'search' | 'create'>('search');
  const [familySearch, setFamilySearch] = useState('');
  const [familyError, setFamilyError] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [newChildPhone, setNewChildPhone] = useState('');
  const [newChildDob, setNewChildDob] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['customerReport', id],
    queryFn: () => getCustomerReport(id!),
    enabled: !!id,
  });

  const { register, handleSubmit, reset } = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
  });

  const closeExamModal = () => {
    setExamOpen(false);
    setEditingExam(null);
    setExamError('');
    reset({});
  };

  const createExamMut = useMutation({
    mutationFn: createExamination,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerReport', id] });
      closeExamModal();
    },
    onError: (err: any) => {
      setExamError(err.response?.data?.message ?? 'Failed to save examination. Please try again.');
    },
  });

  const updateExamMut = useMutation({
    mutationFn: ({ eid, data }: { eid: string; data: any }) => updateExamination(eid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerReport', id] });
      closeExamModal();
    },
    onError: (err: any) => {
      setExamError(err.response?.data?.message ?? 'Failed to update examination. Please try again.');
    },
  });

  const deleteExamMut = useMutation({
    mutationFn: deleteExamination,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customerReport', id] }),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['customers', familySearch],
    queryFn: () => getCustomers(familySearch || undefined),
    enabled: familyOpen && familyTab === 'search' && familySearch.length >= 1,
  });

  const linkChildMut = useMutation({
    mutationFn: (childId: string) => linkChild(id!, childId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerReport', id] });
      closeFamilyModal();
    },
    onError: (err: any) => setFamilyError(err.response?.data?.message ?? 'Failed to link family member.'),
  });

  const unlinkChildMut = useMutation({
    mutationFn: (childId: string) => unlinkChild(id!, childId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customerReport', id] }),
  });

  const createChildMut = useMutation({
    mutationFn: () =>
      createCustomer({ name: newChildName.trim(), phone: newChildPhone.trim() || undefined, dateOfBirth: newChildDob || undefined, parentId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerReport', id] });
      closeFamilyModal();
    },
    onError: (err: any) => setFamilyError(err.response?.data?.message ?? 'Failed to create family member.'),
  });

  const closeFamilyModal = () => {
    setFamilyOpen(false);
    setFamilyTab('search');
    setFamilySearch('');
    setFamilyError('');
    setNewChildName('');
    setNewChildPhone('');
    setNewChildDob('');
  };

  const openExamCreate = () => {
    setEditingExam(null);
    setExamError('');
    reset({ date: new Date().toISOString().slice(0, 10) });
    setExamOpen(true);
  };

  const openExamEdit = (exam: Examination) => {
    setEditingExam(exam);
    setExamError('');
    reset({
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
    setExamOpen(true);
  };

  const onExamSubmit = (data: ExamForm) => {
    setExamError('');
    const payload = {
      customerId: id!,
      doctor: data.doctor || undefined,
      date: data.date || undefined,
      rightSph: parseNum(data.rightSph),
      rightCyl: parseNum(data.rightCyl),
      rightAxis: data.rightAxis ? parseInt(data.rightAxis) : null,
      leftSph: parseNum(data.leftSph),
      leftCyl: parseNum(data.leftCyl),
      leftAxis: data.leftAxis ? parseInt(data.leftAxis) : null,
      add: parseNum(data.add),
      ipd: parseNum(data.ipd),
      height: parseNum(data.height),
      notes: data.notes || undefined,
    };
    if (editingExam) updateExamMut.mutate({ eid: editingExam.id, data: payload });
    else createExamMut.mutate(payload);
  };

  const isSavingExam = createExamMut.isPending || updateExamMut.isPending;

  if (isLoading) return <PageLoader />;
  if (!report) return <div className="text-center py-16 text-slate-500">Customer not found</div>;

  const latestExam = report.examinations[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link to="/customers" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Printer size={14} />} onClick={() => navigate(`/customers/${id}/report`)}>
            Print Report
          </Button>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={openExamCreate}>
            Add Examination
          </Button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {report.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{report.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-slate-500"><Phone size={14} />{report.phone}</span>
              {report.email && <span className="flex items-center gap-1.5 text-sm text-slate-500"><Mail size={14} />{report.email}</span>}
              {report.address && <span className="flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14} />{report.address}</span>}
              {report.dateOfBirth && <span className="flex items-center gap-1.5 text-sm text-slate-500"><Calendar size={14} />{formatDate(report.dateOfBirth)}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center hidden md:grid">
            <div>
              <p className="text-2xl font-bold text-slate-900">{report.examinations.length}</p>
              <p className="text-xs text-slate-500">Exams</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{report.orders.length}</p>
              <p className="text-xs text-slate-500">Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{formatKWD(report.summary.outstanding)}</p>
              <p className="text-xs text-slate-500">Owed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Examination Banner */}
      {latestExam && (
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-sky-600 fill-sky-600" />
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
              Latest Examination — {formatDate(latestExam.date)}
            </span>
            {latestExam.doctor && <span className="text-xs text-slate-500">by {latestExam.doctor}</span>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 font-medium">Right Eye (OD)</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">SPH</span><span className="font-medium">{signedFloat(latestExam.rightSph)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">CYL</span><span className="font-medium">{signedFloat(latestExam.rightCyl)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">AXIS</span><span className="font-medium">{formatAxis(latestExam.rightAxis)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 font-medium">Left Eye (OS)</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">SPH</span><span className="font-medium">{signedFloat(latestExam.leftSph)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">CYL</span><span className="font-medium">{signedFloat(latestExam.leftCyl)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">AXIS</span><span className="font-medium">{formatAxis(latestExam.leftAxis)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 font-medium">Add / IPD / Height</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">ADD</span><span className="font-medium">{signedFloat(latestExam.add)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">IPD</span><span className="font-medium">{latestExam.ipd ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Height</span><span className="font-medium">{latestExam.height ?? '—'}</span></div>
              </div>
            </div>
            {latestExam.notes && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-medium">Notes</p>
                <p className="text-sm text-slate-700">{latestExam.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Billed</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatKWD(report.summary.totalBilled)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Paid</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatKWD(report.summary.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
          <p className={`text-lg font-bold mt-1 ${report.summary.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatKWD(report.summary.outstanding)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Examination History */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">
                Examination History ({report.examinations.length})
              </h3>
            </div>
            <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={openExamCreate}>Add</Button>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {report.examinations.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No examinations yet</p>
            ) : (
              report.examinations.map((exam, i) => (
                <div key={exam.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{formatDate(exam.date)}</span>
                      {i === 0 && (
                        <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">Latest</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openExamEdit(exam)}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 cursor-pointer transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this examination?')) deleteExamMut.mutate(exam.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {exam.doctor && <p className="text-xs text-slate-500 mb-1">Dr. {exam.doctor}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>OD: {signedFloat(exam.rightSph)} / {signedFloat(exam.rightCyl)} / {formatAxis(exam.rightAxis)}</span>
                    <span>OS: {signedFloat(exam.leftSph)} / {signedFloat(exam.leftCyl)} / {formatAxis(exam.leftAxis)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Order History */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Order History</h3>
            </div>
            <Link to="/orders" className="text-xs text-sky-600 hover:text-sky-700 cursor-pointer transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {report.orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No orders yet</p>
            ) : (
              report.orders.map(order => (
                <div key={order.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{formatDate(order.createdAt)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      {order.invoice && (
                        <span className="text-xs font-medium text-slate-700">{formatKWD(order.invoice.totalAmount)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Invoice History */}
      <Card padding={false}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <FileText size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Invoice History</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {report.invoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No invoices yet</p>
          ) : (
            report.invoices.map(inv => (
              <div key={inv.id}>
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatDate(inv.createdAt)}</p>
                    {inv.paymentMethod && <p className="text-xs text-slate-500">{inv.paymentMethod}</p>}
                    {inv.payments && inv.payments.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">{inv.payments.length} payment{inv.payments.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="font-medium text-slate-900">{formatKWD(inv.totalAmount)}</p>
                      {inv.paidAmount < inv.totalAmount && (
                        <p className="text-xs text-red-600">Remaining: {formatKWD(inv.totalAmount - inv.paidAmount)}</p>
                      )}
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                    {inv.payments && inv.payments.length > 0 && (
                      expandedInvoice === inv.id
                        ? <ChevronUp size={14} className="text-slate-400" />
                        : <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expandable payment breakdown */}
                {expandedInvoice === inv.id && inv.payments && inv.payments.length > 0 && (
                  <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide my-2">Payment Breakdown</p>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 w-8">#</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Date</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Method</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Notes</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-500">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inv.payments.map((p, idx) => (
                            <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-slate-400 font-medium">{idx + 1}</td>
                              <td className="px-3 py-2 text-slate-700 font-medium">{formatDate(p.date)}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
                                  {p.method}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-400 italic">{p.notes || '—'}</td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-600">{formatKWD(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                            <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-emerald-700">Total Paid</td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700">{formatKWD(inv.paidAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Family Members */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">
              Family Members
              {report.children && report.children.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({report.children.length})</span>
              )}
            </h3>
          </div>
          <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={() => setFamilyOpen(true)}>
            Add
          </Button>
        </div>

        <div className="divide-y divide-slate-50">
          {/* Parent link */}
          {report.parent && (
            <div className="px-5 py-3 bg-sky-50">
              <p className="text-xs text-sky-600 font-medium mb-1">Parent Account</p>
              <Link
                to={`/customers/${report.parent.id}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-sky-600 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
                  {(report.parent.name ?? '?').charAt(0).toUpperCase()}
                </div>
                {report.parent.name ?? '—'}
                {report.parent.phone && <span className="text-slate-400 font-normal">· {report.parent.phone}</span>}
              </Link>
            </div>
          )}

          {/* Children */}
          {(!report.children || report.children.length === 0) && !report.parent ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No family members linked</p>
          ) : (
            report.children?.map(child => (
              <div key={child.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <Link
                  to={`/customers/${child.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-sky-600 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                    {(child.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span>{child.name ?? '—'}</span>
                    {child.phone && <span className="ml-2 text-xs text-slate-400">{child.phone}</span>}
                    {child.dateOfBirth && (
                      <span className="ml-2 text-xs text-slate-400">{formatDate(child.dateOfBirth)}</span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${child.name ?? 'this member'} from family?`)) {
                      unlinkChildMut.mutate(child.id);
                    }
                  }}
                  className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                  title="Remove from family"
                >
                  <Unlink size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Family Member Modal */}
      <Modal isOpen={familyOpen} onClose={closeFamilyModal} title="Add Family Member" size="lg">
        <div className="space-y-4">
          {familyError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{familyError}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => { setFamilyTab('search'); setFamilyError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                familyTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Link2 size={14} /> Link Existing Customer
            </button>
            <button
              onClick={() => { setFamilyTab('create'); setFamilyError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                familyTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus size={14} /> Create New
            </button>
          </div>

          {familyTab === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={familySearch}
                  onChange={e => { setFamilySearch(e.target.value); setFamilyError(''); }}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-lg">
                {familySearch.length < 1 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">Type to search customers</p>
                ) : !searchResults || searchResults.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No customers found</p>
                ) : (
                  searchResults
                    .filter(c => c.id !== id)
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => linkChildMut.mutate(c.id)}
                        disabled={linkChildMut.isPending}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-sky-50 transition-colors text-left cursor-pointer disabled:opacity-50"
                      >
                        <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
                          {(c.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {familyTab === 'create' && (
            <div className="space-y-4">
              <Input
                label="Full Name *"
                placeholder="Child's name"
                value={newChildName}
                onChange={e => { setNewChildName(e.target.value); setFamilyError(''); }}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone (optional)"
                  placeholder="+965 XXXX XXXX"
                  value={newChildPhone}
                  onChange={e => setNewChildPhone(e.target.value)}
                />
                <Input
                  label="Date of Birth (optional)"
                  type="date"
                  value={newChildDob}
                  onChange={e => setNewChildDob(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={closeFamilyModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!newChildName.trim()) { setFamilyError('Name is required'); return; }
                    setFamilyError('');
                    createChildMut.mutate();
                  }}
                  isLoading={createChildMut.isPending}
                  className="flex-1"
                >
                  Create & Link
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Exam Modal */}
      <Modal
        isOpen={examOpen}
        onClose={closeExamModal}
        title={editingExam ? 'Edit Examination' : 'New Examination'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onExamSubmit)} className="space-y-4">
          {examError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{examError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Doctor" placeholder="Dr. Name (optional)" {...register('doctor')} />
            <Input label="Date" type="date" {...register('date')} />
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-sky-50 rounded-lg">
            <p className="col-span-3 text-xs font-semibold text-sky-700 uppercase tracking-wide">Right Eye (OD)</p>
            <Input label="SPH" placeholder="e.g. -1.50" {...register('rightSph')} />
            <Input label="CYL" placeholder="e.g. -0.75" {...register('rightCyl')} />
            <Input label="AXIS" placeholder="e.g. 180" {...register('rightAxis')} />
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-indigo-50 rounded-lg">
            <p className="col-span-3 text-xs font-semibold text-indigo-700 uppercase tracking-wide">Left Eye (OS)</p>
            <Input label="SPH" placeholder="e.g. -1.25" {...register('leftSph')} />
            <Input label="CYL" placeholder="e.g. -0.50" {...register('leftCyl')} />
            <Input label="AXIS" placeholder="e.g. 90" {...register('leftAxis')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="ADD" placeholder="e.g. +2.00" {...register('add')} />
            <Input label="IPD (mm)" placeholder="e.g. 63.5" {...register('ipd')} />
            <Input label="Height (mm)" placeholder="e.g. 18" {...register('height')} />
          </div>

          <Textarea label="Notes" placeholder="Additional notes..." {...register('notes')} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeExamModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingExam} className="flex-1">
              {editingExam ? 'Update' : 'Save'} Examination
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
