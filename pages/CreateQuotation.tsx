import React, { useState, useEffect } from 'react';
import {
  Printer,
  Calculator,
  ArrowLeft,
  ShieldCheck,
  Send,
  Loader2,
  Check,
  Building2,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Search,
  FileSpreadsheet,
  FileCheck2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, ProposalRequest, Visit } from '../types';
import { api } from '../services/apiService';

export const CreateQuotation: React.FC = () => {
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  const [proposals, setProposals] = useState<ProposalRequest[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Billing Model: Default Compliance Model
  const [billingModel, setBillingModel] = useState<'COMPLIANCE' | 'FLAT'>('COMPLIANCE');

  // Client Details (Fetched from Visits)
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Staff Counts (Field Rep Inputs Only Quantity)
  const [guardCount, setGuardCount] = useState(1);
  const [supervisorCount, setSupervisorCount] = useState(0);
  const [gunmanCount, setGunmanCount] = useState(0);

  // Standard Standard Base Rates
  const [guardBasic] = useState(12150);
  const [supervisorBasic] = useState(13146);
  const [gunmanBasic] = useState(14869);
  const [serviceChargePercent] = useState(8);

  const [flatGuardRate] = useState(15000);
  const [flatSupervisorRate] = useState(18000);
  const [flatGunmanRate] = useState(22000);

  const fetchData = async () => {
    try {
      const [proposalsData, visitsData] = await Promise.all([
        api.request('/proposals'),
        api.request('/visits')
      ]);
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
      setVisits(Array.isArray(visitsData) ? visitsData : []);
    } catch (err) {
      console.error("Failed fetching initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When selecting a client visit log, auto-populate client details
  const handleVisitSelect = (visitId: string) => {
    setSelectedVisitId(visitId);
    const visit = visits.find(v => v.id === visitId);
    if (visit) {
      setClientName(visit.companyName || '');
      setContactPerson(visit.contactPerson || '');
      setClientPhone(visit.phoneNumber || '');
      setClientAddress(visit.notes || 'Indore, Madhya Pradesh');
    }
  };

  useEffect(() => {
    if (selectedProposal) {
      setBillingModel(selectedProposal.billingModel || 'COMPLIANCE');
    }
  }, [selectedProposal]);

  const handleFieldRepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) {
      alert("Please select an existing client visit log first.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: `PROP-${Date.now()}`,
        visitId: selectedVisitId,
        clientName,
        clientAddress,
        clientPhone,
        clientEmail,
        notificationRef: 'Notification No. 24862 Dated 01.10.2025',
        billingModel,
        guardCount,
        supervisorCount,
        gunmanCount,
        guardBasic: 12150,
        supervisorBasic: 13146,
        gunmanBasic: 14869,
        serviceChargePercent: 8,
        flatGuardRate: 15000,
        flatSupervisorRate: 18000,
        flatGunmanRate: 22000,
        requestedById: user?.id || 'REP-001',
        requestedByName: user?.name || 'Field Representative',
        status: 'APPROVED' // Auto-approved under standardized agency rates
      };

      await api.request('/proposals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert("Proposal generated successfully under standard agency rates!");
      setSelectedProposal(payload);
      setSelectedVisitId('');
      setClientName('');
      setClientAddress('');
      setClientPhone('');
      setClientEmail('');
      setGuardCount(1);
      setSupervisorCount(0);
      setGunmanCount(0);
      await fetchData();
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Formula Calculations
  const calculateRow = (basic: number) => {
    const additional12Hrs = Math.round(basic * 0.35);
    const reliever = Math.round(basic * 0.1667);
    const totalE = basic + additional12Hrs + reliever;

    const epf = Math.round(basic * 0.13);
    const esic = Math.round(totalE * 0.0325);
    const lwf = 12;
    const paidHoliday = Math.round(basic * 0.0192);
    const uniform = 125;

    const totalN = epf + esic + lwf + paidHoliday + uniform;
    const directCostP = totalE + totalN;
    const serviceChargeQ = Math.round(directCostP * (serviceChargePercent / 100));
    const grandTotalR = directCostP + serviceChargeQ;

    return { basic, additional12Hrs, reliever, totalE, epf, esic, lwf, paidHoliday, uniform, totalN, directCostP, serviceChargeQ, grandTotalR };
  };

  const guardCalc = calculateRow(guardBasic);
  const supervisorCalc = calculateRow(supervisorBasic);
  const gunmanCalc = calculateRow(gunmanBasic);

  // WhatsApp One-Click Share
  const handleShareWhatsApp = () => {
    if (!selectedProposal) return;
    const phone = selectedProposal.clientPhone || selectedProposal.phoneNumber || settings.contactNo;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const totalQuote = billingModel === 'COMPLIANCE'
      ? (guardCalc.grandTotalR * (selectedProposal.guardCount || 1) + supervisorCalc.grandTotalR * (selectedProposal.supervisorCount || 0))
      : (flatGuardRate * (selectedProposal.guardCount || 1) + flatSupervisorRate * (selectedProposal.supervisorCount || 0));

    const text = `*OFFICIAL QUOTATION PROPOSAL* 🛡️\n` +
      `*${settings.companyName}*\n\n` +
      `Dear *${selectedProposal.clientName}*,\n` +
      `Greetings! Please review our proposed security rate quotation:\n\n` +
      `📋 *Deployment:* ${selectedProposal.guardCount || 0} Guard(s), ${selectedProposal.supervisorCount || 0} Supervisor(s)\n` +
      `💰 *Estimated Monthly Contract:* ₹${totalQuote.toLocaleString('en-IN')}/-\n\n` +
      `Director Anil Dhariwal: +91-${settings.contactNo}\n` +
      `*Your Security Is Our Responsibility!*`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={44} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Visits & Proposals...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">

      {/* Top Controls Header */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-5">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest flex items-center mb-1"
          >
            <ArrowLeft size={14} className="mr-1" /> Back to HQ Command
          </button>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Proposal & Quotation Desk</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Select Client Visit & Generate Official Agency Quotations
          </p>
        </div>

        {selectedProposal && (
          <div className="flex items-center space-x-2">
            <button onClick={handleShareWhatsApp} className="flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow transition-all">
              <MessageCircle size={15} className="mr-1.5" /> WhatsApp
            </button>
            <button onClick={() => window.print()} className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow transition-all">
              <Printer size={15} className="mr-1.5" /> Print Official PDF
            </button>
          </div>
        )}
      </div>

      {/* GENERATE PROPOSAL PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
        <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-2 text-indigo-600">
              <FileSpreadsheet size={20} />
              <h2 className="text-xs font-black uppercase tracking-widest">Select Client Visit Log</h2>
            </div>

            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setBillingModel('COMPLIANCE')} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${billingModel === 'COMPLIANCE' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Compliance</button>
              <button type="button" onClick={() => setBillingModel('FLAT')} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${billingModel === 'FLAT' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Flat Rate</button>
            </div>
          </div>

          <form onSubmit={handleFieldRepSubmit} className="space-y-4">

            {/* Visit Picker Dropdown */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Client From Logged Visits</label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <select
                  required
                  value={selectedVisitId}
                  onChange={(e) => handleVisitSelect(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Logged Visit Site --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} ({v.contactPerson || 'No Contact'}) - {new Date(v.timestamp).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto-filled Client Info Card */}
            {clientName && (
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-400 block">Company Name</span>
                  <span className="font-black text-slate-900 uppercase">{clientName}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-400 block">Contact Person</span>
                  <span className="font-bold text-slate-800 uppercase">{contactPerson || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-400 block">Phone Number</span>
                  <span className="font-mono font-bold text-slate-800">{clientPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-400 block">Address</span>
                  <span className="font-bold text-slate-800 truncate block">{clientAddress}</span>
                </div>
              </div>
            )}

            {/* Staff Count Input (Quantity Only) */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Security Guards</label>
                <input type="number" min={0} value={guardCount} onChange={(e) => setGuardCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border rounded-xl font-mono font-bold text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Supervisors</label>
                <input type="number" min={0} value={supervisorCount} onChange={(e) => setSupervisorCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border rounded-xl font-mono font-bold text-xs text-center" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Armed Gunmen</label>
                <input type="number" min={0} value={gunmanCount} onChange={(e) => setGunmanCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border rounded-xl font-mono font-bold text-xs text-center" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <FileCheck2 size={16} />}
              Generate Official Proposal PDF
            </button>
          </form>
        </div>

        {/* Generated Quotation History Sidebar */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-3">Available Proposals ({proposals.length})</h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {proposals.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProposal(p)}
                className={`p-3 border rounded-xl space-y-2 cursor-pointer transition-all ${selectedProposal?.id === p.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-black text-xs text-slate-900 uppercase">{p.clientName}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">
                    READY
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-mono">Guards: {p.guardCount} | Sup: {p.supervisorCount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 🖨️ PRINTABLE QUOTATION SHEET WITH LARGE WASHED LOGO WATERMARK */}
      {/* ==================================================================== */}
      {selectedProposal && (
        <div className="relative bg-white p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-2xl space-y-6 text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0 overflow-hidden">

          {/* 🌟 LARGE WASHED WATERMARK LOGO IN BACKGROUND */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Watermark"
                className="w-[450px] h-[450px] object-contain opacity-[0.04] filter grayscale print:opacity-[0.06]"
              />
            ) : (
              <ShieldCheck size={400} className="text-slate-900 opacity-[0.03] print:opacity-[0.05]" />
            )}
          </div>

          {/* FRONT CONTENT LAYER */}
          <div className="relative z-10 space-y-6">

            {/* Header Branding */}
            <div className="border-b-2 border-slate-900 pb-5 flex items-center justify-between gap-4">
              <div className="shrink-0">
                {settings.logo ? (
                  <img src={settings.logo} alt="Agency Logo" className="w-20 h-20 object-contain" />
                ) : (
                  <div className="w-20 h-20 bg-slate-950 text-white rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={40} />
                  </div>
                )}
              </div>

              <div className="text-center flex-1">
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block">
                  PROTECTION & SECURITY • संरक्षण एवं सुरक्षा
                </span>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-950 mt-0.5">
                  {settings.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}
                </h1>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">
                  ADDRESS: {settings.address || '012 A BLOCK TREASURE TOWN INDORE'} • PH: {settings.contactNo || '9826259020'}
                </p>
              </div>

              <div className="shrink-0 text-right space-y-1">
                <span className="text-[9px] font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block">
                  PSA LICENSED
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">M.P. GOVT APPROVED</span>
              </div>
            </div>

            {/* Proposal Info Bar */}
            <div className="bg-slate-50/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400">Proposal Prepared For:</p>
                <p className="text-sm font-black text-slate-950 uppercase">{selectedProposal.clientName}</p>
                <p className="text-[10px] text-slate-600 uppercase">{selectedProposal.clientAddress}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase text-slate-400">Prepared By:</p>
                <p className="font-mono font-black text-slate-900">{selectedProposal.requestedByName}</p>
              </div>
            </div>

            {/* RATE BREAKDOWN TABLE OVER WATERMARK */}
            {billingModel === 'COMPLIANCE' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px] bg-white/70 backdrop-blur-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-950 font-black uppercase border-b border-slate-300 text-[10px]">
                      <th className="p-2 border-r border-slate-300 w-12 text-center">Sr</th>
                      <th className="p-2 border-r border-slate-300">Billing Structure Particulars</th>
                      <th className="p-2 border-r border-slate-300 w-16 text-center">% Rate</th>
                      <th className="p-2 border-r border-slate-300 text-right">Security Guard (12 Hrs)</th>
                      <th className="p-2 text-right">Supervisor (12 Hrs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono text-slate-800">
                    <tr>
                      <td className="p-2 border-r text-center font-bold">1</td>
                      <td className="p-2 border-r font-sans font-bold">Basic Minimum Wages (8 Hrs / 26 Days)</td>
                      <td className="p-2 border-r text-center font-bold">FIX [A]</td>
                      <td className="p-2 border-r text-right">₹{guardCalc.basic.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{supervisorCalc.basic.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r text-center font-bold">2</td>
                      <td className="p-2 border-r font-sans font-bold">Additional 4 Hrs Overtime Allowance</td>
                      <td className="p-2 border-r text-center font-bold">35% [B]</td>
                      <td className="p-2 border-r text-right">₹{guardCalc.additional12Hrs.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{supervisorCalc.additional12Hrs.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r text-center font-bold">3</td>
                      <td className="p-2 border-r font-sans font-bold">Reliever Charges</td>
                      <td className="p-2 border-r text-center font-bold">16.67% [C]</td>
                      <td className="p-2 border-r text-right">₹{guardCalc.reliever.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{supervisorCalc.reliever.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r text-center">4</td>
                      <td className="p-2 border-r font-sans">EPF & ESIC Statutory Insurance Reserve</td>
                      <td className="p-2 border-r text-center">STAT [F+G]</td>
                      <td className="p-2 border-r text-right">₹{(guardCalc.epf + guardCalc.esic).toFixed(2)}</td>
                      <td className="p-2 text-right">₹{(supervisorCalc.epf + supervisorCalc.esic).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-indigo-950 text-white font-black font-sans text-xs">
                      <td className="p-2.5 border-r text-center">5</td>
                      <td className="p-2.5 border-r uppercase">Grand Total Rate Per Person / Month</td>
                      <td className="p-2.5 border-r text-center font-mono">[R]</td>
                      <td className="p-2.5 border-r text-right font-mono">₹{guardCalc.grandTotalR.toLocaleString('en-IN')}.00</td>
                      <td className="p-2.5 text-right font-mono">₹{supervisorCalc.grandTotalR.toLocaleString('en-IN')}.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs bg-white/70 backdrop-blur-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                      <th className="p-3 border-r border-slate-700">Service Position Designation</th>
                      <th className="p-3 border-r border-slate-700 text-center">Shift Schedule</th>
                      <th className="p-3 text-right">Monthly Flat Service Charge (Per Head)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-bold text-slate-800">
                    <tr>
                      <td className="p-3 border-r font-black">Security Guard / Lady Guard</td>
                      <td className="p-3 border-r text-center">12 Hours (30/31 Days)</td>
                      <td className="p-3 text-right font-mono text-sm font-black text-indigo-900">₹{flatGuardRate.toLocaleString('en-IN')}.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r font-black">Security Supervisor</td>
                      <td className="p-3 border-r text-center">12 Hours (30/31 Days)</td>
                      <td className="p-3 text-right font-mono text-sm font-black text-indigo-900">₹{flatSupervisorRate.toLocaleString('en-IN')}.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Stamp & Director Signature Block */}
            <div className="pt-8 flex justify-between items-end text-center border-t border-slate-200">
              <div className="text-left text-[9px] font-bold text-slate-400 space-y-0.5">
                <p>PSA LICENSE: {settings.psaraLicense || 'PSA/L/74/MP/2023/FEB/3/425'}</p>
                <p>GSTIN: {settings.gstNumber || '23AQRPD0652Q2ZI'}</p>
                <p className="text-indigo-600 font-black uppercase">CONFIDENTIAL CORPORATE PROPOSAL</p>
              </div>

              <div className="space-y-1">
                <div className="w-28 h-14 border border-indigo-200 bg-indigo-50/50 rounded-lg mx-auto flex items-center justify-center p-1">
                  {settings.sealImage ? <img src={settings.sealImage} className="max-h-full max-w-full object-contain" alt="Seal" /> : '[ OFFICIAL STAMP ]'}
                </div>
                <p className="text-xs font-black text-slate-900 uppercase">{settings.directorName || 'Anil Dhariwal'}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Director / Authorised Signatory</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CreateQuotation;
