import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  FileText,
  AlertTriangle,
  ShieldCheck
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

type ShiftType = '12_HOURS' | '8_HOURS';
type PageNo = 1 | 2 | 3 | 4 | 5;

const DEFAULT_SERVICE_OPTIONS: Record<ServiceRoleType, ServiceOptionMeta> = {
  GUARD: { label: 'Security Guard', defaultFlat12: 15500, defaultFlat8: 12500, defaultBasic12: 13421, defaultBasic8: 12425 },
  SUPERVISOR: { label: 'Security Field Supervisor', defaultFlat12: 18500, defaultFlat8: 15500, defaultBasic12: 14869, defaultBasic8: 13800 },
  GUNMAN: { label: 'Armed Gunman (12 Bore / .32)', defaultFlat12: 23000, defaultFlat8: 19500, defaultBasic12: 16500, defaultBasic8: 15000 },
  HOUSEKEEPING: { label: 'Housekeeping & Sanitation', defaultFlat12: 14000, defaultFlat8: 11000, defaultBasic12: 12425, defaultBasic8: 11500 }
};

const COMPANY_DEFAULTS = {
  companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
  address: '012 A BLOCK TREASURE TOWN INDORE, MP',
  contactNo: '9826259292',
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
const MP_GST_STATE_CODE = '23';

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

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const isValidGSTIN = (raw: string): boolean => {
  const g = (raw || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARSET.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36] === g[14];
};

const isValidPAN = (raw: string): boolean => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((raw || '').trim().toUpperCase());
const normaliseIndianMobile = (raw: string): string => (raw || '').replace(/\D/g, '').replace(/^(?:91|0)(?=\d{10}$)/, '');
const isValidIndianMobile = (raw: string): boolean => /^[6-9]\d{9}$/.test(normaliseIndianMobile(raw));
const differs = (a: number, b: number): boolean => Math.abs((Number(a) || 0) - (Number(b) || 0)) > 0.5;

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

  @page {
    size: A4 portrait;
    margin: 0;
  }

  @media print {
    html.${PRINT_MODE_CLASS},
    html.${PRINT_MODE_CLASS} body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html.${PRINT_MODE_CLASS} body > *:not(#${PRINT_ROOT_ID}) {
      display: none !important;
    }

    html.${PRINT_MODE_CLASS} #${PRINT_ROOT_ID} {
      display: block !important;
      position: static !important;
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    #${PRINT_ROOT_ID} .vsf-sheet {
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    #${PRINT_ROOT_ID} .vsf-sheet:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    #${PRINT_ROOT_ID} table,
    #${PRINT_ROOT_ID} tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

export const CreateQuotation: React.FC = () => {
  const navigate = useNavigate();
  const { user, settings } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === Role.ADMIN;

  const [viewMode, setViewMode] = useState<'BUILDER' | 'PREVIEW'>('BUILDER');
  const [activePageTab, setActivePageTab] = useState<'ALL' | PageNo>('ALL');
  const [printPages, setPrintPages] = useState<PageNo[] | null>(null);
  const printRequestedRef = useRef(false);

  const [proposals, setProposals] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [builderErrors, setBuilderErrors] = useState<string[]>([]);

  // Proposal Meta
  const [billingModel, setBillingModel] = useState<'COMPLIANCE' | 'FLAT'>('COMPLIANCE');
  const [wageMode, setWageMode] = useState<'PORTAL_MIN_WAGE' | 'CUSTOM'>('PORTAL_MIN_WAGE');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(settings?.defaultServiceMargin ?? 8);

  const [enabledServices, setEnabledServices] = useState<Record<ServiceRoleType, boolean>>({
    GUARD: true,
    SUPERVISOR: false,
    GUNMAN: false,
    HOUSEKEEPING: false
  });

  const [serviceConfigs, setServiceConfigs] = useState<Record<ServiceRoleType, { count: number; shift: ShiftType; flatRate: number }>>({
    GUARD: { count: 1, shift: '12_HOURS', flatRate: settings?.flatGuard12 ?? 15500 },
    SUPERVISOR: { count: 0, shift: '12_HOURS', flatRate: settings?.flatSupervisor12 ?? 18500 },
    GUNMAN: { count: 0, shift: '12_HOURS', flatRate: settings?.flatGunman12 ?? 23000 },
    HOUSEKEEPING: { count: 0, shift: '8_HOURS', flatRate: settings?.flatHousekeeping8 ?? 11000 }
  });

  const [customBasicRates, setCustomBasicRates] = useState<Record<ServiceRoleType, { basic12: number; basic8: number }>>({
    GUARD: { basic12: 13421, basic8: 12425 },
    SUPERVISOR: { basic12: 14869, basic8: 13800 },
    GUNMAN: { basic12: 16500, basic8: 15000 },
    HOUSEKEEPING: { basic12: 12425, basic8: 11500 }
  });

  const company = useMemo(() => ({
    companyName: settings?.companyName || COMPANY_DEFAULTS.companyName,
    address: settings?.address || COMPANY_DEFAULTS.address,
    contactNo: settings?.contactNo || COMPANY_DEFAULTS.contactNo,
    email: settings?.email || COMPANY_DEFAULTS.email,
    directorName: settings?.directorName || COMPANY_DEFAULTS.directorName,
    logo: settings?.logo || COMPANY_DEFAULTS.logo,
    sealImage: settings?.sealImage || '',
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
    reliever: settings?.reliverPercent ?? 16.67,
    epf: settings?.epfPercent ?? 13,
    esic: settings?.esicPercent ?? 3.25
  };

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

  // Robust address and details extraction from linked visits
  const handleVisitSelect = (visitId: string) => {
    setSelectedVisitId(visitId);
    setSelectedProposal(null);
    setBuilderErrors([]);

    const visit: any = visits.find((v: any) => v.id === visitId);
    if (!visit) return;

    setClientName(visit.companyName || visit.company_name || '');
    setContactPerson(visit.contactPerson || visit.contact_person || '');
    setClientPhone(normaliseIndianMobile(visit.phoneNumber || visit.phone_number || visit.phone || '').slice(0, 10));

    const rawNotes = visit.notes || '';

    // Priority 1: Direct address field if recorded
    let resolvedAddress = (visit.address || '').trim();

    // Priority 2: Extract explicit "Address: ..." prefix from notes
    if (!resolvedAddress && rawNotes.includes('Address:')) {
      const match = rawNotes.match(/Address:\s*([^|]+)/i);
      if (match && match[1]) {
        resolvedAddress = match[1].trim();
      }
    }

    // Priority 3: Fall back to raw notes strip (excluding system suffixes)
    if (!resolvedAddress) {
      const cleanNotes = rawNotes
        .split('| Requirements:')[0]
        .split('| Guards:')[0]
        .split('| Notes:')[0]
        .trim();
      if (cleanNotes && !cleanNotes.includes('COMMERCIAL COMPLEX') && !cleanNotes.includes('INDUSTRIAL WAREHOUSE')) {
        resolvedAddress = cleanNotes;
      }
    }

    // If still blank, use clean regional fallback without repeating sector text
    if (!resolvedAddress) {
      resolvedAddress = 'Indore, Madhya Pradesh';
    }

    setClientAddress(resolvedAddress);

    const guardMatch = rawNotes.match(/Guards:\s*(\d+)/i) || rawNotes.match(/Requirements:\s*(\d+)/i);
    const count = guardMatch ? parseInt(guardMatch[1], 10) : 1;

    setServiceConfigs(prev => ({
      ...prev,
      GUARD: {
        count: Math.min(MAX_POSTS_PER_ROLE, count > 0 ? count : 1),
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

  const resolveMinimumWage = (role: ServiceRoleType, shift: ShiftType): number => {
    if (role === 'GUARD') return shift === '12_HOURS' ? (settings?.guardBasic12 ?? 13421) : (settings?.guardBasic8 ?? 12425);
    if (role === 'SUPERVISOR') return shift === '12_HOURS' ? (settings?.supervisorBasic12 ?? 14869) : (settings?.supervisorBasic8 ?? 13800);
    if (role === 'GUNMAN') return shift === '12_HOURS' ? (settings?.gunmanBasic12 ?? 16500) : (settings?.gunmanBasic8 ?? 15000);
    return shift === '12_HOURS' ? (settings?.housekeepingBasic12 ?? 12425) : (settings?.housekeepingBasic8 ?? 11500);
  };

  const resolveBaseWage = (role: ServiceRoleType, shift: ShiftType): number => {
    if (wageMode === 'PORTAL_MIN_WAGE') return resolveMinimumWage(role, shift);
    return shift === '12_HOURS' ? customBasicRates[role].basic12 : customBasicRates[role].basic8;
  };

  const resolveFlatRate = (role: ServiceRoleType, shift: ShiftType): number => {
    const fallback = shift === '12_HOURS' ? DEFAULT_SERVICE_OPTIONS[role].defaultFlat12 : DEFAULT_SERVICE_OPTIONS[role].defaultFlat8;
    const fromSettings: Record<ServiceRoleType, [number | undefined, number | undefined]> = {
      GUARD: [settings?.flatGuard12, settings?.flatGuard8],
      SUPERVISOR: [settings?.flatSupervisor12, settings?.flatSupervisor8],
      GUNMAN: [settings?.flatGunman12, settings?.flatGunman8],
      HOUSEKEEPING: [settings?.flatHousekeeping12, settings?.flatHousekeeping8]
    };
    const [rate12, rate8] = fromSettings[role];
    return (shift === '12_HOURS' ? rate12 : rate8) ?? fallback;
  };

  const calculateStatutoryRole = (role: ServiceRoleType, shift: ShiftType) => {
    const base = resolveBaseWage(role, shift);
    const otPercent = statutoryRates.overtime;
    const relPercent = statutoryRates.reliever;
    const epfRate = statutoryRates.epf / 100;
    const esicRate = statutoryRates.esic / 100;
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
        const flatBase = resolveFlatRate(role, conf.shift);

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

  const effectiveMarginPercent: number = (viewMode === 'PREVIEW' && selectedProposal?.service_charge_percent != null)
    ? Number(selectedProposal.service_charge_percent)
    : serviceChargePercent;

  const docClientName: string = (selectedProposal?.client_name || clientName || '').trim();
  const docClientAddress: string = (selectedProposal?.client_address || clientAddress || '').trim();
  const docDate = formatDate(selectedProposal?.created_at);
  const docRef: string = selectedProposal?.id || 'UNSAVED DRAFT';

  const validateBuilder = (): string[] => {
    const errors: string[] = [];
    if (clientName.trim().length < 3) errors.push('Client establishment name is required (minimum 3 characters).');
    if (clientAddress.trim().length < 5) errors.push('Premises address is required.');
    if (clientPhone && !isValidIndianMobile(clientPhone)) errors.push('Contact mobile must be a valid 10-digit Indian number.');

    const enabledRoles = (Object.keys(enabledServices) as ServiceRoleType[]).filter(role => enabledServices[role]);
    if (enabledRoles.length === 0) errors.push('Select at least one service to quote.');

    enabledRoles.forEach(role => {
      const cfg = serviceConfigs[role];
      const label = DEFAULT_SERVICE_OPTIONS[role].label;
      if (!Number.isInteger(cfg.count) || cfg.count < 1 || cfg.count > MAX_POSTS_PER_ROLE) {
        errors.push(`${label}: number of posts must be between 1 and ${MAX_POSTS_PER_ROLE}.`);
      }
      if (billingModel === 'COMPLIANCE' && wageMode === 'CUSTOM') {
        const basic = resolveBaseWage(role, cfg.shift);
        const minWage = resolveMinimumWage(role, cfg.shift);
        if (!(basic > 0)) {
          errors.push(`${label} (${shiftLabel(cfg.shift)}): custom basic wage must be greater than ₹0.`);
        } else if (basic < minWage) {
          errors.push(`${label} (${shiftLabel(cfg.shift)}): custom basic ${formatINR(basic)} is below minimum wage ${formatINR(minWage)}.`);
        }
      }
      if (billingModel === 'FLAT' && !(resolveFlatRate(role, cfg.shift) > 0)) {
        errors.push(`${label} (${shiftLabel(cfg.shift)}): flat rate is not configured in Settings.`);
      }
    });

    if (!(serviceChargePercent >= 0 && serviceChargePercent <= 50)) {
      errors.push('Agency service charge must be between 0% and 50%.');
    }

    return errors;
  };

  const docketIssues = useMemo((): string[] => {
    if (viewMode !== 'PREVIEW') return [];
    const issues: string[] = [];

    if (!selectedProposal) issues.push('Save the proposal first before printing.');
    if (docClientName.length < 3) issues.push('Client establishment name is missing.');
    if (docClientAddress.length < 5) issues.push('Client premises address is missing.');

    const items: any[] = activeChosenServices || [];
    if (items.length === 0) issues.push('No service positions on this proposal.');

    items.forEach((item: any) => {
      const label = item.label || item.role || 'Service';
      const count = Number(item.count);
      const rate = Number(item.perHeadRate);
      const line = Number(item.lineTotal);

      if (!Number.isInteger(count) || count < 1) issues.push(`${label}: invalid post count.`);
      if (!(rate > 0)) issues.push(`${label}: per-head rate is zero or missing.`);
      if (differs(rate * count, line)) issues.push(`${label}: line total calculation mismatch.`);

      if (effectiveBillingModel === 'COMPLIANCE') {
        const s = item.statutory;
        if (!s) {
          issues.push(`${label}: wage breakup missing.`);
          return;
        }
        if (differs(s.base + s.additional12Hrs + s.reliever, s.gross)) issues.push(`${label}: gross earnings do not reconcile.`);
        if (differs(s.ctc + s.agencyMargin, s.grandTotal)) issues.push(`${label}: CTC does not reconcile.`);
      }
    });

    const lineSum = items.reduce((acc: number, it: any) => acc + (Number(it.lineTotal) || 0), 0);
    if (items.length > 0 && differs(lineSum, totalMonthlyBilling)) {
      issues.push(`Total billing mismatch.`);
    }

    if (!isValidGSTIN(company.gstNumber)) {
      issues.push(`Company GSTIN "${company.gstNumber}" is invalid.`);
    }
    if (!isValidPAN(company.panNumber)) issues.push(`Company PAN "${company.panNumber}" is invalid.`);

    return issues;
  }, [viewMode, selectedProposal, docClientName, docClientAddress, activeChosenServices, effectiveBillingModel, totalMonthlyBilling, company]);

  const handleResetForm = () => {
    setSelectedProposal(null);
    setSelectedVisitId('');
    setClientName('');
    setContactPerson('');
    setClientPhone('');
    setClientAddress('');
    setBuilderErrors([]);
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
    showToast('Quotation saved successfully & ready for printing!', 'success');
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
    if (!selectedProposal) {
      showToast('Save the proposal before sharing it.', 'error');
      return;
    }
    const phone = normaliseIndianMobile(selectedProposal.client_phone || clientPhone || '');
    if (!isValidIndianMobile(phone)) {
      showToast('Client mobile number is invalid or missing.', 'error');
      return;
    }
    const formattedPhone = `91${phone}`;
    const client = selectedProposal.client_name || clientName || 'Valued Client';

    const serviceSummary = activeChosenServices
      .map((s: any) => `${s.count}x ${s.label} (${shiftLabel(s.shift)}) @ ${formatINR(s.perHeadRate)}/head`)
      .join('\n');

    const text =
      `*OFFICIAL RATE QUOTATION* 🛡️\n` +
      `*${company.companyName}*\n\n` +
      `Dear *${client}*,\n` +
      `Please review our official service quotation:\n\n` +
      `📋 *Allocated Deployments:*\n${serviceSummary}\n\n` +
      `💰 *Net Monthly Billing:* ${formatINR(totalMonthlyBilling)}/- (*GST Extra*)\n\n` +
      `Director Anil Dhariwal: +91 9826259020\n` +
      `_Protection & Security • संरक्षण एवं सुरक्षा_`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const visiblePages: PageNo[] = activePageTab === 'ALL' ? ALL_PAGES : [activePageTab];
  const pagesInPrintRoot: PageNo[] = printPages ?? visiblePages;

  const pdfFileName = useMemo(() => {
    const safeClient = (docClientName || 'Client').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return `VSF_Quotation_${safeClient}_${docRef.replace(/[^A-Za-z0-9-]+/g, '')}`;
  }, [docClientName, docRef]);

  useEffect(() => {
    if (viewMode !== 'PREVIEW') return;
    document.documentElement.classList.add(PRINT_MODE_CLASS);
    return () => document.documentElement.classList.remove(PRINT_MODE_CLASS);
  }, [viewMode]);

  const handlePrint = (pageTarget: 'ALL' | 'RATE' | PageNo) => {
    if (docketIssues.length > 0) {
      showToast(`Cannot print: ${docketIssues[0]}`, 'error');
      return;
    }
    const pages: PageNo[] = pageTarget === 'ALL' ? ALL_PAGES : [pageTarget === 'RATE' ? 2 : pageTarget];
    printRequestedRef.current = true;
    setPrintPages(pages);
  };

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
      try {
        await (document as any).fonts?.ready;
      } catch {
        /* fonts API */
      }
      const root = document.getElementById(PRINT_ROOT_ID);
      const images = root ? Array.from(root.querySelectorAll('img')) : [];
      await Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              })
        )
      );
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (cancelled) return;

      window.addEventListener('afterprint', restore, { once: true });
      document.title = pdfFileName;
      window.print();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [printPages, pdfFileName]);

  const isApproved = selectedProposal?.status === 'APPROVED';

  // Substantial, Highly-Readable Executive Header Component
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
            EMERGENCY: +91 9826259292
          </span>
        </div>
      </div>

      <div className="text-center flex-1 px-2">
        <h1 className="text-[15px] font-black uppercase tracking-tight text-slate-950 leading-tight">
          {company.companyName}
        </h1>
        <p className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wide mt-1">
          HQ: {company.address}
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

  // Enlarged, Authoritative Seal & Signature Block
  const renderSignature = (title: string, showFirmLine = false) => (
    <div className="text-center space-y-1">
      {showFirmLine && (
        <p className="text-[10px] font-bold text-slate-700 uppercase">For {company.companyName}</p>
      )}
      <div
        className={`w-36 h-20 rounded mx-auto flex items-center justify-center p-1 ${
          company.sealImage ? '' : 'border-2 border-dashed border-red-300 bg-red-50/20'
        }`}
      >
        {company.sealImage ? (
          <img src={company.sealImage} alt="Official Seal" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-[9px] font-mono font-bold text-red-700 tracking-wider">[ OFFICIAL STAMP / SEAL ]</span>
        )}
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
          Page {pageNo} of {TOTAL_PAGES} &bull; Docket Ref: {docRef}
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
        <p className="text-[12px] text-slate-700 mt-1 font-medium leading-tight">Address: {docClientAddress || 'Indore, Madhya Pradesh'}</p>
      </div>
      <div className="text-right font-mono text-[10px] shrink-0">
        <p className="text-slate-500 uppercase font-bold">{rightLabel}</p>
        <p className="text-xs font-black text-slate-950 mt-0.5">{rightValue}</p>
      </div>
    </div>
  );

  const sheetClass = (mode: 'screen' | 'print') =>
    `vsf-sheet font-sans ${mode === 'screen' ? 'rounded-2xl border border-slate-200 shadow-xl' : ''}`;

  // ---------------- PAGE 1: INTRODUCTION LETTER ----------------
  const renderPage1 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-4">
        {renderHeader()}
        {renderClientBlock('To Establishment:', 'Proposal Date:', docDate)}

        <div className="space-y-4 text-[13px] leading-relaxed text-slate-800 pt-1">
          <p className="text-justify font-medium">
            <strong>Objective:</strong> Vidhya Security Force &amp; Housekeeping Services is dedicated to providing <strong className="uppercase font-black text-slate-950">{docClientName || 'your establishment'}</strong> with premier guarding operations, perimeter security, and complete facility management. Our mission is to maintain a completely secure, fortified, and professional working atmosphere for your executives, personnel, inventory, and visitors.
          </p>

          <div className="space-y-2 pt-1">
            <h3 className="text-[13.5px] font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
              Licensed &amp; Experienced Leadership
            </h3>
            <ul className="text-[12.5px] text-slate-700 space-y-2 list-disc pl-5 leading-normal">
              <li>Statutorily licensed across the state of Madhya Pradesh under the <strong>Private Security Agencies Regulation Act (PSARA)</strong>.</li>
              <li>Disciplined, physically vetted security personnel and specialized facility management crews.</li>
              <li>Mandatory background verification and police verification clearances completed for all deployed staff.</li>
              <li>Full statutory benefits and timely compliance including <strong>EPF, ESIC, LWF, Uniform Kit &amp; Paid Holidays</strong>.</li>
              <li>Over a decade of seasoned industry leadership under Managing Director {company.directorName}.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="text-[13.5px] font-black uppercase text-red-800 border-b border-red-100 pb-1 tracking-wider">
              Key Partnership Deliverables
            </h3>
            <ul className="text-[12.5px] text-slate-700 space-y-2 list-disc pl-5 leading-normal">
              <li><strong>Fortified Perimeter Vigilance:</strong> Alert and vigilant static guards safeguarding all entry/exit gates and premises.</li>
              <li><strong>Superior Hygiene &amp; Cleanliness:</strong> Highly trained housekeeping staff maintaining sterile and orderly premises.</li>
              <li><strong>24/7 Command Patrol:</strong> Continuous day &amp; night patrol inspections by field supervisors to maintain duty alertness.</li>
            </ul>
          </div>

          <p className="text-[12.5px] text-slate-800 pt-2 text-justify font-medium">
            We are confident our tailored services will exceed the security expectations of <span className="uppercase font-black">{docClientName.replace(/\.+$/, '')}</span>. We look forward to executing this contract with maximum fidelity.
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

  // ---------------- PAGE 2: OFFICIAL RATE SHEET ----------------
  const wageRows: { sr: number; label: string; pct: string; value: (s: any) => number; strong?: boolean; shaded?: boolean }[] = [
    { sr: 1, label: 'Basic Minimum Wages (26 Days)', pct: 'BASIC', value: s => s.base, strong: true },
    { sr: 2, label: 'Additional 4 Hours Overtime Allowance', pct: formatPercent(statutoryRates.overtime), value: s => s.additional12Hrs },
    { sr: 3, label: 'Reliever Charges (Weekly Day-Off)', pct: formatPercent(statutoryRates.reliever), value: s => s.reliever },
    { sr: 4, label: 'Gross Guard Earnings (Subtotal A)', pct: '—', value: s => s.gross, strong: true, shaded: true },
    { sr: 5, label: 'Provident Fund (EPF Employer Share)', pct: formatPercent(statutoryRates.epf), value: s => s.epf },
    { sr: 6, label: 'ESIC Medical Insurance', pct: formatPercent(statutoryRates.esic), value: s => s.esic },
    { sr: 7, label: 'Uniform Kit, LWF & Festival Leaves', pct: 'STAT', value: s => s.paidHoliday + s.uniform + s.lwf },
    { sr: 8, label: 'Agency Service Charge', pct: formatPercent(effectiveMarginPercent), value: s => s.agencyMargin, strong: true }
  ];

  const renderPage2 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-3.5">
        {renderHeader()}
        {renderClientBlock('Quotation Prepared For:', 'Docket Ref:', docRef)}

        {effectiveBillingModel === 'COMPLIANCE' ? (
          <div className="w-full">
            <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-black uppercase border-b border-slate-300 text-[10px]">
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-8">SR</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">DESCRIPTION OF WAGE STRUCTURE (M.P. PSARA)</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-16">IN %</th>
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
                    <td className={`py-1.5 px-3 border-r border-slate-300 text-center ${row.strong ? 'font-bold' : ''}`}>{row.pct}</td>
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
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse border border-slate-300 text-[12px]">
              <thead>
                <tr className="bg-red-800 text-white font-black uppercase text-[10px]">
                  <th className="py-3 px-3.5 border-r border-red-900">Requested Service Role</th>
                  <th className="py-3 px-3.5 border-r border-red-900 text-center">Shift Schedule</th>
                  <th className="py-3 px-3.5 border-r border-red-900 text-center">Assigned Posts</th>
                  <th className="py-3 px-3.5 border-r border-red-900 text-right">Monthly Rate / Head</th>
                  <th className="py-3 px-3.5 text-right">Monthly Consideration</th>
                </tr>
              </thead>
              <tbody className="font-bold text-slate-800 text-xs">
                {activeChosenServices.map((service: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-3 px-3.5 border-r border-slate-300 font-black text-slate-900">{service.label}</td>
                    <td className="py-3 px-3.5 border-r border-slate-300 text-center font-mono text-[11px]">
                      {service.shift === '12_HOURS' ? '12 Hours (30/31 Days)' : '08 Hours (30/31 Days)'}
                    </td>
                    <td className="py-3 px-3.5 border-r border-slate-300 text-center font-mono">
                      {service.count} {service.count === 1 ? 'Post' : 'Posts'}
                    </td>
                    <td className="py-3 px-3.5 border-r border-slate-300 text-right font-mono text-red-700 font-black whitespace-nowrap">
                      {formatINR(service.perHeadRate)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-950 font-black whitespace-nowrap">
                      {formatINR(service.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total Billing Strip */}
        <div className="p-3.5 bg-red-50/90 border-2 border-red-200 rounded-xl flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-red-950 uppercase tracking-wider">
              TOTAL ALLOCATED DEPLOYMENTS: {activeChosenServices.map((s: any) => `${s.count} ${s.label}`).join(', ')}
            </p>
            <p className="text-[8.5px] font-black text-red-700 uppercase tracking-wider mt-0.5">
              * AS PER GOVERNMENT REGULATIONS, GST WILL BE CHARGED EXTRA ON THE TOTAL MONTHLY BILLING.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-mono font-bold uppercase text-slate-500">Total Monthly Billing</p>
            <p className="text-lg font-mono font-black text-slate-950 whitespace-nowrap">{formatINR(totalMonthlyBilling)}</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-1 text-[9.5px] text-slate-700 leading-normal pt-1">
          <h4 className="text-[10px] font-black uppercase text-slate-950 border-b border-slate-200 pb-1 mb-1">
            Terms &amp; Operational Conditions:
          </h4>
          <ol className="list-decimal pl-4 space-y-0.5 font-medium">
            <li>The above rates are applicable for 30/31 days of continuous duty per calendar month.</li>
            {effectiveBillingModel === 'COMPLIANCE' && (
              <li>
                Per day rates: {activeChosenServices.map((s: any) => `${s.label} (${shiftLabel(s.shift)}): ₹${Math.round(s.perHeadRate / 30).toLocaleString('en-IN')}`).join(', ')}.
              </li>
            )}
            <li>This quotation is valid for 30 days from the date of submission.</li>
            <li><strong className="text-red-700 font-bold">GST will be charged extra on the total monthly billing as per prevailing statutory rates.</strong></li>
            <li>Bills submitted must be processed within 7 business days from presentation date. Any disputes can be resolved mutually.</li>
            <li><em>Note: A 5% surcharge may be levied if invoices remain unsettled beyond the stipulated 7 days.</em></li>
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

  // ---------------- PAGE 3: BILLING, PAYMENT & GST ----------------
  const renderPage3 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-4">
        {renderHeader()}

        <div className="space-y-4 text-xs leading-relaxed text-slate-800">
          <h3 className="text-sm font-black uppercase text-red-800 border-b border-red-200 pb-1 tracking-wider">
            Billing, Payment &amp; GST Compliance Framework
          </h3>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">1. Billing &amp; Invoicing Protocol</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              We shall submit our certified commercial bill on the 1st of every calendar month. Payment must be released via Crossed Account Payee Cheque / NEFT / RTGS in favour of <strong>'{company.companyName}'</strong>.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">2. GST &amp; Reverse Charge Mechanism (RCM)</h4>
            <ul className="list-disc pl-5 text-slate-700 space-y-1 text-[12px]">
              <li>If the client is registered under GST, the client must discharge GST under <strong>Reverse Charge Mechanism (RCM)</strong> as per Section 9(3) of the CGST Act, 2017.</li>
              <li>If the client is unregistered under GST, we shall levy GST at the applicable rate (18%), and the client must pay this GST amount to our agency along with monthly service charges.</li>
            </ul>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">3. Timely Salary Disbursement to Guarding Personnel</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              Vidhya Security Force &amp; Housekeeping Services releases monthly salaries to deployed personnel upon receipt of payments from the client (collect-and-pay policy). Timely clearance of invoices ensures prompt staff remuneration.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">4. Employment Restrictions &amp; Agency Placement</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              The client cannot directly or indirectly employ any of our deployed personnel without prior written authorization from our central management. If the client desires to absorb any staff directly, applicable Agency Placement Charges must be cleared.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-950 uppercase text-[12px]">5. Mandatory Wage Revisions</h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12px]">
              In case of any future statutory wage revision under the Contract Labour (R&amp;A) Act, 1970 or Minimum Wages Act published by the Labour Department of Madhya Pradesh, the billing rates shall be adjusted upward proportionally along with statutory arrears.
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

  // ---------------- PAGE 4: MISSION & SERVICE COMMITMENT ----------------
  const renderPage4 = (mode: 'screen' | 'print') => (
    <div className={sheetClass(mode)}>
      <div className="space-y-5">
        {renderHeader()}

        <div className="space-y-5 text-xs leading-relaxed text-slate-800">
          <p className="text-slate-800 text-justify text-[13px] font-medium">
            Vidhya Security Force &amp; Housekeeping Services is a premier private security and facility management organization providing the highest quality of Guarding Operations, Housekeeping Maintenance, Healthcare Support, and Electronic Perimeter Supervision.
          </p>

          <div className="p-6 bg-red-50/60 border-2 border-red-200 rounded-2xl space-y-2 text-center my-4">
            <h4 className="text-[12px] font-black uppercase text-red-800 tracking-widest">
              MISSION STATEMENT
            </h4>
            <p className="font-black text-slate-950 tracking-wide text-[13px] leading-relaxed uppercase">
              "TO SATISFY AND SURPASS OUR CLIENTS' OPERATIONAL SAFETY REQUIREMENTS WITH ELABORATED &amp; PERSONALISED SERVICES UNDER THE HIGHEST PROFESSIONAL DISCIPLINE."
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="text-[13px] font-black uppercase text-slate-950 border-b border-slate-200 pb-1">
              Executive Assurance
            </h4>
            <p className="text-slate-700 leading-relaxed text-justify text-[12.5px] font-medium">
              If given the opportunity, we assure you that our agency will prove to be an impenetrable line of defence against all security odds and operational adversities. It will be our greatest honour and pride to be associated with your esteemed organization for rendering efficient, prompt, and dedicated protection.
            </p>
            <p className="font-black text-red-800 uppercase tracking-wider pt-3 text-[14px]">
              "YOUR SECURITY IS OUR SACRED RESPONSIBILITY"
            </p>
          </div>

          <p className="text-slate-700 pt-3 text-[12.5px] font-medium">
            Thank you for considering Vidhya Security Force &amp; Housekeeping Services. We look forward to executing this contract with the highest fidelity.
          </p>
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

  // ---------------- PAGE 5: STATUTORY ACCREDITATIONS ----------------
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

        <div className="space-y-4">
          <div className="border-b border-red-200 pb-1.5 flex items-center gap-2">
            <ShieldCheck size={20} className="text-red-800" />
            <h3 className="text-sm font-black uppercase text-red-800 tracking-wider">
              Statutory Accreditations &amp; Registrations
            </h3>
          </div>

          <div className="border border-slate-300 rounded-xl overflow-hidden mt-3 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-black uppercase text-[11px] border-b border-slate-300">
                  <th className="py-3 px-4 border-r border-slate-300 w-12 text-center">SR</th>
                  <th className="py-3 px-4 border-r border-slate-300">REGULATORY ACCREDITATION / LICENSE</th>
                  <th className="py-3 px-4 text-right font-mono">REGISTRATION / LICENSE NUMBER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[12px]">
                {registrations.map(([label, value], idx) => (
                  <tr key={label} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="py-3 px-4 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 border-r border-slate-300 font-bold text-slate-800">{label}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-950">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11.5px] text-slate-600 font-medium pt-3 leading-relaxed text-justify">
            All statutory registrations and operational records are updated and maintained in full accordance with the state government requirements of Madhya Pradesh and the central governing laws of India.
          </p>
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

  const printDisabled = docketIssues.length > 0;

  return (
    <div className="w-full space-y-6 px-1 sm:px-2 pb-16 animate-in fade-in duration-200">
      <style>{PRINT_CSS}</style>

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
                    className={`w-full px-3.5 py-2 bg-[#FBFBF9] border rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 ${
                      clientPhone && !isValidIndianMobile(clientPhone) ? 'border-red-500' : 'border-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Premises Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Vijay Nagar, Indore, Madhya Pradesh"
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700"
                  />
                </div>
              </div>

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
                        {(Object.keys(DEFAULT_SERVICE_OPTIONS) as ServiceRoleType[])
                          .filter((role) => enabledServices[role])
                          .map((role) => {
                            const shift = serviceConfigs[role].shift;
                            const key = shift === '12_HOURS' ? 'basic12' : 'basic8';
                            const value = customBasicRates[role][key];
                            const minWage = resolveMinimumWage(role, shift);
                            const belowMin = !(value > 0) || value < minWage;
                            return (
                              <div key={`${role}-${shift}`}>
                                <label className="text-[9px] font-mono text-slate-400 block mb-1">
                                  {DEFAULT_SERVICE_OPTIONS[role].label} ({shiftLabel(shift)})
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={Number.isFinite(value) ? value : ''}
                                  onChange={(e) => {
                                    const next = e.target.value === '' ? 0 : Number(e.target.value);
                                    setCustomBasicRates(p => ({ ...p, [role]: { ...p[role], [key]: next } }));
                                    setSelectedProposal(null);
                                  }}
                                  className={`w-full p-2 bg-slate-950 border rounded-lg font-mono font-bold text-white outline-none focus:border-amber-400 ${
                                    belowMin ? 'border-red-500' : 'border-slate-700'
                                  }`}
                                />
                                <span className={`text-[8.5px] font-mono block mt-0.5 ${belowMin ? 'text-red-400' : 'text-slate-500'}`}>
                                  Min wage: {formatINR(minWage)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900">
                    Select Services To Quote
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Check the role, set the quantity, and choose shift duration
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(DEFAULT_SERVICE_OPTIONS) as ServiceRoleType[]).map((role) => {
                    const isChecked = enabledServices[role];
                    const cfg = serviceConfigs[role];
                    const stat = calculateStatutoryRole(role, cfg.shift);
                    const flatBase = resolveFlatRate(role, cfg.shift);
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
                                const enabling = !enabledServices[role];
                                setEnabledServices(p => ({ ...p, [role]: enabling }));
                                if (enabling && serviceConfigs[role].count < 1) {
                                  setServiceConfigs(p => ({ ...p, [role]: { ...p[role], count: 1 } }));
                                }
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
                                {cfg.shift === '12_HOURS' ? '12 Hours (Day/Night)' : '8 Hours (3-Shift Rotation)'} &bull; {formatINR(perHead)}/head
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
                                  max={MAX_POSTS_PER_ROLE}
                                  value={cfg.count}
                                  onChange={(e) => {
                                    const count = Math.min(MAX_POSTS_PER_ROLE, Math.max(1, parseInt(e.target.value, 10) || 1));
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
                                {formatINR(perHead * cfg.count)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-900 block">
                    Calculated Monthly Consideration ({activeChosenServices.length} Roles Assigned)
                  </span>
                  <span className="text-2xl font-mono font-black text-slate-950 block">
                    {formatINR(totalMonthlyBilling)}
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
                        <span className="font-bold text-slate-900">{formatINR(Number(total))}/mo</span>
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
      {/* 2. A4 PREVIEW (FULL BUNDLE & PAGE NAVIGATION)              */}
      {/* ========================================================= */}
      {viewMode === 'PREVIEW' && (
        <div className="max-w-4xl mx-auto space-y-6">
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

            {docketIssues.length > 0 ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
                <p className="text-[10px] font-mono font-black uppercase text-red-800 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  Printing blocked — {docketIssues.length} validation issue{docketIssues.length > 1 ? 's' : ''}
                </p>
                <ul className="list-disc pl-5 text-[11px] text-red-800 space-y-0.5">
                  {docketIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-[10px] font-mono font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Validation passed — client details, wage maths, totals, GSTIN &amp; PAN verified
              </p>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
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
                {ALL_PAGES.map((pNum) => (
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePrint('RATE')}
                  disabled={printDisabled}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={13} className="text-amber-300" />
                  <span>Print Rate Sheet (1 Page)</span>
                </button>
                {activePageTab !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => handlePrint(activePageTab)}
                    disabled={printDisabled}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText size={13} className="text-amber-300" />
                    <span>Print Page {activePageTab} Only</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrint('ALL')}
                  disabled={printDisabled}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer size={13} className="text-amber-300" />
                  <span>Print Full 5-Page PDF</span>
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
