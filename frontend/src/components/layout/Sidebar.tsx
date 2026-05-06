import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FlaskConical, ShoppingBag, FileText,
  Package, BarChart3, PieChart, Settings, UserCog, Database,
  ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/examinations', icon: FlaskConical, label: 'Examinations' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/reports', icon: PieChart, label: 'Reports' },
];

const adminItems = [
  { to: '/employees', icon: UserCog, label: 'Employees' },
  { to: '/reports/financial', icon: BarChart3, label: 'Financial' },
  { to: '/backup', icon: Database, label: 'Backup' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
    ${isActive
      ? 'bg-sky-600 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800'
    } ${collapsed ? 'justify-center' : ''}`;

  return (
    <aside className={`no-print flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="p-1.5 bg-sky-600 rounded-lg flex-shrink-0">
          <Eye size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base leading-none">OptiVision</p>
            <p className="text-slate-500 text-xs mt-0.5">Optical Shop</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/reports'} className={linkClass} title={collapsed ? label : undefined}>
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className={`mt-4 mb-1 ${collapsed ? 'hidden' : ''}`}>
              <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Admin</p>
            </div>
            {!collapsed && <div className="border-t border-slate-800 mb-2" />}
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={linkClass} title={collapsed ? label : undefined}>
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 py-2 px-2 space-y-0.5">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass} title={collapsed ? label : undefined}>
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
