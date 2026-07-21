import React, { useState, useEffect } from 'react';
import {
  Users,
  Trash2,
  Shield,
  User as UserIcon,
  RefreshCcw,
  Copy,
  Lock,
  Unlock,
  AlertTriangle,
  Ban,
  Loader2,
  CheckCircle2,
  Target,
  UserCheck,
  XCircle,
  ShieldAlert,
  Search,
  Plus,
  ShieldCheck,
  Eye,
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Role, User, UserStatus } from '../types';
import { api } from '../services/apiService';

const ManageUsers: React.FC = () => {
  const navigate = useNavigate();
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESTRICTED'>('ACTIVE');

  // Modals state
  const [credentialsModal, setCredentialsModal] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  });

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={44} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Personnel Database...</p>
      </div>
    );
  }

  const pendingUsers = userList.filter(u => u.status === 'PENDING_APPROVAL');

  const filteredUsers = userList.filter(u => {
    if (u.status === 'PENDING_APPROVAL') return false;

    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'ACTIVE') {
      return matchesSearch && u.status === 'ACTIVE';
    } else {
      return matchesSearch && (u.status === 'BLOCKED' || u.status === 'SUSPENDED');
    }
  });

  return (
    <div className="w-full space-y-8 px-2 animate-in fade-in duration-300">

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <Shield size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">Access Control Matrix</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Personnel Roster</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5">
            Manage field representative target limits and global dashboard authorizations
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-md">
            <Users size={14} className="mr-2" /> {userList.length} Accounts Registered
          </div>
          <button
            onClick={() => navigate('/add-user')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={14} /> Add Staff
          </button>
        </div>
      </div>

      {/* Pending Authorization Requests */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/60 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
          <h2 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center">
            <AlertTriangle size={15} className="mr-2 animate-bounce" />
            Pending Authorization Requests ({pendingUsers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center text-center">
                <img src={u.avatar} className="w-14 h-14 rounded-xl object-cover mb-3 border-2 border-slate-100 shadow-sm" alt={u.name} />
                <h3 className="font-black text-slate-900 uppercase text-xs leading-tight">{u.name}</h3>
                <p className="text-[9px] text-slate-400 font-black font-mono mt-0.5 mb-4">{u.id}</p>
                <div className="flex items-center space-x-2 w-full mt-auto">
                   <button
                     onClick={() => handleApprove(u)}
                     className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-[9px] uppercase tracking-wider transition-all flex items-center justify-center shadow-sm"
                   >
                     <UserCheck size={12} className="mr-1.5" /> Authorize
                   </button>
                   <button
                     onClick={() => handleReject(u)}
                     className="bg-red-50 hover:bg-red-100 text-red-600 font-black px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center"
                     title="Delete Request"
                   >
                     <XCircle size={14} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs and Search Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="bg-slate-100 p-1 rounded-xl border flex space-x-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Active Force
          </button>
          <button
            onClick={() => setActiveTab('RESTRICTED')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'RESTRICTED' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Suspended/Blocked
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search representative or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-xs font-bold uppercase rounded-xl outline-none focus:border-indigo-500 placeholder-slate-400 transition-all text-slate-950"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200">
                <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel Profile</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Goal Status</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority Role</th>
                <th className="px-8 py-4.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Directives Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">

                  <td className="px-8 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative shrink-0">
                        <img src={u.avatar} className="w-11 h-11 rounded-xl object-cover bg-slate-100 border-2 border-white shadow-sm" alt={u.name} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 uppercase text-sm leading-tight truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-black font-mono mt-0.5 tracking-wide">{u.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                       <div className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border w-fit ${
                         u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                       }`}>
                         {u.status === 'ACTIVE' ? <Unlock size={9} className="mr-1" /> : <Lock size={9} className="mr-1" />}
                         {u.status}
                       </div>
                       {u.role !== Role.ADMIN && (
                         <div className="text-[10px] font-black text-indigo-600 uppercase tracking-tight flex items-center">
                            <Target size={11} className="mr-1" /> Target: {u.visitTarget || 100} Pitches
                         </div>
                       )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      u.role === Role.ADMIN ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {u.role === Role.ADMIN ? <ShieldCheck size={11} className="mr-1 text-indigo-400" /> : <UserIcon size={11} className="mr-1" />}
                      {u.role.replace(/_/g, ' ')}
                    </div>
                  </td>

                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* View Login Card Action Button */}
                      <button
                        onClick={() => setCredentialsModal({ isOpen: true, user: u })}
                        className="p-2.5 text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm bg-white transition-all"
                        title="View User Passkey Card"
                      >
                        <Eye size={15} />
                      </button>

                      {u.role !== Role.ADMIN && (
                        <button
                          onClick={() => setTargetModal({ isOpen: true, user: u, target: u.visitTarget || 100 })}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border rounded-xl shadow-sm bg-white transition-all"
                          title="Adjust Goal Target"
                        >
                          <Target size={15} />
                        </button>
                      )}

                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'BLOCK' })}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 border rounded-xl shadow-sm bg-white transition-all"
                          title="Restrict/Block Credentials"
                        >
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'UNBLOCK' })}
                          className="p-2.5 text-emerald-500 hover:text-emerald-700 hover:bg-slate-50 border rounded-xl shadow-sm bg-white transition-all"
                          title="Restore Credentials Authorization"
                        >
                          <Unlock size={15} />
                        </button>
                      )}

                      <button
                        onClick={() => initiatePasswordReset(u)}
                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 border rounded-xl shadow-sm bg-white transition-all"
                        title="Generate New Temporary Key"
                      >
                        <RefreshCcw size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={u.role === Role.ADMIN}
                        className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-slate-50 border rounded-xl shadow-sm bg-white transition-all disabled:opacity-10"
                        title="Permanent Delete Account"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 uppercase text-xs font-black">
                    No active match found in system records search query index logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 💳 View Credentials Passkey Modal Card */}
      {credentialsModal.isOpen && credentialsModal.user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95 space-y-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Key size={26} />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Access Credentials</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{credentialsModal.user.name}</p>
            </div>

            <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-900 space-y-3 text-left">
              <div>
                <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest block">System User ID</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-mono font-black text-slate-200">{credentialsModal.user.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.user!.id);
                      alert("User ID copied!");
                    }}
                    className="p-1 hover:text-indigo-400 text-slate-500 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest block">Access Status / Key</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-mono font-black text-emerald-400">STATUS: {credentialsModal.user.status}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setCredentialsModal({ isOpen: false, user: null });
                  initiatePasswordReset(credentialsModal.user!);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-sm"
              >
                🔑 Generate New Passkey
              </button>
              <button
                onClick={() => setCredentialsModal({ isOpen: false, user: null })}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {targetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Target size={26} />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-1">Set Pitch Target</h3>
            <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest mb-6">User: {targetModal.user?.name}</p>
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border">
                <input
                  type="number"
                  value={targetModal.target}
                  onChange={(e) => setTargetModal(p => ({ ...p, target: parseInt(e.target.value) || 0 }))}
                  className="w-full text-3xl font-black text-slate-900 bg-transparent outline-none text-center font-mono"
                />
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setTargetModal({ isOpen: false, user: null, target: 100 })} className="flex-1 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">Cancel</button>
                <button onClick={executeTargetUpdate} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all">Update Goal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Reason Modal */}
      {resetReasonModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <RefreshCcw size={26} />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-1">Security Override</h3>
            <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest mb-6">User: {resetReasonModal.user?.name}</p>
            <textarea
              required
              value={resetReasonModal.reason}
              onChange={(e) => setResetReasonModal(p => ({ ...p, reason: e.target.value }))}
              className="w-full p-4 bg-slate-50 border rounded-xl outline-none text-slate-950 text-xs font-bold min-h-[90px] mb-4 uppercase placeholder-slate-400"
              placeholder="State clear audit reason for override..."
            />
            <div className="flex gap-2.5">
              <button onClick={() => setResetReasonModal({ isOpen: false, user: null, reason: '' })} className="flex-1 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">Cancel</button>
              <button onClick={executePasswordReset} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all">Reset Access</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Access Restored</h3>
            <div className="bg-slate-50 p-4 border rounded-xl my-5 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Temporary Passkey</span>
                <span className="text-2xl font-mono font-black text-slate-950 tracking-wider">{resetModal.newPass}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModal.newPass);
                  alert("Key copied to admin system cache!");
                }}
                className="p-2.5 bg-white border hover:bg-slate-50 rounded-xl text-indigo-600 shadow-sm transition-all"
              >
                <Copy size={16} />
              </button>
            </div>
            <button onClick={() => setResetModal({ isOpen: false, userId: '', newPass: '' })} className="w-full py-3 bg-slate-950 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all">Close Terminal</button>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {blockModal.action === 'UNBLOCK' ? <Unlock size={26} /> : <ShieldAlert size={26} />}
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight mb-1">{blockModal.action} Credentials</h3>
            <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest mb-6">Target: {blockModal.user?.name}</p>

            {blockModal.action !== 'UNBLOCK' && (
              <textarea
                required
                value={blockModal.reason}
                onChange={(e) => setBlockModal(p => ({ ...p, reason: e.target.value }))}
                className="w-full p-4 bg-slate-50 border rounded-xl outline-none text-slate-950 text-xs font-bold min-h-[90px] mb-4 uppercase placeholder-slate-400"
                placeholder="State administrative justification reason..."
              />
            )}

            <div className="flex gap-2.5">
              <button onClick={() => setBlockModal({ isOpen: false, user: null, reason: '', action: 'BLOCK' })} className="flex-1 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">Abort</button>
              <button onClick={executeStatusChange} className={`flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
