import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  ArrowLeft,
  Search,
  FileCheck2,
  Eye,
  Edit3,
  CheckSquare,
  Square,
  PlusCircle,
  Loader2,
  MessageCircle,
  Layers,
  FileText,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Visit, ServiceRoleType } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../components/ToastContext';

type ShiftType = '12_HOURS' | '8_HOURS';
type PageNo = 1 | 2 | 3 | 4 | 5;

interface PresetOptionMeta {
  label: string;
  defaultFlat12: number;
  defaultFlat8: number;
  defaultBasic12: number;
  defaultBasic8: number;
}

interface CustomServiceItem {
  id: string;
  label: string;
  count: number;
  shift: ShiftType;
  customBasic: number;
  flatRate: number;
}

const PRESET_SERVICES: Record<ServiceRoleType, PresetOptionMeta> = {
  GUARD: { label: 'Security Guard', defaultFlat12: 15500, defaultFlat8: 12500, defaultBasic12: 13421, defaultBasic8: 12425 },
  SUPERVISOR: { label: 'Security Field Supervisor', defaultFlat12: 18500, defaultFlat8: 15500, defaultBasic12: 14869, defaultBasic8: 13800 },
  GUNMAN: { label: 'Armed Gunman (12 Bore / .32)', defaultFlat12: 23000, defaultFlat8: 19500, defaultBasic12: 16500, defaultBasic8: 15000 },
  HOUSEKEEPING: { label: 'Housekeeping & Sanitation', defaultFlat12: 14000, defaultFlat8: 11000, defaultBasic12: 12425, defaultBasic8: 11500 }
};

const COMPANY_DEFAULTS = {
  companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
  address: '012 A BLOCK TREASURE TOWN INDORE, MP',
  contactNo: '9826259020',
  email: 'contact@vidhyasecurityforce.in',
  directorName: 'Anil Dhariwal',
  logo: '/assets/img/logo/logo.png',
  psaraLicense: 'PSA/L/74/MP/2023/FEB/3/425',
  labourRegNo: 'INDO220426SE009839',
  epfCode: 'MPIND1462732000 / 18000232770',
  esicRegNo: '18000237700000999',
  gstNumber: '23AQRPD0652Q2ZI',
  ptLicenseNo: '79479022051',
  panNumber: 'AQRPD0652Q'
};

const TOTAL_PAGES = 5;
const ALL_PAGES: PageNo[] = [1, 2, 3, 4, 5];
const MAX_POSTS_PER_ROLE = 999;
const PRINT_ROOT_ID = 'vsf-print-root';
const PRINT_MODE_CLASS = 'vsf-print-mode';

const LOGO_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#fff" stroke="#991b1b" stroke-width="3"/><text x="28" y="33" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#991b1b" text-anchor="middle">VSF</text></svg>'
)}`;

const formatINR = (value: number): string =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-GB');
};

const formatPercent = (value: number): string => `${Number(value)}%`;
const shiftLabel = (shift: ShiftType): string => (shift === '12_HOURS' ? '12 Hrs' : '08 Hrs');

const normaliseIndianMobile = (raw: string): string => (raw || '').replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');
const isValidIndianMobile = (raw: string): boolean => /^[6-9]\d{9}$/.test(normaliseIndianMobile(raw));

// Embedded statutory calculations so no external billing file is needed
function calculateFieldWageBreakup(baseWage: number, shift: ShiftType, marginPercent: number = 8) {
  const base = Number(baseWage) || 0;
  const additional12Hrs = shift === '12_HOURS' ? Math.round(base * 0.35) : 0;
  const reliever = Math.round((base + additional12Hrs) * 0.1667);
  const gross = base + additional12Hrs + reliever;
  const epf = Math.round(base * 0.13);
  const esic = Math.round(gross * 0.0325);
  const paidHoliday = Math.round(base * 0.0384);
  const uniform = 250;
  const lwf = 10;
  const ctc = gross + epf + esic + paidHoliday + uniform + lwf;
  const agencyMargin = Math.round(ctc * (marginPercent / 100));
  const grandTotal = ctc + agencyMargin;

  return {
    base,
    additional12Hrs,
    reliever,
    relieverLabel: 'RELIEVER (16.67%)',
    gross,
    epf,
    esic,
    paidHoliday,
    uniform,
    lwf,
    ctc,
    agencyMargin,
    grandTotal
  };
}

const PRINT_CSS = `
  .vsf-sheet {
    width: 210mm;
    height: 297mm;
    padding: 12mm 15mm;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    color: #0f172a;
    flex-shrink: 0;
  }
  #${PRINT_ROOT_ID} { display: none; }
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html.${PRINT_MODE_CLASS},
    html.${PRINT_MODE_CLASS} body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      height: auto !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html.${PRINT_MODE_CLASS} body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
    html.${PRINT_MODE_CLASS} #${PRINT_ROOT_ID} {
      display: block !important;
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #${PRINT_ROOT_ID} .vsf-sheet {
      margin: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
      page-break-after: always;
      break-after: page;
    }
    #${PRINT_ROOT_ID} .vsf-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`;

export const CreateQuotation: React.FC = () => {
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'BUILDER' | 'PREVIEW'>('BUILDER');
  const [activePageTab, setActivePageTab] = useState<'ALL' | PageNo>('ALL');
  const [printPages, setPrintPages] = useState<PageNo[] | null>(null);
  const printRequestedRef = useRef(false);

  const [proposals, setProposals] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [builderErrors, setBuilderErrors] = useState<string[]>([]);

  const proposalSubject = 'Deployment of Security Guarding & Facility Management Operations';
  const paymentTermsDays = 7;
  const validityDays = 30;
  const serviceChargePercent = settings?.defaultServiceMargin ?? 8;

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  const [enabledPresets, setEnabledPresets] = useState<Record<ServiceRoleType, boolean>>({
    GUARD: true,
    SUPERVISOR: false,
    GUNMAN: false,
    HOUSEKEEPING: false
  });

  const [presetConfigs, setPresetConfigs] = useState<Record<ServiceRoleType, { count: number; shift: ShiftType }>>({
    GUARD: { count: 1, shift: '12_HOURS' },
    SUPERVISOR: { count: 0, shift: '12_HOURS' },
    GUNMAN: { count: 0, shift: '12_HOURS' },
    HOUSEKEEPING: { count: 0, shift: '8_HOURS' }
  });

  const [customRoles, setCustomRoles] = useState<CustomServiceItem[]>([]);

  const company = useMemo(() => ({
    companyName: settings?.companyName || COMPANY_DEFAULTS.companyName,
    address: settings?.address || COMPANY_DEFAULTS.address,
    contactNo: settings?.contactNo || COMPANY_DEFAULTS.contactNo,
    email: settings?.email || COMPANY_DEFAULTS.email,
    directorName: settings?.directorName || COMPANY_DEFAULTS.directorName,
    logo: settings?.logo || COMPANY_DEFAULTS.logo,
    psaraLicense: settings?.psaraLicense || COMPANY_DEFAULTS.psaraLicense,
    labourRegNo: settings?.labourRegNo || COMPANY_DEFAULTS.labourRegNo,
    epfCode: settings?.epfCode || COMPANY_DEFAULTS.epfCode,
    esicRegNo: settings?.esicRegNo || COMPANY_DEFAULTS.esicRegNo,
    gstNumber: (settings?.gstNumber || COMPANY_DEFAULTS.gstNumber).trim().toUpperCase(),
    ptLicenseNo: settings?.ptLicenseNo || COMPANY_DEFAULTS.ptLicenseNo,
    panNumber: (settings?.panNumber || COMPANY_DEFAULTS.panNumber).trim().toUpperCase()
  }), [settings]);

  const statutoryRates = {
    overtime: settings?.overtimePercent ?? 35,
    reliever: 16.67,
    epf: settings?.epfPercent ?? 13,
    esic: settings?.esicPercent ?? 3.25
  };

  useEffect(() => {
    const fetchProposalsData = async () => {
      try {
        const [proposalsRes, visitsRes] = await Promise.allSettled([
          api.request('/proposals'),
          api.request(`/visits?rep_id=${user?.id}`)
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
      }
    };

    fetchProposalsData();
  }, [user]);

  const handleVisitSelect = (visitId: string) => {
    setSelectedVisitId(visitId);
    setSelectedProposal(null);
    setBuilderErrors([]);

    const visit: any = visits.find((v: any) => v.id === visitId);
    if (!visit) return;

    setClientName(visit.companyName || visit.company_name || '');
    setContactPerson(visit.contactPerson || visit.contact_person || '');
    setClientPhone(normaliseIndianMobile(visit.phoneNumber || visit.phone_number || visit.phone || '').slice(0, 10));

    let resolvedAddress = (visit.address || '').trim();
    if (!resolvedAddress && visit.notes?.includes('Address:')) {
      const match = visit.notes.match(/Address:\s*([^|]+)/i);
      if (match && match[1]) resolvedAddress = match[1].trim();
    }
    setClientAddress(resolvedAddress || 'Indore, Madhya Pradesh');

    if (visit.manning_specs) {
      const specs = visit.manning_specs;
      setEnabledPresets({
        GUARD: Boolean(specs.guard?.enabled),
        SUPERVISOR: Boolean(specs.supervisor?.enabled),
        GUNMAN: Boolean(specs.gunman?.enabled),
        HOUSEKEEPING: Boolean(specs.housekeeping?.enabled)
      });

      setPresetConfigs(prev => ({
        ...prev,
        GUARD: specs.guard ? { ...prev.GUARD, count: specs.guard.count, shift: specs.guard.shift } : prev.GUARD,
        SUPERVISOR: specs.supervisor ? { ...prev.SUPERVISOR, count: specs.supervisor.count, shift: specs.supervisor.shift } : prev.SUPERVISOR,
        GUNMAN: specs.gunman ? { ...prev.GUNMAN, count: specs.gunman.count, shift: specs.gunman.shift } : prev.GUNMAN,
        HOUSEKEEPING: specs.housekeeping ? { ...prev.HOUSEKEEPING, count: specs.housekeeping.count, shift: specs.housekeeping.shift } : prev.HOUSEKEEPING
      }));

      if (Array.isArray(specs.custom) && specs.custom.length > 0) {
        setCustomRoles(specs.custom.map((c: any) => ({
          id: c.id || `CUSTOM-${Date.now()}`,
          label: c.name || 'Custom Role',
          count: c.count || 1,
          shift: c.shift || '8_HOURS',
          customBasic: 11500,
          flatRate: 12500
        })));
      }
      showToast('Loaded requirements from site visit.', 'info');
    }
    setViewMode('BUILDER');
  };

  const handleAddCustomRole = () => {
    setCustomRoles(prev => [
      ...prev,
      {
        id: `CUSTOM-${Date.now()}`,
        label: 'Peon / Office Attendant',
        count: 1,
        shift: '8_HOURS',
        customBasic: 11500,
        flatRate: 12000
      }
    ]);
  };

  const handleRemoveCustomRole = (id: string) => {
    setCustomRoles(prev => prev.filter(r => r.id !== id));
  };

  const activeChosenServices = useMemo(() => {
    if (viewMode === 'PREVIEW' && selectedProposal?.service_items) {
      return selectedProposal.service_items;
    }

    const lines: any[] = [];

    (Object.keys(PRESET_SERVICES) as ServiceRoleType[]).forEach((role) => {
      if (enabledPresets[role] && presetConfigs[role]?.count > 0) {
        const meta = PRESET_SERVICES[role];
        const cfg = presetConfigs[role];
        const basic = cfg.shift === '12_HOURS' ? meta.defaultBasic12 : meta.defaultBasic8;
        const statutory = calculateFieldWageBreakup(basic, cfg.shift, serviceChargePercent);
        const perHeadRate = statutory.grandTotal;

        lines.push({
          role,
          label: meta.label,
          count: cfg.count,
          shift: cfg.shift,
          perHeadRate,
          lineTotal: perHeadRate * cfg.count,
          statutory
        });
      }
    });

    customRoles.forEach((custom) => {
      if (custom.count > 0) {
        const statutory = calculateFieldWageBreakup(custom.customBasic, custom.shift, serviceChargePercent);
        const perHeadRate = statutory.grandTotal;

        lines.push({
          role: 'CUSTOM',
          label: custom.label,
          count: custom.count,
          shift: custom.shift,
          perHeadRate,
          lineTotal: perHeadRate * custom.count,
          statutory
        });
      }
    });

    return lines;
  }, [viewMode, selectedProposal, enabledPresets, presetConfigs, customRoles, serviceChargePercent]);

  const totalMonthlyBilling = useMemo(() => {
    if (viewMode === 'PREVIEW' && selectedProposal?.total_amount) {
      return Number(selectedProposal.total_amount);
    }
    return activeChosenServices.reduce((acc: number, item: any) => acc + (item.lineTotal || 0), 0);
  }, [viewMode, selectedProposal, activeChosenServices]);

  const docClientName = (selectedProposal?.client_name || clientName || '').trim();
  const docClientAddress = (selectedProposal?.client_address || clientAddress || '').trim();
  const docDate = formatDate(selectedProposal?.created_at);
  const docRef = selectedProposal?.id || 'UNSAVED DRAFT';
  const isApproved = selectedProposal?.status === 'APPROVED';

  const validateBuilder = (): string[] => {
    const errors: string[] = [];
    if (clientName.trim().length < 3) errors.push('Client establishment name is required.');
    if (clientAddress.trim().length < 5) errors.push('Premises address is required.');
    if (clientPhone && !isValidIndianMobile(clientPhone)) errors.push('Mobile must be 10 digits.');
    if (activeChosenServices.length === 0) errors.push('Select at least one position with headcount > 0.');
    return errors;
  };

  const handleResetForm = () => {
    setSelectedProposal(null);
    setSelectedVisitId('');
    setClientName('');
    setContactPerson('');
    setClientPhone('');
    setClientAddress('');
    setBuilderErrors([]);
    setEnabledPresets({ GUARD: true, SUPERVISOR: false, GUNMAN: false, HOUSEKEEPING: false });
    setCustomRoles([]);
    setActivePageTab('ALL');
    setViewMode('BUILDER');
  };

  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateBuilder();
    setBuilderErrors(errors);
    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }

    setSubmitting(true);
    const proposalId = `PROP-${Date.now().toString()}`;

    const newProposal = {
      id: proposalId,
      visit_id: selectedVisitId || null,
      client_name: clientName.trim().toUpperCase(),
      client_address: clientAddress.trim(),
      client_phone: normaliseIndianMobile(clientPhone),
      contact_person: contactPerson.trim(),
      proposal_subject: proposalSubject.trim(),
      payment_terms_days: paymentTermsDays,
      validity_days: validityDays,
      billing_model: 'COMPLIANCE',
      service_charge_percent: serviceChargePercent,
      service_items: activeChosenServices,
      total_amount: totalMonthlyBilling,
      requested_by_id: user?.id || 'HQ-OFFICER',
      requested_by_name: user?.name || 'Field Representative',
      created_at: new Date().toISOString(),
      status: 'PENDING_APPROVAL'
    };

    try {
      await api.request('/proposals', {
        method: 'POST',
        body: JSON.stringify(newProposal)
      });
    } catch (err) {
      console.warn('Database sync notice:', err);
    }

    const local = JSON.parse(localStorage.getItem('vsf_saved_proposals') || '[]');
    const updated = [newProposal, ...local];
    localStorage.setItem('vsf_saved_proposals', JSON.stringify(updated));

    setProposals(updated);
    setSelectedProposal(newProposal);
    setActivePageTab('ALL');
    setViewMode('PREVIEW');
    setSubmitting(false);

    showToast('Proposal submitted to Central HQ for review.', 'info');
  };

  const handleShareWhatsApp = () => {
    if (!selectedProposal) return;
    const phone = normaliseIndianMobile(selectedProposal.client_phone || clientPhone || '');
    if (!isValidIndianMobile(phone)) {
      showToast('Client mobile is missing or invalid.', 'error');
      return;
    }
    const formattedPhone = `91${phone}`;
    const client = selectedProposal.client_name || clientName || 'Valued Client';

    const serviceSummary = activeChosenServices
      .map((s: any) => `• ${s.count}x ${s.label} (${shiftLabel(s.shift)}) @ ${formatINR(s.perHeadRate)}/mo`)
      .join('\n');

    const text =
      `*OFFICIAL SCHEDULE OF RATES & SERVICE PROPOSAL*\n` +
      `*${company.companyName}*\n\n` +
      `To: The Management, *${client}*\n` +
      `Proposal Reference: ${docRef} | Date: ${docDate}\n\n` +
      `Subject: ${proposalSubject}\n\n` +
      `Allocated Guarding Deployments:\n${serviceSummary}\n\n` +
      `Total Monthly Consideration: ${formatINR(totalMonthlyBilling)}/- (Statutory GST Extra)\n\n` +
      `Submitted by: ${user?.name || 'Field Officer'}\n` +
      `Central Head Office: Indore (M.P.) | PSARA Licensed`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const visiblePages: PageNo[] = activePageTab === 'ALL' ? ALL_PAGES : [activePageTab];
  const pagesInPrintRoot: PageNo[] = printPages ?? visiblePages;

  const handlePrint = (pageTarget: 'ALL' | 'RATE' | PageNo) => {
    const pages: PageNo[] = pageTarget === 'ALL' ? ALL_PAGES : [pageTarget === 'RATE' ? 2 : pageTarget];
    printRequestedRef.current = true;
    setPrintPages(pages);
  };

  useEffect(() => {
    if (viewMode !== 'PREVIEW') return;
    document.documentElement.classList.add(PRINT_MODE_CLASS);
    return () => document.documentElement.classList.remove(PRINT_MODE_CLASS);
  }, [viewMode]);

  useEffect(() => {
    if (!printPages || !printRequestedRef.current) return;
    printRequestedRef.current = false;

    let cancelled = false;
    const originalTitle = document.title;

    const restore = () => {
      document.title = originalTitle;
      setPrintPages(null);
    };

    const run = async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (cancelled) return;
      window.addEventListener('afterprint', restore, { once: true });
      document.title = `VSF_Proposal_${docClientName || 'Client'}_${docRef}`;
      window.print();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [printPages, docClientName, docRef]);

  const renderHeader = () => (
    <div className="w-full border-b-2 border-red-800 pb-3 mb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <img
          src={company.logo}
          alt="VSF Logo"
          className="w-16 h-16 object-contain"
          onError={(e: any) => {
            const img = e.currentTarget;
            if (img.dataset.fallback === '1') return;
            img.dataset.fallback = '1';
            img.src = LOGO_FALLBACK;
          }}
        />
        <div className="text-left leading-tight">
          <span className="text-[10px] font-mono font-black text-red-700 tracking-wider block">
            PROTECTION &bull; SECURITY
          </span>
          <span className="text-[12px] font-black text-slate-900 tracking-wide block">
            संरक्षण एवं सुरक्षा
          </span>
          <span className="text-[9px] font-mono text-slate-500 font-bold block mt-0.5">
            24/7 HELPLINE: +91 9826259292
          </span>
        </div>
      </div>

      <div className="text-center flex-1 px-2">
        <h1 className="text-[15px] font-black uppercase tracking-tight text-slate-950 leading-tight">
          {company.companyName}
        </h1>
        <p className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wide mt-1">
          HEAD OFFICE: {company.address}
        </p>
        <p className="text-[9px] font-mono font-semibold text-slate-600">
          Phone: {company.contactNo}, 9229678188 &bull; Email: {company.email}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-1">
        <span className="inline-block text-[9px] font-mono font-black bg-red-50 border border-red-200 text-red-800 px-3 py-1 rounded uppercase">
          PSARA MP LICENSED
        </span>
        <span className="text-[9.5px] font-mono text-slate-700 font-bold block">
          Date: {docDate}
        </span>
      </div>
    </div>
  );

  const renderSignature = (title: string, showFirmLine = false) => (
    <div className="text-center space-y-1">
      {showFirmLine && (
        <p className="text-[10px] font-bold text-slate-700 uppercase">For {company.companyName}</p>
      )}
      <div className="w-36 h-20 rounded mx-auto flex items-center justify-center p-1 border-2 border-dashed border-red-300 bg-red-50/20">
        <span className="text-[8.5px] font-mono font-bold text-red-700 text-center leading-tight">
          {isApproved ? '[ OFFICIAL STAMP ]' : '[ PENDING HQ AUTHORIZATION ]'}
        </span>
      </div>
      <p className="text-[13px] font-black uppercase text-slate-950 tracking-wide">{company.directorName}</p>
      <p className="text-[10.5px] font-mono font-bold text-slate-600 uppercase">{title}</p>
    </div>
  );

  const renderFooter = (pageNo: PageNo, left: React.ReactNode, signatureTitle: string, showFirmLine = false) => (
    <div className="pt-3 border-t border-slate-200 flex justify-between items-end gap-4 mt-auto">
      <div className="text-[9.5px] font-mono text-slate-600 space-y-1">
        {left}
        <p className="text-[8.5px] text-slate-400 pt-0.5">
          Page {pageNo} of {TOTAL_PAGES} &bull; Proposal Docket Ref: {docRef}
        </p>
      </div>
      {renderSignature(signatureTitle, showFirmLine)}
    </div>
  );

  const renderClientBlock = (label: string, rightLabel: string, rightValue: string) => (
    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 flex justify-between items-start gap-4">
      <div className="min-w-0">
        <p className="text-[9.5px] font-mono font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-base font-black text-slate-950 uppercase mt-0.5">{docClientName || 'VALUED CLIENT'}</p>
        <p className="text-[12px] text-slate-700 mt-1 font-medium leading-tight">Premises: {docClientAddress || 'Indore, Madhya Pradesh'}</p>
      </div>
      <div className="text-right font-mono text-[10px] shrink-0">
        <p className="text-slate-500 uppercase font-bold">{rightLabel}</p>
        <p className="text-xs font-black text-slate-950 mt-0.5">{rightValue}</p>
      </div>
    </div>
  );

  const sheetClass = (mode: 'screen' | 'print') =>
    `vsf-sheet font-sans ${mode === 'screen' ? 'rounded-2xl border border-slate-200 shadow-xl' : ''}`;

  const renderPage1 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-4">
        {renderHeader()}
        {renderClientBlock('Quotation Submitted To:', 'Proposal Date:', docDate)}

        <div className="p-2.5 bg-red-50/70 border border-red-200 rounded-lg text-slate-900 text-[11.5px] font-bold">
          <span className="text-red-800 uppercase font-black mr-1">Subject:</span>
          {proposalSubject}
        </div>

        <div className="space-y-3.5 text-[12.5px] leading-relaxed text-slate-800 pt-1">
          <p className="text-justify font-medium">
            <strong>Dear Sir / Madam,</strong><br />
            With reference to our commercial discussion regarding the deployment of specialized guarding and sanitation staff at your establishment, Vidhya Security Force &amp; Housekeeping Services is pleased to present our certified schedule of rates for your favorable review.
          </p>

          <div className="space-y-1.5">
            <h3 className="text-[13px] font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
              Statutory Credentials &amp; Standards
            </h3>
            <ul className="text-[12px] text-slate-700 space-y-1.5 list-disc pl-5 leading-normal">
              <li>Statutorily licensed across Madhya Pradesh under the <strong>Private Security Agencies Regulation Act (PSARA)</strong>.</li>
              <li>Disciplined, uniform-attired, and background-verified security guards and facility crews.</li>
              <li>Full statutory remittance including <strong>EPF, ESIC, Labour Welfare Fund (LWF) &amp; Weekly Rest Offs</strong>.</li>
              <li>Dedicated round-the-clock patrol inspection squad equipped for rapid emergency response across Indore &amp; MP.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[13px] font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
              Operational Scope Summary
            </h3>
            <p className="text-[12px] text-slate-700 text-justify">
              Our guards undergo biometric duty punch-ins, physical drill tests, fire safety training, and incident escalation protocols. We assume end-to-end supervisory responsibility for security rosters and shift handovers.
            </p>
          </div>

          <p className="text-[12px] text-slate-800 pt-1 text-justify font-medium">
            We trust our schedule of rates will meet your administrative standards and look forward to partnering with your prestigious establishment.
          </p>
        </div>
      </div>

      {renderFooter(
        1,
        <>
          <p className="font-bold text-slate-900">Protection &bull; Security &bull; Facility Management</p>
          <p className="font-black text-red-700 text-[10.5px]">संरक्षण एवं सुरक्षा</p>
        </>,
        'Managing Director'
      )}
    </div>
  );

  const wageRows = [
    { sr: 1, label: 'Basic Minimum Wages (26 Days Basis)', pct: () => 'BASIC', value: (s: any) => s.base, strong: true },
    { sr: 2, label: 'Overtime Allowance (Additional 4 Hours)', pct: () => formatPercent(statutoryRates.overtime), value: (s: any) => s.additional12Hrs },
    { sr: 3, label: 'Reliever Charges (Weekly Day-Off Allowance)', pct: () => '16.67%', value: (s: any) => s.reliever },
    { sr: 4, label: 'Gross Guard Earnings (Subtotal A)', pct: () => '—', value: (s: any) => s.gross, strong: true, shaded: true },
    { sr: 5, label: 'Provident Fund (EPF Employer Contribution)', pct: () => formatPercent(statutoryRates.epf), value: (s: any) => s.epf },
    { sr: 6, label: 'ESIC Medical & Accidental Insurance', pct: () => formatPercent(statutoryRates.esic), value: (s: any) => s.esic },
    { sr: 7, label: 'Uniform Kit, LWF & Festival Leaves', pct: () => 'STAT', value: (s: any) => s.paidHoliday + s.uniform + s.lwf },
    { sr: 8, label: 'Agency Administrative & Service Margin', pct: () => formatPercent(serviceChargePercent), value: (s: any) => s.agencyMargin, strong: true }
  ];

  const renderPage2 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-3.5">
        {renderHeader()}
        {renderClientBlock('Quotation Prepared For:', 'Docket Ref:', docRef)}

        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-950 font-black uppercase border-b border-slate-300 text-[10px]">
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-8">SR</th>
                <th className="py-2.5 px-3 border-r border-slate-300">DESCRIPTION OF WAGE STRUCTURE (M.P. PSARA)</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-20">BENCHMARK</th>
                {activeChosenServices.map((s: any, idx: number) => (
                  <th key={idx} className="py-2.5 px-3 border-r border-slate-300 text-right">
                    {s.label.toUpperCase()} ({shiftLabel(s.shift)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-slate-800 text-[10.5px]">
              {wageRows.map(row => (
                <tr key={row.sr} className={`border-b border-slate-200 ${row.shaded ? 'bg-slate-50' : ''}`}>
                  <td className={`py-1.5 px-3 border-r border-slate-300 text-center ${row.strong ? 'font-bold' : ''}`}>{row.sr}</td>
                  <td className={`py-1.5 px-3 border-r border-slate-300 font-sans ${row.strong ? 'font-bold text-slate-950' : ''}`}>{row.label}</td>
                  <td className="py-1.5 px-3 border-r border-slate-300 text-center text-[9.5px]">
                    {row.pct()}
                  </td>
                  {activeChosenServices.map((s: any, idx: number) => (
                    <td key={idx} className={`py-1.5 px-3 border-r border-slate-300 text-right whitespace-nowrap ${row.strong ? 'font-black text-slate-950' : ''}`}>
                      {formatINR(row.value(s.statutory || {}))}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-red-800 text-white font-black text-[11px]">
                <td className="py-2.5 px-3 border-red-900 text-center">9</td>
                <td className="py-2.5 px-3 border-red-900 font-sans uppercase">Cost To Company (Per Head / Month)</td>
                <td className="py-2.5 px-3 border-red-900 text-center font-mono">TOTAL</td>
                {activeChosenServices.map((s: any, idx: number) => (
                  <td key={idx} className="py-2.5 px-3 border-red-900 text-right font-mono font-black text-amber-200 whitespace-nowrap text-xs">
                    {formatINR(s.statutory?.grandTotal ?? s.perHeadRate)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-red-50/90 border-2 border-red-200 rounded-xl flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-red-950 uppercase tracking-wider">
              TOTAL DEPLOYMENT: {activeChosenServices.map((s: any) => `${s.count} ${s.label}`).join(', ')}
            </p>
            <p className="text-[8.5px] font-black text-red-700 uppercase tracking-wider mt-0.5">
              * AS PER STATUTORY LAWS, GST (18%) WILL BE CHARGED EXTRA ON TOTAL MONTHLY BILLING.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-mono font-bold uppercase text-slate-500">Total Monthly Billing</p>
            <p className="text-lg font-mono font-black text-slate-950 whitespace-nowrap">{formatINR(totalMonthlyBilling)}</p>
          </div>
        </div>

        <div className="space-y-1 text-[9.5px] text-slate-700 leading-normal pt-1">
          <h4 className="text-[10px] font-black uppercase text-slate-950 border-b border-slate-200 pb-1 mb-1">
            Terms &amp; Operational Conditions:
          </h4>
          <ol className="list-decimal pl-4 space-y-0.5 font-medium">
            <li>Rates apply for 30/31 continuous duty days per calendar month per post.</li>
            <li>This commercial offer remains valid for <strong>{validityDays} days</strong> from date of issuance.</li>
            <li>Payment is due within <strong>{paymentTermsDays} business days</strong> from monthly invoice submission.</li>
            <li><strong className="text-red-700 font-bold">GST (18%) is extra</strong> as applicable under prevailing tax laws.</li>
            <li>Direct recruitment of deployed staff without prior written consent incurs Agency Placement Fees.</li>
          </ol>
        </div>
      </div>

      {renderFooter(
        2,
        <>
          <p className="font-bold text-slate-900">PSA LICENSE: {company.psaraLicense}</p>
          <p>GSTIN: {company.gstNumber}</p>
        </>,
        'Managing Director'
      )}
    </div>
  );

  const renderPage3 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-4">
        {renderHeader()}

        <div className="space-y-4 text-xs leading-relaxed text-slate-800">
          <h3 className="text-sm font-black uppercase text-red-800 border-b border-red-200 pb-1 tracking-wider">
            Billing, Payment &amp; GST Compliance Framework
          </h3>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">1. Invoicing &amp; Payment Release Protocol</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              Certified commercial bills are submitted on the 1st of every calendar month. Payments must be released via Crossed Account Payee Cheque / NEFT / RTGS in favour of <strong>'{company.companyName}'</strong> within {paymentTermsDays} days of presentation.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">2. GST &amp; Reverse Charge Mechanism (RCM)</h4>
            <ul className="list-disc pl-5 text-slate-700 space-y-1 text-[12px]">
              <li>If the client is registered under GST, the client must discharge GST under <strong>Reverse Charge Mechanism (RCM)</strong> as per Section 9(3) of the CGST Act, 2017.</li>
              <li>If the client is unregistered under GST, we shall levy GST at 18%, and the client must pay this GST amount along with monthly charges.</li>
            </ul>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">3. Timely Salary Remittance to Guarding Personnel</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              Vidhya Security Force releases monthly wages to deployed personnel upon receipt of payments from the client (collect-and-pay policy). Prompt clearance guarantees guard morale and physical vigilance.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">4. Statutory Revisions</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              Any future minimum wage gazette revision notified by the Labour Commissioner of Madhya Pradesh shall result in a proportional billing adjustment with applicable arrears.
            </p>
          </div>
        </div>
      </div>

      {renderFooter(
        3,
        <>
          <p className="font-bold text-slate-900">Operational Contract Terms &bull; PSARA MP Compliant</p>
          <p className="text-slate-400">Statutory Compliance Under MP Labour Regulations</p>
        </>,
        'Authorised Signatory'
      )}
    </div>
  );

  const renderPage4 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-5">
        {renderHeader()}

        <div className="space-y-5 text-xs leading-relaxed text-slate-800">
          <p className="text-slate-800 text-justify text-[13px] font-medium">
            Vidhya Security Force &amp; Housekeeping Services is a premier private security organization providing static physical guarding, armed protection, perimeter patrol, and facility management across commercial, industrial, and retail sectors.
          </p>

          <div className="p-6 bg-red-50/60 border-2 border-red-200 rounded-2xl space-y-2 text-center my-4">
            <h4 className="text-[12px] font-black uppercase text-red-800 tracking-widest">
              DIRECTORIAL MISSION STATEMENT
            </h4>
            <p className="font-black text-slate-950 tracking-wide text-[13px] leading-relaxed uppercase">
              "TO SURPASS CLIENT OPERATIONAL SAFETY STANDARDS THROUGH UNCOMPROMISING PROFESSIONAL DISCIPLINE, RIGOROUS PHYSICAL TRAINING, AND TRANSPARENT STATUTORY COMPLIANCE."
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="text-[13px] font-black uppercase text-slate-950 border-b border-slate-200 pb-1">
              Executive Assurance
            </h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12.5px] font-medium">
              If granted the opportunity, we assure you our team will establish a dependable first line of security for your premises, inventory, and people.
            </p>
            <p className="font-black text-red-800 uppercase tracking-wider pt-3 text-[14px]">
              "YOUR SECURITY IS OUR SACRED RESPONSIBILITY"
            </p>
          </div>
        </div>
      </div>

      {renderFooter(
        4,
        <>
          <p className="font-bold text-slate-900">Service Commitment &bull; Quality Management</p>
          <p className="text-slate-400">Vigilance &amp; Central Escalation Protocol</p>
        </>,
        'Authorised Signatory',
        true
      )}
    </div>
  );

  const registrations: [string, string][] = [
    ['Private Security Agency License No (PSARA M.P.)', company.psaraLicense],
    ['Labour Commissioner Registration No', company.labourRegNo],
    ['Employee Provident Fund (EPF Establishment Code)', company.epfCode],
    ['Employees State Insurance Corporation (ESIC Code)', company.esicRegNo],
    ['GST Registration Number (GSTIN)', company.gstNumber],
    ['Professional Tax (P.T.) License Number', company.ptLicenseNo],
    ['Income Tax Permanent Account Number (PAN)', company.panNumber],
    ['Executive Managing Director', company.directorName.toUpperCase()]
  ];

  const renderPage5 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-4">
        {renderHeader()}

        <div className="space-y-3.5">
          <div className="border-b border-red-200 pb-1.5 flex items-center gap-2">
            <ShieldCheck size={20} className="text-red-800" />
            <h3 className="text-sm font-black uppercase text-red-800 tracking-wider">
              Statutory Accreditations &amp; Accompanying Licenses
            </h3>
          </div>

          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-black uppercase text-[11px] border-b border-slate-300">
                  <th className="py-2 px-4 border-r border-slate-300 w-12 text-center">SR</th>
                  <th className="py-2 px-4 border-r border-slate-300">REGULATORY ACCREDITATION / LICENSE</th>
                  <th className="py-2 px-4 text-right font-mono">REGISTRATION / LICENSE NUMBER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11.5px]">
                {registrations.map(([label, value], idx) => (
                  <tr key={label} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="py-2 px-4 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                    <td className="py-2 px-4 border-r border-slate-300 font-bold text-slate-800">{label}</td>
                    <td className="py-2 px-4 text-right font-mono font-black text-slate-950">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-1">
              <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">
                Client Acceptance &amp; Work Order Authorization
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Docket: {docRef}</span>
            </div>
            <p className="text-[10px] text-slate-600 mb-6">
              We hereby accept the rates, terms, and conditions specified in this proposal for deployment at <strong className="uppercase">{docClientName}</strong>.
            </p>
            <div className="flex justify-between items-end pt-4">
              <div className="border-t border-slate-400 w-52 text-center pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-700 block">Authorized Signatory &amp; Stamp</span>
                <span className="text-[9px] text-slate-400">Date: ________________________</span>
              </div>
              <div className="border-t border-slate-400 w-52 text-center pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-700 block">For {company.companyName}</span>
                <span className="text-[9px] text-slate-400">Director Anil Dhariwal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderFooter(
        5,
        <>
          <p className="font-bold text-slate-900">Certified Statutory Registrations</p>
          <p className="text-red-700 font-bold uppercase text-[10px]">Government of Madhya Pradesh Compliant</p>
        </>,
        'Managing Director'
      )}
    </div>
  );

  const renderPage = (pageNo: PageNo, mode: 'screen' | 'print') => {
    switch (pageNo) {
      case 1: return renderPage1(mode);
      case 2: return renderPage2(mode);
      case 3: return renderPage3(mode);
      case 4: return renderPage4(mode);
      case 5: return renderPage5(mode);
      default: return null;
    }
  };

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-16 animate-in fade-in duration-200">
      <style>{PRINT_CSS}</style>

      {/* Top Header */}
      <div className="print:hidden bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-[10px] font-mono font-bold text-slate-400 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 mb-1 transition cursor-pointer"
          >
            <ArrowLeft size={13} className="text-red-700" />
            <span>Field Operations Desk</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Quotation Requisition Desk
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle size={14} className="text-amber-300" />
            <span>New Quote</span>
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
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* BUILDER WORKSPACE */}
      {viewMode === 'BUILDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-8 shadow-xs space-y-6">

            <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200 text-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase">Field Officer Proposal Desk</p>
                  <p className="text-[10px] text-slate-500">
                    Statutory wage structures &amp; reliever allowances are enforced by MP PSARA gazette norms. Commercial overrides are cleared by Central HQ.
                  </p>
                </div>
              </div>
              <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg bg-white border border-slate-200">
                FIELD REP
              </span>
            </div>

            <form onSubmit={handleSaveProposal} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Autofill From Logged Site Inspection
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
                  <select
                    value={selectedVisitId}
                    onChange={(e) => handleVisitSelect(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 transition cursor-pointer"
                  >
                    <option value="">-- Choose past visit or input manually below --</option>
                    {visits.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName || v.company_name} ({v.contactPerson || v.contact_person || 'No Contact'}) -{' '}
                        {new Date(v.timestamp || v.created_at).toLocaleDateString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Establishment Details */}
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
                    placeholder="e.g. THE SANSKRITI SCHOOL"
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
                    placeholder="HR Head / Estate Manager"
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
                    className={`w-full px-3.5 py-2 bg-[#FBFBF9] border rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 ${
                      clientPhone && !isValidIndianMobile(clientPhone) ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Premises Physical Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Scheme 78, Vijay Nagar, Indore"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700"
                  />
                </div>
              </div>

              {/* Guarding Requirements Matrix */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-900">
                  Guarding Posts &amp; Staff Headcount
                </h4>

                <div className="space-y-3">
                  {(Object.keys(PRESET_SERVICES) as ServiceRoleType[]).map((role) => {
                    const isChecked = enabledPresets[role];
                    const cfg = presetConfigs[role];
                    const meta = PRESET_SERVICES[role];
                    const basic = cfg.shift === '12_HOURS' ? meta.defaultBasic12 : meta.defaultBasic8;
                    const stat = calculateFieldWageBreakup(basic, cfg.shift, serviceChargePercent);
                    const perHead = stat.grandTotal;

                    return (
                      <div
                        key={role}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-white border-red-700 shadow-xs ring-1 ring-red-700'
                            : 'bg-[#FBFBF9] border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const enabling = !enabledPresets[role];
                                  setEnabledPresets(p => ({ ...p, [role]: enabling }));
                                  if (enabling && presetConfigs[role].count < 1) {
                                    setPresetConfigs(p => ({ ...p, [role]: { ...p[role], count: 1 } }));
                                  }
                                  setSelectedProposal(null);
                                }}
                                className="text-red-700 shrink-0 mt-0.5 cursor-pointer"
                              >
                                {isChecked ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-400" />}
                              </button>
                              <div className="min-w-0">
                                <span className="text-xs font-black uppercase text-slate-900 block truncate">
                                  {PRESET_SERVICES[role].label}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 block">
                                  {shiftLabel(cfg.shift)} &bull; {formatINR(perHead)}/head
                                </span>
                              </div>
                            </div>

                            {isChecked && (
                              <span className="text-xs font-mono font-black text-red-700 shrink-0 bg-red-50 border border-red-100 px-2.5 py-1 rounded-xl">
                                {formatINR(perHead * cfg.count)}
                              </span>
                            )}
                          </div>

                          {isChecked && (
                            <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100">
                              <div className="flex items-center space-x-1.5">
                                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Shift:</label>
                                <select
                                  value={cfg.shift}
                                  onChange={(e) => {
                                    const newShift = e.target.value as ShiftType;
                                    setPresetConfigs(p => ({ ...p, [role]: { ...p[role], shift: newShift } }));
                                    setSelectedProposal(null);
                                  }}
                                  className="px-2 py-1 bg-[#FBFBF9] border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                                  max={MAX_POSTS_PER_ROLE}
                                  value={cfg.count}
                                  onChange={(e) => {
                                    const count = Math.min(MAX_POSTS_PER_ROLE, Math.max(1, parseInt(e.target.value, 10) || 1));
                                    setPresetConfigs(p => ({ ...p, [role]: { ...p[role], count } }));
                                    setSelectedProposal(null);
                                  }}
                                  className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-[#FBFBF9] border border-slate-200 rounded-lg outline-none focus:border-red-700"
                                />
                              </div>

                              <span className="text-[10px] font-mono text-slate-400 ml-auto flex items-center gap-1">
                                <Lock size={10} /> MP Minimum Wage Enforced
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Custom Roles */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>Custom Roles (Peon, Attendant)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} className="text-amber-300" />
                    <span>Add Custom Role</span>
                  </button>
                </div>

                {customRoles.map((custom) => {
                  const stat = calculateFieldWageBreakup(custom.customBasic, custom.shift, serviceChargePercent);
                  const perHead = stat.grandTotal;

                  return (
                    <div key={custom.id} className="p-3.5 sm:p-4 rounded-2xl border border-amber-300 bg-amber-50/20 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          value={custom.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomRoles(p => p.map(r => r.id === custom.id ? { ...r, label: val } : r));
                            setSelectedProposal(null);
                          }}
                          placeholder="e.g. Office Attendant"
                          className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-900 outline-none uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRole(custom.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <select
                          value={custom.shift}
                          onChange={(e) => {
                            const newShift = e.target.value as ShiftType;
                            setCustomRoles(p => p.map(r => r.id === custom.id ? { ...r, shift: newShift } : r));
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <option value="8_HOURS">8-Hour (Standard)</option>
                          <option value="12_HOURS">12-Hour</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={MAX_POSTS_PER_ROLE}
                          value={custom.count}
                          onChange={(e) => {
                            const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setCustomRoles(p => p.map(r => r.id === custom.id ? { ...r, count } : r));
                          }}
                          className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-lg"
                        />

                        <span className="text-xs font-mono font-black text-slate-900 ml-auto bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-lg">
                          Line Total: {formatINR(perHead * custom.count)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {builderErrors.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-1">
                  <p className="text-[10px] font-mono font-black uppercase text-red-800 tracking-wider">
                    Please correct the following errors:
                  </p>
                  <ul className="list-disc pl-5 text-[11px] text-red-800 space-y-0.5">
                    {builderErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Bottom Action Strip */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-900 block">
                    Calculated Monthly Consideration ({activeChosenServices.length} Roles Assigned)
                  </span>
                  <span className="text-2xl font-mono font-black text-slate-950 block">
                    {formatINR(totalMonthlyBilling)}
                  </span>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide block mt-0.5">
                    * GST (18%) charged extra on total billing
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xs transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin text-amber-300" size={16} />
                  ) : (
                    <FileCheck2 size={16} className="text-amber-300" />
                  )}
                  <span>Submit for HQ Directorial Clearance</span>
                </button>
              </div>
            </form>
          </div>

          {/* Proposals Registry Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-2">
              Recent Proposals ({proposals.length})
            </h3>

            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {proposals.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No proposals found.</p>
              ) : (
                proposals.map((p: any) => {
                  const name = p.client_name || p.clientName || 'Establishment';
                  const total = p.total_amount || 0;
                  const status = p.status || 'PENDING_APPROVAL';
                  const isSelected = selectedProposal?.id === p.id;
                  const countSummary = p.service_items
                    ? p.service_items.map((s: any) => `${s.count} ${s.label}`).join(', ')
                    : 'Security Guards';

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
                          {status === 'APPROVED' ? 'CERTIFIED' : 'PENDING HQ'}
                        </span>
                      </div>

                      <p className="text-[9.5px] text-slate-500 font-mono mt-1 truncate">
                        {countSummary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                        <span className="font-bold text-slate-900">{formatINR(Number(total))}/mo</span>
                        <span className="text-red-700 font-bold hover:underline">View &rarr;</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* A4 PREVIEW */}
      {viewMode === 'PREVIEW' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="print:hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500">Docket Ref:</span>
                <span className="text-xs font-mono font-black text-slate-900">{selectedProposal?.id || 'NEW'}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isApproved ? 'Approved & Certified' : 'Awaiting Directorial Clearance'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewMode('BUILDER')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
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

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-[#FBFBF9] p-1 rounded-xl border border-slate-200 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActivePageTab('ALL')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    activePageTab === 'ALL' ? 'bg-red-700 text-white' : 'text-slate-600'
                  }`}
                >
                  All 5 Pages
                </button>
                {ALL_PAGES.map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setActivePageTab(pNum)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      activePageTab === pNum ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Page {pNum}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePrint('RATE')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={13} className="text-amber-300" />
                  <span>Print Rate Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('ALL')}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} className="text-amber-300" />
                  <span>Print Full 5 Pages</span>
                </button>
              </div>
            </div>
          </div>

          <div className="print:hidden w-full overflow-x-auto pb-4">
            <div className="w-[210mm] mx-auto flex flex-col gap-8">
              {visiblePages.map((pNum) => (
                <React.Fragment key={pNum}>{renderPage(pNum, 'screen')}</React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'PREVIEW' && typeof document !== 'undefined' && createPortal(
        <div id={PRINT_ROOT_ID} aria-hidden="true">
          {pagesInPrintRoot.map((pNum) => (
            <React.Fragment key={pNum}>{renderPage(pNum, 'print')}</React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default CreateQuotation;
