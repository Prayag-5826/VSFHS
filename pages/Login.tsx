import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, ChevronRight, HardHat, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';

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
        setError(result.message || 'Access Denied');
        if (result.attemptsLeft !== undefined) {
          setAttemptsInfo({ left: result.attemptsLeft, show: true });
        }
      }
    } catch (err) {
      setError('Connection failure. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070913] p-6 text-slate-200 antialiased selection:bg-indigo-600 selection:text-white relative overflow-hidden">

      {/* Background Radial Glow Vectors */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-slate-900/50 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10 space-y-8">

        {/* Top Branding Block */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-900/40 flex items-center justify-center p-2.5 shadow-xl shadow-black/50">
            {settings.logo ? (
              <img src={settings.logo} className="w-full h-full object-contain" alt="VSF Logo" />
            ) : (
              <HardHat className="text-indigo-400" size={26} />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
              {settings.companyName}
            </h1>
            <p className="text-[9px] font-black text-indigo-400/80 uppercase tracking-[0.15em]">
              Personnel Deployment Terminal
            </p>
          </div>
        </div>

        {/* Central Auth Container Card */}
        <div className="bg-slate-900/20 backdrop-blur-md border border-slate-800/50 p-8 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] space-y-6">

          <div className="text-center space-y-1.5 border-b border-slate-800/50 pb-5">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              Staff Authentication
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              Initialize secure shift logging credentials
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] font-black rounded-xl uppercase tracking-widest flex flex-col space-y-1.5 shadow-lg">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="text-red-500 shrink-0" size={14} />
                <span>{error}</span>
              </div>
              {attemptsInfo.show && attemptsInfo.left !== undefined && (
                <span className="text-amber-400 text-[9px] block font-mono pl-6">
                  ⚠️ SECURITY SYSTEM ALERT: {attemptsInfo.left} ATTEMPTS REMAINING.
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Input Element: Personnel ID */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Personnel ID
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={16} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 text-white font-bold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/5"
                  placeholder="VSFHS-XXXX"
                />
              </div>
            </div>

            {/* Input Element: Secure Password */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Security Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 text-white font-bold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-800 text-sm focus:ring-4 focus:ring-indigo-500/5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Main Action Call to Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center active:scale-[0.98] disabled:opacity-40 text-xs uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/10 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Initialize System Access</span>
                  <ChevronRight size={14} className="ml-1 text-indigo-200" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Navigation Elements */}
        <div className="mt-8 text-center flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">
            <ShieldCheck size={12} className="text-slate-500" />
            <span>Authorized Operations Terminal</span>
          </div>

          {/* Executive Gateway Portal Redirect Button */}
          <Link
            to="/vsfhs-master-portal"
            className="group flex items-center space-x-2 px-5 py-2.5 bg-slate-950/40 hover:bg-slate-950/80 backdrop-blur-sm rounded-xl border border-slate-800/80 hover:border-indigo-500/30 transition-all shadow-md shadow-black/30"
          >
            <ShieldAlert size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">
              Access Master Executive Gateway
            </span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
