
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  ExternalLink,
  Calendar,
  Phone,
  User as UserIcon,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { Visit, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/apiService';

const VisitsList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const data = await api.request(`/visits${user?.role === Role.FIELD_REP ? `?rep_id=${user.id}` : ''}`);
        setVisits(data);
      } catch (err) {
        console.error("Failed to load visits", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, [user]);

  const filteredVisits = visits.filter(v => 
    v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.representativeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Field Logs</h1>
          <p className="text-slate-500 font-medium">Monitoring visit details and documentation records.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 shadow-sm"
            />
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Entity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Information</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field Personnel</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <ClipboardList size={32} className="opacity-20" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">Record Archive Empty</p>
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase text-sm leading-tight">{visit.companyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs font-bold text-slate-700">
                          <UserIcon size={14} className="mr-2 text-slate-400" />
                          {visit.contactPerson}
                        </div>
                        <div className="flex items-center text-[10px] text-slate-500">
                          <Phone size={12} className="mr-2" />
                          {visit.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-white uppercase tracking-tighter">
                        {visit.representativeName}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">
                      <div className="flex items-center font-medium">
                        <Calendar size={14} className="mr-2 opacity-50" />
                        {new Date(visit.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] ml-5 opacity-50">
                        {new Date(visit.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        to={`/visit/${visit.id}`}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all inline-block shadow-sm hover:shadow-indigo-100"
                      >
                        <ExternalLink size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VisitsList;
