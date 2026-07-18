import React, { useState, useRef } from 'react';
import {
  UserPlus,
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
  CameraIcon
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

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      alert("Camera access is required for identity snapshots.");
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
        // Center crop for profile picture
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFormData((prev: any) => ({ ...prev, photo: dataUrl }));
        stopCamera();
      }
    }
  };

  const generateCredentials = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const userId = `VSFHS${randomCode}`;
    const password = Math.floor(10000000 + Math.random() * 90000000).toString();
    return { userId, password };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      setIsLoading(false);
      return;
    }

    const { userId, password } = generateCredentials();

    // Status Logic: Non-admin creation goes to pending
    const status = currentUser?.role === Role.ADMIN ? 'ACTIVE' : 'PENDING_APPROVAL';

    const newUser: UserType = {
      id: userId,
      name: formData.name.toUpperCase(),
      email: `${userId.toLowerCase()}@vidhyasecurity.com`,
      phone: formData.phone,
      password: password,
      role: formData.role,
      avatar: formData.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      dob: formData.dob,
      createdAt: new Date().toISOString(),
      status: status as any,
      loginAttempts: 0,
      createdBy: currentUser?.id
    };

    try {
      await api.request('/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setGeneratedUser(newUser);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!generatedUser) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Personnel Deployment Slip - ${generatedUser.id}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
              .slip { border: 2px solid #e2e8f0; padding: 30px; border-radius: 15px; max-width: 500px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
              .header p { margin: 5px 0 0; font-size: 10px; font-weight: bold; color: #6366f1; letter-spacing: 2px; }
              .info { margin-bottom: 15px; display: flex; justify-content: space-between; }
              .label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
              .value { font-size: 16px; font-weight: 900; color: #1e293b; font-family: monospace; }
              .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="slip">
              <div class="header">
                <h1>Vidhya Security Force</h1>
                <p>PERSONNEL DEPLOYMENT AUTHORIZATION</p>
              </div>
              <div class="info">
                <span class="label">Personnel Name:</span>
                <span class="value">${generatedUser.name}</span>
              </div>
              <div class="info">
                <span class="label">Assigned Role:</span>
                <span class="value">${generatedUser.role.replace(/_/g, ' ')}</span>
              </div>
              <div class="info">
                <span class="label">System User ID:</span>
                <span class="value" style="color: #4f46e5;">${generatedUser.id}</span>
              </div>
              <div class="info">
                <span class="label">Security Passkey:</span>
                <span class="value">${generatedUser.password}</span>
              </div>
              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>THIS IS A CONFIDENTIAL DOCUMENT. DO NOT SHARE PASSKEY.</p>
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

  if (isSuccess && generatedUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-indigo-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Record Registered!</h1>
          <p className="text-slate-500 mb-8 font-bold text-xs uppercase tracking-widest">
            {generatedUser.status === 'PENDING_APPROVAL'
              ? 'Request submitted to system admin for final verification.'
              : 'Personnel successfully deployed to field operations.'}
          </p>

          <div className="w-full space-y-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between group border border-slate-100">
              <div className="text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</span>
                <p className="text-lg font-mono font-black text-indigo-600 uppercase tracking-widest">{generatedUser.id}</p>
              </div>
              <button type="button" onClick={() => navigator.clipboard.writeText(generatedUser.id)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-600">
                <Copy size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between group border border-slate-100">
              <div className="text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</span>
                <p className="text-lg font-mono font-black text-slate-950 tracking-widest">{generatedUser.password}</p>
              </div>
              <button type="button" onClick={() => navigator.clipboard.writeText(generatedUser.password!)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900">
                <Copy size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              type="button"
              onClick={handlePrint}
              className="py-5 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center"
            >
              <Printer size={18} className="mr-3" />
              Print Slip
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center justify-center shadow-xl shadow-indigo-100"
            >
              <Plus size={18} className="mr-3" />
              New Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase">Register Deployment</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Personnel deployment authorization protocol.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-xl border border-red-100 uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Full Legal Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-tight"
                    placeholder="Personnel Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mobile Contact (10 Digits)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((p: any) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-tight"
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input
                    required
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData((p: any) => ({ ...p, dob: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-tight"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Assigned Role</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-4 text-slate-300" size={18} />
                  <select
                    disabled={currentUser?.role !== Role.ADMIN}
                    value={formData.role}
                    onChange={(e) => setFormData((p: any) => ({ ...p, role: e.target.value as Role }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-tight appearance-none"
                  >
                    <option value={Role.FIELD_REP}>FIELD REPRESENTATIVE</option>
                    {currentUser?.role === Role.ADMIN && (
                      <option value={Role.SR_FIELD_EXECUTIVE}>SR. FIELD EXECUTIVE</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Identity Snapshot</label>
               {formData.photo ? (
                 <div className="relative aspect-square w-full max-w-[220px] mx-auto rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                    <img src={formData.photo} alt="User" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, photo: '' }))}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                    >
                      <Plus className="rotate-45" size={16} />
                    </button>
                 </div>
               ) : (
                 <button
                    type="button"
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center aspect-square w-full max-w-[220px] mx-auto border-2 border-dashed border-slate-200 rounded-[2rem] hover:border-indigo-400 hover:bg-slate-50 transition-all group"
                 >
                    <div className="p-6 bg-slate-100 rounded-2xl group-hover:bg-indigo-50 transition-colors mb-3">
                      <Camera size={36} className="text-slate-300 group-hover:text-indigo-600" />
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Open Camera Viewfinder</span>
                 </button>
               )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-950 hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all flex items-center justify-center group tracking-[0.2em] uppercase text-sm disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Key size={20} className="mr-3 text-indigo-400" />}
          {currentUser?.role === Role.ADMIN ? 'AUTHORIZE & CREATE RECORD' : 'SUBMIT DEPLOYMENT REQUEST'}
        </button>
      </form>

      {/* Live Camera Modal */}
      {cameraActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 p-4">
           <div className="relative w-full max-w-md aspect-square bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-800">
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-red-600 text-white rounded-2xl backdrop-blur-md transition-all"
              >
                 <X size={20} />
              </button>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center">
                 <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-8 border-slate-200 shadow-2xl flex items-center justify-center active:scale-90 transition-all group"
                 >
                    <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                       <CameraIcon size={24} />
                    </div>
                 </button>
              </div>

              <canvas ref={canvasRef} className="hidden" />
           </div>

           <p className="mt-8 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Align face within center frame</p>
        </div>
      )}
    </div>
  );
};

export default AddUser;
