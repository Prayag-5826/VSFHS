import React, { useEffect, useState, useMemo } from 'react';
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
  Filter,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Visit, Role } from '../types';
import { api } from '../services/apiService';

const FollowUps: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'UPCOMING'>('ALL');

  useEffect(() => {
    if (!user) return;

    const fetchFollowUps = async () => {
      setLoading(true);
      setError(null);
      try {
        const path = `/visits${user.role === Role.FIELD_REP ? `?rep_id=${user.id}` : ''}`;
        const data = await api.request(path);

        if (Array.isArray(data)) {
          // Normalize snake_case and camelCase field variations
          const mappedFollowUps = data
            .map((v: any) => ({
              id: v.id,
              companyName: v.companyName || v.company_name || 'Commercial Entity',
              contactPerson: v.contactPerson || v.contact_person || 'Representative',
              phoneNumber: v.phoneNumber || v.phone_number || v.phone || '',
              representativeName: v.representativeName || v.representative_name || 'Field Officer',
              interactionOutcome: v.interactionOutcome || v.interaction_outcome || 'FOLLOW_UP',
              nextFollowUp: v.nextFollowUp || v.next_follow_up || null,
              category: v.category || 'COMMERCIAL COMPLEX',
              timestamp: v.timestamp || v.created_at
            }))
            .filter((v: any) => Boolean(v.nextFollowUp));

          setFollowUps(mappedFollowUps);
        } else {
          setFollowUps([]);
        }
      } catch (err: any) {
        console.error("Failed to sync follow-up schedules:", err);
        setError(err.message || "Cloud data synchronization error.");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, [user]);

  const todayStr = new Date().toISOString().split('T')[0];

  const displayedFollowUps = useMemo(() => {
    let filtered = followUps.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      const company = (item.companyName || '').toLowerCase();
      const contact = (item.contactPerson || '').toLowerCase();
      const phone = (item.phoneNumber || '');

      return company.includes(searchLower) || contact.includes(searchLower) || phone.includes(searchLower);
    });

    if (filterType === 'TODAY') {
      filtered = filtered.filter((item) => item.nextFollowUp === todayStr);
    } else if (filterType === 'OVERDUE') {
      filtered = filtered.filter((item) => item.nextFollowUp < todayStr);
    } else if (filterType === 'UPCOMING') {
      filtered = filtered.filter((item) => item.nextFollowUp > todayStr);
    }

    // Chronological order: overdue first, then today, then upcoming
    return filtered.sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''));
  }, [followUps, searchQuery, filterType, todayStr]);

  const metrics = useMemo(() => ({
    total: followUps.length,
    today: followUps.filter((f) => f.nextFollowUp === todayStr).length,
    overdue: followUps.filter((f) => f.nextFollowUp < todayStr).length
  }), [followUps, todayStr]);

  const getStatusBadge = (dateStr: string) => {
    if (dateStr === todayStr) {
      return (
        <span className="text-[9.5px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Due Today
        </span>
      );
    } else if (dateStr < todayStr) {
      return (
        <span className="text-[9.5px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Overdue Audit
        </span>
      );
    } else {
      return (
        <span className="text-[9.5px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Scheduled
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Synchronizing Follow-Up Schedule...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-14 animate-in fade-in duration-200">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              Commercial Conversion Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Site Follow-Up Schedule
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Manage scheduled customer callbacks, proposal follow-ups, and deployment pitches
          </p>
        </div>

        <button
          onClick={() => navigate('/add-visit')}
          className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <Plus size={14} className="text-amber-300" />
          <span>New Site Visit</span>
        </button>
      </div>

      {/* KPI Metric Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Follow-Ups
            </p>
            <h4 className="text-2xl font-mono font-black text-slate-900 mt-0.5">
              {metrics.total}
            </h4>
            <span className="text-[9.5px] font-bold text-slate-500 mt-1 block">Active pipeline leads</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FBFBF9] border border-slate-200 text-slate-700 shadow-xs">
            <Calendar size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider">
              Pending Today
            </p>
            <h4 className="text-2xl font-mono font-black text-amber-900 mt-0.5">
              {metrics.today}
            </h4>
            <span className="text-[9.5px] font-bold text-amber-800 mt-1 block">Requires action before shift close</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 shadow-xs">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-wider">
              Critical Overdue
            </p>
            <h4 className="text-2xl font-mono font-black text-red-700 mt-0.5">
              {metrics.overdue}
            </h4>
            <span className="text-[9.5px] font-bold text-red-600 mt-1 block">Immediate callback required</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 shadow-xs">
            <AlertCircle size={20} />
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client entity, representative, or mobile..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'TODAY', 'OVERDUE', 'UPCOMING'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                filterType === type
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-[#FBFBF9] text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-Up Cards List */}
      <div className="space-y-3">
        {displayedFollowUps.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 shadow-xs">
            <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-2" />
            <p className="text-slate-900 font-black text-xs uppercase tracking-wider">
              Schedule Clear
            </p>
            <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider mt-0.5">
              No pending callbacks matching current filters.
            </p>
          </div>
        ) : (
          displayedFollowUps.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-red-200 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                  <span className="font-mono text-[9.5px] font-bold bg-[#FBFBF9] border border-slate-200 text-slate-800 px-2.5 py-0.5 rounded-lg">
                    📅 {new Date(item.nextFollowUp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {getStatusBadge(item.nextFollowUp)}
                  <span className="text-[9.5px] font-bold text-amber-900 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Status: {item.interactionOutcome.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-start space-x-3 pt-0.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                      {item.companyName}
                    </h3>
                    <div className="flex items-center space-x-3 mt-0.5 text-[10.5px] text-slate-500 font-medium">
                      <span className="flex items-center text-slate-700 font-bold">
                        <User size={11} className="mr-1 text-amber-700" />
                        {item.contactPerson}
                      </span>
                      {user?.role !== Role.FIELD_REP && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          &bull; Officer: {item.representativeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                {item.phoneNumber && (
                  <a
                    href={`tel:${item.phoneNumber}`}
                    className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 transition flex items-center justify-center shadow-xs cursor-pointer"
                    title="Call Decision Maker"
                  >
                    <PhoneCall size={15} />
                  </a>
                )}

                <button
                  onClick={() => navigate(`/visit/${item.id}`)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black active:bg-slate-950 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition flex items-center shadow-xs cursor-pointer"
                >
                  <span>Inspection Docket</span>
                  <ArrowUpRight size={13} className="ml-1 text-amber-300" />
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
