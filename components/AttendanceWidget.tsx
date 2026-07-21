import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

interface AttendanceWidgetProps {
  currentVisitsCount: number;
  onStateChange?: () => void;
}

interface ActiveAttendance {
  id: string;
  punch_in: string;
  punch_out: string | null;
  total_visits_logged: number;
  status: string;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({
  currentVisitsCount,
  onStateChange
}) => {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<ActiveAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [reason, setReason] = useState('');

  const DAILY_TARGET = 7;
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Fetch current day's active shift layout on load
  const checkCurrentShiftStatus = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await api.request(`/attendance?user_id=eq.${user.id}&date=eq.${todayDateStr}`);
      if (Array.isArray(data) && data.length > 0) {
        setActiveShift(data[0]);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error("Failed loading remote attendance sync cache", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentShiftStatus();
  }, [user, currentVisitsCount]);

  // 2. Grabbing current coordinate matrices smoothly
  const getLiveLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("GPS engine missing on this unit.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        (err) => reject("Please verify device location settings are enabled."),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  // 3. Morning Entry Punch Action
  const handlePunchIn = async () => {
    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      const shiftId = `ATT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const payload = {
        id: shiftId,
        user_id: user!.id,
        user_name: user!.name,
        punch_in: new Date().toISOString(),
        date: todayDateStr,
        punch_in_location: location,
        status: 'IN_PROGRESS',
        total_visits_logged: currentVisitsCount,
        daily_target: DAILY_TARGET
      };

      await api.request('/attendance', { method: 'POST', body: JSON.stringify(payload) });
      alert("🌅 Good Morning! Shift punched in. GPS trail locked.");
      checkCurrentShiftStatus();
      if (onStateChange) onStateChange();
    } catch (err: any) {
      alert(`Punch In Failed: ${err}`);
    } finally {
      setGpsLoading(false);
    }
  };

  // 4. Regular Clean Shift End (Target Complete)
  const handlePunchOutNormal = async () => {
    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      await api.request(`/attendance/${activeShift!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          punch_out: new Date().toISOString(),
          punch_out_location: location,
          status: 'COMPLETED',
          total_visits_logged: currentVisitsCount
        })
      });
      alert("✅ Shift closed out successfully. Great work covering your sector today!");
      checkCurrentShiftStatus();
      if (onStateChange) onStateChange();
    } catch (err: any) {
      alert(`Punch Out Failed: ${err}`);
    } finally {
      setGpsLoading(false);
    }
  };

  // 5. Emergency Review Dispatch Action
  const handlePunchOutEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please state a valid reason for the operational log audit.");
      return;
    }

    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      await api.request(`/attendance/${activeShift!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          punch_out: new Date().toISOString(),
          punch_out_location: location,
          status: 'PENDING_REVIEW',
          exception_reason: reason.trim(),
          total_visits_logged: currentVisitsCount
        })
      });

      alert("⚠️ Request Dispatched: Early departure logged. Forwarded to Admin Review queue.");
      setShowExceptionForm(false);
      checkCurrentShiftStatus();
      if (onStateChange) onStateChange();
    } catch (err: any) {
      alert(`Submission Fault: ${err}`);
    } finally {
      setGpsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-indigo-600 mr-2" size={16} />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuring Daily Operations...</span>
      </div>
    );
  }

  // PHASE A: Start of Workday (No Record for Today)
  if (!activeShift) {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-4">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Field Attendance Node</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Deployment Status: Inactive</p>
        </div>
        <button
          onClick={handlePunchIn}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center space-x-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          {gpsLoading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
          <span>Punch In & Start Shift</span>
        </button>
      </div>
    );
  }

  // PHASE B: Shift Completed Normally or Reviewed Already for the day
  if (activeShift.punch_out) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] shadow-md flex items-center space-x-4">
        <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-sm">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Shift Complete</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5 uppercase tracking-widest">
            Logged {activeShift.total_visits_logged} Marketing Drops • Status: {activeShift.status}
          </p>
        </div>
      </div>
    );
  }

  // PHASE C: Active Workday Track Engine (Logged In, Not Punched Out)
  const isTargetAchieved = currentVisitsCount >= DAILY_TARGET;

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-5">

      {/* Target Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Daily Marketing Run</span>
            <span className="text-xs font-black text-slate-900 uppercase">Target Performance</span>
          </div>
          <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {currentVisitsCount} / {DAILY_TARGET} Done
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min((currentVisitsCount / DAILY_TARGET) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Conditional Shift Exit Controls */}
      {isTargetAchieved ? (
        // Action allowed - target complete
        <button
          onClick={handlePunchOutNormal}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center space-x-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95"
        >
          {gpsLoading ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
          <span>Punch Out (Target Complete)</span>
        </button>
      ) : (
        // Restricted Area - target short, show bypass layout
        <div className="bg-slate-900 p-5 rounded-2xl text-white space-y-3 border border-slate-800">
          <div className="flex items-start space-x-2.5 text-amber-400">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <div className="text-[10px] font-bold text-slate-300">
              <span className="font-black uppercase tracking-wider text-amber-400 block mb-0.5">Punch Out Restricted</span>
              You have logged {currentVisitsCount} locations. Clear {DAILY_TARGET - currentVisitsCount} more stops to automatically clear shifts.
            </div>
          </div>

          {!showExceptionForm ? (
            <button
              type="button"
              onClick={() => setShowExceptionForm(true)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm"
            >
              🚨 File Emergency Exception Leave
            </button>
          ) : (
            <form onSubmit={handlePunchOutEmergency} className="space-y-2.5 pt-2.5 border-t border-slate-800 animate-in zoom-in-95 duration-200">
              <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">
                Provide Operational Exception Reason:
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white text-xs font-bold focus:border-indigo-500"
                placeholder="E.g., Severe bike puncture near Apollo Premier / Sick..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExceptionForm(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gpsLoading}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all"
                >
                  {gpsLoading ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                  <span>Submit for Review</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
