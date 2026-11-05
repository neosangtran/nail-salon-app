import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCircle,
  DollarSign,
  Package,
  Gift,
  TrendingUp,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={18} /> },
  { to: '/bookings',    label: 'Bookings',     icon: <CalendarDays size={18} /> },
  { to: '/staff',       label: 'Staff',        icon: <Users size={18} /> },
  { to: '/customers',   label: 'Customers',    icon: <UserCircle size={18} /> },
  { to: '/revenue',     label: 'Revenue',      icon: <DollarSign size={18} /> },
  { to: '/supplies',    label: 'Supplies',     icon: <Package size={18} /> },
  { to: '/gift-certs',  label: 'Gift Certs',   icon: <Gift size={18} /> },
  { to: '/commissions', label: 'Commissions',  icon: <TrendingUp size={18} /> },
];

function pageTitleFromPath(pathname: string): string {
  const segment = pathname.split('/')[1] ?? '';
  const map: Record<string, string> = {
    dashboard:   'Dashboard',
    bookings:    'Bookings',
    staff:       'Staff',
    customers:   'Customers',
    revenue:     'Revenue',
    supplies:    'Supplies',
    'gift-certs': 'Gift Certificates',
    commissions: 'Commissions',
  };
  return map[segment] ?? 'LuxeNails';
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin:     'bg-primary-100 text-primary-700',
    manager:   'bg-gold-100 text-gold-700',
    technician:'bg-green-100 text-green-700',
  };
  const cls = colors[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {role}
    </span>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = pageTitleFromPath(location.pathname);

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-rose-800/30">
        <span className="text-2xl font-extrabold bg-gradient-to-r from-primary-300 to-gold-400 bg-clip-text text-transparent select-none">
          💅 LuxeNails
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-rose-200 hover:bg-rose-800/40 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User area */}
      <div className="px-4 py-4 border-t border-rose-800/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-gold-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">{user?.name ?? 'User'}</p>
            <RoleBadge role={user?.role ?? 'staff'} />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-300 hover:bg-rose-800/40 hover:text-white text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-gradient-to-b from-rose-900 to-slate-900">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 flex flex-col w-60 h-full bg-gradient-to-b from-rose-900 to-slate-900">
            <button
              className="absolute top-4 right-4 text-rose-300 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <button
            className="md:hidden text-gray-500 hover:text-primary-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-sm text-gray-500">{user?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
