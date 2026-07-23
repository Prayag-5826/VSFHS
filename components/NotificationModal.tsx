import React, { useState } from 'react';
import { Send, Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/apiService';
import { useToast } from './ToastContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('ALL'); // ALL, FIELD_REP, SR_EXECUTIVE
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Please complete all notification fields.", "info");
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        id: `NOTIF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
        created_at: new Date().toISOString(),
        read: false,
      };

      // 📡 Save broadcast payload to Supabase/backend queue
      await api.request('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast("📢 Broadcast alert dispatched to representatives successfully!", "success");
      setTitle('');
      setMessage('');
      onClose();
    } catch (err: any) {
      showToast(`Broadcast Dispatch Fault: ${err}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Dispatch Broadcast Alert</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target Field Roster Devices</p>
          </div>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Target Roster Group
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
            >
              <option value="ALL">📢 All Field Representatives</option>
              <option value="FIELD_REP">🛡️ Field Representatives Only</option>
              <option value="SR_EXECUTIVE">⭐ Senior Field Executives Only</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Alert Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., High-Priority Client Sector Update"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Broadcast Message
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter operational notice or instruction..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 flex items-center justify-center space-x-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60"
            >
              {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              <span>Send Broadcast</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
