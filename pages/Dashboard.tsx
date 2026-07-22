import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Visit, Role, Attendance, Lead } from '../types';
import { api } from '../services/apiService';

// Import Separated Presentation Layout Views
import { AdminDashboard } from './AdminDashboard';
import { FieldDashboard } from './FieldDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ visits: 0, users: 0, leads: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<'IDLE' | 'CAPTURE'>('IDLE');

  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const isFieldStaff = user?.role === Role.FIELD_REP || user?.role === Role.SR_FIELD_EXECUTIVE;
  const todayDateStr = new Date().toISOString().split('T')[0];

  const fetchDashboardTelemetry = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

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
      console.error("Core metrics sync protocol error:", err);
      setError(err.message || "Cloud pipeline data synchronization error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardTelemetry();
  }, [user, isFieldStaff]);

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
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("GPS Location Verified. Activating camera stream...");
        setAttendanceStep('CAPTURE');
        setPunchLoading(false);
      },
      (err) => {
        setPunchLoading(false);
        setLocationStatus(null);
        alert("Telemetry Alert: Failed to lock high-precision location coordinates.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const finalizeAttendanceRecord = async (selfieBase64: string) => {
    if (!user || !coordinates) return;
    setPunchLoading(true);
    const now = new Date();

    const payload = {
      id: `ATT-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      punchIn: now.toISOString(),
      date: now.toISOString().split('T')[0],
      selfie: selfieBase64,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      deviceVerified: true
    };

    try {
      await api.request('/attendance', { method: 'POST', body: JSON.stringify(payload) });
      setAttendance(payload as any);
      setAttendanceStep('IDLE');
      setLocationStatus(null);
    } catch (err: any) {
      alert(`Attendance Transmission Failure: ${err.message}`);
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={44} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Establishing Secure Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-2 shadow-sm">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sync Error Occurred</h2>
          <p className="text-xs text-slate-500 font-bold">{error}</p>
        </div>
        <button
          onClick={() => fetchDashboardTelemetry()}
          className="w-full bg-slate-900 hover:bg-black text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-md active:scale-95"
        >
          <RefreshCw size={14} />
          <span>Retry Session Connection</span>
        </button>
      </div>
    );
  }

  const totalPipelineValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  const personalTarget = user?.visitTarget || 100;
  const progressPercent = Math.min(100, (visits.length / personalTarget) * 100).toFixed(0);

  const todayVisits = visits.filter(v => v.timestamp.startsWith(todayDateStr));

  const upcomingFollowUps = visits.filter(v => {
    if (!v.nextFollowUp) return false;
    return v.nextFollowUp >= new Date().toISOString().split('T')[0];
  }).sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || '')).slice(0, 3);

  // Parse chart entries mapping chronologically
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { name: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toISOString().split('T')[0], pitches: 0 };
  }).reverse();

  visits.forEach(v => {
    const vDate = new Date(v.timestamp).toISOString().split('T')[0];
    const day = last7Days.find(d => d.date === vDate);
    if (day) day.pitches++;
  });

  // 🔀 DYNAMIC ROUTER SWITCH
  if (user?.role === Role.ADMIN) {
    return (
      <AdminDashboard
        stats={stats}
        visits={visits}
        leads={leads}
        totalPipelineValue={totalPipelineValue}
        chartData={last7Days}
      />
    );
  }

  return (
    <FieldDashboard
      user={user}
      visits={visits}
      leads={leads}
      totalPipelineValue={totalPipelineValue}
      progressPercent={progressPercent}
      personalTarget={personalTarget}
      todayVisits={todayVisits}
      upcomingFollowUps={upcomingFollowUps}
      onRefresh={fetchDashboardTelemetry}
    />
  );
};

export default Dashboard;
