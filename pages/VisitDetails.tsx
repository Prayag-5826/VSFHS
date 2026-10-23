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
  MessageCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api, supabase } from '../services/apiService';

/** Escapes text before it is written into a print window's HTML. */
const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

const VisitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisit = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
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

  // 1-Click WhatsApp Proposal Outreach
  const handleShareWhatsApp = () => {
    if (!visit) return;
    const phone = (visit.phoneNumber || visit.phone_number || '').replace(/\D/g, '').slice(-10);
    if (!phone) {
      alert('Contact mobile number not recorded.');
      return;
    }
    const company = visit.companyName || visit.company_name || 'Client Establishment';
    const text =
      `*SITE SURVEY & SECURITY AUDIT SUMMARY* 🛡️\n` +
      `*VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES*\n\n` +
      `Dear Management at *${company}*,\n\n` +
      `Our inspection officer completed the on-site physical survey for your premises.\n\n` +
      `📋 *Inspection Outcome:* ${visit.interactionOutcome || 'Survey Completed'}\n` +
      `📍 *Status:* Verified On-Site GPS Coordinates Recorded\n\n` +
      `We have compiled your tailored commercial proposal under MP PSARA minimum wage norms. Kindly confirm when we may present the certified rate docket.\n\n` +
      `📞 Managing Director: +91 98262 59292\n` +
      `_Protection & Security • संरक्षण एवं सुरक्षा_`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Official Post-Visit Letter Generator
  const handlePrintPostVisitLetter = () => {
    if (!visit) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const company = visit.companyName || visit.company_name || 'Valued Establishment';
    const contact = visit.contactPerson || visit.contact_person || 'HR / Operations Head';
    const phone = visit.phoneNumber || visit.phone_number || 'N/A';
    const rep = visit.representativeName || visit.representative_name || 'Field Officer';
    const outcome = visit.interactionOutcome || visit.interaction_outcome || 'DISCUSSED';
    const timestamp = visit.timestamp || visit.created_at || new Date().toISOString();

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VSF - Site Inspection Confirmation Docket - ${esc(company)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { padding: 36px; color: #0f172a; line-height: 1.5; background: #fff; }
            .sheet { border: 2px solid #b91c1c; padding: 32px; border-radius: 14px; max-width: 780px; margin: 0 auto; min-height: 960px; display: flex; flex-direction: column; justify-content: space-between; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fecdd3; padding-bottom: 16px; }
            .logo-title { font-size: 15px; font-weight: 900; color: #b91c1c; text-transform: uppercase; }
            .license { font-size: 9.5px; font-family: monospace; font-weight: 700; color: #9a3412; margin-top: 3px; }
            .client-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 18px 0; }
            .subject { background: #fef2f2; border: 1px solid #fecaca; padding: 9px 12px; font-weight: 900; color: #991b1b; font-size: 11.5px; border-radius: 8px; margin: 14px 0; text-transform: uppercase; }
            .table-box { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11.5px; }
            .table-box th, .table-box td { border: 1px solid #cbd5e1; padding: 8px 10px; }
            .table-box th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; text-align: left; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .sig-line { border-top: 1px solid #475569; width: 200px; text-align: center; font-size: 9.5px; font-weight: bold; text-transform: uppercase; padding-top: 5px; }
            @media print { body { padding: 0; } .sheet { border: 2px solid #000; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div>
              <div class="header">
                <div>
                  <div class="logo-title">Vidhya Security Force &amp; Housekeeping Services</div>
                  <div style="font-size: 11px; font-weight: 900; color: #1e3a8a;">संरक्षण एवं सुरक्षा &bull; PSARA MP LICENSED</div>
                  <div class="license">PSARA LIC: PSA/L/74/MP/2023/FEB/3/425 &bull; INDORE HQ</div>
                </div>
                <div style="text-align: right; font-size: 10px; font-weight: bold;">
                  <div>DATE: ${new Date(timestamp).toLocaleDateString('en-IN')}</div>
                  <div style="color: #b91c1c;">DOCKET: ${esc(visit.id)}</div>
                </div>
              </div>

              <div class="client-card">
                <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">To Organization:</span>
                <div style="font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${esc(company)}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">Attention: <strong>${esc(contact)}</strong> &bull; Contact: +91 ${esc(phone)}</div>
              </div>

              <div class="subject">
                Subject: Post-Inspection Audit Confirmation &amp; Guard Requirement Acknowledgment
              </div>

              <p style="font-size: 11.5px; color: #334155; margin-bottom: 12px; text-align: justify;">
                Dear Sir/Madam,<br><br>
                Thank you for accommodating our inspection team on ${new Date(timestamp).toLocaleDateString('en-IN')}. Our certified representative has executed an on-site physical evaluation of your premises to analyze security coverage, visitor reception desks, and peripheral perimeter boundaries.
              </p>

              <table class="table-box">
                <tr><th width="35%">Inspection Officer</th><td><strong>${esc(rep)}</strong></td></tr>
                <tr><th>Discussion Verdict</th><td>${esc(outcome.replace(/_/g, ' '))}</td></tr>
                <tr><th>Observations Recorded</th><td>${esc(visit.notes || 'Static guard manning & gate security')}</td></tr>
                <tr><th>Next Agreed Action</th><td>${visit.nextFollowUp ? `Follow-up meeting scheduled on ${visit.nextFollowUp}` : 'Rate quotation delivery'}</td></tr>
              </table>

              <p style="font-size: 11.5px; color: #334155; margin-top: 14px;">
                Our official Madhya Pradesh PSARA statutory quotation docket is prepared and will be shared with your procurement committee.
              </p>

              <div class="sig-row">
                <div class="sig-line">Inspecting Officer<br><span style="font-size: 8px; color: #64748b; font-weight: normal;">${esc(rep)}</span></div>
                <div class="sig-line">For Vidhya Security Force<br><span style="font-size: 8px; color: #64748b; font-weight: normal;">Managing Director Anil Dhariwal</span></div>
              </div>
            </div>

            <div style="text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
              HQ: 012 A Block, Treasure Town, Indore (M.P.) &bull; Emergency: 9826259292 &bull; contact@vidhyasecurityforce.in
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
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

      {/* Top Navigation Bar with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-red-700 uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={15} className="mr-1.5 text-red-700" />
          <span>Back to Logs</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/create-quotation')}
            className="inline-flex items-center px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer gap-1.5"
          >
            <FileSpreadsheet size={13} className="text-amber-300" />
            <span>Generate Quote</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer gap-1.5"
          >
            <MessageCircle size={13} />
            <span>WhatsApp Client</span>
          </button>

          <button
            onClick={handlePrintPostVisitLetter}
            className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer gap-1.5"
          >
            <FileText size={13} className="text-red-700" />
            <span>Visit Letter</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer gap-1.5"
          >
            <Printer size={13} className="text-slate-500" />
            <span>Print Docket</span>
          </button>
        </div>
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

      {/* Grid: Profile & Evidence Proofs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (5 Cols): Entity Profile & Notes */}
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

        {/* Right Column (7 Cols): Photographs & GPS Map */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Board Image */}
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

            {/* Officer Selfie */}
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

          {/* GPS Satellite Lock Card */}
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
