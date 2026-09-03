import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3.8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating System Notification HUD */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 pointer-events-none w-full max-w-sm px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl shadow-lg border backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-250 ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-800 text-white shadow-emerald-950/20'
                : toast.type === 'error'
                ? 'bg-red-950/95 border-red-800 text-white shadow-red-950/20'
                : 'bg-slate-950/95 border-amber-600/40 text-white shadow-black/30'
            }`}
          >
            {/* Status Brand Icons */}
            {toast.type === 'success' && (
              <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={17} />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="shrink-0 text-red-400 mt-0.5" size={17} />
            )}
            {toast.type === 'info' && (
              <ShieldAlert className="shrink-0 text-amber-400 mt-0.5" size={17} />
            )}

            <div className="flex-1 min-w-0">
              <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                {toast.type === 'success' ? 'Command Verified' : toast.type === 'error' ? 'Security Alert' : 'System Notice'}
              </span>
              <p className="text-xs font-semibold leading-relaxed text-slate-100">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
