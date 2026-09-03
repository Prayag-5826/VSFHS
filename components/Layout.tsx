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
  PhoneCall,
  FileText,
  ExternalLink,
  ShieldAlert,
  Globe
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
    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
      active
        ? 'bg-red-700 text-white shadow-xs font-black'
        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-bold'
    }`}
  >
    <Icon size={17} className={active ? 'text-amber-300' : 'text-slate-400'} />
    <span className="text-xs uppercase tracking-wider">{label}</span>
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

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/add-visit', icon: PlusCircle, label: 'Add Visit', roles: [Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/visits', icon: ClipboardList, label: 'Visit Logs', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/follow-ups', icon: PhoneCall, label: 'Follow-Ups', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/create-quotation', icon: FileText, label: 'Proposal Desk', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP] },
    { to: '/add-user', icon: UserPlus, label: 'Register Staff', roles: [Role.ADMIN, Role.SR_FIELD_EXECUTIVE] },
    { to: '/manage-users', icon: Users, label: 'Staff Roster', roles: [Role.ADMIN] },
    { to: '/reports', icon: BarChart3, label: 'Audit & Reports', roles: [Role.ADMIN] },
    { to: '/settings', icon: SettingsIcon, label: 'Portal Config', roles: [Role.ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role as Role));

  const websiteDeskUrl =
    typeof window !== 'undefined' && window.location.hostname.includes('vidhyasecurityforce.in')
      ? 'https://vidhyasecurityforce.in/admin'
      : 'http://localhost:3000/admin';

  return (
    <div className="min-h-screen flex bg-[#FBFBF9] text-slate-900 antialiased selection:bg-red-700 selection:text-white">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Executive Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col justify-between shadow-xs
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">

          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white border-2 border-amber-400 p-1 flex items-center justify-center shadow-md shadow-red-900/10 shrink-0">
                <img
                  src={settings.logo || '/assets/img/logo/logo.png'}
                  alt="VSF Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://vidhyasecurityforce.in/assets/img/logo/logo.png';
                  }}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-black text-red-700 uppercase tracking-wider truncate">
                  Vidhya Security
                </h1>
                <span className="inline-block font-mono text-[9px] font-bold text-amber-800 uppercase tracking-widest">
                  Field Operations
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
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

            {/* Cross-Link: Return to Web Admin Desk */}
            {user?.role === Role.ADMIN && (
              <a
                href={websiteDeskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-950 transition border border-transparent hover:border-amber-200 mt-2 font-bold text-xs uppercase tracking-wider"
              >
                <div className="flex items-center space-x-3">
                  <Globe size={17} className="text-amber-600" />
                  <span>Lead Intake Desk</span>
                </div>
                <ExternalLink size={13} className="text-amber-600" />
              </a>
            )}
          </nav>

          {/* Compact User Profile & Direct Sign Out Footer */}
          <div className="p-3 border-t border-slate-100 bg-[#FBFBF9] shrink-0">
            <div className="bg-white p-2.5 rounded-xl flex items-center justify-between border border-slate-200/80 shadow-xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 object-cover p-0.5 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://vidhyasecurityforce.in/assets/img/logo/logo.png';
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate uppercase leading-tight">{user?.name}</p>
                  <p className="text-[9px] text-red-700 font-mono font-bold uppercase truncate">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg transition shrink-0 cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-xs z-20">
          <button
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden md:flex flex-col">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Central Station</span>
            <span className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-md">
              {settings.companyName}
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Emergency Control</span>
              <span className="text-xs font-mono font-bold text-red-700">+91 {settings.contactNo}</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-red-700" />
              <span>PSARA MP Licensed</span>
            </div>
          </div>
        </header>

        {/* Dynamic Children Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;
