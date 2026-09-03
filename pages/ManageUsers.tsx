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
import { api, supabase } from '../services/apiService';

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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        // Map database fields cleanly to User models
        const mappedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          avatar: u.avatar || '/assets/img/logo/logo.png',
          dob: u.dob,
          status: u.status || 'ACTIVE',
          password: u.password,
          visitTarget: u.visit_target || 100,
          loginAttempts: u.login_attempts || 0,
          createdAt: u.created_at
        }));
        setUserList(mappedUsers);
      }
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
    if (window.confirm(`Authorize deployment for ${user.name}? This activates mobile duty credentials.`)) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ status: 'ACTIVE', block_reason: null })
          .eq('id', user.id);

        if (error) throw error;
        await fetchUsers();
      } catch (err: any) {
        alert("Authorization failed: " + err.message);
      }
    }
  };

  const handleReject = async (user: User) => {
    if (window.confirm(`Reject and delete deployment application for ${user.name}?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (error) throw error;
        await fetchUsers();
      } catch (err: any) {
        alert("Rejection failed: " + err.message);
      }
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (window.confirm(`PERMANENT DELETION: Remove officer ${name} (${userId}) from database?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
        await fetchUsers();
      } catch (err: any) {
        alert("Deletion failed: " + err.message);
      }
    }
  };

  const executeTargetUpdate = async () => {
    if (!targetModal.user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ visit_target: targetModal.target })
        .eq('id', targetModal.user.id);

      if (error) throw error;
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
      alert("Audit justification is required for credential override.");
      return;
    }

    const userId = resetReasonModal.user.id;
    // 8-digit numeric password
    const newPassword = Math.floor(10000000 + Math.random() * 90000000).toString();

    try {
      const { error } = await supabase
        .from('users')
        .update({
          password: newPassword,
          status: 'ACTIVE',
          login_attempts: 0,
          block_reason: `OVERRIDE: ${resetReasonModal.reason}`
        })
        .eq('id', userId);

      if (error) throw error;

      setResetReasonModal({ isOpen: false, user: null, reason: '' });
      setResetModal({ isOpen: true, userId, newPass: newPassword });
      await fetchUsers();
    } catch (err: any) {
      alert("Security reset failed: " + err.message);
    }
  };

  const executeStatusChange = async () => {
    if (!blockModal.user) return;

    if ((blockModal.action === 'BLOCK' || blockModal.action === 'SUSPEND') && !blockModal.reason.trim()) {
      alert("Administrative justification reason is mandatory.");
      return;
    }

    const newStatus: UserStatus =
      blockModal.action === 'UNBLOCK' ? 'ACTIVE' : (blockModal.action === 'BLOCK' ? 'BLOCKED' : 'SUSPENDED');

    try {
      const payload: any = {
        status: newStatus,
        block_reason: blockModal.action === 'UNBLOCK' ? null : blockModal.reason
      };

      if (blockModal.action === 'UNBLOCK') {
        payload.login_attempts = 0;
      }

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', blockModal.user.id);

      if (error) throw error;

      setBlockModal({ isOpen: false, user: null, reason: '', action: 'BLOCK' });
      await fetchUsers();
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Synchronizing Personnel Matrix...
        </p>
      </div>
    );
  }

  const pendingUsers = userList.filter(u => u.status === 'PENDING_APPROVAL');

  const filteredUsers = userList.filter(u => {
    if (u.status === 'PENDING_APPROVAL') return false;

    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Boolean(u.phone?.includes(searchQuery));

    if (activeTab === 'ACTIVE') {
      return matchesSearch && u.status === 'ACTIVE';
    } else {
      return matchesSearch && (u.status === 'BLOCKED' || u.status === 'SUSPENDED');
    }
  });

  return (
    <div className="w-full space-y-7 px-1 sm:px-2 pb-12 animate-in fade-in duration-300">

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              Agency Field Personnel Roster
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Staff Access Management
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Configure guard inspection targets, credentials override &amp; active status
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="bg-[#FBFBF9] border border-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center shadow-xs">
            <Users size={14} className="mr-2 text-red-700" /> {userList.length} Officers
          </div>
          <button
            onClick={() => navigate('/add-user')}
            className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} className="text-amber-300" />
            <span>Deploy Officer</span>
          </button>
        </div>
      </div>

      {/* Pending Authorization Requests */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 p-6 rounded-3xl space-y-4 shadow-xs">
          <h2 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center">
            <AlertTriangle size={15} className="mr-2 text-red-600 animate-bounce" />
            Pending Authorization Requests ({pendingUsers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col items-center text-center">
                <img
                  src={u.avatar || '/assets/img/logo/logo.png'}
                  className="w-14 h-14 rounded-xl object-cover mb-3 border-2 border-amber-300 shadow-xs"
                  alt={u.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://vidhyasecurityforce.in/assets/img/logo/logo.png';
                  }}
                />
                <h3 className="font-black text-slate-900 uppercase text-xs leading-tight">{u.name}</h3>
                <p className="text-[10px] text-red-700 font-bold font-mono mt-0.5 mb-4">{u.id}</p>
                <div className="flex items-center space-x-2 w-full mt-auto">
                  <button
                    onClick={() => handleApprove(u)}
                    className="flex-1 bg-red-700 hover:bg-red-800 text-white font-black py-2 rounded-xl text-[9px] uppercase tracking-wider transition shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    <UserCheck size={12} className="mr-1.5 text-amber-300" /> Authorize
                  </button>
                  <button
                    onClick={() => handleReject(u)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-black px-3 py-2 rounded-xl transition cursor-pointer"
                    title="Reject"
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
        <div className="bg-[#FBFBF9] p-1 rounded-2xl border border-slate-200 flex space-x-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'ACTIVE'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Active Force
          </button>
          <button
            onClick={() => setActiveTab('RESTRICTED')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${activeTab === 'RESTRICTED'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Suspended / Blocked
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search officer name, phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 text-xs font-bold uppercase rounded-xl outline-none focus:border-red-600 placeholder-slate-400 transition text-slate-900 shadow-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-[#FBFBF9] border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Personnel Profile</th>
                <th className="px-6 py-4">Deployment Status</th>
                <th className="px-6 py-4">Agency Authority</th>
                <th className="px-6 py-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-all group">

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="relative shrink-0">
                        <img
                          src={u.avatar || '/assets/img/logo/logo.png'}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-50 border-2 border-slate-200 shadow-xs"
                          alt={u.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://vidhyasecurityforce.in/assets/img/logo/logo.png';
                          }}
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 uppercase text-xs leading-tight truncate">{u.name}</p>
                        <p className="text-[10px] text-red-700 font-mono font-bold mt-0.5">{u.id}</p>
                        <p className="text-[9px] text-slate-400 font-mono">+91 {u.phone}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border w-fit ${u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                        {u.status === 'ACTIVE' ? <Unlock size={9} className="mr-1" /> : <Lock size={9} className="mr-1" />}
                        {u.status}
                      </div>
                      {u.role !== Role.ADMIN && (
                        <div className="text-[9.5px] font-bold text-amber-900 uppercase tracking-tight flex items-center">
                          <Target size={11} className="mr-1 text-red-700" /> Target: {u.visitTarget || 100} Pitches
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-bold uppercase tracking-wider border ${u.role === Role.ADMIN
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-[#FBFBF9] text-slate-700 border-slate-200'
                      }`}>
                      {u.role === Role.ADMIN ? (
                        <ShieldCheck size={11} className="mr-1 text-red-700" />
                      ) : (
                        <UserIcon size={11} className="mr-1 text-slate-400" />
                      )}
                      {u.role.replace(/_/g, ' ')}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">

                      {/* View Login Card Action Button */}
                      <button
                        onClick={() => setCredentialsModal({ isOpen: true, user: u })}
                        className="p-2 text-red-700 hover:bg-red-50 border border-red-100 rounded-xl shadow-xs bg-white transition cursor-pointer"
                        title="View Passkey Card"
                      >
                        <Eye size={15} />
                      </button>

                      {u.role !== Role.ADMIN && (
                        <button
                          onClick={() => setTargetModal({ isOpen: true, user: u, target: u.visitTarget || 100 })}
                          className="p-2 text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 rounded-xl shadow-xs bg-white transition cursor-pointer"
                          title="Adjust Goal Target"
                        >
                          <Target size={15} />
                        </button>
                      )}

                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'BLOCK' })}
                          className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-xl shadow-xs bg-white transition cursor-pointer"
                          title="Restrict / Block"
                        >
                          <Ban size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlockModal({ isOpen: true, user: u, reason: '', action: 'UNBLOCK' })}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs bg-white transition cursor-pointer"
                          title="Unblock / Restore"
                        >
                          <Unlock size={15} />
                        </button>
                      )}

                      <button
                        onClick={() => initiatePasswordReset(u)}
                        className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 rounded-xl shadow-xs bg-white transition cursor-pointer"
                        title="Reset Passkey"
                      >
                        <RefreshCcw size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={u.role === Role.ADMIN}
                        className="p-2 text-slate-300 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-xl shadow-xs bg-white transition disabled:opacity-20 cursor-pointer"
                        title="Delete Officer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 uppercase text-xs font-medium">
                    No active personnel found matching the query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* View Credentials Passkey Modal */}
      {credentialsModal.isOpen && credentialsModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 sm:p-8 text-center space-y-5 border border-slate-200">
            <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Key size={22} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Security Credentials</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{credentialsModal.user.name}</p>
            </div>

            <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 space-y-3 text-left">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block">Security Badge ID</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-mono font-black text-red-700">{credentialsModal.user.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.user!.id);
                      alert("User ID copied!");
                    }}
                    className="p-1 hover:text-red-700 text-slate-400 transition cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block">Access Key / PIN</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-mono font-black text-slate-900">
                    {credentialsModal.user.password || '********'}
                  </span>
                  {credentialsModal.user.password && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(credentialsModal.user!.password!);
                        alert("Password copied!");
                      }}
                      className="p-1 hover:text-slate-900 text-slate-400 transition cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setCredentialsModal({ isOpen: false, user: null });
                  initiatePasswordReset(credentialsModal.user!);
                }}
                className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition shadow-xs cursor-pointer"
              >
                Generate New 8-Digit PIN
              </button>
              <button
                onClick={() => setCredentialsModal({ isOpen: false, user: null })}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {targetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 sm:p-8">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Target size={22} />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center uppercase tracking-tight mb-0.5">Set Pitch Goal</h3>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-5">Officer: {targetModal.user?.name}</p>
            <div className="space-y-4">
              <div className="bg-[#FBFBF9] p-3 rounded-xl border border-slate-200">
                <input
                  type="number"
                  value={targetModal.target}
                  onChange={(e) => setTargetModal(p => ({ ...p, target: parseInt(e.target.value) || 0 }))}
                  className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none text-center font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetModal({ isOpen: false, user: null, target: 100 })}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeTargetUpdate}
                  className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-xs transition cursor-pointer"
                >
                  Save Target
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Reason Modal */}
      {resetReasonModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 sm:p-8">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <RefreshCcw size={22} />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center uppercase tracking-tight mb-0.5">Credential Reset</h3>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-5">Officer: {resetReasonModal.user?.name}</p>
            <textarea
              required
              value={resetReasonModal.reason}
              onChange={(e) => setResetReasonModal(p => ({ ...p, reason: e.target.value }))}
              className="w-full p-3 bg-[#FBFBF9] border border-slate-200 rounded-xl outline-none text-slate-900 text-xs font-bold min-h-[90px] mb-4 uppercase placeholder-slate-400 focus:border-red-700"
              placeholder="State reason for password reset..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setResetReasonModal({ isOpen: false, user: null, reason: '' })}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executePasswordReset}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-xs transition cursor-pointer"
              >
                Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 sm:p-8 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1">New PIN Issued</h3>
            <div className="bg-[#FBFBF9] p-4 border border-slate-200 rounded-2xl my-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">8-Digit Numeric Key</span>
                <span className="text-2xl font-mono font-black text-slate-900 tracking-wider">{resetModal.newPass}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModal.newPass);
                  alert("Passkey copied!");
                }}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-red-700 shadow-xs transition cursor-pointer"
              >
                <Copy size={15} />
              </button>
            </div>
            <button
              onClick={() => setResetModal({ isOpen: false, userId: '', newPass: '' })}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Block / Unblock Modal */}
      {blockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-6 sm:p-8">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
              {blockModal.action === 'UNBLOCK' ? <Unlock size={22} /> : <ShieldAlert size={22} />}
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center uppercase tracking-tight mb-0.5">
              {blockModal.action} Credentials
            </h3>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-5">Target: {blockModal.user?.name}</p>

            {blockModal.action !== 'UNBLOCK' && (
              <textarea
                required
                value={blockModal.reason}
                onChange={(e) => setBlockModal(p => ({ ...p, reason: e.target.value }))}
                className="w-full p-3 bg-[#FBFBF9] border border-slate-200 rounded-xl outline-none text-slate-900 text-xs font-bold min-h-[90px] mb-4 uppercase placeholder-slate-400 focus:border-red-700"
                placeholder="State administrative justification reason..."
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setBlockModal({ isOpen: false, user: null, reason: '', action: 'BLOCK' })}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-wider transition cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={executeStatusChange}
                className={`flex-1 py-2.5 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider shadow-xs transition cursor-pointer ${blockModal.action === 'UNBLOCK' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
