import React, { useState, useEffect, useRef } from 'react';
import {
  LogIn,
  LogOut,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ShieldCheck,
  Camera,
  X,
  CameraIcon,
  Clock
} from 'lucide-react';
import { api, supabase } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';

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
  selfie?: string | null;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({
  currentVisitsCount,
  onStateChange
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeShift, setActiveShift] = useState<ActiveAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [reason, setReason] = useState('');

  // Camera State for Biometric Punch
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [tempLocation, setTempLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const DAILY_TARGET = 7;
  const todayDateStr = new Date().toISOString().split('T')[0];

  const activeUserId = (user as any)?.id || (user as any)?.user_id || localStorage.getItem('vsf_user_id');
  const activeUserName = user?.name || (user as any)?.full_name || 'Field Representative';

  // 1. Fetch current day's active shift
  const checkCurrentShiftStatus = async () => {
    if (!activeUserId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', activeUserId)
        .eq('date', todayDateStr)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setActiveShift(data[0]);
      } else {
        setActiveShift(null);
      }
    } catch (err) {
      console.error("Failed loading remote attendance record:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCurrentShiftStatus();
  }, [user, currentVisitsCount]);

  // 2. High-Accuracy GPS Retrieval
  const getLiveLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS hardware sensor not detected on this terminal."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        () => reject(new Error("GPS permission denied. Please allow location access to authenticate shifts.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // 3. Camera Controls
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraActive(false);
      showToast("Camera access required for official attendance badge verification.", "error");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Step 1 of Punch In: Lock GPS -> Open Camera
  const handleInitiatePunchIn = async () => {
    if (!activeUserId) {
      showToast("Session Error: Unable to identify user account. Please log in again.", "error");
      return;
    }

    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      setTempLocation(location);
      await startCamera();
    } catch (err: any) {
      showToast(err.message || "Failed to lock GPS position.", "error");
    } finally {
      setGpsLoading(false);
    }
  };

  // Step 2 of Punch In: Capture selfie and push to database
  const handleCaptureAndPunchIn = async () => {
    if (!videoRef.current || !canvasRef.current || !tempLocation) return;

    setGpsLoading(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
      const selfieDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      stopCamera();

      const shiftId = `ATT-${Date.now()}`;
      const payload = {
        id: shiftId,
        user_id: activeUserId,
        user_name: activeUserName,
        punch_in: new Date().toISOString(),
        date: todayDateStr,
        selfie: selfieDataUrl,
        punch_in_location: tempLocation,
        status: 'IN_PROGRESS',
        total_visits_logged: currentVisitsCount,
        daily_target: DAILY_TARGET
      };

      try {
        const { error } = await supabase.from('attendance').insert([payload]);
        if (error) throw error;

        showToast("Shift authorized! Biometric selfie & GPS locked.", "success");
        await checkCurrentShiftStatus();
        if (onStateChange) onStateChange();
      } catch (err: any) {
        showToast(`Punch In Failed: ${err.message || err}`, "error");
      } finally {
        setGpsLoading(false);
        setTempLocation(null);
      }
    }
  };

  // 4. Normal Punch Out (Target Met)
  const handlePunchOutNormal = async () => {
    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      const { error } = await supabase
        .from('attendance')
        .update({
          punch_out: new Date().toISOString(),
          punch_out_location: location,
          status: 'COMPLETED',
          total_visits_logged: currentVisitsCount
        })
        .eq('id', activeShift!.id);

      if (error) throw error;

      showToast("Shift completed and logged successfully!", "success");
      await checkCurrentShiftStatus();
      if (onStateChange) onStateChange();
    } catch (err: any) {
      showToast(`Punch Out Failed: ${err.message || err}`, "error");
    } finally {
      setGpsLoading(false);
    }
  };

  // 5. Emergency Early Departure Review Request
  const handlePunchOutEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("Please provide a valid reason for early checkout.", "info");
      return;
    }

    setGpsLoading(true);
    try {
      const location = await getLiveLocation();
      const { error } = await supabase
        .from('attendance')
        .update({
          punch_out: new Date().toISOString(),
          punch_out_location: location,
          status: 'PENDING_REVIEW',
          exception_reason: reason.trim(),
          total_visits_logged: currentVisitsCount
        })
        .eq('id', activeShift!.id);

      if (error) throw error;

      showToast("Early checkout request submitted for Admin audit.", "info");
      setShowExceptionForm(false);
      await checkCurrentShiftStatus();
      if (onStateChange) onStateChange();
    } catch (err: any) {
      showToast(`Submission Failed: ${err.message || err}`, "error");
    } finally {
      setGpsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-center py-6">
        <Loader2 className="animate-spin text-red-700 mr-2" size={18} />
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          Syncing Attendance Status...
        </span>
      </div>
    );
  }

  // PHASE A: Inactive Shift (Morning Punch In)
  if (!activeShift) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-red-700 mb-0.5">
              <Clock size={14} />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Shift Duty Punch-In
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              PSARA compliance requires live photo capture and GPS lock for mobile inspection duty.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full text-[9px] font-mono font-bold uppercase">
            Off Duty
          </span>
        </div>

        <button
          onClick={handleInitiatePunchIn}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center space-x-2 py-3.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {gpsLoading ? (
            <>
              <Loader2 className="animate-spin text-amber-300" size={16} />
              <span>Locking Location GPS...</span>
            </>
          ) : (
            <>
              <Camera size={16} className="text-amber-300" />
              <span>Punch In &amp; Verify Identity</span>
            </>
          )}
        </button>

        {/* Live Camera Viewfinder Modal */}
        {cameraActive && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-2 border-amber-400 shadow-2xl">
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-red-700 text-white rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Status Indicator */}
              <div className="absolute top-4 left-4 z-10 bg-black/70 px-2.5 py-1 rounded-xl text-[9px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <MapPin size={10} />
                <span>GPS Location Locked</span>
              </div>

              {/* Reticle */}
              <div className="absolute inset-8 border-2 border-dashed border-amber-400/60 rounded-2xl pointer-events-none" />

              <div className="absolute bottom-5 inset-x-0 flex justify-center">
                <button
                  type="button"
                  onClick={handleCaptureAndPunchIn}
                  disabled={gpsLoading}
                  className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg flex items-center justify-center active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {gpsLoading ? (
                    <Loader2 size={24} className="animate-spin text-red-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center text-white">
                      <CameraIcon size={20} />
                    </div>
                  )}
                </button>
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>

            <p className="mt-4 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-widest text-center">
              Position face in frame &bull; Click red button to punch in
            </p>
          </div>
        )}
      </div>
    );
  }

  // PHASE B: Shift Completed
  if (activeShift.punch_out) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-5 sm:p-6 rounded-3xl shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-xs shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              Shift Duty Completed
            </h3>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Punched Out at {new Date(activeShift.punch_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} &bull; {activeShift.total_visits_logged} Client Drops Logged
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-white text-emerald-800 border border-emerald-200 rounded-xl text-[9.5px] font-mono font-bold uppercase shrink-0">
          {activeShift.status}
        </span>
      </div>
    );
  }

  // PHASE C: Shift In Progress
  const isTargetAchieved = currentVisitsCount >= DAILY_TARGET;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">

      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-red-700">
            <Clock size={14} />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Shift Duty Active
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
            Punched in at {new Date(activeShift.punch_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[9.5px] font-mono font-bold uppercase">
          On Duty
        </span>
      </div>

      {/* Target Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            Daily Marketing Drops
          </span>
          <span className="font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-[10px]">
            {currentVisitsCount} / {DAILY_TARGET} Completed
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-700 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min((currentVisitsCount / DAILY_TARGET) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Action Controls */}
      {isTargetAchieved ? (
        <button
          onClick={handlePunchOutNormal}
          disabled={gpsLoading}
          className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
        >
          {gpsLoading ? <Loader2 className="animate-spin" size={15} /> : <LogOut size={15} />}
          <span>Punch Out (Quota Reached)</span>
        </button>
      ) : (
        <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-start space-x-2.5 text-amber-800">
            <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={15} />
            <div className="text-[10.5px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900 block">
                Shift Target Pending ({DAILY_TARGET - currentVisitsCount} stops remaining)
              </span>
              Complete {DAILY_TARGET - currentVisitsCount} more drops to unlock standard checkout, or submit an early departure justification note for Admin review.
            </div>
          </div>

          {!showExceptionForm ? (
            <button
              type="button"
              onClick={() => setShowExceptionForm(true)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-amber-950 font-bold text-[10px] uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer"
            >
              Request Early Departure Authorization
            </button>
          ) : (
            <form onSubmit={handlePunchOutEmergency} className="space-y-2.5 pt-2 border-t border-slate-200">
              <label className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                Reason for Early Checkout:
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:border-red-700 outline-none transition"
                placeholder="e.g. Motorcycle breakdown on AB Road / Medical urgency..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExceptionForm(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gpsLoading}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {gpsLoading ? <Loader2 className="animate-spin text-amber-300" size={13} /> : <Send size={13} className="text-amber-300" />}
                  <span>Submit to Command Desk</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
};

export default AttendanceWidget;
