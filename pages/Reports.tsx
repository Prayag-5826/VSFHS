import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Target,
  Database,
  Loader2,
  MapPin,
  Clock,
  UserCheck,
  FileCheck2,
  XCircle,
  Eye,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, supabase } from '../services/apiService';
import { Visit } from '../types';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  punch_in: string;
  punch_out: string | null;
  date: string;
  selfie: string | null;
  punch_in_location: { latitude: number; longitude: number; accuracy: number } | null;
  punch_out_location: { latitude: number; longitude: number; accuracy: number } | null;
  total_visits_logged: number;
  daily_target: number;
  status: string;
  exception_reason: string | null;
}

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AUDIT'>('ANALYTICS');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCoreTelemetry = async () => {
    try {
      const [visitsData, attendanceData] = await Promise.all([
        api.request('/visits'),
        api.request('/attendance')
      ]);
      setVisits(Array.isArray(visitsData) ? visitsData : []);
      setAttendanceLogs(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (err) {
      console.error("Failed synchronizing management metrics data streams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreTelemetry();
  }, []);

  const handleAuditDecision = async (id: string, resolution: 'APPROVED_FULL' | 'APPROVED_HALF' | 'REJECTED') => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ status: resolution })
        .eq('id', id);

      if (error) throw error;
      await fetchCoreTelemetry();
    } catch (err: any) {
      alert(`Failed to update operational status: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getChartData = () => {
    const dailyMap: Record<string, number> = {};
    const sortedVisits = [...visits].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedVisits.forEach((v) => {
      const date = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    });

    const mapped = Object.entries(dailyMap).map(([name, visitsCount]) => ({ name, visits: visitsCount }));
    return mapped.length > 0 ? mapped.slice(-10) : [{ name: 'Today', visits: 0 }];
  };

  const handleExportCSV = () => {
    if (visits.length === 0) {
      alert("No visit records available for export.");
      return;
    }
    const headers = ['ID', 'Company', 'Representative', 'Contact', 'Phone', 'Date', 'Outcome'];
    const rows = visits.map((v: any) => [
      `"${v.id || ''}"`,
      `"${v.companyName || ''}"`,
      `"${v.representativeName || ''}"`,
      `"${v.contactPerson || ''}"`,
      `"${v.phoneNumber || ''}"`,
      `"${new Date(v.timestamp).toLocaleString('en-IN')}"`,
      `"${v.interactionOutcome || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r) => r.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VSF_FieldAudit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Compiling Audit Telemetry...
        </p>
      </div>
    );
  }

  const chartData = getChartData();
  const quota = 100;
  const progress = Math.min(100, (visits.length / quota) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12 px-1 sm:px-2">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              Operations Audit Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Analytics &amp; Audit Desk
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Real-time biometric attendance review &amp; commercial visit telemetry
          </p>
        </div>

        {/* Workspace Segment Toggles */}
        <div className="flex items-center gap-2">
          <div className="bg-[#FBFBF9] p-1 rounded-2xl border border-slate-200 flex space-x-1">
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'ANALYTICS'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Performance Graphs
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'AUDIT'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance &amp; GPS Auditing
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ANALYTICS' ? (
        /* ==================== WORKSPACE A: ANALYTICS CORE ==================== */
        <div className="space-y-6">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition shadow-xs text-xs uppercase tracking-wider cursor-pointer"
            >
              <FileSpreadsheet size={14} className="mr-2 text-emerald-600" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition shadow-xs text-xs uppercase tracking-wider cursor-pointer"
            >
              <FileText size={14} className="mr-2 text-red-700" /> Print Summary
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs min-h-[380px] flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Patrol Volume Aggregate
                    </h2>
                    <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">
                      Client interaction timelines
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[9px] font-mono font-bold uppercase tracking-wider">
                    Synced Live
                  </span>
                </div>

                <div className="flex-1 w-full min-h-[260px] min-w-0 pt-2">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorVisitsRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#B91C1C" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="visits"
                          stroke="#B91C1C"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorVisitsRed)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <Database size={36} className="text-slate-300 mb-2" />
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                        No activity metrics logged yet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-red-700 to-red-900 p-6 rounded-3xl text-white shadow-xs relative overflow-hidden">
                  <TrendingUp className="absolute top-0 right-0 w-28 h-28 text-white/10 -mr-6 -mt-6 pointer-events-none" />
                  <h3 className="text-red-100 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
                    Monthly Quota Velocity
                  </h3>
                  <p className="text-3xl font-black mb-3">{progress.toFixed(1)}%</p>
                  <div className="w-full bg-red-950/40 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-300 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xs relative overflow-hidden">
                  <Target className="absolute top-0 right-0 w-28 h-28 text-slate-800/40 -mr-6 -mt-6 pointer-events-none" />
                  <h3 className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">
                    Logged Pitches Total
                  </h3>
                  <p className="text-3xl font-black mb-3">{visits.length} / {quota}</p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Leaderboard */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Top Field Representatives
                </h2>
                <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
                  Ranked
                </span>
              </div>

              <div className="space-y-2.5">
                {visits.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs font-medium uppercase py-8">
                    No field activity logged
                  </p>
                ) : (
                  Object.entries(
                    visits.reduce((acc, v) => {
                      acc[v.representativeName] = (acc[v.representativeName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, count], i) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-3 bg-[#FBFBF9] rounded-2xl border border-slate-200/80"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            i === 0 ? 'bg-amber-400 text-amber-950' : 'bg-red-700 text-white'
                          }`}>
                            {i + 1}
                          </div>
                          <span className="text-xs font-black text-slate-900 uppercase truncate">
                            {name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-white text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs shrink-0">
                          {count} VISITS
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== WORKSPACE B: GPS & ATTENDANCE AUDIT TERMINAL ==================== */
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Shift Biometric &amp; Exception Auditing
              </h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Verify mobile check-in selfies and lock coordinates against registered site boundaries
              </p>
            </div>
            <span className="text-[9.5px] font-mono font-bold text-slate-700 bg-[#FBFBF9] border border-slate-200 px-2.5 py-1 rounded-xl">
              {attendanceLogs.length} Records Logged
            </span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Database size={40} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium uppercase">
                No remote attendance records stored in database yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-[#FBFBF9]">
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Live Snapshot</th>
                    <th className="py-3 px-4">Shift Timestamps</th>
                    <th className="py-3 px-4">Performance Check</th>
                    <th className="py-3 px-4">Status &amp; Notes</th>
                    <th className="py-3 px-4 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-all align-top">

                      {/* Name */}
                      <td className="py-4 px-4 font-black text-slate-900 uppercase tracking-tight max-w-[140px] truncate">
                        {log.user_name}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-500">
                        {log.date}
                      </td>

                      {/* Selfie */}
                      <td className="py-4 px-4">
                        {log.selfie ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden group border border-slate-200 shadow-xs bg-slate-100">
                            <img src={log.selfie} className="w-full h-full object-cover" alt="Biometric Token" />
                            <a
                              href={log.selfie}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                              <Eye size={12} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">NO_PHOTO</span>
                        )}
                      </td>

                      {/* Timestamps & GPS Pin */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center text-[11px] text-slate-900 font-bold font-mono">
                          <Clock size={11} className="mr-1 text-slate-400" />
                          <span>IN: {new Date(log.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {log.punch_out ? (
                          <div className="flex items-center text-[11px] text-slate-900 font-bold font-mono">
                            <Clock size={11} className="mr-1 text-slate-400" />
                            <span>OUT: {new Date(log.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase block w-fit">
                            DUTY ACTIVE
                          </span>
                        )}

                        <div className="pt-1 flex flex-col gap-0.5 font-mono text-[9px] text-slate-500">
                          {log.punch_in_location && (
                            <a
                              href={`https://www.google.com/maps?q=${log.punch_in_location.latitude},${log.punch_in_location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-red-700 hover:underline flex items-center"
                            >
                              <MapPin size={9} className="mr-0.5 text-red-700" /> View Punch GPS
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Pitch Progress */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-slate-900 font-bold block">
                          {log.total_visits_logged || 0} / {log.daily_target || 7} Drops
                        </span>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-red-700 rounded-full"
                            style={{
                              width: `${Math.min(((log.total_visits_logged || 0) / (log.daily_target || 7)) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </td>

                      {/* Exception Reasoning Context */}
                      <td className="py-4 px-4 max-w-[220px]">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider block w-fit border ${
                            log.status === 'COMPLETED' || log.status?.startsWith('APPROVED')
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : log.status === 'PENDING_REVIEW'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {log.status}
                        </span>

                        {log.exception_reason && (
                          <div className="mt-1.5 bg-[#FBFBF9] p-2 rounded-xl border border-slate-200 text-[10px] text-slate-600 leading-normal">
                            <span className="font-bold text-amber-800 block mb-0.5 text-[8.5px] uppercase tracking-wider">
                              Reported Note:
                            </span>
                            &ldquo;{log.exception_reason}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {actionLoading === log.id ? (
                          <Loader2 className="animate-spin text-slate-400 inline" size={15} />
                        ) : log.status === 'PENDING_REVIEW' ? (
                          <div className="flex flex-col gap-1 items-end">
                            <button
                              onClick={() => handleAuditDecision(log.id, 'APPROVED_FULL')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-xs transition cursor-pointer"
                            >
                              <UserCheck size={10} /> <span>Approve Full Day</span>
                            </button>
                            <button
                              onClick={() => handleAuditDecision(log.id, 'APPROVED_HALF')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-amber-950 text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-xs transition cursor-pointer"
                            >
                              <FileCheck2 size={10} /> <span>Approve Half Day</span>
                            </button>
                            <button
                              onClick={() => handleAuditDecision(log.id, 'REJECTED')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg shadow-xs transition cursor-pointer"
                            >
                              <XCircle size={10} /> <span>Reject / Penalize</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest select-none">
                            AUDITED
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Reports;
