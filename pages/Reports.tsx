import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  ExternalLink,
  Users,
  Building2,
  Phone,
  Camera,
  Calendar,
  IndianRupee,
  ChevronRight,
  X,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/apiService';
import { Visit } from '../types';

type TabView = 'COMMERCIAL' | 'OFFICER_AUDIT' | 'EVIDENCE_LOG';

interface ImageModalState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  src: string | null;
}

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('COMMERCIAL');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState('ALL');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState('ALL');

  // Photo Audit Modal State
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    title: '',
    subtitle: '',
    src: null
  });
  const [imageLoadError, setImageLoadError] = useState(false);

  const fetchFieldLogs = async () => {
    setLoading(true);
    try {
      const data = await api.request('/visits');
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to synchronize field audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldLogs();
  }, []);

  // Filtered Visits Engine
  const filteredVisits = useMemo(() => {
    return visits.filter((v: any) => {
      const comp = (v.companyName || v.company_name || '').toLowerCase();
      const rep = (v.representativeName || v.representative_name || '').toLowerCase();
      const phone = (v.phoneNumber || v.phone_number || '').toLowerCase();
      const outcome = (v.interactionOutcome || v.interaction_outcome || '').toUpperCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = comp.includes(term) || rep.includes(term) || phone.includes(term);
      const matchesOutcome = selectedOutcomeFilter === 'ALL' || outcome === selectedOutcomeFilter;
      const matchesOfficer = selectedOfficerFilter === 'ALL' || rep === selectedOfficerFilter.toLowerCase();

      return matchesSearch && matchesOutcome && matchesOfficer;
    });
  }, [visits, searchTerm, selectedOutcomeFilter, selectedOfficerFilter]);

  // Unique Officers Roster
  const officerNames = useMemo(() => {
    const set = new Set<string>();
    visits.forEach((v: any) => {
      const name = v.representativeName || v.representative_name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [visits]);

  // Analytics Math Engine
  const kpis = useMemo(() => {
    const total = visits.length;
    let interested = 0;
    let verifiedGps = 0;
    let hasPhotos = 0;

    visits.forEach((v: any) => {
      const outcome = v.interactionOutcome || v.interaction_outcome;
      if (outcome === 'INTERESTED' || outcome === 'DEMO_SCHEDULED') interested += 1;

      const lat = v.location?.latitude ?? v.latitude;
      const lng = v.location?.longitude ?? v.longitude;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        verifiedGps += 1;
      }

      if (v.boardPhoto || v.board_photo || v.repPhoto || v.rep_photo) {
        hasPhotos += 1;
      }
    });

    const conversionRate = total > 0 ? ((interested / total) * 100).toFixed(1) : '0';
    const gpsRate = total > 0 ? Math.round((verifiedGps / total) * 100) : 0;

    return { total, interested, verifiedGps, hasPhotos, conversionRate, gpsRate };
  }, [visits]);

  // Daily Chart Telemetry
  const chartTelemetry = useMemo(() => {
    const map: Record<string, number> = {};
    const sorted = [...visits].sort((a: any, b: any) => {
      const ta = new Date(a.timestamp || a.created_at).getTime();
      const tb = new Date(b.timestamp || b.created_at).getTime();
      return ta - tb;
    });

    sorted.forEach((v: any) => {
      const stamp = v.timestamp || v.created_at;
      if (!stamp) return;
      const dateKey = new Date(stamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      map[dateKey] = (map[dateKey] || 0) + 1;
    });

    const entries = Object.entries(map).map(([name, count]) => ({ name, pitches: count }));
    return entries.length > 0 ? entries.slice(-14) : [{ name: 'Today', pitches: 0 }];
  }, [visits]);

  // Officer Leaderboard Breakdown
  const officerPerformance = useMemo(() => {
    const map: Record<string, { total: number; leads: number; withGps: number; withSelfie: number }> = {};

    visits.forEach((v: any) => {
      const name = v.representativeName || v.representative_name || 'Field Officer';
      if (!map[name]) map[name] = { total: 0, leads: 0, withGps: 0, withSelfie: 0 };

      map[name].total += 1;
      const outcome = v.interactionOutcome || v.interaction_outcome;
      if (outcome === 'INTERESTED' || outcome === 'DEMO_SCHEDULED') map[name].leads += 1;

      const lat = v.location?.latitude ?? v.latitude;
      if (lat != null) map[name].withGps += 1;

      if (v.repPhoto || v.rep_photo) map[name].withSelfie += 1;
    });

    return Object.entries(map)
      .map(([officer, data]) => ({ officer, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [visits]);

  const openImageModal = (title: string, subtitle: string, src: string | null | undefined) => {
    setImageLoadError(false);
    setImageModal({
      isOpen: true,
      title,
      subtitle,
      src: src && src.trim().length > 20 ? src : null
    });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, title: '', subtitle: '', src: null });
    setImageLoadError(false);
  };

  const handleDownloadImage = () => {
    if (!imageModal.src) return;
    try {
      const a = document.createElement('a');
      a.href = imageModal.src;
      a.download = `${imageModal.title.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Unable to download this asset directly.');
    }
  };

  const handleExportCSV = () => {
    if (filteredVisits.length === 0) {
      alert('No inspection records match the current filter criteria.');
      return;
    }

    const headers = [
      'Record ID',
      'Establishment',
      'Field Officer',
      'Contact Person',
      'Mobile Number',
      'Inspection Date',
      'Outcome',
      'GPS Latitude',
      'GPS Longitude',
      'Notes & Manning Requirements'
    ];

    const rows = filteredVisits.map((v: any) => {
      const lat = v.location?.latitude ?? v.latitude ?? '';
      const lng = v.location?.longitude ?? v.longitude ?? '';
      const stamp = v.timestamp || v.created_at;
      const dateStr = stamp ? new Date(stamp).toLocaleString('en-IN') : 'N/A';

      return [
        `"${v.id || ''}"`,
        `"${(v.companyName || v.company_name || '').replace(/"/g, '""')}"`,
        `"${(v.representativeName || v.representative_name || '').replace(/"/g, '""')}"`,
        `"${(v.contactPerson || v.contact_person || '').replace(/"/g, '""')}"`,
        `"${v.phoneNumber || v.phone_number || ''}"`,
        `"${dateStr}"`,
        `"${v.interactionOutcome || v.interaction_outcome || ''}"`,
        `"${lat}"`,
        `"${lng}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VSF_Field_Audit_Inspection_Docket_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-slate-50">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={20} />
        </div>
        <p className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
          Synchronizing field inspection telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-1 sm:px-2 animate-in fade-in duration-200">

      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500">
              Operations &amp; Compliance Audit Desk
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
            Field Inspection Intelligence
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Biometric verification, GPS satellite audit compliance, and commercial pipeline velocity
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('COMMERCIAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'COMMERCIAL'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pipeline Velocity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OFFICER_AUDIT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'OFFICER_AUDIT'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Officer Roster Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EVIDENCE_LOG')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'EVIDENCE_LOG'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evidence &amp; GPS Log
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Inspections</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.total}</p>
          <span className="text-[11px] font-medium text-slate-400 block">Logged physical site drops</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">High-Intent Leads</span>
            <Target size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.interested}</p>
          <span className="text-[11px] font-medium text-emerald-700 block">
            {kpis.conversionRate}% Commercial interest rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">GPS Satellite Verified</span>
            <MapPin size={16} className="text-red-700" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.verifiedGps}</p>
          <span className="text-[11px] font-medium text-slate-400 block">
            {kpis.gpsRate}% Hardware coordinates locked
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider">Visual Audit Proof</span>
            <Camera size={16} className="text-slate-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.hasPhotos}</p>
          <span className="text-[11px] font-medium text-slate-400 block">Gate or selfie tokens stored</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: COMMERCIAL VELOCITY & PIPELINE TELEMETRY                */}
      {/* ============================================================== */}
      {activeTab === 'COMMERCIAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Site Visit Volume Aggregate
                </h3>
                <p className="text-xs text-slate-500">Daily verification pitches across Madhya Pradesh</p>
              </div>
              <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-mono font-semibold">
                Daily Trend
              </span>
            </div>

            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTelemetry}>
                  <defs>
                    <linearGradient id="colorVisitsRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
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
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pitches"
                    stroke="#b91c1c"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVisitsRed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Meeting Outcome Distribution
              </h3>
              <p className="text-xs text-slate-500">Commercial client conversion breakdown</p>
            </div>

            <div className="space-y-3">
              {['INTERESTED', 'DEMO_SCHEDULED', 'CALLBACK', 'DISCUSSED', 'NOT_INTERESTED'].map((outcomeKey) => {
                const count = visits.filter(
                  (v: any) => (v.interactionOutcome || v.interaction_outcome) === outcomeKey
                ).length;
                const pct = visits.length > 0 ? ((count / visits.length) * 100).toFixed(0) : '0';

                return (
                  <div key={outcomeKey} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 uppercase tracking-wider">
                        {outcomeKey.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-slate-500 font-bold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          outcomeKey === 'INTERESTED'
                            ? 'bg-emerald-600'
                            : outcomeKey === 'DEMO_SCHEDULED'
                            ? 'bg-amber-600'
                            : outcomeKey === 'CALLBACK'
                            ? 'bg-blue-600'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1 font-mono">
              <p>&bull; Target: Minimum 7 site surveys per officer daily[cite: 2]</p>
              <p>&bull; PSARA MP License: PSA/L/74/MP/2023/FEB/3/425</p>[cite: 5]
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: FIELD OFFICER AUDIT ROSTER                              */}
      {/* ============================================================== */}
      {activeTab === 'OFFICER_AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Field Officer Accountability &amp; Integrity Roster
              </h3>
              <p className="text-xs text-slate-500">Cross-verified against GPS coordinates and photographic tokens</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {officerPerformance.length} Officers Deployed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4 text-center">Total Site Drops</th>
                  <th className="py-3 px-4 text-center">Converted Leads</th>
                  <th className="py-3 px-4 text-center">GPS Satellite Locks</th>
                  <th className="py-3 px-4 text-center">Selfie Audits</th>
                  <th className="py-3 px-4 text-right">Compliance Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {officerPerformance.map((item, idx) => {
                  const complianceScore =
                    item.total > 0
                      ? Math.round(((item.withGps + item.withSelfie) / (item.total * 2)) * 100)
                      : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 uppercase">
                        {item.officer}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                        {item.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                        {item.leads}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {item.withGps} of {item.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {item.withSelfie} of {item.total}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            complianceScore >= 80
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : complianceScore >= 50
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {complianceScore}% Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EVIDENTIARY LOG & INLINE PHOTO AUDITING                 */}
      {/* ============================================================== */}
      {activeTab === 'EVIDENCE_LOG' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search establishment, officer, or phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-red-700 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedOutcomeFilter}
                onChange={(e) => setSelectedOutcomeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Outcomes</option>
                <option value="INTERESTED">Interested</option>
                <option value="DEMO_SCHEDULED">Site Survey Scheduled</option>
                <option value="CALLBACK">Callback</option>
                <option value="DISCUSSED">Brochure Handed</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>

              <select
                value={selectedOfficerFilter}
                onChange={(e) => setSelectedOfficerFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Officers</option>
                {officerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet size={14} className="text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {filteredVisits.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Database size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium uppercase tracking-wider">
                No inspection records match your active query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 px-3">Establishment</th>
                    <th className="py-3 px-3">Officer</th>
                    <th className="py-3 px-3">Contact Person</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Outcome</th>
                    <th className="py-3 px-3">GPS Location</th>
                    <th className="py-3 px-3 text-right">Photo Audit Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredVisits.map((v: any) => {
                    const comp = v.companyName || v.company_name || 'Establishment';
                    const rep = v.representativeName || v.representative_name || 'Officer';
                    const contact = v.contactPerson || v.contact_person || 'N/A';
                    const phone = v.phoneNumber || v.phone_number || '';
                    const stamp = v.timestamp || v.created_at;
                    const outcome = (v.interactionOutcome || v.interaction_outcome || 'VISITED') as string;

                    const lat = v.location?.latitude ?? v.latitude;
                    const lng = v.location?.longitude ?? v.longitude;
                    const hasGps = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

                    const boardPic = v.boardPhoto || v.board_photo;
                    const repPic = v.repPhoto || v.rep_photo;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-bold text-slate-900 uppercase max-w-[200px] truncate">
                          {comp}
                        </td>
                        <td className="py-3 px-3 text-slate-800 font-semibold">{rep}</td>
                        <td className="py-3 px-3">
                          <span className="block font-semibold text-slate-800">{contact}</span>
                          {phone && <span className="font-mono text-slate-400 block text-[11px]">+91 {phone}</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {stamp ? new Date(stamp).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              outcome === 'INTERESTED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : outcome === 'DEMO_SCHEDULED'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : outcome === 'CALLBACK'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {outcome.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {hasGps ? (
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-red-700 font-mono text-[11px] font-semibold hover:underline"
                            >
                              <MapPin size={11} />
                              <span>{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">No GPS Lock</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Gate Signboard Inspection Button */}
                            <button
                              type="button"
                              onClick={() => openImageModal(`Gate / Signboard Inspection: ${comp}`, `Logged by ${rep}`, boardPic)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                                boardPic
                                  ? 'bg-slate-900 hover:bg-black text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              }`}
                              title={boardPic ? 'Inspect Gate Photo' : 'No Gate Photo on File'}
                            >
                              <Building2 size={11} />
                              <span>Gate</span>
                            </button>

                            {/* Officer Selfie Inspection Button */}
                            <button
                              type="button"
                              onClick={() => openImageModal(`Officer Verification Selfie: ${rep}`, `Site Visit at ${comp}`, repPic)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                                repPic
                                  ? 'bg-red-700 hover:bg-red-800 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                              }`}
                              title={repPic ? 'Inspect Selfie Biometric' : 'No Selfie on File'}
                            >
                              <UserCheck size={11} />
                              <span>Selfie</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* IN-APP PHOTO AUDIT MODAL (PREVENTS BLANK DATA-URI TABS)        */}
      {/* ============================================================== */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase text-slate-900 truncate">
                  {imageModal.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {imageModal.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeImageModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Image Viewport */}
            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-hidden relative">
              {imageModal.src && !imageLoadError ? (
                <img
                  src={imageModal.src}
                  alt="Audit Token"
                  onError={() => setImageLoadError(true)}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-700/50 flex items-center justify-center mx-auto text-red-400">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-red-300 uppercase tracking-wider">
                      Photo Not Found in Database
                    </h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-normal">
                      This inspection record was logged without a visual sensor token, or the photo string was pruned during database synchronization.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                {imageModal.src && !imageLoadError ? 'Verified Biometric Token' : 'Integrity Notice'}
              </span>

              <div className="flex items-center gap-2">
                {imageModal.src && !imageLoadError && (
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeImageModal}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
