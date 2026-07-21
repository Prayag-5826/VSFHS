import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Target,
  Database,
  Loader2,
  ShieldCheck,
  MapPin,
  Clock,
  UserCheck,
  AlertTriangle,
  FileCheck2,
  XCircle,
  Eye
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/apiService';
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
        api.request('/attendance?order=date.desc')
      ]);
      setVisits(visitsData || []);
      setAttendanceLogs(attendanceData || []);
    } catch (err) {
      console.error("Failed synchronizing management metrics data streams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreTelemetry();
  }, []);

  // Modify attendance row state flags smoothly
  const handleAuditDecision = async (id: string, resolution: 'APPROVED_FULL' | 'APPROVED_HALF' | 'REJECTED') => {
    setActionLoading(id);
    try {
      await api.request(`/attendance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: resolution })
      });
      alert(`Shift record updated state: ${resolution}`);
      await fetchCoreTelemetry();
    } catch (err: any) {
      alert(`Failed to update operational status: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getChartData = () => {
    const dailyMap: Record<string, number> = {};
    const sortedVisits = [...visits].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedVisits.forEach(v => {
      const date = new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    });

    return Object.entries(dailyMap).map(([name, visits]) => ({ name, visits })).slice(-10);
  };

  const handleExportCSV = () => {
    if (visits.length === 0) {
      alert("No data available for export.");
      return;
    }
    const headers = ['ID', 'Company', 'Representative', 'Contact', 'Phone', 'Date', 'Latitude', 'Longitude'];
    const rows = visits.map((v: any) => [
      v.id,
      v.companyName,
      v.representativeName,
      v.contactPerson,
      v.phoneNumber,
      new Date(v.timestamp).toLocaleString(),
      v.location?.latitude || '',
      v.location?.longitude || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map((r: any) => r.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FieldAudit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={44} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Parsing Global Systems Logs...</p>
      </div>
    );
  }

  const chartData = getChartData();
  const quota = 100;
  const progress = Math.min(100, (visits.length / quota) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* Structural Action Control Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Analytics & Auditing Command</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-0.5">Cloud-synced tracking records matrix.</p>
        </div>

        {/* Workspace Segment Toggles */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border flex space-x-1">
            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ANALYTICS' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Performance Graphs
            </button>
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'AUDIT' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Attendance GPS Auditing
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'ANALYTICS' ? (
        /* ==================== PANEL WORKSPACE A: ANALYTICS CORE ==================== */
        <div className="space-y-6">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 font-black transition-all shadow-sm text-[10px] uppercase tracking-wider"
            >
              <FileSpreadsheet size={14} className="mr-2 text-green-600" /> Export CSV Sheet
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 font-black transition-all shadow-sm text-[10px] uppercase tracking-wider"
            >
              <FileText size={14} className="mr-2 text-red-600" /> Print Summary Report
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl min-h-[380px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Deployment Volume Analysis</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Historical timeline metrics</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border">Real-time Sync</span>
                </div>

                <div className="flex-1 w-full pt-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <Database size={40} className="text-slate-200 mb-2" />
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No metrics history mapped</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                   <TrendingUp className="absolute top-0 right-0 w-28 h-28 text-indigo-500/20 -mr-6 -mt-6" />
                   <h3 className="text-indigo-100 text-[9px] font-black uppercase tracking-widest mb-1">Growth Efficiency Ratio</h3>
                   <p className="text-3xl font-black mb-3">{(progress).toFixed(1)}%</p>
                   <div className="w-full bg-indigo-500/50 rounded-full h-1.5">
                      <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                   </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                   <Target className="absolute top-0 right-0 w-28 h-28 text-slate-800/40 -mr-6 -mt-6" />
                   <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Monthly Capture Performance</h3>
                   <p className="text-3xl font-black mb-3">{visits.length} / {quota}</p>
                   <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                   </div>
                </div>
              </div>
            </div>

            {/* Sidebar Leaderboard */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Top Field Personnel</h2>
              <div className="space-y-3">
                {visits.length === 0 ? (
                  <p className="text-center text-slate-300 text-[10px] font-black uppercase py-8">No statistics recorded</p>
                ) : (
                  Object.entries(visits.reduce((acc, v) => {
                    acc[v.representativeName] = (acc[v.representativeName] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, count], i) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black">{i + 1}</div>
                        <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[120px]">{name}</span>
                      </div>
                      <span className="text-[9px] font-mono font-black bg-white px-2 py-0.5 rounded border shadow-sm">{count} VISITS</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== PANEL WORKSPACE B: EXECUTIVE GPS/ATTENDANCE AUDER TERMINAL ==================== */
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-2xl space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Telemetry Exception Auditing Matrix</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verify background biometric check-ins and emergency exception entries</p>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Database size={44} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-bold uppercase">No remote attendance logs registered in database storage blocks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="py-3 px-4">Officer Identity</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Biometric Token</th>
                    <th className="py-3 px-4">Shift Timestamps</th>
                    <th className="py-3 px-4">Performance Check</th>
                    <th className="py-3 px-4">Operational Status Exception Details</th>
                    <th className="py-3 px-4 text-right">Actions Panel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-all align-top">

                      {/* Name Header */}
                      <td className="py-4 px-4 font-black text-slate-900 uppercase tracking-tight max-w-[140px] truncate">
                        {log.user_name}
                      </td>

                      {/* Log Date */}
                      <td className="py-4 px-4 font-mono font-black text-slate-400">
                        {log.date}
                      </td>

                      {/* Selfie Column Box */}
                      <td className="py-4 px-4">
                        {log.selfie ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden group border shadow-sm bg-slate-100">
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
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NO_TOKEN</span>
                        )}
                      </td>

                      {/* Timestamps & Telemetry Maps Coordinates */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center text-[11px] text-slate-900 font-black">
                          <Clock size={11} className="mr-1 text-slate-400" />
                          <span>IN: {new Date(log.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {log.punch_out ? (
                          <div className="flex items-center text-[11px] text-slate-900 font-black">
                            <Clock size={11} className="mr-1 text-slate-400" />
                            <span>OUT: {new Date(log.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase block w-fit">ACTIVE RUNNING</span>
                        )}

                        {/* GPS Mapping Coordinates */}
                        <div className="pt-1 flex flex-col gap-0.5 font-mono text-[9px] text-slate-400">
                          {log.punch_in_location && (
                            <a
                              href={`https://www.google.com/maps?q=${log.punch_in_location.latitude},${log.punch_in_location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-indigo-600 hover:underline flex items-center"
                            >
                              <MapPin size={9} className="mr-0.5 text-indigo-500" /> Lock In Position
                            </a>
                          )}
                          {log.punch_out_location && (
                            <a
                              href={`https://www.google.com/maps?q=${log.punch_out_location.latitude},${log.punch_out_location.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-indigo-600 hover:underline flex items-center"
                            >
                              <MapPin size={9} className="mr-0.5 text-amber-500" /> Lock Out Position
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Logged Target Drop Performance Meter */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-slate-950 font-black block">
                          {log.total_visits_logged} / {log.daily_target || 7} Drops
                        </span>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${Math.min((log.total_visits_logged / (log.daily_target || 7)) * 100, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Exception Reasoning Context Block */}
                      <td className="py-4 px-4 max-w-[220px]">
                        {/* Status Label */}
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider block w-fit ${
                          log.status === 'COMPLETED' || log.status.startsWith('APPROVED') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          log.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {log.status}
                        </span>

                        {log.exception_reason && (
                          <div className="mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[10px] text-slate-600 leading-normal">
                            <span className="font-black text-amber-600 block mb-0.5 text-[8px] uppercase tracking-wider">⚠️ Filed Reason:</span>
                            "{log.exception_reason}"
                          </div>
                        )}
                      </td>

                      {/* Actions Panel Buttons Trigger */}
                      <td className="py-4 px-4 text-right">
                        {actionLoading === log.id ? (
                          <Loader2 className="animate-spin text-slate-400 inline" size={16} />
                        ) : log.status === 'PENDING_REVIEW' ? (
                          <div className="flex flex-col gap-1.5 items-end">
                            <button
                              onClick={() => handleAuditDecision(log.id, 'APPROVED_FULL')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all"
                            >
                              <UserCheck size={10} /> <span>Approve Full Day</span>
                            </button>
                            <button
                              onClick={() => handleAuditDecision(log.id, 'APPROVED_HALF')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all"
                            >
                              <FileCheck2 size={10} /> <span>Approve Half Day</span>
                            </button>
                            <button
                              onClick={() => handleAuditDecision(log.id, 'REJECTED')}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm transition-all"
                            >
                              <XCircle size={10} /> <span>Deduct/Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest select-none">AUDITED</span>
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
