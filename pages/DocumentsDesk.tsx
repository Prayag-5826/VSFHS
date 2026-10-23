import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  Send,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiService';
import { Visit } from '../types';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type DocType = 'POSTING_ORDER' | 'CLIENT_INVITATION';

interface GuardPostingEntry {
  id: string;
  name: string;
  fatherName: string;
  post: string;
  issueDate: string; // ISO yyyy-mm-dd
  address: string;
  district: string;
  state: string;
  nationality: string;
  phone: string;
}

interface ClientForm {
  clientName: string;
  clientAddress: string;
  contactPerson: string;
  contactPhone: string;
  city: string;
  visitDate: string; // ISO yyyy-mm-dd
  visitTime: string;
  guardRequirement: string;
  agendaReason: string;
}

const COMPANY = {
  nameEn: 'Vidhya Security Force & Housekeeping Services',
  nameHi: 'विद्या सिक्योरिटी फोर्स',
  tagline: 'संरक्षण एवं सुरक्षा • PSARA MP LICENSED',
  licence: 'PSA/L/74/MP/2023/FEB/3/425',
  office: '012 A Block, Treasure Town, Indore (M.P.)',
  officeHi: '012 ए ब्लॉक ट्रेजर टाउन, इंदौर (म.प्र.)',
  phone: '9826259292',
  email: 'contact@vidhyasecurityforce.in',
  directorEn: 'Anil Dhariwal',
  directorHi: 'अनिल धारीवाल'
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

const todayISO = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split('T')[0];
};

/** yyyy-mm-dd -> dd/mm/yyyy (Indian convention). Returns input if not ISO. */
const formatDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '';
};

const makeRef = (prefix: 'PO' | 'INV') => {
  const d = new Date();
  const yy = d.getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `VSF/${prefix}/${yy}/${seq}`;
};

const onlyDigits = (s: string, max = 10) => s.replace(/\D/g, '').slice(0, max);

const newGuard = (overrides: Partial<GuardPostingEntry> = {}): GuardPostingEntry => ({
  id: `GUARD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: '',
  fatherName: '',
  post: 'SECURITY GUARD (12 HRS)',
  issueDate: todayISO(),
  address: '',
  district: 'Indore',
  state: 'Madhya Pradesh',
  nationality: 'भारतीय (Indian)',
  phone: '',
  ...overrides
});

/* -------------------------------------------------------------------------- */
/*  Print / preview document builders                                          */
/* -------------------------------------------------------------------------- */

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap" rel="stylesheet">';

const BASE_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Noto Sans", "Noto Sans Devanagari", "Segoe UI", Arial, sans-serif;
    color: #0f172a; font-size: 12.5px; line-height: 1.6; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 794px; margin: 0 auto; padding: 8px 4px; }
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #b91c1c; }
  .brand-en { font-size: 17px; font-weight: 800; color: #b91c1c; letter-spacing: .2px; }
  .brand-hi { font-size: 12px; font-weight: 700; color: #1e3a8a; margin-top: 2px; }
  .brand-lic { font-size: 10px; color: #64748b; margin-top: 2px; }
  .meta { text-align: right; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
  .meta .ref { color: #b91c1c; }
  .rule { height: 1px; background: #e2e8f0; margin: 3px 0 0; }
  .addressee { margin: 18px 0 12px; font-size: 13px; line-height: 1.7; }
  .addressee .org { font-size: 14px; font-weight: 800; text-transform: uppercase; }
  .subject { font-weight: 700; font-size: 13px; margin: 14px 0; padding: 7px 0; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
  .para { text-align: justify; margin-bottom: 12px; }
  table.roster { width: 100%; border-collapse: collapse; margin: 14px 0 16px; font-size: 11px; }
  table.roster th { background: #f1f5f9; text-align: left; font-weight: 700; padding: 7px 8px; border: 1px solid #94a3b8; }
  table.roster td { padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
  table.roster tr { page-break-inside: avoid; }
  table.roster .nm { font-weight: 700; text-transform: uppercase; }
  table.roster .sub { color: #64748b; font-size: 10px; }
  table.spec { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  table.spec th, table.spec td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; vertical-align: top; }
  table.spec th { background: #f8fafc; width: 32%; font-weight: 700; }
  .signatures { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 56px; page-break-inside: avoid; }
  .sig { width: 230px; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; font-weight: 700; }
  .sig small { display: block; font-weight: 400; color: #64748b; font-size: 10px; }
  .stamp { height: 64px; border: 1px dashed #94a3b8; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
  .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #64748b; }
  .client-head { text-align: center; padding-bottom: 12px; border-bottom: 3px double #0f172a; }
  .client-head .name { font-size: 19px; font-weight: 800; text-transform: uppercase; }
  .client-head .addr { font-size: 11px; color: #475569; margin-top: 3px; }
  .client-head .kind { font-size: 10px; letter-spacing: .4px; color: #64748b; margin-top: 4px; }
  .refrow { display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; margin-top: 18px; }
  .to-box { margin-top: 14px; padding: 12px 14px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; }
  .to-box .org { font-size: 14px; font-weight: 800; color: #b91c1c; }
  .subject-box { border-left: 4px solid #b91c1c; background: #f1f5f9; padding: 9px 14px; font-weight: 700; font-size: 12px; margin: 18px 0; }
  @media print { .sheet { padding: 0; } }
`;

interface DocContext {
  docType: DocType;
  client: ClientForm;
  guards: GuardPostingEntry[];
  refNo: string;
}

const buildPostingOrderHtml = ({ client, guards, refNo }: DocContext): string => {
  const rows = guards
    .map(
      (g, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><div class="nm">${esc(g.name) || '—'}</div><div class="sub">${esc(g.nationality)}</div></td>
        <td class="nm">${esc(g.fatherName) || '—'}</td>
        <td>${esc(g.post)}</td>
        <td>${esc(g.address) || '—'}<div class="sub">${esc(g.district)}, ${esc(g.state)}</div></td>
        <td>${g.phone ? '+91 ' + esc(g.phone) : '—'}</td>
        <td>${esc(formatDate(g.issueDate))}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="sheet">
      <div class="letterhead">
        <div>
          <div class="brand-en">${esc(COMPANY.nameEn)}</div>
          <div class="brand-hi">${esc(COMPANY.tagline)}</div>
          <div class="brand-lic">Licence No: ${esc(COMPANY.licence)} • Indore HQ</div>
        </div>
        <div class="meta">
          <div>दिनांक: ${esc(formatDate(todayISO()))}</div>
          <div class="ref">क्रमांक: ${esc(refNo)}</div>
        </div>
      </div>

      <div class="addressee">
        <strong>प्रति,</strong><br>
        श्रीमान प्रबंधक महोदय / संचालक,<br>
        <span class="org">${esc(client.clientName)}</span><br>
        ${esc(client.clientAddress)}
      </div>

      <div class="subject">विषय: गार्ड की नियुक्ति हेतु।</div>

      <p class="para">
        आपको सूचित किया जाता है कि हमारी एजेंसी, ${esc(COMPANY.nameHi)}, आपकी संस्था में गार्ड सेवा हेतु
        निम्नलिखित प्रशिक्षित कर्मचारियों को उपलब्ध करा रही है।
      </p>

      <table class="roster">
        <thead>
          <tr>
            <th>क्र.</th><th>नाम</th><th>पिता का नाम</th><th>पद</th>
            <th>पता</th><th>मोबाइल नं.</th><th>जारी दिनांक</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p class="para">
        आपसे निवेदन है कि हमारी संस्था के उक्त कर्मचारियों को आपकी संस्था में नियुक्त करने का कष्ट करें।<br>
        धन्यवाद।
      </p>

      <div class="signatures">
        <div class="sig">स्वीकृति / संस्था मुहर<small>(क्लाइंट प्रबंधन के हस्ताक्षर)</small></div>
        <div class="sig">भवदीय,<br>${esc(COMPANY.nameHi)}<small>डायरेक्टर ${esc(COMPANY.directorHi)}</small></div>
      </div>

      <div class="footer">
        केंद्रीय कार्यालय: ${esc(COMPANY.officeHi)} • संपर्क: ${esc(COMPANY.phone)} • ${esc(COMPANY.email)}
      </div>
    </div>`;
};

const buildInvitationHtml = ({ client, refNo }: DocContext): string => `
  <div class="sheet">
    <div class="client-head">
      <div class="name">${esc(client.clientName)}</div>
      <div class="addr">${esc(client.clientAddress)}${client.contactPhone ? ' • Contact: +91 ' + esc(client.contactPhone) : ''}</div>
      <div class="kind">Site survey invitation</div>
    </div>

    <div class="refrow">
      <div>Ref. No: ${esc(refNo)}</div>
      <div>Date: ${esc(formatDate(todayISO()))}</div>
    </div>

    <div class="to-box">
      To,<br>
      <div class="org">The Managing Director</div>
      <strong>${esc(COMPANY.nameEn)}</strong><br>
      ${esc(COMPANY.office)}
    </div>

    <div class="subject-box">
      Subject: Invitation for on-site physical security survey and proposal submission
    </div>

    <p class="para">
      Dear Sir,<br><br>
      Further to our telephonic conversation regarding security guarding and housekeeping services,
      we invite your authorised assessment officer to visit our premises for an on-site physical
      security survey.
    </p>

    <table class="spec">
      <tr><th>Survey date and time</th><td><strong>${esc(formatDate(client.visitDate))}</strong> at <strong>${esc(client.visitTime)}</strong></td></tr>
      <tr><th>Premises</th><td>${esc(client.clientAddress)}</td></tr>
      <tr><th>Manpower requirement</th><td>${esc(client.guardRequirement)}</td></tr>
      <tr><th>Survey agenda</th><td>${esc(client.agendaReason)}</td></tr>
      <tr><th>Attention</th><td>Director ${esc(COMPANY.directorEn)} / Inspection team</td></tr>
    </table>

    <p class="para">
      Gate clearance and administrative access will be arranged on your team's arrival. After the
      survey, please share your PSARA-compliant rate proposal.
    </p>

    <div class="signatures">
      <div>
        <div class="stamp">Client stamp</div>
        <div class="sig">${esc(client.contactPerson)}<small>Authorised signatory</small></div>
      </div>
      <div>
        <div style="height:72px"></div>
        <div class="sig">Acknowledged by VSF desk<small>Travel clearance granted</small></div>
      </div>
    </div>

    <div class="footer">
      Issued for an authorised, PSARA-compliant site inspection • ${esc(COMPANY.phone)} • ${esc(COMPANY.email)}
    </div>
  </div>`;

const buildDocumentHtml = (ctx: DocContext, title: string): string => `<!DOCTYPE html>
<html lang="hi">
  <head>
    <meta charset="utf-8">
    <title>${esc(title)}</title>
    ${FONT_LINK}
    <style>${BASE_CSS}</style>
  </head>
  <body>
    ${ctx.docType === 'POSTING_ORDER' ? buildPostingOrderHtml(ctx) : buildInvitationHtml(ctx)}
  </body>
</html>`;

/** Prints HTML through a hidden iframe: not affected by popup blockers. */
const printHtml = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  iframe.onload = async () => {
    const win = iframe.contentWindow;
    if (!win) return;
    try {
      await Promise.race([
        (win.document as any).fonts?.ready,
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    } catch {
      /* fonts are optional; fall back to system fonts */
    }
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 2000);
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
};

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

const inputBase =
  'w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-700/20';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ id, label, required, hint, error, className = '', children }) => (
  <div className={`space-y-1 ${className}`}>
    <label htmlFor={id} className="text-xs font-semibold text-slate-700">
      {label}
      {required && <span className="text-red-700"> *</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
    {error && <p className="text-[11px] text-red-700">This field is required.</p>}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export const DocumentsDesk: React.FC = () => {
  const navigate = useNavigate();

  const [docType, setDocType] = useState<DocType>('POSTING_ORDER');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitSearch, setVisitSearch] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [touched, setTouched] = useState(false);

  // Reference numbers are generated once, then editable. Reprinting keeps the same number.
  const [refNos, setRefNos] = useState<Record<DocType, string>>(() => ({
    POSTING_ORDER: makeRef('PO'),
    CLIENT_INVITATION: makeRef('INV')
  }));

  const [clientForm, setClientForm] = useState<ClientForm>({
    clientName: '',
    clientAddress: '',
    contactPerson: '',
    contactPhone: '',
    city: 'Indore',
    visitDate: todayISO(),
    visitTime: '11:00 AM',
    guardRequirement: '',
    agendaReason: 'Perimeter boundary audit and gate manning security assessment'
  });

  const [guardList, setGuardList] = useState<GuardPostingEntry[]>([newGuard()]);

  /* ---------------------------- Load past visits --------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.request('/visits');
        if (!cancelled && Array.isArray(data)) setVisits(data as Visit[]);
      } catch (err) {
        console.error('Failed to load visits:', err);
      } finally {
        if (!cancelled) setVisitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------- Handlers -------------------------------- */
  const setClient = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) =>
    setClientForm((prev) => ({ ...prev, [key]: value }));

  const readVisit = (v: Visit) => {
    const r = v as unknown as Record<string, any>;
    const notes: string = r.notes || '';
    const follow: string = r.nextFollowUp || '';
    return {
      id: String(r.id),
      company: String(r.companyName || r.company_name || ''),
      person: String(r.contactPerson || r.contact_person || ''),
      phone: String(r.phoneNumber || r.phone_number || ''),
      city: String(r.city || ''),
      address: notes.match(/Address:\s*([^|]+)/i)?.[1]?.trim() || '',
      followUp: /^\d{4}-\d{2}-\d{2}/.test(follow) ? follow.slice(0, 10) : ''
    };
  };

  const handleAutofillVisit = (visitId: string) => {
    const found = visits.find((item) => String((item as any).id) === visitId);
    if (!found) return;
    const v = readVisit(found);
    setSelectedVisitId(visitId);
    setClientForm((prev) => ({
      ...prev,
      clientName: v.company.toUpperCase(),
      clientAddress: v.address || prev.clientAddress,
      contactPerson: v.person,
      contactPhone: onlyDigits(v.phone.replace(/\D/g, '').slice(-10)),
      city: v.city || prev.city,
      visitDate: v.followUp || prev.visitDate
    }));
  };

  const handleAddGuard = () => setGuardList((prev) => [...prev, newGuard()]);

  const handleDuplicateGuard = (id: string) =>
    setGuardList((prev) => {
      const idx = prev.findIndex((g) => g.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      // Keep post, address and location; clear personal identifiers.
      const copy = newGuard({ post: src.post, address: src.address, district: src.district, state: src.state, nationality: src.nationality, issueDate: src.issueDate });
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });

  const handleRemoveGuard = (id: string) =>
    setGuardList((prev) => (prev.length === 1 ? prev : prev.filter((g) => g.id !== id)));

  const handleUpdateGuard = (id: string, field: keyof GuardPostingEntry, value: string) =>
    setGuardList((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));

  /* ------------------------------ Validation ------------------------------- */
  const issues = useMemo(() => {
    const list: string[] = [];
    if (!clientForm.clientName.trim()) list.push('Client name is missing');
    if (!clientForm.clientAddress.trim()) list.push('Client address is missing');

    if (docType === 'POSTING_ORDER') {
      guardList.forEach((g, i) => {
        const n = i + 1;
        if (!g.name.trim()) list.push(`Guard ${n}: name is missing`);
        if (!g.fatherName.trim()) list.push(`Guard ${n}: father's name is missing`);
        if (!g.address.trim()) list.push(`Guard ${n}: address is missing`);
        if (g.phone.length !== 10) list.push(`Guard ${n}: mobile number needs 10 digits`);
      });
    } else {
      if (!clientForm.visitDate) list.push('Survey date is missing');
      if (!clientForm.visitTime.trim()) list.push('Survey time is missing');
      if (!clientForm.agendaReason.trim()) list.push('Survey agenda is missing');
    }
    return list;
  }, [clientForm, guardList, docType]);

  const canPrint = issues.length === 0;

  /* ------------------------------ Document HTML ---------------------------- */
  const documentHtml = useMemo(
    () =>
      buildDocumentHtml(
        { docType, client: clientForm, guards: guardList, refNo: refNos[docType] },
        `${docType === 'POSTING_ORDER' ? 'Posting Order' : 'Client Invitation'} - ${clientForm.clientName}`
      ),
    [docType, clientForm, guardList, refNos]
  );

  const handlePrint = () => {
    setTouched(true);
    if (!canPrint) return;
    printHtml(documentHtml);
  };

  const handleWhatsApp = () => {
    setTouched(true);
    const phone = onlyDigits(clientForm.contactPhone);
    if (phone.length !== 10) return;
    const label = docType === 'POSTING_ORDER' ? 'guard posting order' : 'site visit invitation';
    const text =
      `*${COMPANY.nameEn}*\n` +
      `${COMPANY.tagline}\n\n` +
      `Dear ${clientForm.clientName},\n` +
      `Your ${label} (Ref: ${refNos[docType]}) has been issued. We will share the signed copy shortly.\n\n` +
      `Director ${COMPANY.directorEn}: +91 ${COMPANY.phone}`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    const mapped = visits.map(readVisit);
    return (q ? mapped.filter((v) => `${v.company} ${v.person} ${v.phone}`.toLowerCase().includes(q)) : mapped).slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, visitSearch]);

  const whatsappReady = onlyDigits(clientForm.contactPhone).length === 10;
  const showErrors = touched;

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* Header */}
      <header className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-slate-500 hover:text-red-700 flex items-center gap-1 mb-1 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to command centre</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Documents desk</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create guard posting orders and client site-survey invitations on company letterhead.
          </p>
        </div>

        <div role="tablist" aria-label="Document type" className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
          {([
            ['POSTING_ORDER', 'Posting order (तैनाती आदेश)'],
            ['CLIENT_INVITATION', 'Client invitation']
          ] as [DocType, string][]).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={docType === key}
              type="button"
              onClick={() => setDocType(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                docType === key ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Builder */}
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {docType === 'POSTING_ORDER' ? 'Client and deployment details' : 'Client and survey details'}
              </h2>
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                {docType === 'POSTING_ORDER'
                  ? `${guardList.length} ${guardList.length === 1 ? 'guard' : 'guards'}`
                  : 'Pre-visit'}
              </span>
            </div>

            {/* Client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="clientName" label="Client organisation" required error={showErrors && !clientForm.clientName.trim()}>
                <input
                  id="clientName"
                  value={clientForm.clientName}
                  onChange={(e) => setClient('clientName', e.target.value.toUpperCase())}
                  placeholder="School, factory or company name"
                  className={`${inputBase} font-semibold uppercase`}
                />
              </Field>

              <Field id="clientAddress" label="Premises address" required error={showErrors && !clientForm.clientAddress.trim()}>
                <input
                  id="clientAddress"
                  value={clientForm.clientAddress}
                  onChange={(e) => setClient('clientAddress', e.target.value)}
                  placeholder="Street, area, city"
                  className={inputBase}
                />
              </Field>

              <Field id="contactPerson" label="Contact person">
                <input
                  id="contactPerson"
                  value={clientForm.contactPerson}
                  onChange={(e) => setClient('contactPerson', e.target.value)}
                  placeholder="Name and designation"
                  className={inputBase}
                />
              </Field>

              <Field
                id="contactPhone"
                label="Client mobile number"
                hint="10 digits, used for the WhatsApp message"
              >
                <input
                  id="contactPhone"
                  inputMode="numeric"
                  value={clientForm.contactPhone}
                  onChange={(e) => setClient('contactPhone', onlyDigits(e.target.value))}
                  placeholder="9XXXXXXXXX"
                  className={`${inputBase} font-mono`}
                />
              </Field>

              <Field id="refNo" label="Reference number" hint="Stays the same each time you print" className="sm:col-span-2">
                <div className="flex gap-2">
                  <input
                    id="refNo"
                    value={refNos[docType]}
                    onChange={(e) => setRefNos((p) => ({ ...p, [docType]: e.target.value }))}
                    className={`${inputBase} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setRefNos((p) => ({ ...p, [docType]: makeRef(docType === 'POSTING_ORDER' ? 'PO' : 'INV') }))}
                    className="px-3 rounded-xl border border-slate-300 text-slate-600 hover:text-red-700 hover:border-red-700 transition cursor-pointer"
                    title="Generate a new reference number"
                    aria-label="Generate a new reference number"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </Field>
            </div>

            {/* Doc-specific */}
            {docType === 'POSTING_ORDER' ? (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Deployed guards (कर्मचारी विवरण)</h3>
                    <p className="text-xs text-slate-500">Enter details for each guard. Use Duplicate to reuse the post and address.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddGuard}
                    className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus size={14} />
                    <span>Add guard</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {guardList.map((guard, index) => {
                    const p = `g${index}`;
                    return (
                      <div key={guard.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-sm font-bold text-slate-900">Guard {index + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateGuard(guard.id)}
                              className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg cursor-pointer"
                              title="Duplicate post and address"
                              aria-label={`Duplicate guard ${index + 1}`}
                            >
                              <Copy size={15} />
                            </button>
                            {guardList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGuard(guard.id)}
                                className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg cursor-pointer"
                                title="Remove guard"
                                aria-label={`Remove guard ${index + 1}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Field id={`${p}-name`} label="नाम (Full name)" required error={showErrors && !guard.name.trim()}>
                            <input
                              id={`${p}-name`}
                              value={guard.name}
                              onChange={(e) => handleUpdateGuard(guard.id, 'name', e.target.value.toUpperCase())}
                              className={`${inputBase} font-semibold uppercase`}
                            />
                          </Field>

                          <Field id={`${p}-father`} label="पिता का नाम (Father's name)" required error={showErrors && !guard.fatherName.trim()}>
                            <input
                              id={`${p}-father`}
                              value={guard.fatherName}
                              onChange={(e) => handleUpdateGuard(guard.id, 'fatherName', e.target.value.toUpperCase())}
                              className={`${inputBase} font-semibold uppercase`}
                            />
                          </Field>

                          <Field id={`${p}-post`} label="पद (Post and shift)">
                            <input
                              id={`${p}-post`}
                              value={guard.post}
                              onChange={(e) => handleUpdateGuard(guard.id, 'post', e.target.value.toUpperCase())}
                              className={`${inputBase} font-semibold uppercase`}
                            />
                          </Field>

                          <Field id={`${p}-date`} label="जारी दिनांक (Issue date)">
                            <input
                              id={`${p}-date`}
                              type="date"
                              value={guard.issueDate}
                              onChange={(e) => handleUpdateGuard(guard.id, 'issueDate', e.target.value)}
                              className={inputBase}
                            />
                          </Field>

                          <Field
                            id={`${p}-phone`}
                            label="मोबाइल नं. (Mobile)"
                            required
                            hint={guard.phone && guard.phone.length !== 10 ? `${guard.phone.length}/10 digits` : undefined}
                            error={showErrors && guard.phone.length !== 10}
                          >
                            <input
                              id={`${p}-phone`}
                              inputMode="numeric"
                              value={guard.phone}
                              onChange={(e) => handleUpdateGuard(guard.id, 'phone', onlyDigits(e.target.value))}
                              placeholder="10 digits"
                              className={`${inputBase} font-mono`}
                            />
                          </Field>

                          <Field id={`${p}-nat`} label="राष्ट्रीयता (Nationality)">
                            <input
                              id={`${p}-nat`}
                              value={guard.nationality}
                              onChange={(e) => handleUpdateGuard(guard.id, 'nationality', e.target.value)}
                              className={inputBase}
                            />
                          </Field>

                          <Field id={`${p}-addr`} label="स्थायी पता (Permanent address)" required error={showErrors && !guard.address.trim()} className="sm:col-span-3">
                            <input
                              id={`${p}-addr`}
                              value={guard.address}
                              onChange={(e) => handleUpdateGuard(guard.id, 'address', e.target.value)}
                              placeholder="Village or locality, tehsil"
                              className={inputBase}
                            />
                          </Field>

                          <Field id={`${p}-district`} label="जिला (District)" className="sm:col-span-2">
                            <input
                              id={`${p}-district`}
                              value={guard.district}
                              onChange={(e) => handleUpdateGuard(guard.id, 'district', e.target.value)}
                              className={inputBase}
                            />
                          </Field>

                          <Field id={`${p}-state`} label="राज्य (State)">
                            <input
                              id={`${p}-state`}
                              value={guard.state}
                              onChange={(e) => handleUpdateGuard(guard.id, 'state', e.target.value)}
                              className={inputBase}
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Survey details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="visitDate" label="Survey date" required error={showErrors && !clientForm.visitDate}>
                    <input
                      id="visitDate"
                      type="date"
                      value={clientForm.visitDate}
                      onChange={(e) => setClient('visitDate', e.target.value)}
                      className={inputBase}
                    />
                  </Field>

                  <Field id="visitTime" label="Survey time" required error={showErrors && !clientForm.visitTime.trim()}>
                    <input
                      id="visitTime"
                      value={clientForm.visitTime}
                      onChange={(e) => setClient('visitTime', e.target.value)}
                      placeholder="11:00 AM"
                      className={inputBase}
                    />
                  </Field>

                  <Field id="guardReq" label="Manpower requirement" className="sm:col-span-2">
                    <input
                      id="guardReq"
                      value={clientForm.guardRequirement}
                      onChange={(e) => setClient('guardRequirement', e.target.value)}
                      placeholder="e.g. 12 guards, 12-hour shifts"
                      className={inputBase}
                    />
                  </Field>

                  <Field id="agenda" label="Survey agenda" required error={showErrors && !clientForm.agendaReason.trim()} className="sm:col-span-2">
                    <input
                      id="agenda"
                      value={clientForm.agendaReason}
                      onChange={(e) => setClient('agendaReason', e.target.value)}
                      className={inputBase}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* Validation summary */}
            {showErrors && issues.length > 0 && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertCircle size={16} />
                  <span>Complete these before printing</span>
                </div>
                <ul className="list-disc pl-6 space-y-0.5">
                  {issues.slice(0, 6).map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                  {issues.length > 6 && <li>and {issues.length - 6} more</li>}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handlePrint}
                aria-disabled={!canPrint}
                className={`flex-1 py-3.5 font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                  canPrint ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Printer size={17} />
                <span>Print {docType === 'POSTING_ORDER' ? 'posting order' : 'invitation'} (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreview((s) => !s)}
                className="py-3.5 px-5 border border-slate-300 text-slate-700 hover:border-red-700 hover:text-red-700 font-semibold text-sm rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showPreview ? 'Hide preview' : 'Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                disabled={!whatsappReady}
                title={whatsappReady ? 'Opens WhatsApp with a notification message' : 'Enter a 10-digit client mobile number first'}
                className="py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={16} />
                <span>Notify on WhatsApp</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              WhatsApp sends a text notification only. To share the document itself, choose "Save as PDF" in the print dialog and attach the file.
            </p>
          </div>

          {/* Live preview */}
          {showPreview && (
            <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-sm">
              <iframe
                title="Document preview"
                srcDoc={documentHtml}
                className="w-full rounded-2xl border border-slate-100 bg-white"
                style={{ height: 900 }}
              />
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fill from a past visit</h2>
              <p className="text-xs text-slate-500">Select a client to load their details into the form.</p>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={visitSearch}
                onChange={(e) => setVisitSearch(e.target.value)}
                placeholder="Search by name or number"
                aria-label="Search past visits"
                className={`${inputBase} pl-9`}
              />
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {visitsLoading ? (
                <p className="text-sm text-slate-400 py-6 text-center">Loading visits…</p>
              ) : filteredVisits.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  {visits.length === 0 ? 'No visits recorded yet.' : 'No visits match your search.'}
                </p>
              ) : (
                filteredVisits.map((v) => {
                  const active = selectedVisitId === v.id;
                  return (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => handleAutofillVisit(v.id)}
                      aria-pressed={active}
                      className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer ${
                        active ? 'border-red-700 bg-red-50/50 ring-1 ring-red-700' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 uppercase truncate">{v.company || 'Unnamed client'}</span>
                        {active && <CheckCircle2 size={15} className="text-red-700 shrink-0" />}
                      </span>
                      <span className="block text-xs text-slate-500 truncate mt-0.5">
                        {v.person || 'No contact name'}
                        {v.phone ? ` • +91 ${v.phone}` : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Readiness */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-2">Ready to print?</h2>
            {canPrint ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 size={16} />
                All required details are filled in.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                {issues.length} {issues.length === 1 ? 'item needs' : 'items need'} attention before printing.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DocumentsDesk;
