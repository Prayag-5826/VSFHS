import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  ArrowLeft,
  Search,
  FileCheck2,
  CheckCircle2,
  Eye,
  Edit3,
  CheckSquare,
  Square,
  PlusCircle,
  Loader2,
  MessageCircle,
  Layers,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role, Visit, ServiceRoleType } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../components/ToastContext';

interface ServiceOptionMeta {
  label: string;
  defaultFlat12: number;
  defaultFlat8: number;
  defaultBasic12: number;
  defaultBasic8: number;
}

const DEFAULT_SERVICE_OPTIONS: Record<ServiceRoleType, ServiceOptionMeta> = {
  GUARD: { label: 'Security Guard', defaultFlat12: 15500, defaultFlat8: 12500, defaultBasic12: 13421, defaultBasic8: 12425 },
  SUPERVISOR: { label: 'Security Field Supervisor', defaultFlat12: 18500, defaultFlat8: 15500, defaultBasic12: 14869, defaultBasic8: 13800 },
  GUNMAN: { label: 'Armed Gunman (12 Bore / .32)', defaultFlat12: 23000, defaultFlat8: 19500, defaultBasic12: 16500, defaultBasic8: 15000 },
  HOUSEKEEPING: { label: 'Housekeeping & Sanitation', defaultFlat12: 14000, defaultFlat8: 11000, defaultBasic12: 12425, defaultBasic8: 11500 }
};

export const CreateQuotation: React.FC = () => {
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === Role.ADMIN;

  const [viewMode, setViewMode] = useState<'BUILDER' | 'PREVIEW'>('BUILDER');
  const [activePageTab, setActivePageTab] = useState<'ALL' | 1 | 2 | 3 | 4 | 5>('ALL');

  const [proposals, setProposals] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Proposal Meta
  const [billingModel, setBillingModel] = useState<'COMPLIANCE' | 'FLAT'>('COMPLIANCE');
  const [wageMode, setWageMode] = useState<'PORTAL_MIN_WAGE' | 'CUSTOM'>('PORTAL_MIN_WAGE');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(settings?.defaultServiceMargin ?? 8);

  // Active Service Toggles
  const [enabledServices, setEnabledServices] = useState<Record<ServiceRoleType, boolean>>({
    GUARD: true,
    SUPERVISOR: false,
    GUNMAN: false,
    HOUSEKEEPING: false
  });

  // Manning Configurations per Service
  const [serviceConfigs, setServiceConfigs] = useState<Record<ServiceRoleType, { count: number; shift: '12_HOURS' | '8_HOURS'; flatRate: number }>>({
    GUARD: { count: 1, shift: '12_HOURS', flatRate: settings?.flatGuard12 ?? 15500 },
    SUPERVISOR: { count: 0, shift: '12_HOURS', flatRate: settings?.flatSupervisor12 ?? 18500 },
    GUNMAN: { count: 0, shift: '12_HOURS', flatRate: settings?.flatGunman12 ?? 23000 },
    HOUSEKEEPING: { count: 0, shift: '8_HOURS', flatRate: settings?.flatHousekeeping8 ?? 11000 }
  });

  // Custom Negotiated Basic Rates
  const [customBasicRates, setCustomBasicRates] = useState<Record<ServiceRoleType, { basic12: number; basic8: number }>>({
    GUARD: { basic12: 13421, basic8: 12425 },
    SUPERVISOR: { basic12: 14869, basic8: 13800 },
    GUNMAN: { basic12: 16500, basic8: 15000 },
    HOUSEKEEPING: { basic12: 12425, basic8: 11500 }
  });

  const fetchProposalsData = async () => {
    try {
      const [proposalsRes, visitsRes] = await Promise.allSettled([
        api.request('/proposals'),
        api.request(isAdmin ? '/visits' : `/visits?rep_id=${user?.id}`)
      ]);

      let allProps: any[] = [];
      if (proposalsRes.status === 'fulfilled' && Array.isArray(proposalsRes.value)) {
        allProps = proposalsRes.value;
      }

      const localProps = JSON.parse(localStorage.getItem('vsf_saved_proposals') || '[]');
      const combined = [...localProps, ...allProps.filter((p: any) => !localProps.some((lp: any) => lp.id === p.id))];

      setProposals(combined);

      if (visitsRes.status === 'fulfilled' && Array.isArray(visitsRes.value)) {
        setVisits(visitsRes.value);
      }
    } catch (err) {
      console.error('Data retrieval warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposalsData();
  }, [user]);

  const handleVisitSelect = (visitId: string) => {
    setSelectedVisitId(visitId);
    setSelectedProposal(null);

    const visit: any = visits.find((v: any) => v.id === visitId);
    if (!visit) return;

    setClientName(visit.companyName || visit.company_name || '');
    setContactPerson(visit.contactPerson || visit.contact_person || '');
    setClientPhone(visit.phoneNumber || visit.phone_number || visit.phone || '');

    const rawNotes = visit.notes || '';
    const cleanNotes = rawNotes.split('| Requirements:')[0].split('| Guards:')[0].trim();
    const categoryText = visit.category ? `${visit.category}, Indore (M.P.)` : 'Indore, Madhya Pradesh';
    setClientAddress(cleanNotes ? `${cleanNotes}, ${categoryText}` : categoryText);

    const guardMatch = rawNotes.match(/Guards:\s*(\d+)/i);
    const count = guardMatch ? parseInt(guardMatch[1], 10) : 1;

    setServiceConfigs(prev => ({
      ...prev,
      GUARD: {
        count: count > 0 ? count : 1,
        shift: rawNotes.includes('8_HOURS') ? '8_HOURS' : '12_HOURS',
        flatRate: settings?.flatGuard12 ?? 15500
      }
    }));

    setEnabledServices({
      GUARD: true,
      SUPERVISOR: false,
      GUNMAN: false,
      HOUSEKEEPING: false
    });

    setViewMode('BUILDER');
  };

  const resolveBaseWage = (role: ServiceRoleType, shift: '12_HOURS' | '8_HOURS'): number => {
    if (wageMode === 'PORTAL_MIN_WAGE') {
      if (role === 'GUARD') return shift === '12_HOURS' ? (settings?.guardBasic12 ?? 13421) : (settings?.guardBasic8 ?? 12425);
      if (role === 'SUPERVISOR') return shift === '12_HOURS' ? (settings?.supervisorBasic12 ?? 14869) : (settings?.supervisorBasic8 ?? 13800);
      if (role === 'GUNMAN') return shift === '12_HOURS' ? (settings?.gunmanBasic12 ?? 16500) : (settings?.gunmanBasic8 ?? 15000);
      if (role === 'HOUSEKEEPING') return shift === '12_HOURS' ? (settings?.housekeepingBasic12 ?? 12425) : (settings?.housekeepingBasic8 ?? 11500);
    }
    return shift === '12_HOURS' ? customBasicRates[role].basic12 : customBasicRates[role].basic8;
  };

  const calculateStatutoryRole = (role: ServiceRoleType, shift: '12_HOURS' | '8_HOURS') => {
    const base = resolveBaseWage(role, shift);
    const otPercent = settings?.overtimePercent ?? 35;
    const relPercent = settings?.reliverPercent ?? 16.67;
    const epfRate = (settings?.epfPercent ?? 13) / 100;
    const esicRate = (settings?.esicPercent ?? 3.25) / 100;
    const marginRate = (serviceChargePercent || settings?.defaultServiceMargin || 8) / 100;

    const additional12Hrs = shift === '12_HOURS' ? Math.round(base * (otPercent / 100)) : 0;
    const reliever = Math.round(base * (relPercent / 100));
    const gross = base + additional12Hrs + reliever;

    const epf = Math.round(base * epfRate);
    const esic = Math.round(gross * esicRate);
    const lwf = settings?.lwfAmount ?? 12;
    const paidHoliday = Math.round(base * 0.0192);
    const uniform = settings?.uniformKitAmount ?? 125;
    const totalStat = epf + esic + lwf + paidHoliday + uniform;

    const ctc = gross + totalStat;
    const agencyMargin = Math.round(ctc * marginRate);
    const grandTotal = ctc + agencyMargin;

    return { base, additional12Hrs, reliever, gross, epf, esic, lwf, paidHoliday, uniform, totalStat, ctc, agencyMargin, grandTotal };
  };

  const activeChosenServices = useMemo(() => {
    if (viewMode === 'PREVIEW' && selectedProposal?.service_items) {
      return selectedProposal.service_items;
    }

    const list: any[] = [];
    (Object.keys(enabledServices) as ServiceRoleType[]).forEach(role => {
      if (enabledServices[role] && serviceConfigs[role].count > 0) {
        const conf = serviceConfigs[role];
        const stat = calculateStatutoryRole(role, conf.shift);

        let flatBase = conf.shift === '12_HOURS' ? DEFAULT_SERVICE_OPTIONS[role].defaultFlat12 : DEFAULT_SERVICE_OPTIONS[role].defaultFlat8;
        if (role === 'GUARD') flatBase = conf.shift === '12_HOURS' ? (settings?.flatGuard12 ?? flatBase) : (settings?.flatGuard8 ?? flatBase);
        if (role === 'SUPERVISOR') flatBase = conf.shift === '12_HOURS' ? (settings?.flatSupervisor12 ?? flatBase) : (settings?.flatSupervisor8 ?? flatBase);
        if (role === 'GUNMAN') flatBase = conf.shift === '12_HOURS' ? (settings?.flatGunman12 ?? flatBase) : (settings?.flatGunman8 ?? flatBase);
        if (role === 'HOUSEKEEPING') flatBase = conf.shift === '12_HOURS' ? (settings?.flatHousekeeping12 ?? flatBase) : (settings?.flatHousekeeping8 ?? flatBase);

        const currentModel = (viewMode === 'PREVIEW' && selectedProposal?.billing_model) ? selectedProposal.billing_model : billingModel;
        const perHead = currentModel === 'COMPLIANCE' ? stat.grandTotal : flatBase;

        list.push({
          role,
          label: DEFAULT_SERVICE_OPTIONS[role].label,
          count: conf.count,
          shift: conf.shift,
          flatRate: flatBase,
          statutory: stat,
          perHeadRate: perHead,
          lineTotal: perHead * conf.count
        });
      }
    });
    return list;
  }, [viewMode, selectedProposal, enabledServices, serviceConfigs, billingModel, wageMode, customBasicRates, settings, serviceChargePercent]);

  const totalMonthlyBilling = useMemo(() => {
    if (viewMode === 'PREVIEW' && selectedProposal?.total_amount) {
      return Number(selectedProposal.total_amount);
    }
    return activeChosenServices.reduce((acc: number, item: any) => acc + (item.lineTotal || 0), 0);
  }, [viewMode, selectedProposal, activeChosenServices]);

  const effectiveBillingModel = (viewMode === 'PREVIEW' && selectedProposal?.billing_model)
    ? selectedProposal.billing_model
    : billingModel;

  const handleResetForm = () => {
    setSelectedProposal(null);
    setSelectedVisitId('');
    setClientName('');
    setContactPerson('');
    setClientPhone('');
    setClientAddress('');
    setEnabledServices({ GUARD: true, SUPERVISOR: false, GUNMAN: false, HOUSEKEEPING: false });
    setServiceConfigs({
      GUARD: { count: 1, shift: '12_HOURS', flatRate: settings?.flatGuard12 ?? 15500 },
      SUPERVISOR: { count: 0, shift: '12_HOURS', flatRate: settings?.flatSupervisor12 ?? 18500 },
      GUNMAN: { count: 0, shift: '12_HOURS', flatRate: settings?.flatGunman12 ?? 23000 },
      HOUSEKEEPING: { count: 0, shift: '8_HOURS', flatRate: settings?.flatHousekeeping8 ?? 11000 }
    });
    setActivePageTab('ALL');
    setViewMode('BUILDER');
  };

  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      showToast('Client establishment name is required.', 'info');
      return;
    }
    if (activeChosenServices.length === 0) {
      showToast('Assign at least one deployed service position.', 'error');
      return;
    }

    setSubmitting(true);
    const proposalId = `PROP-${Date.now().toString()}`;

    const newProposal = {
      id: proposalId,
      visit_id: selectedVisitId || null,
      client_name: clientName.trim().toUpperCase(),
      client_address: clientAddress.trim(),
      client_phone: clientPhone.trim(),
      contact_person: contactPerson.trim(),
      billing_model: billingModel,
      wage_mode: wageMode,
      service_charge_percent: serviceChargePercent,
      service_items: activeChosenServices,
      total_amount: totalMonthlyBilling,
      requested_by_id: user?.id || 'HQ-DIRECTOR',
      requested_by_name: user?.name || 'Managing Director',
      created_at: new Date().toISOString(),
      status: isAdmin ? 'APPROVED' : 'PENDING_APPROVAL'
    };

    try {
      await api.request('/proposals', {
        method: 'POST',
        body: JSON.stringify(newProposal)
      });
    } catch (err) {
      console.warn('Database proposal synchronization notice:', err);
    }

    const local = JSON.parse(localStorage.getItem('vsf_saved_proposals') || '[]');
    const updated = [newProposal, ...local];
    localStorage.setItem('vsf_saved_proposals', JSON.stringify(updated));

    setProposals(updated);
    setSelectedProposal(newProposal);
    setActivePageTab('ALL');
    setViewMode('PREVIEW');
    setSubmitting(false);
    showToast('Quotation saved successfully & added to All Saved Proposals!', 'success');
  };

  const handleApproveProposal = async () => {
    if (!selectedProposal || !isAdmin) return;
    setApproving(true);

    const updated = {
      ...selectedProposal,
      status: 'APPROVED',
      approved_by: user?.name || 'Anil Dhariwal',
      approved_at: new Date().toISOString()
    };

    const local = JSON.parse(localStorage.getItem('vsf_saved_proposals') || '[]');
    const idx = local.findIndex((p: any) => p.id === updated.id);
    if (idx !== -1) {
      local[idx] = updated;
      localStorage.setItem('vsf_saved_proposals', JSON.stringify(local));
    }

    setSelectedProposal(updated);
    setProposals(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setApproving(false);
    showToast('Quotation authorized for official presentation.', 'success');
  };

  const handleShareWhatsApp = () => {
    if (!selectedProposal) return;
    const phone = selectedProposal.client_phone || clientPhone || settings?.contactNo || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const client = selectedProposal.client_name || clientName || 'Valued Client';

    const serviceSummary = activeChosenServices
      .map((s: any) => `${s.count}x ${s.label} (${s.shift === '12_HOURS' ? '12-Hr' : '8-Hr'}) @ ₹${s.perHeadRate.toLocaleString('en-IN')}/head`)
      .join('\n');

    let text = '';
    if (activePageTab === 2) {
      text =
        `*OFFICIAL RATE QUOTATION* 🛡️\n` +
        `*${settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}*\n\n` +
        `Dear *${client}*,\n` +
        `Please review our commercial quotation:\n\n` +
        `📋 *Selected Services:*\n${serviceSummary}\n\n` +
        `💰 *Monthly Consideration:* ₹${totalMonthlyBilling.toLocaleString('en-IN')}/- (*GST extra on monthly billing*)\n\n` +
        `Director Anil Dhariwal: +91 9826259020\n` +
        `_Your Security Is Our Responsibility!_`;
    } else {
      text =
        `*COMPREHENSIVE PROPOSAL DOSSIER (5 PAGES)* 🛡️\n` +
        `*${settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}*\n` +
        `_PSARA MP Licensed Security & Facility Agency_\n\n` +
        `Dear *${client}*,\n` +
        `We are pleased to present our complete 5-Page Dossier for your establishment.\n\n` +
        `📋 *Proposed Deployments:*\n${serviceSummary}\n\n` +
        `💰 *Net Monthly Billing:* ₹${totalMonthlyBilling.toLocaleString('en-IN')}/- (*GST Extra on Monthly Billing*)\n` +
        `📄 *Includes:* Introduction, Service Rate Matrix, GST Compliance (RCM Sec 9(3)), Service Assurance & Statutory Registrations (PSARA, EPF, ESIC, GSTIN).\n\n` +
        `Central Command: +91 9826259020, 9229678188\n` +
        `_Protection & Security • संरक्षण एवं सुरक्षा_`;
    }

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = (pageTarget: 'ALL' | 'RATE' | 1 | 2 | 3 | 4 | 5) => {
    // 'RATE' maps to Page 2 (Rate Sheet) but keeps API simple for callers
    const target = pageTarget === 'RATE' ? 2 : pageTarget;
    // Ensure preview mode and active page are set before printing
    setActivePageTab(target as any);
    setViewMode('PREVIEW');
    // Allow layout to settle (fonts, images) before invoking print
    setTimeout(() => {
      window.print();
      // After print dialog is closed reset to ALL to avoid accidental extra pages
      setActivePageTab('ALL');
    }, 220);
  };

  const isApproved = selectedProposal?.status === 'APPROVED';

  // Professional Printable Header Component
  const PrintHeader: React.FC = () => (
    <div className="w-full border-b-2 border-red-800 pb-2.5 mb-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 shrink-0">
        <img
          src={settings?.logo || '/assets/img/logo/logo.png'}
          alt="VSF Logo"
          className="w-14 h-14 object-contain"
          onError={(e: any) => { e.target.src = 'https://via.placeholder.com/56?text=VSF'; }}
        />
        <div className="text-left leading-tight">
          <span className="text-[9px] font-mono font-black text-red-700 tracking-wider block">
            PROTECTION &bull; SECURITY
          </span>
          <span className="text-[10.5px] font-black text-slate-800 tracking-wide block">
            संरक्षण एवं सुरक्षा
          </span>
          <span className="text-[8px] font-mono text-slate-500 font-semibold block mt-0.5">
            EMERGENCY CONTROL: +91 9826259292
          </span>
        </div>
      </div>

      <div className="text-center flex-1 px-1">
        <h1 className="text-[13px] font-black uppercase tracking-tight text-slate-950 leading-tight">
          {settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES'}
        </h1>
        <p className="text-[8px] font-bold text-slate-700 uppercase tracking-wide mt-0.5">
          ADDRESS: {settings?.address || '012 A BLOCK TREASURE TOWN INDORE, MP'}
        </p>
        <p className="text-[8px] font-mono font-medium text-slate-600">
          Office No: {settings?.contactNo || '9826259292'}, 9229678188 &bull; Email: {settings?.email || 'contact@vidhyasecurityforce.in'}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        <span className="inline-block text-[8px] font-mono font-black bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded uppercase">
          PSARA MP LICENSED
        </span>
        <span className="text-[8px] font-mono text-slate-600 font-bold block">
          Date: {new Date().toLocaleDateString('en-GB')}
        </span>
      </div>
    </div>
  );

  // Flexible spacer that absorbs leftover vertical space on lightly-filled
  // pages so the footer doesn't get stranded at the bottom with a raw gap.
  // Renders a subtle centered brand mark + divider instead of dead space.
  const PageFiller: React.FC = () => (
    <div className="page-filler flex-1 min-h-[10mm] flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full border border-red-100 flex items-center justify-center opacity-[0.14] print:opacity-20">
        <FileCheck2 className="w-7 h-7 text-red-800" strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-3 w-full max-w-[100mm]">
        <span className="flex-1 h-px bg-slate-200" />
        <span className="text-[7px] font-mono uppercase tracking-[0.35em] text-slate-300 whitespace-nowrap">
          Vidhya Security Force
        </span>
        <span className="flex-1 h-px bg-slate-200" />
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-16 animate-in fade-in duration-200">

      {/* Embedded Pixel-Perfect A4 Print Rules & Exact Page Splitting */}
      <style>{`
        /* Global A4 @page */
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }

        @media print {
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 10pt !important;
            color-adjust: exact !important;
          }

          /* Utility: hide interactive UI in print */
          .print-hidden, .no-print, .print-hide {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }

          /* Tailwind variant generated class escape for print:hidden usage in JSX */
          .print\:hidden {
            display: none !important;
          }

          /* Print container should match A4 width */
          .print-container {
            display: block !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          /* Each A4 page box: strict sizing and page breaks.
             277mm matches the on-screen box height below (297mm minus the
             8mm+8mm @page margin), so preview and print line up exactly. */
          .a4-page-box {
            width: 210mm !important;
            height: 277mm !important;
            min-height: 277mm !important;
            max-height: 277mm !important;
            margin: 0 !important;
            padding: 12mm 14mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            background: white !important;
            border: none !important;
          }

          /* Filler stays flexible in print too, so short pages keep their
             footer anchored to the bottom instead of leaving a raw gap. */
          .page-filler {
            flex: 1 1 auto !important;
          }

          /* avoid leaving a trailing blank page */
          .a4-page-box:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          /* Keep critical blocks intact */
          .avoid-break, .no-break, table, thead, tbody, tr, h1, h2, h3, p, .header, .footer {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Make tables compact and avoid mid-row breaks when possible */
          table { border-collapse: collapse !important; width: 100% !important; }
          table th, table td { padding: 4px 6px !important; font-size: 9.5pt !important; }

          /* Signature block pinned to bottom via flex layout -- ensure it doesn't float */
          .signature-block { margin-top: 8px !important; margin-bottom: 0 !important; }
        }
      `}</style>

      {/* Workspace Header Bar */}
      <div className="print:hidden bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[10px] font-mono font-bold text-slate-400 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 mb-1 transition cursor-pointer"
          >
            <ArrowLeft size={13} className="text-red-700" />
            <span>Central Operations Command</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Quotation &amp; Proposal Desk
          </h1>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle size={14} className="text-amber-300" />
            <span>New Blank Quote</span>
          </button>

          <div className="bg-[#FBFBF9] p-1 rounded-2xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('BUILDER')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'BUILDER' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 size={13} />
              <span>Scope Builder</span>
            </button>
            <button
              onClick={() => {
                if (!selectedProposal && !clientName) {
                  showToast('Choose or create a proposal to preview.', 'info');
                  return;
                }
                setViewMode('PREVIEW');
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'PREVIEW' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye size={13} />
              <span>A4 Print Docket</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. BUILDER WORKSPACE                                      */}
      {/* ========================================================= */}
      {viewMode === 'BUILDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {clientName ? `Quotation: ${clientName}` : 'Custom Client Quotation Engine'}
                </h3>
                <p className="text-xs text-slate-400">Choose required security and facility roles</p>
              </div>

              {/* Billing Model Selector */}
              <div className="bg-[#FBFBF9] p-1 rounded-xl border border-slate-200 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBillingModel('COMPLIANCE')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                    billingModel === 'COMPLIANCE' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Statutory PSARA
                </button>
                <button
                  type="button"
                  onClick={() => setBillingModel('FLAT')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                    billingModel === 'FLAT' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Flat Rate
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-5">
              {/* Linked Visit Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Select Logged Site Inspection
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
                  <select
                    value={selectedVisitId}
                    onChange={(e) => handleVisitSelect(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 transition cursor-pointer"
                  >
                    <option value="">-- Choose a visit or type new client info below --</option>
                    {visits.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName || v.company_name} ({v.contactPerson || v.contact_person || 'No Contact'}) -{' '}
                        {new Date(v.timestamp || v.created_at).toLocaleDateString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Client Establishment Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    required
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setSelectedProposal(null);
                    }}
                    placeholder="e.g. RADISSON BLU HOTEL"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase outline-none focus:border-red-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Contact Person Met
                  </label>
                  <input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="General Manager / Director"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Contact Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Premises Address
                  </label>
                  <input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Vijay Nagar, Indore, Madhya Pradesh"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700"
                  />
                </div>
              </div>

              {/* STATUTORY WAGE PRICING ENGINE TOGGLE */}
              {billingModel === 'COMPLIANCE' && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        Statutory Wage Pricing Engine
                      </span>
                      <p className="text-xs font-black text-slate-900 uppercase">
                        {wageMode === 'PORTAL_MIN_WAGE'
                          ? 'Active: Portal Master Minimum Wages (M.P. Labour Dept)'
                          : 'Active: Custom Negotiated Basic Rates'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setWageMode('PORTAL_MIN_WAGE');
                          setSelectedProposal(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                          wageMode === 'PORTAL_MIN_WAGE' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Portal Minimum Wages
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWageMode('CUSTOM');
                          setSelectedProposal(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                          wageMode === 'CUSTOM' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Enter Custom Basic
                      </button>
                    </div>
                  </div>

                  {wageMode === 'CUSTOM' && (
                    <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                          Custom Basic Wage Overrides (₹ / 26 Days)
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">Recalculated dynamically</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">Guard Basic (12-Hr)</label>
                          <input
                            type="number"
                            value={customBasicRates.GUARD.basic12}
                            onChange={(e) => {
                              setCustomBasicRates(p => ({ ...p, GUARD: { ...p.GUARD, basic12: Number(e.target.value) } }));
                              setSelectedProposal(null);
                            }}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">Guard Basic (8-Hr)</label>
                          <input
                            type="number"
                            value={customBasicRates.GUARD.basic8}
                            onChange={(e) => {
                              setCustomBasicRates(p => ({ ...p, GUARD: { ...p.GUARD, basic8: Number(e.target.value) } }));
                              setSelectedProposal(null);
                            }}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">Supervisor (12-Hr)</label>
                          <input
                            type="number"
                            value={customBasicRates.SUPERVISOR.basic12}
                            onChange={(e) => {
                              setCustomBasicRates(p => ({ ...p, SUPERVISOR: { ...p.SUPERVISOR, basic12: Number(e.target.value) } }));
                              setSelectedProposal(null);
                            }}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block mb-1">Gunman (12-Hr)</label>
                          <input
                            type="number"
                            value={customBasicRates.GUNMAN.basic12}
                            onChange={(e) => {
                              setCustomBasicRates(p => ({ ...p, GUNMAN: { ...p.GUNMAN, basic12: Number(e.target.value) } }));
                              setSelectedProposal(null);
                            }}
                            className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-white outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DYNAMIC SERVICE SELECTION MATRIX */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900">
                    Select Services To Quote (Only Checked Services Appear On Proposal)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Check the role, set the quantity, and choose shift duration (12-Hour vs 8-Hour)
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(DEFAULT_SERVICE_OPTIONS) as ServiceRoleType[]).map((role) => {
                    const isChecked = enabledServices[role];
                    const cfg = serviceConfigs[role];
                    const stat = calculateStatutoryRole(role, cfg.shift);

                    let flatBase = cfg.shift === '12_HOURS' ? DEFAULT_SERVICE_OPTIONS[role].defaultFlat12 : DEFAULT_SERVICE_OPTIONS[role].defaultFlat8;
                    if (role === 'GUARD') flatBase = cfg.shift === '12_HOURS' ? (settings?.flatGuard12 ?? flatBase) : (settings?.flatGuard8 ?? flatBase);
                    if (role === 'SUPERVISOR') flatBase = cfg.shift === '12_HOURS' ? (settings?.flatSupervisor12 ?? flatBase) : (settings?.flatSupervisor8 ?? flatBase);
                    if (role === 'GUNMAN') flatBase = cfg.shift === '12_HOURS' ? (settings?.flatGunman12 ?? flatBase) : (settings?.flatGunman8 ?? flatBase);
                    if (role === 'HOUSEKEEPING') flatBase = confFallback(role, cfg.shift, flatBase);

                    function confFallback(r: ServiceRoleType, s: string, defVal: number) {
                      if (r === 'HOUSEKEEPING') return s === '12_HOURS' ? (settings?.flatHousekeeping12 ?? defVal) : (settings?.flatHousekeeping8 ?? defVal);
                      return defVal;
                    }

                    const perHead = billingModel === 'COMPLIANCE' ? stat.grandTotal : flatBase;

                    return (
                      <div
                        key={role}
                        className={`p-4 rounded-2xl border transition-all ${
                          isChecked ? 'bg-white border-red-700 shadow-xs ring-1 ring-red-700' : 'bg-[#FBFBF9] border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEnabledServices(p => ({ ...p, [role]: !p[role] }));
                                setSelectedProposal(null);
                              }}
                              className="text-red-700 cursor-pointer"
                            >
                              {isChecked ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-400" />}
                            </button>
                            <div>
                              <span className="text-xs font-black uppercase text-slate-900 block">
                                {DEFAULT_SERVICE_OPTIONS[role].label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {cfg.shift === '12_HOURS' ? '12 Hours (Day/Night)' : '8 Hours (3-Shift Rotation)'} &bull; ₹{perHead.toLocaleString('en-IN')}/head
                              </span>
                            </div>
                          </div>

                          {isChecked && (
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="flex items-center space-x-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Shift:</label>
                                <select
                                  value={cfg.shift}
                                  onChange={(e) => {
                                    const newShift = e.target.value as '12_HOURS' | '8_HOURS';
                                    setServiceConfigs(p => ({
                                      ...p,
                                      [role]: { ...p[role], shift: newShift }
                                    }));
                                    setSelectedProposal(null);
                                  }}
                                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="12_HOURS">12-Hour</option>
                                  <option value="8_HOURS">8-Hour</option>
                                </select>
                              </div>

                              <div className="flex items-center space-x-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Posts:</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={cfg.count}
                                  onChange={(e) => {
                                    const count = Math.max(1, parseInt(e.target.value) || 1);
                                    setServiceConfigs(p => ({
                                      ...p,
                                      [role]: { ...p[role], count }
                                    }));
                                    setSelectedProposal(null);
                                  }}
                                  className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-700"
                                />
                              </div>

                              <span className="text-xs font-mono font-black text-slate-900 w-24 text-right">
                                ₹{(perHead * cfg.count).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Calculation Box */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-900 block">
                    Calculated Monthly Consideration ({activeChosenServices.length} Roles Assigned)
                  </span>
                  <span className="text-2xl font-mono font-black text-slate-950 block">
                    ₹{totalMonthlyBilling.toLocaleString('en-IN')}.00
                  </span>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide block mt-0.5">
                    * GST extra on monthly billing
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="animate-spin text-amber-300" size={16} /> : <FileCheck2 size={16} className="text-amber-300" />}
                  <span>Save Proposal &amp; Open A4 Preview</span>
                </button>
              </div>
            </form>
          </div>

          {/* ALL SAVED PROPOSALS SIDEBAR */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                All Saved Proposals ({proposals.length})
              </h3>
              <span className="text-[9.5px] font-mono text-slate-400 font-bold">REGISTRY</span>
            </div>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {proposals.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No saved quotations found yet.</p>
              ) : (
                proposals.map((p: any) => {
                  const name = p.client_name || p.clientName || 'Establishment';
                  const total = p.total_amount || 0;
                  const status = p.status || 'PENDING_APPROVAL';
                  const isSelected = selectedProposal?.id === p.id;
                  const countSummary = p.service_items
                    ? p.service_items.map((s: any) => `${s.count} ${s.label}`).join(', ')
                    : `${p.guard_count || 1} Guards`;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProposal(p);
                        setActivePageTab('ALL');
                        setViewMode('PREVIEW');
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-red-700 bg-red-50/40 shadow-xs ring-1 ring-red-700'
                          : 'border-slate-200 bg-[#FBFBF9] hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-xs text-slate-900 uppercase truncate">{name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase shrink-0 ${
                            status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {status === 'APPROVED' ? 'RELEASED' : 'PENDING'}
                        </span>
                      </div>

                      <p className="text-[9.5px] text-slate-500 font-mono mt-1 truncate">
                        {countSummary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                        <span className="font-bold text-slate-900">₹{Number(total).toLocaleString('en-IN')}/mo</span>
                        <span className="text-red-700 font-bold hover:underline">View Docket &rarr;</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PRINTABLE A4 PREVIEW (PAGE BY PAGE & FULL BUNDLE)      */}
      {/* ========================================================= */}
      {viewMode === 'PREVIEW' && (
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Top Control Bar with Page Switchers & Print Triggers */}
          <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-4">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500">Ref:</span>
                <span className="text-xs font-mono font-black text-slate-900">{selectedProposal?.id || 'NEW'}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isApproved ? 'Approved & Certified' : 'Draft / Awaiting Clearance'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('BUILDER')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>Edit Scope</span>
                </button>

                {isAdmin && !isApproved && selectedProposal && (
                  <button
                    type="button"
                    onClick={handleApproveProposal}
                    disabled={approving}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {approving ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
                    <span>Authorize</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Page Navigation & Individual Page Print Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Web View Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#FBFBF9] p-1 rounded-xl border border-slate-200 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 uppercase">View Mode:</span>
                <button
                  type="button"
                  onClick={() => setActivePageTab('ALL')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    activePageTab === 'ALL' ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={12} />
                  <span>All 5 Pages</span>
                </button>
                {([1, 2, 3, 4, 5] as const).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setActivePageTab(pNum)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      activePageTab === pNum ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Page {pNum}
                  </button>
                ))}
              </div>

              {/* Direct Print Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('RATE')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={13} className="text-amber-300" />
                  <span>Print Rate Sheet Only</span>
                </button>
                {activePageTab !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handlePrint(activePageTab)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={13} className="text-amber-300" />
                    <span>Print Page {activePageTab} Only</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrint('ALL')}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} className="text-amber-300" />
                  <span>Print Full 5-Page PDF</span>
                </button>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* THE 5-PAGE PRINT DOSSIER                                                  */}
          {/* ========================================================================= */}
          <div className="print-container space-y-8 print:space-y-0 flex flex-col items-center">

            {/* PAGE 1: INTRODUCTION LETTER */}
            {(activePageTab === 'ALL' || activePageTab === 1) && (
              <div className="a4-page-box bg-white w-[210mm] min-h-[277mm] max-h-[277mm] p-[12mm_14mm] rounded-2xl border border-slate-200 shadow-xl flex flex-col text-slate-900 font-sans box-border overflow-hidden">
                <div className="space-y-4">
                  <PrintHeader />

                  {/* Client & Date Block */}
                  <div className="bg-[#F8F9FA] p-3 rounded-xl border border-slate-200 flex justify-between items-start text-xs">
                    <div>
                      <p className="text-[8.5px] font-mono font-bold text-slate-400 uppercase">To Establishment:</p>
                      <p className="text-xs font-black text-slate-950 uppercase">{selectedProposal?.client_name || clientName || 'ESTEEMED CLIENT'}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Address: {selectedProposal?.client_address || clientAddress || 'Commercial Complex, Indore (M.P.)'}</p>
                    </div>
                    <div className="text-right font-mono text-[9px]">
                      <p className="text-slate-400 uppercase font-bold">Proposal Date:</p>
                      <p className="font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs leading-relaxed">
                    <p className="font-medium text-slate-800 text-justify">
                      <strong>Objective:</strong> Vidhya Security Force and Housekeeping Services is committed to providing <strong className="uppercase">{selectedProposal?.client_name || clientName || 'Your Establishment'}</strong> with exceptional security and housekeeping solutions[cite: 1]. We aim to create a safe, clean, and secure work environment for your employees and operations[cite: 1].
                    </p>

                    <div className="space-y-2 pt-1">
                      <h3 className="text-xs font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
                        Licensed &amp; Experienced Leadership
                      </h3>
                      <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-5 leading-normal">
                        <li>Licensed throughout Madhya Pradesh under <strong>PSARA (copy enclosed)</strong>[cite: 1].</li>
                        <li>Hardworking, responsible security guards and verified housekeeping staff[cite: 1].</li>
                        <li>Thorough background verification and police records clearance check[cite: 1].</li>
                        <li>Competitive salaries and statutory benefits (including <strong>EPF &amp; ESIC</strong>)[cite: 1].</li>
                        <li>10+ years of security industry leadership under Director Anil Dhariwal[cite: 1].</li>
                      </ul>
                    </div>

                    <div className="space-y-2 pt-1">
                      <h3 className="text-xs font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
                        Key Partnership Benefits
                      </h3>
                      <ul className="text-[11px] text-slate-700 space-y-1.5 list-disc pl-5 leading-normal">
                        <li><strong>Enhanced Security:</strong> Vigilant guards protect your property, inventory, and personnel[cite: 1].</li>
                        <li><strong>Superior Cleanliness:</strong> Skilled housekeeping maintains a clean, hygienic environment[cite: 1].</li>
                        <li><strong>Unwavering Professionalism:</strong> Consistent, high-quality services with 24/7 central patrol supervision[cite: 1].</li>
                      </ul>
                    </div>

                    <p className="text-[11px] text-slate-700 pt-2 text-justify">
                      We are confident our services will exceed the expectations of <span className="uppercase font-bold">{selectedProposal?.client_name || clientName}</span>[cite: 1]. Let us discuss your operational requirements and provide a customized deployment[cite: 1].
                    </p>
                  </div>
                </div>

                <PageFiller />

                {/* Footer Page 1 */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[8.5px] font-mono text-slate-500">
                    <p>Protection &bull; Security &bull; Facility Management[cite: 1]</p>
                    <p className="font-bold text-red-700">संरक्षण एवं सुरक्षा[cite: 1]</p>
                    <p className="text-[7.5px] text-slate-400 mt-1">Page 1 of 5 &bull; Operational Presentation</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="w-20 h-10 border border-dashed border-slate-300 rounded mx-auto flex items-center justify-center p-0.5">
                      {settings?.sealImage ? <img src={settings.sealImage} alt="Seal" className="max-h-full max-w-full" /> : <span className="text-[7px] font-mono text-slate-400">[ SEAL / STAMP ]</span>}
                    </div>
                    <p className="text-[10px] font-black uppercase">{settings?.directorName || 'Anil Dhariwal'}</p>
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Managing Director[cite: 1]</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: OFFICIAL RATE SHEET (WAGE STRUCTURE) */}
            {(activePageTab === 'ALL' || activePageTab === 2) && (
              <div className="a4-page-box bg-white w-[210mm] min-h-[277mm] max-h-[277mm] p-[12mm_14mm] rounded-2xl border border-slate-200 shadow-xl flex flex-col text-slate-900 font-sans box-border overflow-hidden">
                <div className="space-y-3">
                  <PrintHeader />

                  {/* Client Reference Box */}
                  <div className="bg-[#F8F9FA] p-2 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[8px] font-mono font-bold text-slate-400 uppercase">Quotation Prepared For:</p>
                      <p className="text-[11px] font-black text-slate-950 uppercase">{selectedProposal?.client_name || clientName || 'ESTEEMED CLIENT'}</p>
                      <p className="text-[9px] text-slate-600 truncate max-w-sm">{selectedProposal?.client_address || clientAddress || 'Commercial Complex, Indore (M.P.)'}</p>
                    </div>
                    <div className="text-right font-mono text-[8.5px]">
                      <p className="text-slate-400 uppercase font-bold">Docket Ref:</p>
                      <p className="font-black text-slate-900">{selectedProposal?.id || 'PROP-HQ-DIRECT'}</p>
                    </div>
                  </div>

                  {/* --- A. STATUTORY PSARA COMPLIANCE TABLE --- */}
                  {effectiveBillingModel === 'COMPLIANCE' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-950 font-black uppercase border-b border-slate-300 text-[8.5px]">
                            <th className="p-1 border-r border-slate-300 text-center w-7">Sr</th>
                            <th className="p-1 border-r border-slate-300">Description of Wage Structure (M.P. PSARA)[cite: 1]</th>
                            <th className="p-1 border-r border-slate-300 text-center w-14">In %</th>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <th key={idx} className="p-1 border-r border-slate-300 text-right">
                                {s.label} ({s.shift === '12_HOURS' ? '12 Hrs' : '08 Hrs'})
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800 text-[9px]">
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center font-bold">1</td>
                            <td className="p-1 border-r border-slate-300 font-sans font-bold">Basic Minimum Wages (26 Days)[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center font-bold">BASIC</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{s.statutory.base.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">2</td>
                            <td className="p-1 border-r border-slate-300 font-sans">Additional 4 Hours Overtime Allowance[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">35%</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{s.statutory.additional12Hrs.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">3</td>
                            <td className="p-1 border-r border-slate-300 font-sans">Reliever Charges (Weekly Day-Off)[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">16.67%</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{s.statutory.reliever.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td className="p-1 border-r border-slate-300 text-center">4</td>
                            <td className="p-1 border-r border-slate-300 font-sans">Gross Guard Earnings (Subtotal A)[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">-</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right font-bold text-slate-900">
                                ₹{s.statutory.gross.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">5</td>
                            <td className="p-1 border-r border-slate-300 font-sans">Provident Fund (EPF Employer)[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">13%</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{s.statutory.epf.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">6</td>
                            <td className="p-1 border-r border-slate-300 font-sans">ESIC Medical Insurance[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">3.25%</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{s.statutory.esic.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">7</td>
                            <td className="p-1 border-r border-slate-300 font-sans">Uniform Kit, LWF &amp; Festival Leaves[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center">STAT</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right">
                                ₹{(s.statutory.paidHoliday + s.statutory.uniform + s.statutory.lwf).toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="p-1 border-r border-slate-300 text-center">8</td>
                            <td className="p-1 border-r border-slate-300 font-sans font-bold">Agency Service Charge[cite: 1]</td>
                            <td className="p-1 border-r border-slate-300 text-center font-bold">{serviceChargePercent}%</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-slate-300 text-right font-bold">
                                ₹{s.statutory.agencyMargin.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-red-800 text-white font-black text-[9.5px]">
                            <td className="p-1 border-r border-red-900 text-center">9</td>
                            <td className="p-1 border-r border-red-900 font-sans uppercase">Cost To Company (Per Head / Month)[cite: 1]</td>
                            <td className="p-1 border-r border-red-900 text-center font-mono">[R][cite: 1]</td>
                            {activeChosenServices.map((s: any, idx: number) => (
                              <td key={idx} className="p-1 border-r border-red-900 text-right font-mono font-black">
                                ₹{s.statutory.grandTotal.toLocaleString('en-IN')}.00
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* --- B. COMMERCIAL FLAT RATE TABLE --- */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                        <thead>
                          <tr className="bg-red-800 text-white font-black uppercase text-[8.5px]">
                            <th className="p-2 border-r border-red-900">Requested Service Role</th>
                            <th className="p-2 border-r border-red-900 text-center">Shift Schedule</th>
                            <th className="p-2 border-r border-red-900 text-center">Assigned Posts</th>
                            <th className="p-2 border-r border-red-900 text-right">Monthly Rate / Head</th>
                            <th className="p-2 text-right">Monthly Consideration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-bold text-slate-800 text-xs">
                          {activeChosenServices.map((service: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-2 border-r border-slate-300 font-black text-slate-900">
                                {service.label}
                              </td>
                              <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px]">
                                {service.shift === '12_HOURS' ? '12 Hours (30/31 Days)' : '08 Hours (30/31 Days)'}
                              </td>
                              <td className="p-2 border-r border-slate-300 text-center font-mono">
                                {service.count} Posts
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono text-red-700 font-black">
                                ₹{service.perHeadRate.toLocaleString('en-IN')}.00
                              </td>
                              <td className="p-2 text-right font-mono text-slate-950 font-black">
                                ₹{service.lineTotal.toLocaleString('en-IN')}.00
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total Billing Strip */}
                  <div className="p-2 bg-red-50/70 border border-red-200 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-bold text-red-900 uppercase tracking-wider">
                        TOTAL ALLOCATED DEPLOYMENTS: {activeChosenServices.map((s: any) => `${s.count} ${s.label}`).join(', ')}[cite: 1]
                      </p>
                      <p className="text-[8px] font-black text-red-700 uppercase tracking-wider mt-0.5">
                        * AS PER GOVERNMENT REGULATIONS, GST WILL BE CHARGED EXTRA ON THE TOTAL MONTHLY BILLING.[cite: 1]
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-mono font-bold uppercase text-slate-500">Total Monthly Billing:[cite: 1]</p>
                      <p className="text-base font-mono font-black text-slate-950">₹{totalMonthlyBilling.toLocaleString('en-IN')}.00[cite: 1]</p>
                    </div>
                  </div>

                  {/* Primary Terms & Conditions */}
                  <div className="space-y-0.5 text-[8.5px] text-slate-700 leading-snug">
                    <h4 className="text-[9px] font-black uppercase text-slate-900 border-b border-slate-200 pb-0.5 mb-1">
                      Terms &amp; Conditions:[cite: 1]
                    </h4>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>The above rates are applicable for 30/31 days of duty per calendar month.[cite: 1]</li>
                      {effectiveBillingModel === 'COMPLIANCE' && (
                        <li>
                          Per day rates: {activeChosenServices.map((s: any) => `${s.label} (${s.shift === '12_HOURS' ? '12 Hrs' : '08 Hrs'}): ₹${Math.round(s.perHeadRate / 30)}`).join(', ')}.[cite: 1]
                        </li>
                      )}
                      <li>This quotation is valid for 30 days from the date of submission.[cite: 1]</li>
                      <li><strong className="text-red-700">GST will be charged extra on the total monthly billing as per prevailing statutory rates.</strong>[cite: 1]</li>
                      <li>Bills submitted must be processed within 7 days from the date of submission. Any disputes raised can be resolved mutually through discussion.[cite: 1]</li>
                      <li><em>Note: A 5% extra charge will be levied if there is a delay in passing the bill beyond the stipulated 7 days.</em>[cite: 1]</li>
                    </ol>
                  </div>
                </div>

                <PageFiller />

                {/* Footer Page 2 */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[8px] font-mono text-slate-500">
                    <p>PSA LICENSE: {settings?.psaraLicense || 'PSA/L/74/MP/2023/FEB/3/425'}[cite: 1]</p>
                    <p>GSTIN: {settings?.gstNumber || '23AQRPD06520221'}[cite: 1]</p>
                    <p className="text-[7.5px] text-slate-400 mt-0.5">Page 2 of 5 &bull; Commercial Wage Proposal</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="w-20 h-10 border border-dashed border-slate-300 rounded mx-auto flex items-center justify-center p-0.5">
                      {settings?.sealImage ? <img src={settings.sealImage} alt="Seal" className="max-h-full max-w-full" /> : <span className="text-[7px] font-mono text-slate-400">[ SEAL / STAMP ]</span>}
                    </div>
                    <p className="text-[9.5px] font-black uppercase">{settings?.directorName || 'Anil Dhariwal'}</p>
                    <p className="text-[7.5px] font-mono text-slate-500 uppercase">Managing Director[cite: 1]</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: BILLING, PAYMENT & GST */}
            {(activePageTab === 'ALL' || activePageTab === 3) && (
              <div className="a4-page-box bg-white w-[210mm] min-h-[277mm] max-h-[277mm] p-[12mm_14mm] rounded-2xl border border-slate-200 shadow-xl flex flex-col text-slate-900 font-sans box-border overflow-hidden">
                <div className="space-y-4">
                  <PrintHeader />

                  <div className="space-y-4 text-xs">
                    <h3 className="text-xs font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
                      2. Billing, Payment &amp; GST Compliance[cite: 1]
                    </h3>

                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 uppercase text-[11px]">Billing &amp; Payment:[cite: 1]</h4>
                      <p className="text-slate-700 leading-relaxed text-justify text-[11px]">
                        We shall submit our bills on the 1st of every month[cite: 1]. Payment must be made via crossed cheque / NEFT / RTGS in favor of <strong>'Vidhya Security Force &amp; Housekeeping Services.'</strong>[cite: 1]
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 uppercase text-[11px]">GST &amp; Reverse Charge Mechanism (RCM):[cite: 1]</h4>
                      <ul className="list-disc pl-5 text-slate-700 space-y-1 text-[11px]">
                        <li>If the client is registered under GST, the client must pay GST under <strong>Reverse Charge Mechanism (RCM)</strong> as per Section 9(3) of the CGST Act, 2017[cite: 1].</li>
                        <li>If the client is unregistered under GST, we shall levy GST at the applicable rate (18%), and the client must pay this GST amount to us along with the monthly service charges[cite: 1].</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 uppercase text-[11px]">Payment of Salary to Security Staff:[cite: 1]</h4>
                      <p className="text-slate-700 leading-relaxed text-justify text-[11px]">
                        Vidhya Security Force &amp; Housekeeping Services will pay salary to deployed personnel only upon receipt of payment from the client (collect-and-pay policy)[cite: 1]. Any delay in payment by the client will result in an equivalent delay in salary disbursement to deployed staff[cite: 1].
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 uppercase text-[11px]">Employment Restrictions:[cite: 1]</h4>
                      <p className="text-slate-700 leading-relaxed text-justify text-[11px]">
                        The client cannot directly or indirectly employ any of our deployed security personnel without the prior consent and written confirmation of our authorized signatory[cite: 1]. If the client wishes to hire our personnel, they must pay the applicable Agency Placement Charges as per company rules[cite: 1].
                      </p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <h4 className="font-black text-slate-900 uppercase text-[11px]">3. Mandatory Wages Revision:[cite: 1]</h4>
                      <p className="text-slate-700 leading-relaxed text-justify text-[11px]">
                        In case in future any wage revision takes place under Contract Labour (R&amp;A) Act, 1970 or Minimum Wages Act or any other labour legislation directly affecting employee cost, the principal employer reimburses the same together with statutory arrears and amends the agreement terms corresponding to such increase[cite: 1].
                      </p>
                    </div>
                  </div>
                </div>

                <PageFiller />

                {/* Footer Page 3 */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[8.5px] font-mono text-slate-500">
                    <p>Page 3 of 5 &bull; Operational Contract Terms[cite: 1]</p>
                    <p className="text-slate-400">Statutory Compliance Under MP Labour Regulations</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="w-20 h-10 border border-dashed border-slate-300 rounded mx-auto flex items-center justify-center p-0.5">
                      {settings?.sealImage ? <img src={settings.sealImage} alt="Seal" className="max-h-full max-w-full" /> : <span className="text-[7px] font-mono text-slate-400">[ SEAL / STAMP ]</span>}
                    </div>
                    <p className="text-[10px] font-black uppercase">{settings?.directorName || 'Anil Dhariwal'}</p>
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Authorised Signatory[cite: 1]</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4: MISSION STATEMENT & SERVICE COMMITMENT */}
            {(activePageTab === 'ALL' || activePageTab === 4) && (
              <div className="a4-page-box bg-white w-[210mm] min-h-[277mm] max-h-[277mm] p-[12mm_14mm] rounded-2xl border border-slate-200 shadow-xl flex flex-col text-slate-900 font-sans box-border overflow-hidden">
                <div className="space-y-4">
                  <PrintHeader />

                  <div className="space-y-4 text-xs">
                    <p className="text-slate-800 leading-relaxed text-justify text-[11px]">
                      Vidhya Security Force &amp; Housekeeping Services is a premier facility management company providing the highest quality of Guarding Operations, Housekeeping Maintenance, Healthcare Support, and Electronic Perimeter Supervision[cite: 1].
                    </p>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-center my-3">
                      <h4 className="text-xs font-black uppercase text-red-800 tracking-widest">
                        MISSION STATEMENT[cite: 1]
                      </h4>
                      <p className="font-bold text-slate-900 tracking-wide text-xs leading-normal">
                        "TO SATISFY AND SURPASS OUR CLIENTS' REQUIREMENTS WITH ELABORATED &amp; PERSONALISED SERVICES UNDER THE HIGHEST PROFESSIONAL STANDARDS."[cite: 1]
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-black uppercase text-slate-900 border-b border-slate-200 pb-1">
                        Executive Assurance[cite: 1]
                      </h4>
                      <p className="text-slate-700 leading-relaxed text-justify text-[11px]">
                        If the chance is given, we assure you that our agency will prove to be the finest source of defence against all security odds and adversities[cite: 1]. It will be our pleasure and pride to be associated with your esteemed organization for rendering efficient, prompt, dedicated, and sincere protection[cite: 1].
                      </p>
                      <p className="font-black text-red-800 uppercase tracking-wider pt-2 text-xs">
                        "YOUR SECURITY IS OUR SACRED RESPONSIBILITY"[cite: 1]
                      </p>
                    </div>

                    <p className="text-slate-700 pt-2 text-[11px]">
                      Thank you for considering Vidhya Security Force &amp; Housekeeping Services[cite: 1]. We look forward to executing this contract with highest fidelity[cite: 1].
                    </p>
                  </div>
                </div>

                <PageFiller />

                {/* Footer Page 4 */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[8.5px] font-mono text-slate-500">
                    <p>Page 4 of 5 &bull; Service Commitment[cite: 1]</p>
                    <p className="text-slate-400">Quality Management &amp; Vigilance Protocol</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-[8.5px] font-bold text-slate-600 uppercase">FOR VIDHYA SECURITY FORCE &amp; HOUSEKEEPING SERVICES[cite: 1]</p>
                    <div className="w-20 h-10 border border-dashed border-slate-300 rounded mx-auto flex items-center justify-center p-0.5 mt-0.5">
                      {settings?.sealImage ? <img src={settings.sealImage} alt="Seal" className="max-h-full max-w-full" /> : <span className="text-[7px] font-mono text-slate-400">[ SEAL / STAMP ]</span>}
                    </div>
                    <p className="text-[10px] font-black uppercase">{settings?.directorName || 'Anil Dhariwal'}</p>
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Authorised Signatory[cite: 1]</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 5: STATUTORY ACCREDITATIONS & REGISTRATIONS */}
            {(activePageTab === 'ALL' || activePageTab === 5) && (
              <div className="a4-page-box bg-white w-[210mm] min-h-[277mm] max-h-[277mm] p-[12mm_14mm] rounded-2xl border border-slate-200 shadow-xl flex flex-col text-slate-900 font-sans box-border overflow-hidden">
                <div className="space-y-4">
                  <PrintHeader />

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
                      Statutory Accreditations &amp; Licenses[cite: 1]
                    </h3>

                    <div className="divide-y divide-slate-200 text-xs">
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">1. Private Security Agency License No (PSARA)</span>
                        <span className="font-mono font-black text-slate-950">{settings?.psaraLicense || 'PSA/L/74/MP/2023/FEB/3/425'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">2. Labour Commissioner Registration No</span>
                        <span className="font-mono font-black text-slate-950">{settings?.labourRegNo || 'INDO220426SE009839'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">3. Employee Provident Fund (EPF Code)</span>
                        <span className="font-mono font-black text-slate-950">{settings?.epfCode || 'MPIND1462732000 / 18000232770'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">4. ESIC Corporation Registration</span>
                        <span className="font-mono font-black text-slate-950">{settings?.esicRegNo || '18000237700000999'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">5. GST Registration Number (GSTIN)</span>
                        <span className="font-mono font-black text-slate-950">{settings?.gstNumber || '23AQRPD06520221'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">6. Professional Tax (P.T.) License</span>
                        <span className="font-mono font-black text-slate-950">{settings?.ptLicenseNo || '79479022051'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">7. Income Tax PAN Card</span>
                        <span className="font-mono font-black text-slate-950">{settings?.panNumber || 'AQRPD0652Q'}</span>
                      </div>
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-700">8. Managing Director</span>
                        <span className="font-black text-slate-950 uppercase">{settings?.directorName || 'Anil Dhariwal'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <PageFiller />

                {/* Footer Page 5 */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-[8.5px] font-mono text-slate-500">
                    <p>Page 5 of 5 &bull; Certified Legal Document</p>
                    <p className="text-red-700 font-bold uppercase">Government of Madhya Pradesh Compliant</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <div className="w-20 h-10 border border-dashed border-slate-300 rounded mx-auto flex items-center justify-center p-0.5">
                      {settings?.sealImage ? <img src={settings.sealImage} alt="Seal" className="max-h-full max-w-full" /> : <span className="text-[7px] font-mono text-slate-400">[ SEAL / STAMP ]</span>}
                    </div>
                    <p className="text-[10px] font-black uppercase">{settings?.directorName || 'Anil Dhariwal'}</p>
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Managing Director[cite: 1]</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default CreateQuotation;
