import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  Calendar,
  User,
  ShieldCheck,
  Key,
  CheckCircle2,
  Copy,
  Plus,
  Phone,
  Loader2,
  Shield,
  Printer,
  X,
  CameraIcon,
  ShieldAlert,
  BadgeAlert,
  Lock
} from 'lucide-react';
import { api } from '../services/apiService';
import { Role, User as UserType } from '../types';
import { useAuth } from '../context/AuthContext';

const AddUser: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    phone: '',
    photo: '',
    role: Role.FIELD_REP
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedUser, setGeneratedUser] = useState<UserType | null>(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Calculate 18-year cutoff date for PSARA compliance
  const maxAllowedDob = useMemo(() => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today.toISOString().split('T')[0];
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 800 },
          height: { ideal: 800 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Camera access is required for PSARA security identity snapshots.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFormData((prev) => ({ ...prev, photo: dataUrl }));
        stopCamera();
      }
    }
  };

  // Simplified VSF credentials logic
  const generateCredentials = () => {
    const randomBadge = Math.floor(100000 + Math.random() * 900000);
    const userId = `VSFHS${randomBadge}`;
    const password = Math.floor(10000000 + Math.random() * 90000000).toString();
    return { userId, password };
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Mandatory Mobile Validation
    if (formData.phone.length !== 10) {
      setError('Mobile contact number must be exactly 10 digits.');
      return;
    }

    // 2. Mandatory Photo Validation
    if (!formData.photo) {
      setError('Identity snapshot is required. Please capture an officer photo before submitting.');
      return;
    }

    // 3. PSARA 18+ Age Validation
    if (!formData.dob) {
      setError('Date of birth is required for PSARA background verification.');
      return;
    }

    const birthDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError(`Candidate is ineligible (${age} years old). PSARA regulations require all security personnel to be at least 18 years of age.`);
      return;
    }

    setIsLoading(true);
    const { userId, password } = generateCredentials();
    const status = currentUser?.role === Role.ADMIN ? 'ACTIVE' : 'PENDING_APPROVAL';

    const newUser: UserType = {
      id: userId,
      name: formData.name.trim().toUpperCase(),
      email: `${userId.toLowerCase()}@vidhyasecurityforce.in`,
      phone: formData.phone,
      password: password,
      role: formData.role,
      avatar: formData.photo,
      dob: formData.dob,
      createdAt: new Date().toISOString(),
      status: status as any,
      loginAttempts: 0,
      createdBy: currentUser?.id
    };

    try {
      const savedUser = await api.request('/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      if (!savedUser) {
        throw new Error('Database server failed to record new deployment entry.');
      }

      setGeneratedUser(newUser);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to register field officer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!generatedUser) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>VSF Personnel Deployment Docket - ${generatedUser.id}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0f172a; background: #fff; }
              .slip { border: 2px solid #b91c1c; padding: 32px; border-radius: 16px; max-width: 520px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #fecdd3; padding-bottom: 20px; margin-bottom: 20px; }
              .logo-title { font-size: 16px; font-weight: 900; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; }
              .license { font-size: 9.5px; font-family: monospace; font-weight: 700; color: #9a3412; margin-top: 4px; }
              .tag { display: inline-block; background: #fef2f2; color: #991b1b; padding: 3px 10px; font-size: 10px; font-weight: 800; border-radius: 999px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
              .photo-container { text-align: center; margin: 15px 0; }
              .photo-container img { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; border: 2px solid #e2e8f0; }
              .grid-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
              .label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
              .value { font-size: 13px; font-weight: 800; color: #0f172a; }
              .mono-val { font-family: monospace; font-size: 14px; font-weight: 900; color: #b91c1c; }
              .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 600; line-height: 1.5; }
              @media print { body { padding: 0; } .slip { border: 2px solid #000; } }
            </style>
          </head>
          <body>
            <div class="slip">
              <div class="header">
                <div class="logo-title">Vidhya Security Force &amp; Housekeeping Services</div>
                <div class="license">PSARA LIC: PSA/L/74/MP/2023/FEB/3/425 &bull; INDORE HQ</div>
                <div class="tag">Personnel Deployment Docket</div>
              </div>

              ${generatedUser.avatar ? `
                <div class="photo-container">
                  <img src="${generatedUser.avatar}" alt="Officer Photo" />
                </div>
              ` : ''}

              <div class="grid-row">
                <span class="label">Officer Name</span>
                <span class="value">${generatedUser.name}</span>
              </div>
              <div class="grid-row">
                <span class="label">Assigned Role</span>
                <span class="value">${generatedUser.role.replace(/_/g, ' ')}</span>
              </div>
              <div class="grid-row">
                <span class="label">Contact Mobile</span>
                <span class="value">+91 ${generatedUser.phone}</span>
              </div>
              <div class="grid-row">
                <span class="label">Security Badge ID</span>
                <span class="mono-val">${generatedUser.id}</span>
              </div>
              <div class="grid-row">
                <span class="label">8-Digit Security Key</span>
                <span class="mono-val" style="color: #0f172a;">${generatedUser.password}</span>
              </div>

              <div class="footer">
                <p>Issued on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; Central Command Desk</p>
                <p>CONFIDENTIAL SECURITY CREDENTIAL &bull; FOR AUTHORIZED FIELD PATROL ONLY</p>
              </div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', dob: '', phone: '', photo: '', role: Role.FIELD_REP });
    setIsSuccess(false);
    setGeneratedUser(null);
    setError('');
  };

  // SUCCESS CONFIRMATION MODAL CARD
  if (isSuccess && generatedUser) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-2 sm:px-4 animate-in fade-in duration-300">
        <div className="bg-white border-2 border-amber-200/80 rounded-3xl p-6 sm:p-10 shadow-xs text-center relative overflow-hidden">

          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle2 size={32} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[10px] font-mono font-bold text-red-800 uppercase tracking-widest mb-2">
            <ShieldCheck size={12} className="text-red-700" />
            <span>Personnel Docket Registered</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {generatedUser.name}
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1 max-w-md mx-auto">
            {generatedUser.status === 'PENDING_APPROVAL'
              ? 'Verification request dispatched to HQ management desk for activation.'
              : 'Field representative authorized for mobile inspection duty and punch-ins.'}
          </p>

          {/* Credentials Display Box */}
          <div className="mt-8 space-y-3 max-w-lg mx-auto text-left">
            <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Security Badge ID
                </span>
                <p className="text-lg font-mono font-black text-red-700 tracking-wider">
                  {generatedUser.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedUser.id, 'id')}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy size={13} />
                <span>{copiedKey === 'id' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Numeric Passkey (8-Digit)
                </span>
                <p className="text-lg font-mono font-black text-slate-900 tracking-wider">
                  {generatedUser.password}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedUser.password!, 'pass')}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy size={13} />
                <span>{copiedKey === 'pass' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mt-8">
            <button
              type="button"
              onClick={handlePrint}
              className="py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Officer Slip</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="py-3.5 px-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={15} className="text-amber-300" />
              <span>Register Next Officer</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // MAIN REGISTRATION FORM
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-2 pb-12">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={16} className="text-red-700" />
            <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-widest">
              Personnel Deployment Registry
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Register Field Staff
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Issue verified credentials for mobile inspection and duty attendance tracking.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-[#FBFBF9] border border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center gap-1.5 self-start sm:self-auto">
          <Lock size={12} className="text-red-700" />
          <span>PSARA Compliant (18+ Verified)</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200 flex items-center gap-2">
            <BadgeAlert size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Form Fields (7 cols) */}
            <div className="lg:col-span-7 space-y-4">

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Full Legal Name <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-amber-600" size={16} />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-red-700/10 focus:border-red-700 focus:bg-white transition"
                    placeholder="e.g. SURENDRA SINGH RATHORE"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Mobile Number (10 Digits) <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 text-amber-600" size={16} />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-4 focus:ring-red-700/10 focus:border-red-700 focus:bg-white transition"
                    placeholder="98260XXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Date of Birth (18+) <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-amber-600" size={16} />
                    <input
                      required
                      type="date"
                      max={maxAllowedDob}
                      value={formData.dob}
                      onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-red-700/10 focus:border-red-700 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Deployment Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 text-amber-600" size={16} />
                    <select
                      disabled={currentUser?.role !== Role.ADMIN}
                      value={formData.role}
                      onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as Role }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs text-slate-900 font-bold uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-red-700/10 focus:border-red-700 focus:bg-white transition cursor-pointer appearance-none"
                    >
                      <option value={Role.FIELD_REP}>Field Representative</option>
                      {currentUser?.role === Role.ADMIN && (
                        <option value={Role.SR_FIELD_EXECUTIVE}>Sr. Field Executive</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Identity Snapshot Frame (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center text-center p-4 bg-[#FBFBF9] border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
                  Officer Snapshot
                </span>
                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  Required *
                </span>
              </div>

              {formData.photo ? (
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md">
                  <img src={formData.photo} alt="Officer Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, photo: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-40 h-40 border-2 border-dashed border-red-300 bg-red-50/20 hover:border-red-600 hover:bg-red-50/50 rounded-2xl flex flex-col items-center justify-center p-4 transition group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-red-700 group-hover:scale-105 shadow-xs mb-2 transition">
                    <Camera size={22} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 group-hover:text-red-700">
                    Capture Live Photo
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5">PSARA Badge Spec</span>
                </button>
              )}

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[200px]">
                Must capture a frontal identity photo for official badge issuance.
              </p>
            </div>

          </div>
        </div>

        {/* Submit Execution Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black py-4 px-6 rounded-2xl text-xs uppercase tracking-widest shadow-md shadow-red-700/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              <span>Registering Security Docket...</span>
            </>
          ) : (
            <>
              <Key size={15} className="text-amber-300" />
              <span>{currentUser?.role === Role.ADMIN ? 'Authorize & Issue Docket' : 'Submit for HQ Approval'}</span>
            </>
          )}
        </button>

      </form>

      {/* Live Viewfinder Modal */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-2 border-amber-400 shadow-2xl">
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-red-700 text-white rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Target Reticle */}
            <div className="absolute inset-8 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none" />

            <div className="absolute bottom-6 inset-x-0 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center text-white">
                  <CameraIcon size={20} />
                </div>
              </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="mt-4 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-widest">
            Align face within frame &bull; Click red button to capture
          </p>
        </div>
      )}

    </div>
  );
};

export default AddUser;
