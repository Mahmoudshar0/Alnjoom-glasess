import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/LoadingSpinner';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/examinations': 'Examinations',
  '/orders': 'Orders',
  '/invoices': 'Invoices',
  '/invoices/': 'Invoice',
  '/inventory': 'Inventory',
  '/reports/financial': 'Financial Reports',
  '/reports/staff': 'Staff Performance',
  '/reports/sales': 'Sales Statistics',
  '/reports': 'Reports',
  '/employees': 'Employee Management',
  '/backup': 'Backup & Restore',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  const title = Object.entries(pageTitles).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'OptiVision';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
