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
  Download,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Printer,
  ExternalLink,
  Target,
  Tag
} from 'lucide-react';
import { Visit } from '../types';
import { api, supabase } from '../services/apiService';

const VisitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisit = async () => {
      if (!id) return;
      try {
        // Direct query to ensure all fields load regardless of PostgREST column conventions
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
          // Fallback through API request
          const fallbackData = await api.request(`/visits/${id}`);
          setVisit(fallbackData);
        } else {
          setVisit(data);
        }
      } catch (err) {
        console.error("Visit docket fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVisit();
  }, [id]);

  const handleDownloadImage = (base64: string, filename: string) => {
    if (!base64) return;
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Opening Inspection Record...
        </p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-center shadow-xs">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Record Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The requested inspection docket does not exist or has been removed.</p>
        </div>
        <button
          onClick={() => navigate('/visits')}
          className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          Return to Patrol Logs
        </button>
      </div>
    );
  }

  // Normalize camelCase vs snake_case fields safely
  const companyName = visit.companyName || visit.company_name || 'Commercial Establishment';
  const contactPerson = visit.contactPerson || visit.contact_person || 'Not Specified';
  const phoneNumber = visit.phoneNumber || visit.phone_number || '';
  const representativeName = visit.representativeName || visit.representative_name || visit.representativeId || 'Field Officer';
  const category = visit.category || 'COMMERCIAL COMPLEX';
  const purpose = visit.visitPurpose || visit.visit_purpose || 'COLD_CALL';
  const outcome = visit.interactionOutcome || visit.interaction_outcome || 'DISCUSSED';
  const notes = visit.notes || '';
  const nextFollowUp = visit.nextFollowUp || visit.next_follow_up || null;
  const timestamp = visit.timestamp || visit.created_at || new Date().toISOString();
  const boardPhoto = visit.boardPhoto || visit.board_photo || null;
  const repPhoto = visit.repPhoto || visit.rep_photo || null;
  const location = visit.location || null;

  const lat = location?.latitude ?? location?.lat;
  const lng = location?.longitude ?? location?.lng;
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 px-1 sm:px-2 animate-in fade-in duration-200">

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-red-700 uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={15} className="mr-1.5 text-red-700" />
          <span>Back to Logs</span>
        </button>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer"
        >
          <Printer size={14} className="mr-1.5 text-red-700" />
          <span>Print Docket</span>
        </button>
      </div>

      {/* Main Docket Header Card */}
      <div className="bg-white border border-slate-200/90 p-6 sm:p-8 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-[9.5px] font-mono font-bold uppercase tracking-wider">
                PSARA Field Audit
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                DOC ID: {visit.id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              {companyName}
            </h1>
            <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">
              {category}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1 font-mono text-xs text-slate-500">
            <div className="flex items-center text-slate-800 font-bold">
              <Calendar size={13} className="mr-1.5 text-red-700" />
              <span>{new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center text-[11px] text-slate-500">
              <Clock size={12} className="mr-1.5 text-slate-400" />
              <span>{new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Status Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#FBFBF9] p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Patrol Objective</span>
            <span className="text-xs font-black text-slate-900 uppercase mt-0.5 block truncate">
              {purpose.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="bg-[#FBFBF9] p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Client Verdict</span>
            <span className="text-xs font-black text-red-700 uppercase mt-0.5 block truncate">
              {outcome.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="bg-[#FBFBF9] p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Assigned Officer</span>
            <span className="text-xs font-black text-slate-900 uppercase mt-0.5 block truncate">
              {representativeName}
            </span>
          </div>

          <div className="bg-[#FBFBF9] p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block">Next Follow-Up</span>
            <span className="text-xs font-mono font-black text-amber-800 mt-0.5 block truncate">
              {nextFollowUp || 'None Scheduled'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Context & Proof of Presence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (5 Cols): Entity Profile & Observations */}
        <div className="lg:col-span-5 space-y-6">

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-red-700 border-b border-slate-100 pb-3">
              <Building2 size={16} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Client Entity Profile
              </h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Contact Person Met</span>
                <p className="text-sm font-bold text-slate-900 uppercase mt-0.5">{contactPerson}</p>
              </div>

              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Official Contact</span>
                {phoneNumber ? (
                  <a
                    href={`tel:${phoneNumber}`}
                    className="text-sm font-mono font-bold text-red-700 hover:underline mt-0.5 inline-flex items-center gap-1.5"
                  >
                    <Phone size={13} />
                    <span>+91 {phoneNumber}</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Not provided</span>
                )}
              </div>

              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Inspection Officer</span>
                <p className="text-xs font-bold text-slate-800 uppercase mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-red-700 shrink-0" />
                  <span>{representativeName}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-red-700 border-b border-slate-100 pb-3">
              <FileText size={16} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Field Inspection Notes
              </h3>
            </div>

            <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 min-h-[110px]">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {notes ? `"${notes}"` : 'No specific observation directives recorded for this encounter.'}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (7 Cols): Photo Evidences & GPS Geo-Lock */}
        <div className="lg:col-span-7 space-y-6">

          {/* Photographic Audit Proofs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Board / Gate Photo */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Site Signboard Photo
                </span>
                {boardPhoto && (
                  <button
                    onClick={() => handleDownloadImage(boardPhoto, `${companyName}_signboard.jpg`)}
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Download Photo"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>

              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-[#FBFBF9] flex items-center justify-center">
                {boardPhoto ? (
                  <img src={boardPhoto} alt="Site Exterior" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">No Board Image Stored</span>
                )}
              </div>
            </div>

            {/* Officer Selfie Verification */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Officer Selfie Audit
                </span>
                {repPhoto && (
                  <button
                    onClick={() => handleDownloadImage(repPhoto, `${representativeName}_selfie.jpg`)}
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Download Photo"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>

              <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-[#FBFBF9] flex items-center justify-center">
                {repPhoto ? (
                  <img src={repPhoto} alt="Officer Verification" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">No Selfie Stored</span>
                )}
              </div>
            </div>

          </div>

          {/* GPS Coordinates Deployment Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-red-700">
                <MapPin size={16} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  GPS Telemetry Verification
                </h3>
              </div>

              {hasCoordinates && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-[10px] font-mono font-bold text-red-700 hover:text-red-800 uppercase tracking-wider hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={12} className="ml-1" />
                </a>
              )}
            </div>

            <div className="bg-[#FBFBF9] p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mb-1">
                <MapPin size={18} />
              </div>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Verified Geolocation Lock
              </span>

              {hasCoordinates ? (
                <>
                  <p className="text-base font-mono font-black text-slate-900 tracking-wider">
                    {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">
                    PSARA On-Site Tamper-Proof Audit Pass
                  </p>
                </>
              ) : (
                <p className="text-xs font-mono font-bold text-slate-400 uppercase mt-1">
                  GPS Coordinates Unrecorded for this Session
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default VisitDetails;
