import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MapPin,
  ExternalLink,
  Calendar,
  Phone,
  User as UserIcon,
  ClipboardList,
  Loader2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Filter,
  Eye
} from 'lucide-react';
import { Visit, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../services/apiService';

const VisitsList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const endpoint = `/visits${user?.role === Role.FIELD_REP ? `?rep_id=${user.id}` : ''}`;
        const data = await api.request(endpoint);
        setVisits(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load visits telemetry:", err);
        setVisits([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, [user]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v: any) => {
      const company = (v.companyName || v.company_name || '').toLowerCase();
      const contact = (v.contactPerson || v.contact_person || '').toLowerCase();
      const rep = (v.representativeName || v.representative_name || '').toLowerCase();
      const phone = (v.phoneNumber || v.phone_number || '');
      const category = (v.category || '');

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        company.includes(searchLower) ||
        contact.includes(searchLower) ||
        rep.includes(searchLower) ||
        phone.includes(searchLower);

      const matchesCategory = categoryFilter === 'ALL' || category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [visits, searchTerm, categoryFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Synchronizing Field Logs...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-14 animate-in fade-in duration-200">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              Field Telemetry &amp; Inspection Audit
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Client Patrol Logs
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Verified field drops, GPS locks, and commercial client inspections
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search entity, contact, rep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-700 transition cursor-pointer"
            >
              <option value="ALL">All Sectors</option>
              <option value="COMMERCIAL COMPLEX">Commercial Complex</option>
              <option value="INDUSTRIAL WAREHOUSE">Industrial Warehouse</option>
              <option value="RETAIL SHOWROOM">Retail Showroom</option>
              <option value="CORPORATE OFFICE">Corporate Office</option>
              <option value="HOSPITALITY / HOTEL">Hospitality / Hotel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#FBFBF9] border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Client Establishment</th>
                <th className="px-6 py-4">Site Representative</th>
                <th className="px-6 py-4">Patrol Officer</th>
                <th className="px-6 py-4">Inspection Date / GPS</th>
                <th className="px-6 py-4 text-right">View Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <ClipboardList size={26} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-700">No matching logs found</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Adjust your search query or log a new field visit.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit: any) => {
                  const company = visit.companyName || visit.company_name || 'Unnamed Site';
                  const contact = visit.contactPerson || visit.contact_person || 'Not Specified';
                  const phone = visit.phoneNumber || visit.phone_number || '';
                  const rep = visit.representativeName || visit.representative_name || visit.representativeId || 'Field Officer';
                  const outcome = visit.interactionOutcome || visit.interaction_outcome || 'VISITED';
                  const category = visit.category || 'COMMERCIAL';
                  const timestamp = visit.timestamp || visit.created_at || new Date().toISOString();
                  const loc = visit.location;

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/70 transition-colors group">

                      {/* Entity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center justify-center shrink-0 shadow-xs">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 uppercase text-xs leading-tight truncate">
                              {company}
                            </p>
                            <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded mt-1 inline-block">
                              {category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center text-xs font-bold text-slate-800">
                            <UserIcon size={12} className="mr-1.5 text-amber-600 shrink-0" />
                            <span className="truncate">{contact}</span>
                          </div>
                          {phone && (
                            <div className="flex items-center text-[10.5px] font-mono text-slate-500">
                              <Phone size={11} className="mr-1.5 text-slate-400 shrink-0" />
                              <a href={`tel:${phone}`} className="hover:text-red-700 hover:underline">
                                +91 {phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Rep Badge */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FBFBF9] border border-slate-200 text-[10px] font-mono font-bold text-slate-800 uppercase tracking-tight">
                          <ShieldCheck size={12} className="text-red-700" />
                          <span>{rep}</span>
                        </div>
                        <span className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                          Verdict: {outcome}
                        </span>
                      </td>

                      {/* Date & Location */}
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1.5 text-slate-400" />
                          <span>{new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-[10px] text-slate-400 mt-0.5 ml-4">
                          <Clock size={10} className="mr-1 text-slate-400" />
                          <span>{new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {loc?.latitude && (
                            <span className="ml-2 text-emerald-600 font-bold">&bull; GPS Lock</span>
                          )}
                        </div>
                      </td>

                      {/* Details Link */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/visit/${visit.id}`}
                          className="inline-flex items-center gap-1 p-2.5 text-slate-500 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition shadow-xs cursor-pointer"
                          title="Open Full Inspection Docket"
                        >
                          <Eye size={15} />
                        </Link>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default VisitsList;
