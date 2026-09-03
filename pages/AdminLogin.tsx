import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, UserCheck, ShieldAlert, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, settings } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(userId, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Administrative privilege verification failed.');
      }
    } catch (err: any) {
      setError('HQ Server connection failure. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] p-4 sm:p-6 text-slate-800 antialiased selection:bg-red-700 selection:text-white relative overflow-hidden font-sans">

      {/* Brand Ambient Glows: Red & Gold Radiant Halos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-red-100/50 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 space-y-6">

        {/* Master Gateway Header Block */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-2 border-amber-400 p-2 shadow-xl shadow-red-900/10 flex items-center justify-center transition-transform hover:scale-105 duration-300">
            {settings.logo ? (
              <img src={settings.logo} className="w-full h-full object-contain" alt="VSF Logo" />
            ) : (
              <img src="/logo.png" className="w-full h-full object-contain" alt="VSF Logo" />
            )}
          </div>

          <div className="space-y-1.5 px-2">
            <h1 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-red-700 font-heading">
              {settings.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-[10px] font-mono font-bold text-amber-900 uppercase tracking-widest shadow-xs">
              <ShieldAlert size={12} className="text-red-600" />
              <span>Executive HQ Master Terminal</span>
            </div>
          </div>
        </div>

        {/* Master Auth Container Card */}
        <div className="bg-white border-2 border-amber-100 p-7 sm:p-8 rounded-3xl shadow-[0_20px_45px_-15px_rgba(185,28,28,0.08)] space-y-5 relative">

          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase flex items-center justify-center gap-2">
              <span>Master Authentication</span>
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              Elevated directorial access &amp; control console
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-xs animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Input Element: Operational ID */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Administrator Identifier / Email
              </label>
              <div className="relative group">
                <UserCheck className="absolute left-3.5 top-3.5 text-amber-600 transition-colors group-focus-within:text-red-700" size={17} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-[#FBFBF9] border border-slate-200 focus:border-red-700 focus:bg-white text-slate-900 font-semibold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-400 text-xs sm:text-sm focus:ring-4 focus:ring-red-700/10"
                  placeholder="VSFHS-ADMININDORE"
                />
              </div>
            </div>

            {/* Input Element: Master Passkey */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Master Security Passkey
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3.5 text-amber-600 transition-colors group-focus-within:text-red-700" size={17} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-3 bg-[#FBFBF9] border border-slate-200 focus:border-red-700 focus:bg-white text-slate-900 font-semibold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-400 text-xs sm:text-sm focus:ring-4 focus:ring-red-700/10"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Main Action Button: VSF Crimson Red with Gold Accent */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black py-3.5 px-5 rounded-xl transition-all flex items-center justify-center active:scale-[0.99] disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-red-700/25 cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Unlock Master Console</span>
                  <ArrowRight size={15} className="ml-2 text-amber-300" />
                </>
              )}
            </button>
          </form>

          {/* Statutory Subtext matching the Hindi Navy Blue emblem banner */}
          <div className="pt-2 text-center">
            <span className="text-[10px] font-mono font-bold text-[#1E3A8A] block">
              Direct Agency Control &bull; Indore HQ &bull; संरक्षण एवं सुरक्षा
            </span>
          </div>
        </div>

        {/* Footer Navigation: Return to Officer Login */}
        <div className="text-center flex flex-col items-center space-y-3 pt-2">
          <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck size={13} className="text-red-700" />
            <span>Restricted Directorial Gateway</span>
          </div>

          <Link
            to="/login"
            className="group flex items-center space-x-2 px-4 py-2 bg-white hover:bg-amber-50/60 rounded-xl border border-amber-200 hover:border-red-300 transition-all shadow-xs"
          >
            <ArrowLeft size={14} className="text-red-700 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black text-slate-700 group-hover:text-red-700 uppercase tracking-wider transition-colors">
              Return to Officer Portal
            </span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
