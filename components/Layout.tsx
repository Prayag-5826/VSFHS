import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  BarChart3,
  LogOut,
  Menu,
  UserPlus,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  PhoneCall // Imported for marketing follow-up queue representation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-bold text-sm uppercase tracking-tight">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, settings } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Re-engineered navigation schema to cleanly support the Lead Follow-Up Agenda
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/add-visit', icon: PlusCircle, label: 'Add Visit', roles: [Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/visits', icon: ClipboardList, label: 'Visit Logs', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/follow-ups', icon: PhoneCall, label: 'Follow-Ups', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] }, // Integrated new anchor
    { to: '/add-user', icon: UserPlus, label: 'Register Staff', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE] },
    { to: '/manage-users', icon: Users, label: 'Staff Roster', roles: [Role.ADMIN] },
    { to: '/reports', icon: BarChart3, label: 'Reports', roles: [Role.ADMIN] },
    { to: '/settings', icon: SettingsIcon, label: 'Settings', roles: [Role.ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role as Role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain mb-4" />
              ) : (
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl ${user?.role === Role.ADMIN ? 'bg-slate-900' : 'bg-indigo-600'}`}>
                  <ShieldCheck size={32} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">
                  {settings.companyName.split(' ').slice(0, 2).join(' ')}
                </h1>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">Management Pro</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="p-4 mt-auto">
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center space-x-3 mb-4 border border-slate-100">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                alt="Profile"
                className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate uppercase">{user?.name}</p>
                <p className="text-[9px] text-indigo-500 font-mono font-bold">{user?.id}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest"
            >
              <LogOut size={16} />
              <span>TERMINATE SESSION</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 shrink-0">
          <button
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active System</span>
            <span className="text-sm font-black text-slate-900 uppercase">{settings.companyName}</span>
          </div>

          <div className="flex items-center space-x-6">
             <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Line</span>
                <span className="text-xs font-black text-indigo-600">{settings.contactNo}</span>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Users size={20} />
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
};
