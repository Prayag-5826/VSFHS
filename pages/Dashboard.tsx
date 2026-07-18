import React, { useEffect, useState } from 'react';
import {
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Camera,
  Fingerprint,
  Calendar,
  AlertTriangle,
  Briefcase,
  IndianRupee,
  Activity,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Visit, Role, Attendance, Lead } from '../types';
import { api } from '../services/apiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
}> = ({ title, value, icon: Icon, trend, color }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {trend && (
          <div className="flex items-center mt-2 text-xs font-bold text-green-600 uppercase tracking-tighter">
            <TrendingUp size={14} className="mr-1" />
            {trend}
          </div>
        )}
      </div>
      <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-indigo-100`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ visits: 0, users: 0, leads: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<'IDLE' | 'CAPTURE'>('IDLE');

  // Enterprise Telemetry States
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const isFieldStaff = user?.role === Role.FIELD_REP || user?.role === Role.SR_FIELD_EXECUTIVE;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch visits, pipeline leads data, global metrics, and attendance files concurrently
        const [visitsData, leadsData, statsData, attendanceData] = await Promise.all([
          api.request(`/visits${user?.role === Role.FIELD_REP ? `?rep_id=${user.id}` : ''}`),
          api.request(`/leads${user?.role === Role.FIELD_REP ? `?assignedTo=${user.id}` : ''}`),
          api.request('/stats'),
          isFieldStaff ? api.request(`/attendance?userId=${user?.id}&date=${todayStr}`) : Promise.resolve([])
        ]);

        setVisits(Array.isArray(visitsData) ? visitsData : []);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setStats(statsData || { visits: 0, users: 0, leads: 0 });

        if (Array.isArray(attendanceData) && attendanceData.length > 0) {
          setAttendance(attendanceData[0]);
        }
      } catch (err: any) {
        console.error("Dashboard primary synchronization failure:", err);
        setError(err.message || "Cloud data synchronization error. Verify network and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isFieldStaff]);

  // Professional Telemetry Stage 1: Active High-Accuracy GPS Request
  const handleProfessionalPunchIn = async () => {
    if (!user) return;
    setPunchLoading(true);
    setLocationStatus("Verifying secure GPS matrix...");

    if (!navigator.geolocation) {
      alert("GPS Error: Geolocation tracking is not supported by this device hardware.");
      setPunchLoading(false);
      setLocationStatus(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordinates({ lat, lng });
        setLocationStatus("GPS Lokation Verified. Activating biometric camera stream...");
        setAttendanceStep('CAPTURE');
        setPunchLoading(false);
      },
      (err) => {
        setPunchLoading(false);
        setLocationStatus(null);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            alert("Security Denied: You must grant precise location permission access to check into shifts.");
            break;
          case err.POSITION_UNAVAILABLE:
            alert("Telemetry Alert: Satellite internal location tracking unavailable.");
            break;
          case err.TIMEOUT:
            alert("Network Timeout: Telemetry request timed out before acquiring lock.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Professional Telemetry Stage 2: Database Transmission Payload Mapping
  const finalizeAttendanceRecord = async (selfieBase64: string) => {
    if (!user || !coordinates) return;
    setPunchLoading(true);
    const now = new Date();

    const professionalPayload = {
      id: `ATT-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      punchIn: now.toISOString(),
      date: now.toISOString().split('T')[0],
      selfie: selfieBase64,
      // Injected Telemetry properties
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      deviceVerified: true
    };

    try {
      await api.request('/attendance', {
        method: 'POST',
        body: JSON.stringify(professionalPayload)
      });
      setAttendance(professionalPayload as any);
      setAttendanceStep('IDLE');
      setLocationStatus(null);
    } catch (err: any) {
      alert(`Attendance Transmission Failure: ${err.message}`);
    } finally {
      setPunchLoading(false);
    }
  };

  const onSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        finalizeAttendanceRecord(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate marketing analytics conversion data map for charts
  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toISOString().split('T')[0],
        pitches: 0
      };
    }).reverse();

    visits.forEach(v => {
      const vDate = new Date(v.timestamp).toISOString().split('T')[0];
      const day = last7Days.find(d => d.date === vDate);
      if (day) day.pitches++;
    });

    return last7Days;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Establishing Secure Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6">
          <AlertTriangle size={40} />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Sync Protocol Failure</h2>
        <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
          The system could not retrieve real-time deployment data from the cloud server.
          <span className="block mt-2 font-mono text-[10px] text-red-400 p-2 bg-slate-50 rounded-lg">{error}</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl"
        >
          Initialize Hard Reset
        </button>
      </div>
    );
  }

  const chartData = getChartData();
  const personalTarget = user?.visitTarget || 100;

  // Calculate total monetary pipeline assets running inside agent's scope
  const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

  // Calculate upcoming follow-ups due today or later
  const upcomingFollowUps = visits.filter(v => {
    if (!v.nextFollowUp) return false;
    const today = new Date().toISOString().split('T')[0];
    return v.nextFollowUp >= today;
  }).sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || '')).slice(0, 3);

  const progressPercent = Math.min(100, (visits.length / personalTarget) * 100).toFixed(0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tight">Marketing Portal</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">HQ Command • Active Rep: {user?.name}</p>
        </div>
        <div className="hidden lg:flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
           <ShieldCheck size={18} className="text-emerald-600" />
           <span className="text-emerald-800 font-bold text-xs uppercase tracking-widest">Pipeline Engines Active</span>
        </div>
      </div>

      {/* Field Attendance/Punch-In Block */}
      {isFieldStaff && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Fingerprint size={120} className="text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-white font-black text-xl uppercase tracking-tight">Shift Deployment</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {locationStatus ? locationStatus : "Mandatory Location & Biometric Verification"}
              </p>
            </div>

            {attendance ? (
              <div className="flex items-center space-x-6">
                 <div className="text-right">
                    <p className="text-emerald-400 font-black text-sm uppercase tracking-widest flex items-center justify-end">
                      <CheckCircle2 size={16} className="mr-2" /> Security Verified Present
                    </p>
                    <p className="text-slate-500 text-[9px] font-mono mt-1 uppercase tracking-wider">
                      SYS_IN: {new Date(attendance.punchIn).toLocaleTimeString()}
                    </p>
                 </div>
                 <img src={attendance.selfie} className="w-16 h-16 rounded-2xl object-cover border border-emerald-500/30 shadow-2xl" alt="Verification Summary" />
              </div>
            ) : attendanceStep === 'CAPTURE' ? (
              <div className="flex items-center space-x-4">
                 <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-xl text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/20 cursor-pointer transition-all flex items-center">
                    <Camera size={16} className="mr-2" />
                    Capture Live Verification Image
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={onSelfieCapture} />
                 </label>
                 <button
                   onClick={() => { setAttendanceStep('IDLE'); setLocationStatus(null); }}
                   className="text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-wider transition-colors"
                 >
                   Cancel
                 </button>
              </div>
            ) : (
              <button
                onClick={handleProfessionalPunchIn}
                disabled={punchLoading}
                className="bg-white hover:bg-slate-100 text-slate-900 font-black px-10 py-4.5 rounded-xl text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-40"
              >
                {punchLoading ? 'Acquiring GPS...' : 'Initialize Verification Sequence'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* RE-ENGINEERED MARKETING KPI STRIPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Pitches Made"
          value={visits.length}
          icon={MapPin}
          color="bg-indigo-600"
        />

        <StatsCard
          title="Pipeline Accounts"
          value={user?.role === Role.ADMIN ? stats.leads : leads.length}
          icon={Briefcase}
          color="bg-slate-900"
        />

        <StatsCard
          title="Pipeline Value"
          value={`₹${totalPipelineValue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="bg-amber-500"
          trend="Estimated Revenue"
        />

        <StatsCard
          title="Target Conversion"
          value={`${progressPercent}%`}
          icon={CheckCircle2}
          color="bg-emerald-500"
          trend={`Goal: ${personalTarget} Visits`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CHART CONTAINER LAYOUT */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Weekly Sales Activity</h2>
            <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Activity size={14} className="text-indigo-600" />
              <span>Real-time Conversions</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="pitches" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pitches > 0 ? '#6366f1' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SIDEBAR: FOLLOW-UPS AND LEADS TRACKER */}
        <div className="space-y-6">
          {/* CRITICAL ACTION VECTOR: DYNAMIC FOLLOW UPS */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center">
              <PhoneCall size={16} className="mr-2" /> Pending Lead Actions
            </h3>
            <div className="space-y-3">
              {upcomingFollowUps.length === 0 ? (
                <p className="text-slate-400 text-[10px] font-bold uppercase py-2">No follow-ups scheduled</p>
              ) : (
                upcomingFollowUps.map(item => (
                  <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-white truncate max-w-[140px] uppercase">{item.companyName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.interactionOutcome}</p>
                    </div>
                    <span className="text-[10px] font-mono font-black bg-indigo-600/50 px-2 py-1 rounded text-indigo-300">
                      {item.nextFollowUp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RECENT PITCH LISTING */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Activity</h2>
              <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors" onClick={() => window.location.hash = '#/visits'}>
                <ArrowRight size={18} className="text-indigo-600" />
              </button>
            </div>
            <div className="space-y-4">
              {visits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Archive Empty</p>
                </div>
              ) : (
                visits.slice(0, 4).map((visit) => (
                  <div key={visit.id} className="flex items-start space-x-3 p-2 hover:bg-indigo-50/50 rounded-xl transition-all border border-transparent">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{visit.companyName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                        {visit.visitPurpose} • {visit.interactionOutcome}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
