import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../api/employees';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { RoleBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/format';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
});

const updateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  isActive: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: employees, isLoading } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(editing ? updateSchema : createSchema),
    defaultValues: { role: 'EMPLOYEE', isActive: true },
  });

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close(); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const openCreate = () => { setEditing(null); reset({ role: 'EMPLOYEE', isActive: true }); setIsOpen(true); };
  const openEdit = (emp: User) => {
    setEditing(emp);
    reset({ name: emp.name, email: emp.email, role: emp.role, isActive: emp.isActive ?? true });
    setIsOpen(true);
  };
  const close = () => { setIsOpen(false); setEditing(null); reset({}); };

  const onSubmit = (data: any) => {
    const payload = { ...data, isActive: data.isActive === 'true' || data.isActive === true };
    if (!payload.password) delete payload.password;
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Add Employee</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {employees?.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{emp.name}</p>
                      {emp.id === currentUser?.id && <p className="text-xs text-sky-600">You</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-sm text-slate-600">{emp.email}</span>
                </td>
                <td className="px-4 py-3"><RoleBadge role={emp.role} /></td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5">
                    {emp.isActive ? (
                      <><UserCheck size={14} className="text-emerald-500" /><span className="text-xs text-emerald-600">Active</span></>
                    ) : (
                      <><UserX size={14} className="text-slate-400" /><span className="text-xs text-slate-500">Inactive</span></>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm text-slate-500">{emp.createdAt ? formatDate(emp.createdAt) : '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer transition-colors"><Edit2 size={15} /></button>
                    {emp.id !== currentUser?.id && (
                      <button onClick={() => { if (confirm(`Delete ${emp.name}?`)) deleteMut.mutate(emp.id); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">{employees?.length ?? 0} employee{employees?.length !== 1 ? 's' : ''}</div>
      </div>

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Edit Employee' : 'New Employee'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name *" {...register('name')} error={errors.name?.message as string} />
          <Input label="Email *" type="email" {...register('email')} error={errors.email?.message as string} />
          <Input label={editing ? 'New Password (leave blank to keep)' : 'Password *'} type="password"
            placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'}
            {...register('password')} error={errors.password?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Role" {...register('role')}>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </Select>
            {editing && (
              <Select label="Status" {...register('isActive')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
