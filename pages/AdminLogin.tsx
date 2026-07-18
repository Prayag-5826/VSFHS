import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/apiService';

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
      // 1. Authenticate with custom X-Gateway-Portal to verify admin role permissions
      const result = await api.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Portal': 'MASTER'
        },
        body: JSON.stringify({ username: userId, password })
      });

      // 2. Inject profile context details directly into universal auth state container
      if (result && result.access_token) {
        // Mocking the context state payload mapping
        const loginSuccess = await login(userId, password);
        if (loginSuccess.success) {
          navigate('/');
        } else {
          setError(loginSuccess.message || 'Administrative Access Denied');
        }
      }
    } catch (err: any) {
      setError(err.message || 'System connection failure.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d16] p-6 text-slate-200 antialiased selection:bg-indigo-600 selection:text-white relative overflow-hidden">

      {/* Subtle Background Radial Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-slate-900/40 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10 space-y-8">

        {/* Top Branding Block */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center p-2.5 shadow-xl shadow-black/40">
            {settings.logo ? (
              <img src={settings.logo} className="w-full h-full object-contain" alt="VSF Logo" />
            ) : (
              <ShieldAlert className="text-indigo-400" size={26} />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
              {settings.companyName}
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">
              HQ Core Security Control
            </p>
          </div>
        </div>

        {/* Central Auth Container Card */}
        <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/60 p-8 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] space-y-6">

          <div className="text-center space-y-1.5 border-b border-slate-800/60 pb-5">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              Master Authentication
            </h2>
            <p className="text-slate-400 text-xs font-medium">
              Enter secure credentials to unlock system access portal
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center space-x-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Input Element: Operational ID */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Operational ID
              </label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={16} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 text-white font-bold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-700 text-sm focus:ring-4 focus:ring-indigo-500/5"
                  placeholder="VSFHS-ADMIN"
                />
              </div>
            </div>

            {/* Input Element: Secure Passkey */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                Secure Passkey
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-indigo-500 text-white font-bold tracking-tight outline-none rounded-xl transition-all placeholder:text-slate-700 text-sm focus:ring-4 focus:ring-indigo-500/5"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Main Submission Call To Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center active:scale-[0.98] disabled:opacity-40 text-xs uppercase tracking-[0.15em] shadow-lg shadow-indigo-600/10 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Initialize Secure Session</span>
                  <ArrowRight size={14} className="ml-2 text-indigo-200" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Audit Message */}
        <div className="flex items-center justify-center space-x-2 text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">
          <ShieldCheck size={12} className="text-slate-500" />
          <span>Restricted Area // Encrypted Connection Hub</span>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;
