
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Building2,
  FileText,
  Loader2,
  Download
} from 'lucide-react';
import { Visit } from '../types';
import { api } from '../services/apiService';

const VisitDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const data = await api.request(`/visits/${id}`);
        setVisit(data);
      } catch (err) {
        console.error("Visit not found", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisit();
  }, [id]);

  const handleDownloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Visit ID not found.</p>
        <button onClick={() => navigate('/visits')} className="text-indigo-600 font-black uppercase text-xs">Return to Logs</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to Visits
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">{visit.companyName}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500">
            <span className="flex items-center tracking-tight font-bold text-xs uppercase"><Calendar size={14} className="mr-1.5 text-indigo-500" /> {new Date(visit.timestamp).toLocaleString()}</span>
            <span className="flex items-center tracking-tight font-bold text-xs uppercase"><MapPin size={14} className="mr-1.5 text-indigo-500" /> {visit.location.latitude.toFixed(6)}, {visit.location.longitude.toFixed(6)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 flex items-center uppercase tracking-widest border-b border-slate-50 pb-4">
              <Building2 size={16} className="mr-2 text-indigo-600" />
              Entity Audit Profile
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contact Person</span>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{visit.contactPerson}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Phone Number</span>
                <span className="text-sm font-black text-slate-900 tracking-widest">{visit.phoneNumber}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Representative</span>
                <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">{visit.representativeName}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 flex items-center uppercase tracking-widest border-b border-slate-50 pb-4">
              <FileText size={16} className="mr-2 text-indigo-600" />
              Field Observations
            </h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-5 rounded-2xl leading-relaxed min-h-[120px] font-bold italic border border-slate-100">
              "{visit.notes || "No additional observations logged for this deployment."}"
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Board Verification</span>
                <button
                  onClick={() => handleDownloadImage(visit.boardPhoto, `${visit.companyName}_board.png`)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                <img src={visit.boardPhoto} alt="Board" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel Verification</span>
                <button
                  onClick={() => handleDownloadImage(visit.repPhoto, `${visit.representativeName}_selfie.png`)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Download size={16} />
                </button>
              </div>
              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                <img src={visit.repPhoto} alt="Personnel" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <h3 className="text-xs font-black text-slate-900 mb-6 flex items-center uppercase tracking-widest border-b border-slate-50 pb-4">
                <MapPin size={16} className="mr-2 text-indigo-600" />
                GPS Deployment Context
             </h3>
             <div className="bg-slate-50 aspect-[21/9] rounded-2xl flex flex-col items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                <MapPin size={32} className="mb-3 opacity-20" />
                <p className="text-[10px] font-black font-mono tracking-widest">VERIFIED COORDINATES:</p>
                <p className="text-sm font-black text-slate-900 font-mono mt-1">{visit.location.latitude}, {visit.location.longitude}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDetails;
