import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  PhoneCall,
  UserPlus,
  Users,
  Globe,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Radio,
  ChevronRight,
  Headphones,
  Camera,
  Images
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

/* -------------------------------------------------------------------------- */
/*  Field Navigation Architecture                                              */
/* -------------------------------------------------------------------------- */

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
  also?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL: Role[] = [Role.ADMIN, Role.SR_FIELD_EXECUTIVE, Role.FIELD_REP];
const FIELD_ADMIN: Role[] = [Role.ADMIN, Role.SR_FIELD_EXECUTIVE];

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Field Operations',
    items: [
      { to: '/', label: 'Operations Command', icon: LayoutDashboard, roles: ALL },
      { to: '/add-visit', label: 'Log Site Visit', icon: PlusCircle, roles: ALL, badge: 'GPS' },
      { to: '/site-audit', label: 'Site Inspection Audit', icon: Camera, roles: ALL, badge: 'CAM' },
      { to: '/visits', label: 'Visit History', icon: ClipboardList, roles: ALL, also: ['/visit/'] },
      { to: '/follow-ups', label: 'Scheduled Follow-ups', icon: PhoneCall, roles: ALL }
    ]
  },
  {
    title: 'Audit & Evidence',
    items: [
      { to: '/inspection-gallery', label: 'Photo Audit Stream', icon: Images, roles: FIELD_ADMIN, badge: 'HQ' }
    ]
  },
  {
    title: 'Guarding & Personnel',
    items: [
      { to: '/add-user', label: 'Enroll Field Staff', icon: UserPlus, roles: FIELD_ADMIN },
      { to: '/manage-users', label: 'Officer Roster', icon: Users, roles: [Role.ADMIN] }
    ]
  }
];

const isItemActive = (item: NavItem, pathname: string) => {
  if (pathname === item.to) return true;
  if (item.to !== '/' && pathname.startsWith(item.to + '/')) return true;
  return Boolean(item.also?.some((p) => pathname.startsWith(p)));
};

const initials = (name?: string) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'VS';

const formatRole = (role?: string) =>
  (role || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

interface SidebarProps {
  groups: NavGroup[];
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ groups, pathname, onNavigate, onLogout }) => {
  const { user, settings } = useAuth();

  const centralAdminUrl =
    typeof window !== 'undefined' && window.location.hostname.includes('vidhyasecurityforce.in')
      ? 'https://admin.vidhyasecurityforce.in'
      : 'http://localhost:3000/admin';

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/90 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-1.5 shadow-xs">
          <img
            src={settings?.logo || '/assets/img/logo/logo.png'}
            alt="VSF logo"
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/img/logo/logo.png';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-black tracking-tight uppercase text-slate-950">
              Vidhya Security Force
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500">
              Field Telemetry Node
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
              {group.title}
            </p>
            <ul className="space-y-1 pt-1">
              {group.items.map((item) => {
                const active = isItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-red-700 text-white shadow-sm shadow-red-700/20'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          className={`shrink-0 transition-colors ${
                            active ? 'text-amber-300' : 'text-slate-600 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Central HQ Access for Authorized Roles */}
        {user?.role === Role.ADMIN && (
          <div className="pt-2">
            <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 mb-1">
              Central HQ Desk
            </p>
            <a
              href={centralAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-amber-900 bg-amber-50/70 border border-amber-200/80 transition-all hover:bg-amber-100/70"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe size={16} className="text-amber-700 shrink-0" />
                <span className="truncate">HQ Command Portal</span>
              </div>
              <ExternalLink size={13} className="text-amber-700 opacity-70 group-hover:opacity-100" />
            </a>
          </div>
        )}
      </nav>

      {/* Authenticated Officer Pill */}
      <div className="shrink-0 border-t border-slate-100 bg-[#FBFBF9] p-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[11px] font-mono font-black text-amber-300 shadow-2xs">
              {initials(user?.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase text-slate-900 leading-tight">
              {user?.name || 'Field Officer'}
            </p>
            <p className="truncate text-[9.5px] font-mono font-semibold uppercase text-slate-600 mt-0.5">
              {formatRole(user?.role)}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out of field session"
            aria-label="Sign out"
            className="shrink-0 cursor-pointer rounded-xl p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main Application Shell                                                     */
/* -------------------------------------------------------------------------- */

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout, settings } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.roles.includes(user?.role as Role))
      })).filter((g) => g.items.length > 0),
    [user?.role]
  );

  const currentLabel = useMemo(() => {
    for (const g of visibleGroups) {
      const hit = g.items.find((i) => isItemActive(i, location.pathname));
      if (hit) return hit.label;
    }
    return 'Field Portal';
  }, [visibleGroups, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const sidebar = (
    <Sidebar
      groups={visibleGroups}
      pathname={location.pathname}
      onNavigate={() => setDrawerOpen(false)}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#FBFBF9] text-slate-900 antialiased selection:bg-red-700 selection:text-white">
      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile Drawer (Accessible off-canvas) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Field Navigation">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebar}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3.5 top-4 cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              <X size={18} />
            </button>
          </aside>
        </div>
      )}

      {/* Main Field Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Operational App Bar */}
        <header
          className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8 shadow-2xs"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 58 }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open field navigation"
              className="cursor-pointer rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black uppercase tracking-tight text-slate-900">
                {currentLabel}
              </h1>
              <p className="hidden truncate text-[10px] font-mono font-medium text-slate-500 md:block">
                {settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {/* Live GPS Telemetry Status Chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
              <Radio size={11} className="text-emerald-700 animate-pulse" />
              <span className="hidden sm:inline">GPS TELEMETRY</span>
              <span className="text-emerald-800">ONLINE</span>
            </div>

            {/* Helpline Link */}
            {settings?.contactNo && (
              <div className="hidden text-right lg:block">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-600 block">
                  Control Helpline
                </span>
                <a
                  href={`tel:+91${settings.contactNo}`}
                  className="text-xs font-mono font-black text-red-700 hover:underline"
                >
                  +91 {settings.contactNo}
                </a>
              </div>
            )}

            {/* PSARA Regulatory Compliance Badge */}
            <div className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 md:inline-flex">
              <ShieldCheck size={14} className="text-red-700 shrink-0" />
              <span>PSARA MP LICENSED</span>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export const Layout = AppShell;
export default AppShell;
