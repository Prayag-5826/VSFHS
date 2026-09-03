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
  Plus,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Visit, Lead } from '../types';
import { AttendanceWidget } from '../components/AttendanceWidget';

interface FieldDashboardProps {
  user: any;
  visits?: Visit[];
  leads?: Lead[];
  totalPipelineValue?: number;
  progressPercent?: string;
  personalTarget?: number;
  todayVisits?: Visit[];
  upcomingFollowUps?: any[];
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
  <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 flex items-start justify-between relative overflow-hidden transition-all duration-300 hover:shadow-md group">
    <div className="space-y-1">
      <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
        {title}
      </p>
      <h3 className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
        {value}
      </h3>
      {trend && (
        <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
          {trend}
        </p>
      )}
    </div>
    <div className={`p-3.5 rounded-2xl ${iconBg} ${color} border border-slate-100 shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0`}>
      <Icon size={20} />
    </div>
  </div>
);

export const FieldDashboard: React.FC<FieldDashboardProps> = ({
  user,
  visits = [],
  leads = [],
  totalPipelineValue = 0,
  progressPercent = '0',
  personalTarget = 100,
  todayVisits = [],
  upcomingFollowUps = [],
  onRefresh
}) => {
  const navigate = useNavigate();

  const getGreetingText = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="w-full space-y-7 px-1 sm:px-2 pb-12 animate-in fade-in duration-300">

      {/* Dynamic Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              {getGreetingText()} &bull; VSF Field Patrol
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Operations Desk
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Active Duty Representative: <span className="text-slate-800 font-bold">{user?.name}</span> ({user?.id})
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => navigate('/create-quotation')}
            className="bg-[#FBFBF9] hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl transition shadow-xs flex items-center justify-center space-x-2 w-full sm:w-auto cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-red-700" />
            <span>Generate Proposal</span>
          </button>

          <button
            onClick={() => navigate('/add-visit')}
            className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition shadow-xs flex items-center justify-center space-x-2 w-full sm:w-auto cursor-pointer"
          >
            <Plus size={14} className="text-amber-300" />
            <span>Log Client Drop</span>
          </button>
        </div>
      </div>

      {/* Embedded Biometric Attendance Module */}
      <AttendanceWidget
        currentVisitsCount={todayVisits.length}
        onStateChange={onRefresh}
      />

      {/* KPI Stats Configuration Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Pitches Made"
          value={visits.length}
          icon={MapPin}
          color="text-red-700"
          iconBg="bg-red-50"
          trend="Cumulative drops logged"
        />

        <StatsCard
          title="Assigned Accounts"
          value={leads.length}
          icon={Briefcase}
          color="text-amber-700"
          iconBg="bg-amber-50"
          trend="Assigned client roster"
        />

        <StatsCard
          title="Pipeline Contract Value"
          value={`₹${totalPipelineValue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="text-emerald-700"
          iconBg="bg-emerald-50"
          trend="Estimated deal volume"
        />

        <StatsCard
          title="Target Quota"
          value={`${progressPercent}%`}
          icon={CheckCircle2}
          color="text-slate-900"
          iconBg="bg-slate-100"
          trend={`Goal: ${personalTarget} Pitches`}
        />
      </div>

      {/* Split Bottom Section Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

        {/* Left 2 Cols: Today's Patrol Path */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Today&apos;s Patrol Trail
              </h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Client pitches recorded during your active shift
              </p>
            </div>
            <button
              onClick={() => navigate('/visits')}
              className="text-[10px] font-black text-red-700 hover:text-red-800 uppercase tracking-wider flex items-center cursor-pointer hover:underline"
            >
              <span>View History</span>
              <ArrowUpRight size={13} className="ml-0.5" />
            </button>
          </div>

          {todayVisits.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <p className="text-xs font-bold uppercase">No drops recorded yet today.</p>
              <p className="text-[10px]">Log your client visits to fulfill your required daily shift target.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayVisits.slice(0, 5).map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => navigate(`/visits`)}
                  className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer transition-all hover:bg-slate-50/70 px-3 rounded-2xl"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 uppercase truncate group-hover:text-red-700 transition-colors">
                        {visit.companyName}
                      </h4>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight mt-0.5 truncate">
                        <Clock size={10} className="inline mr-1 text-slate-400" />
                        {new Date(visit.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1.5">&bull;</span>
                        {visit.visitPurpose}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-red-700 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Pending Follow-Ups & Action Panel */}
        <div className="bg-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-900 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 border-b border-slate-800 pb-3">
              <PhoneCall size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Scheduled Follow-Ups
              </h3>
            </div>

            <div className="space-y-2.5">
              {upcomingFollowUps.length === 0 ? (
                <p className="text-slate-400 text-[10px] font-medium uppercase py-8 text-center tracking-wider">
                  No site follow-ups scheduled for today.
                </p>
              ) : (
                upcomingFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex justify-between items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate uppercase">
                        {item.companyName}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5 truncate">
                        {item.contactPerson || item.interactionOutcome}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg text-amber-300 shrink-0">
                      {item.nextFollowUp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>PSARA Field Network</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

      </div>

    </div>
  );
};

export default FieldDashboard;
