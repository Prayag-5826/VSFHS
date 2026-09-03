import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Briefcase,
  IndianRupee,
  Users,
  Building2,
  ShieldCheck,
  ArrowUpRight,
  FileSpreadsheet,
  Bell,
  MapPin,
  Clock,
  ShieldAlert,
  ChevronRight,
  Sparkles
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
import { FieldTrackingMap, MapPoint } from '../components/FieldTrackingMap';
import { NotificationModal } from '../components/NotificationModal';

interface AdminDashboardProps {
  stats: { visits: number; users: number; leads: number };
  visits: Visit[];
  leads: Lead[];
  totalPipelineValue: number;
  chartData: any[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  visits,
  leads,
  totalPipelineValue,
  chartData
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAP' | 'ROSTER'>('OVERVIEW');
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);

  const todayDateStr = new Date().toISOString().split('T')[0];

  const todayVisits = useMemo(() => {
    return visits.filter((v: any) => {
      const stamp = v.timestamp || v.created_at || '';
      return stamp.startsWith(todayDateStr);
    });
  }, [visits, todayDateStr]);

  // Extract coordinates for field map
  useEffect(() => {
    const points: MapPoint[] = visits
      .filter((v: any) => {
        const lat = v.location?.latitude ?? v.latitude;
        const lng = v.location?.longitude ?? v.longitude;
        return typeof lat === 'number' && typeof lng === 'number';
      })
      .map((v: any) => ({
        id: v.id,
        title: v.companyName || v.company_name || 'Client Site',
        subtitle: v.representativeName || v.representative_name || 'Field Officer',
        lat: Number(v.location?.latitude ?? v.latitude),
        lng: Number(v.location?.longitude ?? v.longitude),
        type: 'VISIT',
        timestamp: v.timestamp || v.created_at || new Date().toISOString()
      }));

    setMapPoints(points);
  }, [visits]);

  // Group visits per representative
  const staffPerformance = useMemo(() => {
    const map: { [key: string]: { name: string; totalToday: number; lastStop: string } } = {};

    todayVisits.forEach((v: any) => {
      const repId = v.representative_id || v.representativeId || 'UNASSIGNED';
      const repName = v.representative_name || v.representativeName || 'Field Officer';
      const company = v.company_name || v.companyName || 'Patrol Point';

      if (!map[repId]) {
        map[repId] = { name: repName, totalToday: 0, lastStop: company };
      }
      map[repId].totalToday += 1;
      map[repId].lastStop = company;
    });

    return Object.values(map);
  }, [todayVisits]);

  const sanitizedChartData = useMemo(() => {
    if (Array.isArray(chartData) && chartData.length > 0) return chartData;
    return [
      { name: 'Mon', pitches: 0 },
      { name: 'Tue', pitches: 0 },
      { name: 'Wed', pitches: 0 },
      { name: 'Thu', pitches: 0 },
      { name: 'Fri', pitches: 0 },
      { name: 'Sat', pitches: 0 },
      { name: 'Sun', pitches: 0 }
    ];
  }, [chartData]);

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-14 animate-in fade-in duration-200">

      {/* Clean Single Master Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-red-700 text-[10.5px] font-mono font-bold tracking-wider uppercase mb-0.5">
            <ShieldCheck size={14} />
            <span>Central Operations Command</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Operations Overview
          </h1>
        </div>

        {/* Unified Tab & Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[#FBFBF9] p-1 rounded-2xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('MAP')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'MAP'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin size={13} className={activeTab === 'MAP' ? 'text-amber-300' : 'text-slate-400'} />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'ROSTER'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Officers ({staffPerformance.length})
            </button>
          </div>

          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Broadcast Field Notice"
          >
            <Bell size={16} className="text-amber-600" />
          </button>

          <button
            onClick={() => navigate('/create-quotation')}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-amber-300" />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Visits</span>
            <Layers size={18} className="text-red-700" />
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">{stats.visits}</p>
          <span className="text-[10px] text-slate-400 font-medium">Logged patrol drops</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Active Leads</span>
            <Briefcase size={18} className="text-amber-700" />
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">{stats.leads}</p>
          <span className="text-[10px] text-slate-400 font-medium">Commercial opportunities</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Pipeline Value</span>
            <IndianRupee size={18} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">
            ₹{totalPipelineValue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Estimated monthly volume</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Enrolled Staff</span>
            <Users size={18} className="text-slate-700" />
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">{stats.users}</p>
          <span className="text-[10px] text-slate-400 font-medium">Verified field officers</span>
        </div>
      </div>

      {/* VIEW: LIVE SATELLITE MAP */}
      {activeTab === 'MAP' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Live Field Positions</h3>
              <p className="text-xs text-slate-400">GPS satellite locks from active client visits</p>
            </div>
            <span className="text-xs font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              {mapPoints.length} Pins Loaded
            </span>
          </div>
          <FieldTrackingMap points={mapPoints} />
        </div>
      )}

      {/* VIEW: ROSTER DUTY TABLE */}
      {activeTab === 'ROSTER' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">Today's Field Officer Patrols</h3>
            <p className="text-xs text-slate-400">Daily quota tracking (Target: 7 client drops per day)</p>
          </div>

          {staffPerformance.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No field officers have checked in or logged visits today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Officer Name</th>
                    <th className="py-3 px-4">Visits Today</th>
                    <th className="py-3 px-4">Shift Completion</th>
                    <th className="py-3 px-4">Recent Client Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {staffPerformance.map((staff, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-slate-900 uppercase font-black">{staff.name}</td>
                      <td className="py-3.5 px-4 font-mono text-red-700">{staff.totalToday} / 7 Drops</td>
                      <td className="py-3.5 px-4">
                        <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-red-700 h-full rounded-full"
                            style={{ width: `${Math.min((staff.totalToday / 7) * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 uppercase">{staff.lastStop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: MAIN ANALYTICS OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Activity Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Weekly Inspection Volume</h3>
                <p className="text-xs text-slate-400">Total client visits per day across the agency</p>
              </div>
            </div>

            {/* Guaranteed Height Box to Silence Recharts Warning */}
            <div className="w-full min-w-0 h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sanitizedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#FBFBF9' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="pitches" radius={[6, 6, 0, 0]}>
                    {sanitizedChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pitches > 0 ? '#B91C1C' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance & Audit Watch Card (4 Cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 text-red-700">
                <ShieldAlert size={16} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  PSARA Compliance
                </h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                Active
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FBFBF9] border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Biometric Duty Punches
                </span>
                <p className="text-slate-800 font-bold">
                  {todayVisits.length} Site Reports Verified Today
                </p>
              </div>

              <div className="p-3 bg-[#FBFBF9] border border-slate-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  High-Value Proposals
                </span>
                <p className="text-slate-800 font-bold">
                  {leads.filter((l: any) => (l.estimatedValue || l.estimated_value || 0) > 25000).length} Deals Exceeding ₹25,000/mo
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/reports')}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Audit Terminal</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Full-Width Recent Incoming Visits Table */}
          <div className="lg:col-span-12 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Recent Client Encounters</h3>
                <p className="text-xs text-slate-400">Incoming logs with verified timestamps and outcomes</p>
              </div>
              <button
                onClick={() => navigate('/visits')}
                className="text-xs font-mono font-bold text-red-700 hover:text-red-800 uppercase tracking-wider hover:underline flex items-center cursor-pointer"
              >
                <span>View All Visits</span>
                <ArrowUpRight size={13} className="ml-0.5" />
              </button>
            </div>

            {visits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No field logs registered yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {visits.slice(0, 5).map((v: any) => {
                  const company = v.companyName || v.company_name || 'Client Site';
                  const rep = v.representativeName || v.representative_name || 'Officer';
                  const outcome = v.interactionOutcome || v.interaction_outcome || 'VISITED';
                  const stamp = v.timestamp || v.created_at || new Date().toISOString();

                  return (
                    <div key={v.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 uppercase truncate">{company}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Logged by {rep}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-800 bg-[#FBFBF9] border border-slate-200 px-2 py-0.5 rounded-lg inline-block">
                          {outcome.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                          {new Date(stamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Broadcast Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />

    </div>
  );
};

export default AdminDashboard;
