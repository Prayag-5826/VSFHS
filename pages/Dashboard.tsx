import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Visit, Role, Lead } from '../types';
import { api, isNetworkError } from '../services/apiService';

// Charts and the map are only downloaded for administrators.
const AdminDashboard = lazy(() => import('./AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const FieldDashboard = lazy(() => import('./FieldDashboard').then((m) => ({ default: m.FieldDashboard })));

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <Loader2 className="animate-spin text-red-700" size={26} />
  </div>
);

/** Local (not UTC) yyyy-mm-dd, so "today" is right in India before 5:30 AM. */
const toLocalISO = (d: Date) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ visits: 0, users: 0, leads: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardTelemetry = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const isRep = user.role === Role.FIELD_REP;

      const [visitsData, leadsData, statsData] = await Promise.all([
        api.request(`/visits${isRep ? `?rep_id=${user.id}` : ''}`),
        api.request(`/leads${isRep ? `?assignedTo=${user.id}` : ''}`),
        api.request('/stats')
      ]);

      setVisits(Array.isArray(visitsData) ? visitsData : []);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setStats(statsData || { visits: 0, users: 0, leads: 0 });
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
      console.error('Dashboard sync error:', err);
      setError(
        isNetworkError(err)
          ? 'No connection. Check your network and retry. Visits you log offline are saved on this device.'
          : err?.message || 'Data synchronisation error.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Depend on id and role, not the whole user object, so a background session refresh doesn't reload everything.
  useEffect(() => {
    fetchDashboardTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-red-800">Vidhya Security Force</p>
          <p className="text-xs text-slate-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] p-8 text-center max-w-md mx-auto space-y-5 bg-white border border-red-100 rounded-3xl shadow-sm mt-6">
        <div className="w-16 h-16 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={30} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">Connection interrupted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
        </div>
        <button
          onClick={() => fetchDashboardTelemetry()}
          className="w-full bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  const personalTarget = user?.visitTarget || 100;
  const progressPercent = Math.min(100, (visits.length / personalTarget) * 100).toFixed(0);

  const today = toLocalISO(new Date());
  const visitDay = (v: Visit) => {
    const d = new Date(v.timestamp);
    return isNaN(d.getTime()) ? '' : toLocalISO(d);
  };

  const todayVisits = visits.filter((v) => visitDay(v) === today);

  const upcomingFollowUps = visits
    .filter((v) => v.nextFollowUp && v.nextFollowUp >= today)
    .sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''))
    .slice(0, 3);

  // Last seven days, oldest first
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: toLocalISO(d),
        pitches: 0
      };
    })
    .reverse();

  visits.forEach((v) => {
    const day = last7Days.find((d) => d.date === visitDay(v));
    if (day) day.pitches++;
  });

  if (user?.role === Role.ADMIN) {
    return (
      <Suspense fallback={<ViewLoader />}>
        <AdminDashboard
          stats={stats}
          visits={visits}
          leads={leads}
          totalPipelineValue={totalPipelineValue}
          chartData={last7Days}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ViewLoader />}>
      <FieldDashboard
        user={user}
        visits={visits}
        leads={leads}
        totalPipelineValue={totalPipelineValue}
        progressPercent={progressPercent}
        personalTarget={personalTarget}
        todayVisits={todayVisits}
        upcomingFollowUps={upcomingFollowUps}
        onRefresh={fetchDashboardTelemetry}
      />
    </Suspense>
  );
};

export default Dashboard;
