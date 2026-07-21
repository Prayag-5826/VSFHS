import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  PhoneCall,
  Clock,
  Building2,
  ArrowUpRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { Visit, Lead } from '../types';
import { AttendanceWidget } from '../components/AttendanceWidget';

interface FieldDashboardProps {
  user: any;
  visits: Visit[];
  leads: Lead[];
  totalPipelineValue: number;
  progressPercent: string;
  personalTarget: number;
  todayVisits: Visit[];
  upcomingFollowUps: any[];
  onRefresh: () => void;
}

const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
  iconBg: string;
}> = ({ title, value, icon: Icon, trend, color, iconBg }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-start justify-between relative overflow-hidden transition-all hover:shadow-md">
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest leading-none">{title}</p>
      <h3 className="text-3xl font-mono font-black text-slate-900 tracking-tight">{value}</h3>
      {trend && (
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-2 block">
          {trend}
        </p>
      )}
    </div>
    <div className={`p-4 rounded-2xl ${iconBg} ${color} shadow-lg shrink-0`}>
      <Icon size={20} />
    </div>
  </div>
);

export const FieldDashboard: React.FC<FieldDashboardProps> = ({
  user,
  visits,
  leads,
  totalPipelineValue,
  progressPercent,
  personalTarget,
  todayVisits,
  upcomingFollowUps,
  onRefresh
}) => {
  const navigate = useNavigate();

  const getGreetingText = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning 🌅';
    if (hrs < 17) return 'Good Afternoon ☀️';
    return 'Good Evening 🌌';
  };

  return (
    <div className="w-full space-y-8 px-2 animate-in fade-in duration-300">

      {/* Dynamic Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600">
              {getGreetingText()}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Marketing Portal</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5">
            Active Representative Workspace: <span className="text-slate-700 font-black">{user?.name}</span>
          </p>
        </div>

        <button
          onClick={() => navigate('/add-visit')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus size={14} />
          <span>Log New Visit</span>
        </button>
      </div>

      {/* 🌟 EMBEDDED ATTENDANCE WORKFLOW SYSTEM WIDGET */}
      <AttendanceWidget
        currentVisitsCount={todayVisits.length}
        onStateChange={onRefresh}
      />

      {/* KPI Stats Configuration Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Pitches Made"
          value={visits.length}
          icon={MapPin}
          color="text-indigo-600"
          iconBg="bg-indigo-50"
        />

        <StatsCard
          title="Pipeline Accounts"
          value={leads.length}
          icon={Briefcase}
          color="text-slate-950"
          iconBg="bg-slate-100"
        />

        <StatsCard
          title="Pipeline Value"
          value={`₹${totalPipelineValue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="text-amber-600"
          iconBg="bg-amber-50"
          trend="Estimated Revenue"
        />

        <StatsCard
          title="Target Conversion"
          value={`${progressPercent}%`}
          icon={CheckCircle2}
          color="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={`Goal: ${personalTarget} Visits`}
        />
      </div>

      {/* Split Bottom Section Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Double Card: Today's Path Trail */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Today's Marketing Path</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Locations recorded during your active shift</p>
            </div>
            <button
              onClick={() => navigate('/visits')}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center"
            >
              <span>View Roster</span>
              <ArrowUpRight size={14} className="ml-0.5" />
            </button>
          </div>

          {todayVisits.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <p className="text-xs font-bold uppercase">No drops recorded yet today.</p>
              <p className="text-[9px]">Log your marketing visits to fulfill your target checklist ring.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayVisits.slice(0, 4).map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => navigate(`/visit/${visit.id}`)}
                  className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer transition-all"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 uppercase truncate group-hover:text-indigo-600 transition-colors">{visit.companyName}</h4>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5">
                        <Clock size={10} className="inline mr-1" />
                        {new Date(visit.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1.5">•</span>
                        {visit.visitPurpose}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Single Card: Pending Actions Follow Ups Box */}
        <div className="bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-xl border border-slate-900 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-800/80 pb-3">
              <PhoneCall size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Pending Lead Actions</h3>
            </div>

            <div className="space-y-3">
              {upcomingFollowUps.length === 0 ? (
                <p className="text-slate-400 text-[10px] font-bold uppercase py-4 text-center tracking-wide">
                  No follow-ups scheduled at this moment.
                </p>
              ) : (
                upcomingFollowUps.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate uppercase">{item.companyName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">{item.interactionOutcome}</p>
                    </div>
                    <span className="text-[9px] font-mono font-black bg-indigo-600/30 px-2.5 py-1 rounded text-indigo-300 shrink-0">
                      {item.nextFollowUp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-900 text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
            <span>Security Operational Node</span>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
          </div>
        </div>

      </div>

    </div>
  );
};
