
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Shield, 
  Calendar, 
  User as UserIcon, 
  RefreshCcw, 
  Key, 
  Copy,
  Lock,
  Unlock,
  AlertTriangle,
  Ban,
  Loader2,
  FileText,
  CheckCircle2,
  Target,
  UserCheck,
  UserX,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role, User, UserStatus } from '../types';
import { api } from '../services/apiService';

const ManageUsers: React.FC = () => {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; userId: string; newPass: string }>({
    isOpen: false,
    userId: '',
    newPass: ''
  });
  
  const [resetReasonModal, setResetReasonModal] = useState<{ isOpen: boolean; user: User | null; reason: string }>({
    isOpen: false,
    user: null,
    reason: ''
  });

  const [blockModal, setBlockModal] = useState<{ isOpen: boolean; user: User | null; reason: string; action: 'BLOCK' | 'SUSPEND' | 'UNBLOCK' }>({
    isOpen: false,
    user: null,
    reason: '',
    action: 'BLOCK'
  });

  const [targetModal, setTargetModal] = useState<{ isOpen: boolean; user: User | null; target: number }>({
    isOpen: false,
    user: null,
    target: 100
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.request('/users');
      setUserList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Roster Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (user: User) => {
    if (window.confirm(`Authorize deployment for ${user.name}? This will activate their credentials.`)) {
      try {
        await api.request(`/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACTIVE', blockReason: '' })
        });
        await fetchUsers();
      } catch (err: any) {
        alert("Authorization failed: " + err.message);
      }
    }
  };

  const handleReject = async (user: User) => {
    if (window.confirm(`Reject and delete deployment request for ${user.name}?`)) {
      try {
        await api.request(`/users/${user.id}`, { method: 'DELETE' });
        await fetchUsers();
      } catch (err: any) {
        alert("Rejection failed: " + err.message);
      }
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (window.confirm(`PERMANENT DELETION: Are you sure you want to remove ${name} from the system roster?`)) {
      try {
        await api.request(`/users/${userId}`, { method: 'DELETE' });
        await fetchUsers();
      } catch (err: any) {
        alert("Deletion failed: " + err.message);
      }
    }
  };

  const executeTargetUpdate = async () => {
    if (!targetModal.user) return;
    try {
      await api.request(`/users/${targetModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ visitTarget: targetModal.target })
      });
      setTargetModal({ isOpen: false, user: null, target: 100 });
      await fetchUsers();
    } catch (err: any) {
      alert("Target update failed: " + err.message);
    }
  };

  const initiatePasswordReset = (user: User) => {
    setResetReasonModal({
      isOpen: true,
      user: user,
      reason: ''
    });
  };

  const executePasswordReset = async () => {
    if (!resetReasonModal.user || !resetReasonModal.reason.trim()) {
      alert("Audit justification is mandatory.");
      return;
    }

    const userId = resetReasonModal.user.id;
    const newPassword = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    try {
      await api.request(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          password: newPassword, 
          status: 'ACTIVE', 
          loginAttempts: 0,
          blockReason: `PWD_RESET: ${resetReasonModal.reason}` 
        })
      });
      
      setResetReasonModal({ isOpen: false, user: null, reason: '' });
      setResetModal({ isOpen: true, userId, newPass: newPassword });
      await fetchUsers();
    } catch (err: any) {
      alert("Security override failed: " + err.message);
    }
  };

  const executeStatusChange = async () => {
    if (!blockModal.user) return;
    
    if ((blockModal.action === 'BLOCK' || blockModal.action === 'SUSPEND') && !blockModal.reason.trim()) {
      alert("Justification reason is required.");
      return;
    }

    const newStatus: UserStatus = blockModal.action === 'UNBLOCK' ? 'ACTIVE' : (blockModal.action === 'BLOCK' ? 'BLOCKED' : 'SUSPENDED');
    
    try {
      const payload: any = { status: newStatus, blockReason: blockModal.reason };
      if (blockModal.action === 'UNBLOCK') {
        payload.loginAttempts = 0;
        payload.blockReason = '';
      }

      await api.request(`/users/${blockModal.user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setBlockModal({ isOpen: false, user: null, reason: '', action: 'BLOCK' });
      await fetchUsers();
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  const pendingUsers = userList.filter(u => u.status === 'PENDING_APPROVAL');
  const activeUsers = userList.filter(u => u.status !== 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Personnel Roster</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Access Control & Productivity Management</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center shadow-2xl">
          <Users size={16} className="mr-3" />
          {userList.length} Records
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center">
            <AlertTriangle size={16} className="mr-2" />
            Pending Deployment Requests ({pendingUsers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-50/50 flex flex-col items-center text-center">
                <img src={u.avatar} className="w-16 h-16 rounded-2xl object-cover mb-4 border-2 border-amber-50" alt={u.name} />
                <h3 className="font-black text-slate-900 uppercase text-sm leading-tight">{u.name}</h3>
                <p className="text-[10px] text-slate-400 font-black font-mono mt-1 mb-4">{u.id}</p>
                <div className="flex items-center space-x-2 w-full mt-auto">
                   <button 
                     onClick={() => handleApprove(u)}
                     className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center"
                   >
                     <UserCheck size={14} className="mr-2" /> Approve
                   </button>
                   <button 
                     onClick={() => handleReject(u)}
                     className="bg-red-50 hover:bg-red-100 text-red-600 font-black px-4 py-3 rounded-xl transition-all flex items-center justify-center"
                     title="Reject Request"
                   >
                     <XCircle size={14} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">State / Target</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth Role</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeUsers.map((u) => (
                <tr key={u.id} className="hover:bg-indigo-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img src={u.avatar} className="w-12 h-12 rounded-2xl object-cover bg-slate-100 border-2 border-white shadow-md" alt={u.name} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm leading-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-black font-mono mt-0.5">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col space-y-2">
                       <div className={`inline-flex self-start items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                         u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-200'
                       }`}>
                         {u.status === 'ACTIVE' ? <Unlock size={10} className="mr-1.5" /> : <Lock size={10} className="mr-1.5" />}
                         {u.status}
                       </div>
                       {u.role !== Role.ADMIN && (
                         <div className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter flex items-center">
                            <Target size={12} className="mr-1.5" />
                            Target: {u.visitTarget || 100} Vis.
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      u.role === Role.ADMIN ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200'
                    }`}>
                      {u.role === Role.ADMIN ? <Shield size={12} className="mr-1.5" /> : <UserIcon size={12} className="mr-1.5" />}
                      {u.role.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {u.role !== Role.ADMIN && (
                        <button 
                          onClick={() => setTargetModal({ isOpen: true, user: u, target: u.visitTarget || 100 })}
                          className="p-3 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                          title="Adjust Target"
                        >
                          <Target size={18} />
                        </button>
                      )}
                      
                      {u.status === 'ACTIVE' ? (
                        <button 
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'BLOCK' })}
                          className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                          title="Restrict Access"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'UNBLOCK' })}
                          className="p-3 text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                          title="Restore Access"
                        >
                          <Unlock size={18} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => initiatePasswordReset(u)}
                        className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                        title="Password Reset Override"
                      >
                        <RefreshCcw size={18} />
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={u.role === Role.ADMIN}
                        className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100 disabled:opacity-10"
                        title="Delete Record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visit Target Modal */}
      {targetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <Target size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">Set Performance Goal</h3>
            <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest mb-8">Personnel: {targetModal.user?.name}</p>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Monthly Visit Target</label>
                <input 
                  type="number"
                  value={targetModal.target}
                  onChange={(e) => setTargetModal(p => ({ ...p, target: parseInt(e.target.value) }))}
                  className="w-full text-4xl font-black text-slate-900 bg-transparent outline-none text-center"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTargetModal({ isOpen: false, user: null, target: 100 })} className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
                <button onClick={executeTargetUpdate} className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Update Goal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Reason Modal */}
      {resetReasonModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <RefreshCcw size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">Security Override</h3>
            <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.2em] mb-8">Personnel: {resetReasonModal.user?.name}</p>
            <textarea 
              required
              value={resetReasonModal.reason}
              onChange={(e) => setResetReasonModal(p => ({ ...p, reason: e.target.value }))}
              className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none text-slate-950 font-black min-h-[120px] mb-6"
              placeholder="Justification for manual override..."
            />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setResetReasonModal({ isOpen: false, user: null, reason: '' })} className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancel</button>
              <button onClick={executePasswordReset} className="py-5 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Reset Access</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Access Restored</h3>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 my-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">New Security Key</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-black text-slate-900">{resetModal.newPass}</span>
                <button onClick={() => navigator.clipboard.writeText(resetModal.newPass)} className="p-3 hover:bg-white rounded-xl text-indigo-600">
                  <Copy size={20} />
                </button>
              </div>
            </div>
            <button onClick={() => setResetModal({ isOpen: false, userId: '', newPass: '' })} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Close</button>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {blockModal.action === 'UNBLOCK' ? <Unlock size={40} /> : <Ban size={40} />}
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">{blockModal.action} PERSONNEL</h3>
            <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest mb-8">Target: {blockModal.user?.name}</p>
            {blockModal.action !== 'UNBLOCK' && (
              <textarea 
                required
                value={blockModal.reason}
                onChange={(e) => setBlockModal(p => ({ ...p, reason: e.target.value }))}
                className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none text-slate-950 font-black min-h-[120px] mb-6"
                placeholder="Audit justification..."
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setBlockModal({ isOpen: false, user: null, reason: '', action: 'BLOCK' })} className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Abort</button>
              <button onClick={executeStatusChange} className={`py-5 text-white rounded-2xl font-black uppercase text-xs ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-600' : 'bg-red-600'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
