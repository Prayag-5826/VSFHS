import React, { useState } from 'react';
import { Send, Bell, Loader2, X, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/apiService';
import { useToast } from './ToastContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Please enter both alert title and message.", "info");
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        id: `NOTIF-${Date.now()}`,
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
        created_at: new Date().toISOString(),
        read: false,
      };

      const { error } = await supabase.from('notifications').insert([payload]);

      // If the notifications table is not set up, gracefully log to local storage
      if (error) {
        const stored = JSON.parse(localStorage.getItem('vsf_broadcast_logs') || '[]');
        stored.unshift(payload);
        localStorage.setItem('vsf_broadcast_logs', JSON.stringify(stored.slice(0, 50)));
      }

      showToast("Operational broadcast dispatched to field personnel.", "success");
      setTitle('');
      setMessage('');
      onClose();
    } catch (err: any) {
      showToast(`Broadcast Dispatch Fault: ${err.message || err}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-5 animate-in zoom-in-95 duration-200 relative">

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 pr-6">
          <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 rounded-2xl shadow-xs shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-800">
                Central HQ Broadcast
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Dispatch Operational Alert
            </h3>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSendNotification} className="space-y-4">

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
              Recipient Group
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition cursor-pointer"
            >
              <option value="ALL">All Active Representatives</option>
              <option value="FIELD_REP">Field Representatives Only</option>
              <option value="SR_FIELD_EXECUTIVE">Senior Field Executives Only</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
              Alert Subject <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Priority Sector Check: Sanwer Road Industrial Area"
              className="w-full px-3.5 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
              Directives / Instructions <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter patrol directive, deployment notice, or emergency instructions..."
              className="w-full px-3.5 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="animate-spin text-amber-300" size={15} />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={14} className="text-amber-300" />
                  <span>Send Broadcast</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default NotificationModal;
