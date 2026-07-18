import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Phone,
  User,
  Building2,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Visit, Role } from '../types';
import { api } from '../services/apiService';

const FollowUps: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<Visit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'UPCOMING'>('ALL');

  useEffect(() => {
    if (!user) return;

    const fetchFollowUps = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pull visits filtering by agent if they are field reps
        const path = `/visits${user.role === Role.FIELD_REP ? `?rep_id=${user.id}` : ''}`;
        const data = await api.request(path);

        if (Array.isArray(data)) {
          // Filter down strictly to visits that have an active follow up date scheduled
          const mappedFollowUps = data.filter((v: Visit) => v.nextFollowUp);
          setFollowUps(mappedFollowUps);
        }
      } catch (err: any) {
        console.error("Failed to sync follow up schedules:", err);
        setError(err.message || "Cloud data synchronization error.");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, [user]);

  const getFilteredData = () => {
    const todayStr = new Date().toISOString().split('T')[0];

    let filtered = followUps.filter(item => {
      const matchesSearch =
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    if (filterType === 'TODAY') {
      filtered = filtered.filter(item => item.nextFollowUp === todayStr);
    } else if (filterType === 'OVERDUE') {
      filtered = filtered.filter(item => item.nextFollowUp! < todayStr);
    } else if (filterType === 'UPCOMING') {
      filtered = filtered.filter(item => item.nextFollowUp! > todayStr);
    }

    // Sort chronologically (oldest overdue first, so they resolve them)
    return filtered.sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''));
  };

  const getStatusBadge = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) {
      return <span className="text-[9px] font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-widest">Due Today</span>;
    } else if (dateStr < todayStr) {
      return <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Overdue</span>;
    } else {
      return <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">Scheduled</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Pipeline Agendas...</p>
      </div>
    );
  }

  const displayedFollowUps = getFilteredData();
  const todayStr = new Date().toISOString().split('T')[0];

  const metrics = {
    total: followUps.length,
    today: followUps.filter(f => f.nextFollowUp === todayStr).length,
    overdue: followUps.filter(f => f.nextFollowUp! < todayStr).length
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">Lead Action Center</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
          Manage scheduled callbacks, presentations, and account conversions.
        </p>
      </div>

      {/* COMPACT METRIC ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Action Rows</p>
            <h4 className="text-xl font-black text-slate-900 mt-1">{metrics.total}</h4>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-800"><Calendar size={18} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Today</p>
            <h4 className="text-xl font-black text-slate-900 mt-1">{metrics.today}</h4>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Clock size={18} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Critical Overdue</p>
            <h4 className="text-xl font-black text-slate-900 mt-1">{metrics.overdue}</h4>
          </div>
          <div className="p-3 rounded-xl bg-red-50 text-red-600"><AlertCircle size={18} /></div>
        </div>
      </div>

      {/* SEARCH AND FILTER HEADERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Company or Client Lead..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-slate-400 hidden sm:inline" />
          {(['ALL', 'TODAY', 'OVERDUE', 'UPCOMING'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === type
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ACTION CARD WORKSPACE */}
      <div className="space-y-4">
        {displayedFollowUps.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[2rem] border border-dashed border-slate-200">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-900 font-black text-xs uppercase tracking-widest">Pipeline Agenda Clean</p>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter mt-1">No scheduled records match your filters.</p>
          </div>
        ) : (
          displayedFollowUps.map(item => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                  <span className="font-mono text-[9px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {item.nextFollowUp}
                  </span>
                  {getStatusBadge(item.nextFollowUp!)}
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    🎯 Last Outcome: {item.interactionOutcome}
                  </span>
                </div>

                <div className="flex items-start space-x-3">
                  <Building2 className="text-slate-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.companyName}</h3>
                    <div className="flex items-center space-x-4 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      <span className="flex items-center"><User size={12} className="mr-1 text-indigo-400"/> {item.contactPerson}</span>
                      {user?.role !== Role.FIELD_REP && (
                        <span>• Rep: {item.representativeName}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION CALL ROW BUTTONS */}
              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50">
                <a
                  href={`tel:${item.phoneNumber}`}
                  className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all flex items-center justify-center shadow-sm"
                  title="Call Decision Maker"
                >
                  <Phone size={16} />
                </a>

                <button
                  onClick={() => window.location.hash = `#/visits/${item.id}`}
                  className="px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center shadow-sm"
                >
                  <span>Log Pitch Update</span>
                  <ArrowUpRight size={14} className="ml-1.5 text-indigo-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FollowUps;
