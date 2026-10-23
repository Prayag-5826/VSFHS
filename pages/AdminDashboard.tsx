import React, { Suspense, lazy, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Briefcase,
  IndianRupee,
  Users,
  Building2,
  ArrowUpRight,
  Bell,
  MapPin,
  ShieldAlert,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Visit, Lead } from '../types';
import type { MapPoint } from '../components/FieldTrackingMap';

// Leaflet (the map library) is large, so it loads only when the Live map tab is opened.
const FieldTrackingMap = lazy(() =>
  import('../components/FieldTrackingMap').then((m) => ({ default: m.FieldTrackingMap }))
);
import { NotificationModal } from '../components/NotificationModal';

interface AdminDashboardProps {
  stats: { visits: number; users: number; leads: number };
  visits: Visit[];
  leads: Lead[];
  totalPipelineValue: number;
  chartData: any[];
}

type DashboardView = 'OVERVIEW' | 'MAP' | 'ROSTER';

const DAILY_TARGET = 7;

/** Local (not UTC) yyyy-mm-dd, so "today" is correct in India before 5:30 AM. */
const toLocalISO = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

const EMPTY_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => ({ name, pitches: 0 }));

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  visits,
  leads,
  totalPipelineValue,
  chartData
}) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<DashboardView>('OVERVIEW');
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const todayVisits = useMemo(() => {
    const today = toLocalISO(new Date());
    return visits.filter((v: any) => {
      const stamp = v.timestamp || v.created_at;
      if (!stamp) return false;
      const d = new Date(stamp);
      return !isNaN(d.getTime()) && toLocalISO(d) === today;
    });
  }, [visits]);

  const mapPoints = useMemo<MapPoint[]>(
    () =>
      visits
        .filter((v: any) => {
          const lat = v.location?.latitude ?? v.latitude;
          const lng = v.location?.longitude ?? v.longitude;
          return typeof lat === 'number' && typeof lng === 'number';
        })
        .map((v: any) => ({
          id: v.id,
          title: v.companyName || v.company_name || 'Client site',
          subtitle: v.representativeName || v.representative_name || 'Field officer',
          lat: Number(v.location?.latitude ?? v.latitude),
          lng: Number(v.location?.longitude ?? v.longitude),
          type: 'VISIT',
          timestamp: v.timestamp || v.created_at || new Date().toISOString()
        })),
    [visits]
  );

  const staffPerformance = useMemo(() => {
    const map: Record<string, { name: string; totalToday: number; lastStop: string }> = {};
    todayVisits.forEach((v: any) => {
      const repId = v.representative_id || v.representativeId || 'UNASSIGNED';
      const repName = v.representative_name || v.representativeName || 'Field officer';
      const company = v.company_name || v.companyName || 'Patrol point';
      if (!map[repId]) map[repId] = { name: repName, totalToday: 0, lastStop: company };
      map[repId].totalToday += 1;
      map[repId].lastStop = company;
    });
    return Object.values(map);
  }, [todayVisits]);

  const sanitizedChartData = useMemo(
    () => (Array.isArray(chartData) && chartData.length > 0 ? chartData : EMPTY_WEEK),
    [chartData]
  );

  const highValueDeals = useMemo(
    () => leads.filter((l: any) => (l.estimatedValue || l.estimated_value || 0) > 25000).length,
    [leads]
  );

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const views: { key: DashboardView; label: string; icon?: React.ElementType }[] = [
    { key: 'OVERVIEW', label: 'Overview', icon: LayoutGrid },
    { key: 'MAP', label: 'Live map', icon: MapPin },
    { key: 'ROSTER', label: `Officers (${staffPerformance.length})`, icon: Users }
  ];

  const kpis = [
    { label: 'Total visits', value: stats.visits, note: 'Logged client visits', icon: Layers, tone: 'text-red-700 bg-red-50' },
    { label: 'Active leads', value: stats.leads, note: 'Open opportunities', icon: Briefcase, tone: 'text-amber-700 bg-amber-50' },
    {
      label: 'Pipeline value',
      value: `₹${totalPipelineValue.toLocaleString('en-IN')}`,
      note: 'Estimated monthly value',
      icon: IndianRupee,
      tone: 'text-emerald-700 bg-emerald-50'
    },
    { label: 'Field officers', value: stats.users, note: 'Enrolled staff', icon: Users, tone: 'text-slate-700 bg-slate-100' }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{todayLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNotifModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Bell size={16} className="text-amber-600" />
            <span>Broadcast notice</span>
          </button>
        </div>
      </header>

      {/* KPI row */}
      <section aria-label="Key figures" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, note, icon: Icon, tone }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={18} />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{note}</p>
          </div>
        ))}
      </section>

      {/* View switcher */}
      <div role="tablist" aria-label="Dashboard views" className="flex gap-1 border-b border-slate-200">
        {views.map(({ key, label, icon: Icon }) => {
          const active = activeView === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveView(key)}
              className={`-mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
                active
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon size={15} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW: LIVE MAP */}
      {activeView === 'MAP' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live field positions</h2>
              <p className="text-sm text-slate-500">GPS locations from logged client visits</p>
            </div>
            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              {mapPoints.length} {mapPoints.length === 1 ? 'pin' : 'pins'}
            </span>
          </div>
          <Suspense fallback={<div className="h-[400px] rounded-2xl bg-slate-100 animate-pulse" />}>
            <FieldTrackingMap points={mapPoints} />
          </Suspense>
        </section>
      )}

      {/* VIEW: OFFICERS ROSTER */}
      {activeView === 'ROSTER' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's field officers</h2>
            <p className="text-sm text-slate-500">Daily target: {DAILY_TARGET} client visits per officer</p>
          </div>

          {staffPerformance.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No officers have logged a visit today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4">Visits today</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Last location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {staffPerformance.map((staff, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{staff.name}</td>
                      <td className="py-3.5 px-4 tabular-nums">
                        {staff.totalToday} of {DAILY_TARGET}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-36 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-red-700 h-full rounded-full"
                            style={{ width: `${Math.min((staff.totalToday / DAILY_TARGET) * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{staff.lastStop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* VIEW: OVERVIEW */}
      {activeView === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Weekly chart */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Weekly inspection volume</h2>
              <p className="text-sm text-slate-500">Client visits per day across the agency</p>
            </div>

            <div className="w-full min-w-0 h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sanitizedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Bar dataKey="pitches" name="Visits" radius={[6, 6, 0, 0]}>
                    {sanitizedChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pitches > 0 ? '#B91C1C' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Compliance */}
          <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert size={17} />
                <h2 className="text-base font-bold text-slate-900">PSARA compliance</h2>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-medium text-slate-500">Site reports today</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{todayVisits.length} verified</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-medium text-slate-500">High-value proposals</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {highValueDeals} {highValueDeals === 1 ? 'deal' : 'deals'} above ₹25,000 per month
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Open reports</span>
              <ChevronRight size={15} />
            </button>
          </section>

          {/* Recent visits */}
          <section className="lg:col-span-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent client visits</h2>
                <p className="text-sm text-slate-500">Latest logs with time and outcome</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/visits')}
                className="text-sm font-semibold text-red-700 hover:text-red-800 hover:underline flex items-center cursor-pointer"
              >
                <span>View all</span>
                <ArrowUpRight size={14} className="ml-0.5" />
              </button>
            </div>

            {visits.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No visits logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visits.slice(0, 5).map((v: any) => {
                  const company = v.companyName || v.company_name || 'Client site';
                  const rep = v.representativeName || v.representative_name || 'Officer';
                  const outcome = (v.interactionOutcome || v.interaction_outcome || 'VISITED') as string;
                  const stamp = v.timestamp || v.created_at;
                  const time = stamp
                    ? new Date(stamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <li
                      key={v.id}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{company}</p>
                          <p className="text-xs text-slate-500">Logged by {rep}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg inline-block capitalize">
                          {outcome.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        {time && <span className="text-xs text-slate-400 block mt-0.5">{time}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <NotificationModal isOpen={isNotifModalOpen} onClose={() => setIsNotifModalOpen(false)} />
    </div>
  );
};

export default AdminDashboard;
