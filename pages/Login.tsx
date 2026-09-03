import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsInfo, setAttemptsInfo] = useState<{ left?: number; show: boolean }>({ show: false });

  const { login, settings } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setAttemptsInfo({ show: false });

    try {
      const result = await login(userId, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Access Denied. Please verify officer credentials.');
        if (result.attemptsLeft !== undefined) {
          setAttemptsInfo({ left: result.attemptsLeft, show: true });
        }
      }
    } catch (err) {
      setError('Connection failure. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] p-4 sm:p-6 text-slate-800 antialiased selection:bg-red-700 selection:text-white relative overflow-hidden font-sans">

      {/* Subtle Cream & Amber Ambient Radiance */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-red-100/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 space-y-6">

        {/* Top Official Emblem Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border-2 border-amber-400/80 p-2.5 shadow-md shadow-red-950/5 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src={settings.logo || '/assets/img/logo/logo.png'}
              className="w-full h-full object-contain"
              alt="VSF Logo"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://vidhyasecurityforce.in/assets/img/logo/logo.png';
              }}
            />
          </div>

          <div className="space-y-1 px-2">
            <h1 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-slate-900">
              {settings.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-red-700 uppercase tracking-widest font-mono">
              <span>संरक्षण एवं सुरक्षा</span>
              <span>&bull;</span>
              <span>Field Operations Portal</span>
            </div>
          </div>
        </div>

        {/* Central Auth Container Card */}
        <div className="bg-white border border-slate-200/90 p-7 sm:p-8 rounded-3xl shadow-xs space-y-5 relative">

          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              Officer Sign In
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              Enter your assigned staff credentials to start field duty
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex flex-col space-y-1 shadow-xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-red-600 shrink-0" size={15} />
                <span>{error}</span>
              </div>
              {attemptsInfo.show && attemptsInfo.left !== undefined && (
                <span className="text-amber-900 text-[10px] block font-mono pl-6 font-semibold">
                  ⚠️ Security Notice: {attemptsInfo.left} login attempts remaining before account lock.
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Input Element: Personnel ID */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Officer ID / Mobile Number
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-3.5 top-3.5 text-amber-600 transition-colors group-focus-within:text-red-700" size={17} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-[#FBFBF9] border border-slate-200 focus:border-red-700 focus:bg-white text-slate-900 font-bold tracking-tight outline-none rounded-xl transition placeholder:text-slate-400 text-xs sm:text-sm focus:ring-4 focus:ring-red-700/10"
                  placeholder="e.g. VSFHS527339 or 98260XXXXX"
                />
              </div>
            </div>

            {/* Input Element: Secure Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Security Passkey / PIN
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 text-amber-600 transition-colors group-focus-within:text-red-700" size={17} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-[#FBFBF9] border border-slate-200 focus:border-red-700 focus:bg-white text-slate-900 font-bold tracking-tight outline-none rounded-xl transition placeholder:text-slate-400 text-xs sm:text-sm focus:ring-4 focus:ring-red-700/10"
                  placeholder="8-Digit Passkey PIN"
                />
              </div>
            </div>

            {/* Main Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black py-3.5 px-5 rounded-xl transition flex items-center justify-center active:scale-[0.99] disabled:opacity-50 text-xs uppercase tracking-widest shadow-md shadow-red-700/20 cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate &amp; Punch In</span>
                  <ChevronRight size={15} className="ml-1 text-amber-300" />
                </>
              )}
            </button>
          </form>

          {/* Statutory Subtext */}
          <div className="pt-2 text-center border-t border-slate-100">
            <span className="text-[10px] font-mono font-bold text-slate-400 block">
              PSARA License: PSA/L/74/MP/2023/FEB/3/425[cite: 5, 10, 11]
            </span>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="text-center flex items-center justify-center space-x-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest pt-1">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Authorized Field Deployment Network</span>
        </div>

      </div>
    </div>
  );
};

export default Login;
