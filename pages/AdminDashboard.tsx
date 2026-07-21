import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Briefcase,
  IndianRupee,
  Users,
  Activity,
  ShieldAlert,
  Building2,
  ExternalLink,
  ShieldCheck,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Visit, Lead } from '../types';

interface AdminDashboardProps {
  stats: { visits: number; users: number; leads: number };
  visits: Visit[];
  leads: Lead[];
  totalPipelineValue: number;
  chartData: any[];
}

const MetricBox: React.FC<{
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string
}> = ({ title, value, description, icon: Icon, color, bg }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
    <div className="space-y-1">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{title}</span>
      <h3 className="text-3xl font-mono font-black text-slate-900 tracking-tight">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{description}</p>
    </div>
    <div className={`p-4 rounded-2xl ${bg} ${color} shadow-sm shrink-0`}><Icon size={22} /></div>
  </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats, visits, leads, totalPipelineValue, chartData
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROSTER'>('OVERVIEW');
  const todayDateStr = new Date().toISOString().split('T')[0];

  const todayVisits = visits.filter(v => v.timestamp.startsWith(todayDateStr));

  // Group visits by representative to display active runtime logs
  const staffPerformanceMap: { [key: string]: { name: string; totalToday: number; lastStop: string } } = {};

  todayVisits.forEach(v => {
    const repId = v.representativeId || 'UNASSIGNED';
    const repName = v.representativeName || 'Field Officer';
    if (!staffPerformanceMap[repId]) {
      staffPerformanceMap[repId] = { name: repName, totalToday: 0, lastStop: v.companyName };
    }
    staffPerformanceMap[repId].totalToday += 1;
    staffPerformanceMap[repId].lastStop = v.companyName;
  });

  const activeStaffArray = Object.values(staffPerformanceMap);

  return (
    <div className="w-full space-y-8 px-2 animate-in fade-in duration-300">

      {/* Dynamic Header Block */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <ShieldCheck size={18} className="animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase">Management Control Suite</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">HQ Executive Command</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5">
            Real-time monitoring panel for Vidhya Security Force & Housekeeping Services
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border flex space-x-1">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Analytics Matrix
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ROSTER' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Team Deployment ({activeStaffArray.length})
            </button>
          </div>

          <button
            onClick={() => navigate('/add-user')}
            className="bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md active:scale-95"
          >
            Add New Officer
          </button>
        </div>
      </div>

      {/* Grid KPI Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricBox title="Global Brand Pitches" value={stats.visits} description="Total historical drops" icon={Layers} color="text-indigo-600" bg="bg-indigo-50" />
        <MetricBox title="Pipeline Contracts" value={stats.leads} description="Active business leads" icon={Briefcase} color="text-slate-900" bg="bg-slate-100" />
        <MetricBox title="Secured Asset Value" value={`₹${totalPipelineValue.toLocaleString('en-IN')}`} description="Estimated revenue capacity" icon={IndianRupee} color="text-amber-600" bg="bg-amber-50" />
        <MetricBox title="Active Field Forces" value={stats.users} description="Registered agency staff" icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            {/* Recharts Performance Visualizations */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Weekly Performance Aggregate</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Combined field metrics chart logs</p>
                </div>
                <div className="flex items-center space-x-1.5 text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border tracking-widest">
                  <Activity size={12} className="text-indigo-600 animate-pulse" />
                  <span>LIVE TRACKER</span>
                </div>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="pitches" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pitches > 0 ? '#6366f1' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comprehensive Logs Roster */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Latest System Actions</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time incoming drop logs</p>
                </div>
                <button
                  onClick={() => navigate('/visit-logs')}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center"
                >
                  <span>Open Master Log</span>
                  <ArrowUpRight size={14} className="ml-0.5" />
                </button>
              </div>

              {visits.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">No data streams arriving yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visits.slice(0, 5).map((visit) => (
                    <div key={visit.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 uppercase truncate">{visit.companyName}</h4>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5 truncate">
                            👤 Rep: <strong className="text-slate-700 font-bold">{visit.representativeName || 'Agent'}</strong> • {visit.visitPurpose}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md block">
                          {visit.interactionOutcome}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 block mt-1 uppercase tracking-wider">
                          {new Date(visit.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Alerts Panel */}
          <div className="space-y-6">
            <div className="bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-xl border border-slate-900 space-y-4">
              <div className="flex items-center space-x-2 text-amber-400 border-b border-slate-800 pb-3">
                <ShieldAlert size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Operations Control</h3>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest bg-indigo-950 px-2 py-0.5 rounded">Attendance Watch</span>
                <p className="text-[11px] font-bold text-slate-300 leading-relaxed">
                  Review and verify remote location attendance bypass logs using the dedicated checking terminal.
                </p>
                <button
                  onClick={() => navigate('/reports')}
                  className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all text-center flex items-center justify-center space-x-1"
                >
                  <span>Open Audit Terminal</span>
                  <ExternalLink size={10} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">High Value Leads</h3>
                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">PROSPECTS</span>
              </div>
              <div className="space-y-3">
                {leads.filter(l => (l.estimatedValue || 0) > 20000).slice(0, 3).map(lead => (
                  <div key={lead.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-900 uppercase truncate max-w-[130px]">{lead.companyName}</h4>
                      <span className="text-[10px] font-mono font-black text-emerald-600">
                        ₹{lead.estimatedValue?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">Status: {lead.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* TAB MODULE B: DENSE TEAM ROSTER METRICS */
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Active Representatives Tracker</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Calculated tracking logs for today's field actions</p>
          </div>

          {activeStaffArray.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xs font-bold uppercase">No field officers have checked into active status streams today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Field Representative</th>
                    <th className="py-3 px-4">Today's Total Pitches</th>
                    <th className="py-3 px-4">Shift Status Bar</th>
                    <th className="py-3 px-4">Last Monitored Location Node</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {activeStaffArray.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-4 px-4 font-black text-slate-900 uppercase">{staff.name}</td>
                      <td className="py-4 px-4 font-mono text-indigo-600 font-black text-sm">{staff.totalToday} / 7 Drops</td>
                      <td className="py-4 px-4">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min((staff.totalToday / 7) * 100, 100)}%` }} />
                        </div>
                      </td>
                      <td className="py-4 px-4 uppercase text-slate-400 truncate max-w-[200px]">{staff.lastStop}</td>
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
