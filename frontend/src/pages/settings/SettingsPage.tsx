import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function SettingsPage() {
  const { user } = useAuth();
  const [pwSuccess, setPwSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const changePwMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      client.post('/auth/change-password', data),
    onSuccess: () => { setPwSuccess(true); reset(); setTimeout(() => setPwSuccess(false), 3000); },
  });

  const onSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) return;
    changePwMut.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-slate-900">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-900">{user?.role === 'ADMIN' ? 'Administrator' : 'Employee'}</span>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
        </div>
        {pwSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            Password updated successfully
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Current Password" type="password" {...register('currentPassword', { required: true })} />
          <Input label="New Password" type="password" {...register('newPassword', { required: true, minLength: { value: 6, message: 'Min 6 characters' } })} error={errors.newPassword?.message} />
          <Input label="Confirm New Password" type="password" {...register('confirmPassword', { required: true })} />
          <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={15} />}>Update Password</Button>
        </form>
      </Card>

      {/* About */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">About OptiVision</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>Version 1.0.0</p>
          <p>Optical Shop Management System</p>
          <p className="text-slate-400 text-xs">Built for optical retailers — manages customers, examinations, orders, and invoices.</p>
        </div>
      </Card>
    </div>
  );
}
