import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomersList from './pages/customers/CustomersList';
import CustomerProfile from './pages/customers/CustomerProfile';
import ExaminationsPage from './pages/examinations/ExaminationsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import OrdersPage from './pages/orders/OrdersPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoicePrint from './pages/invoices/InvoicePrint';
import EmployeesPage from './pages/employees/EmployeesPage';
import ReportsPage from './pages/reports/ReportsPage';
import FinancialReports from './pages/reports/FinancialReports';
import StaffPerformance from './pages/reports/StaffPerformance';
import SalesStats from './pages/reports/SalesStats';
import CustomerReport from './pages/reports/CustomerReport';
import SettingsPage from './pages/settings/SettingsPage';
import BackupPage from './pages/backup/BackupPage';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<CustomersList />} />
            <Route path="customers/:id" element={<CustomerProfile />} />
            <Route path="customers/:id/report" element={<CustomerReport />} />
            <Route path="examinations" element={<ExaminationsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:id/print" element={<InvoicePrint />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="employees" element={<AdminRoute><EmployeesPage /></AdminRoute>} />
            <Route path="reports/financial" element={<AdminRoute><FinancialReports /></AdminRoute>} />
            <Route path="reports/staff" element={<AdminRoute><StaffPerformance /></AdminRoute>} />
            <Route path="reports/sales" element={<AdminRoute><SalesStats /></AdminRoute>} />
            <Route path="backup" element={<AdminRoute><BackupPage /></AdminRoute>} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
