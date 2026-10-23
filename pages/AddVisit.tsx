import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  User,
  Building2,
  Phone,
  Send,
  Loader2,
  Trash2,
  AlertCircle,
  FileText,
  Tag,
  X,
  CameraIcon,
  Target,
  Calendar,
  IndianRupee,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Users,
  Clock,
  ExternalLink,
  Crosshair,
  Navigation,
  Printer,
  ShieldCheck,
  Plus,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canvasToCompressedDataUrl } from '../services/imageCompress';
import { Location, VisitPurpose, InteractionOutcome, Role } from '../types';
import { api } from '../services/apiService';
import { saveVisitOffline } from '../services/offlineSync';

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

const VISIT_PURPOSES: { value: VisitPurpose; label: string }[] = [
  { value: 'COLD_CALL', label: 'Initial Site Inspection / Introduction' },
  { value: 'FOLLOW_UP', label: 'Commercial Follow-Up Meeting' },
  { value: 'CLOSING', label: 'Contract Finalization / Guard Deployment' }
];

const INTERACTION_OUTCOMES: { value: InteractionOutcome; label: string }[] = [
  { value: 'INTERESTED', label: 'Interested in Security Proposal' },
  { value: 'DEMO_SCHEDULED', label: 'Site Survey / Next Meeting Fixed' },
  { value: 'CALLBACK', label: 'Call Back Later for Quote' },
  { value: 'DISCUSSED', label: 'Rate Brochure Handed Over' },
  { value: 'NOT_INTERESTED', label: 'Not Interested at Present' }
];

interface AccountOption {
  id: string;
  isRealLead: boolean;
  companyName: string;
  contactPerson: string;
  phone: string;
  address?: string;
  category?: string;
  estimatedValue?: number | string;
}

type FormStep = 'VISIT_TYPE' | 'CLIENT_DETAILS' | 'MEETING_OUTCOME' | 'VERIFICATION';
const STEPS: FormStep[] = ['VISIT_TYPE', 'CLIENT_DETAILS', 'MEETING_OUTCOME', 'VERIFICATION'];

interface ServiceRequirementRow {
  role: string;
  enabled: boolean;
  count: number;
  shift: '12_HOURS' | '8_HOURS';
}

export const AddVisit: React.FC = () => {
  const { user, settings } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === Role.ADMIN;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGpsLocking, setIsGpsLocking] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState('');

  const [visitType, setVisitType] = useState<'new' | 'followup'>('new');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [accountList, setAccountList] = useState<AccountOption[]>([]);
  const [isAccountLoading, setIsAccountLoading] = useState(false);

  const [cameraActive, setCameraActive] = useState<{ active: boolean; type: 'board' | 'rep' }>({
    active: false,
    type: 'board'
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    category: 'COMMERCIAL COMPLEX',
    phone: '',
    contactPerson: '',
    notes: '',
    leadId: '' as string | null,
    visitPurpose: 'COLD_CALL' as VisitPurpose,
    interactionOutcome: 'DISCUSSED' as InteractionOutcome,
    estimatedValue: '',
    nextFollowUp: ''
  });

  const [serviceRequirements, setServiceRequirements] = useState<Record<string, ServiceRequirementRow>>({
    guard: { role: 'Security Guard', enabled: true, count: 2, shift: '12_HOURS' },
    supervisor: { role: 'Field Supervisor', enabled: false, count: 1, shift: '12_HOURS' },
    gunman: { role: 'Armed Gunman', enabled: false, count: 1, shift: '12_HOURS' },
    housekeeping: { role: 'Housekeeping Staff', enabled: false, count: 2, shift: '8_HOURS' }
  });

  const [customRoles, setCustomRoles] = useState<{ id: string; name: string; count: number; shift: '12_HOURS' | '8_HOURS' }[]>([]);

  const [photos, setPhotos] = useState<{ board: string | null; rep: string | null }>({
    board: null,
    rep: null
  });

  useEffect(() => {
    const fetchAvailableAccounts = async () => {
      if (!user?.id) return;
      setIsAccountLoading(true);
      try {
        const leadsUrl = isAdmin ? '/leads' : `/leads?assignedTo=${user.id}`;
        const visitsUrl = isAdmin ? '/visits' : `/visits?rep_id=${user.id}`;

        const [leadsRes, visitsRes] = await Promise.allSettled([
          api.request(leadsUrl),
          api.request(visitsUrl)
        ]);

        const combinedMap = new Map<string, AccountOption>();

        if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) {
          leadsRes.value.forEach((l: any) => {
            const name = (l.companyName || l.company_name || '').trim();
            if (name) {
              combinedMap.set(name.toLowerCase(), {
                id: l.id,
                isRealLead: true,
                companyName: name.toUpperCase(),
                contactPerson: l.contactPerson || l.contact_person || '',
                phone: l.phone || l.phoneNumber || l.phone_number || '',
                address: l.address || '',
                category: l.category || 'COMMERCIAL COMPLEX',
                estimatedValue: l.estimatedValue || l.estimated_value || ''
              });
            }
          });
        }

        if (visitsRes.status === 'fulfilled' && Array.isArray(visitsRes.value)) {
          visitsRes.value.forEach((v: any) => {
            const name = (v.companyName || v.company_name || '').trim();
            if (name && !combinedMap.has(name.toLowerCase())) {
              let cleanAddr = '';
              if (v.notes) {
                const match = v.notes.match(/Address:\s*([^|]+)/i);
                if (match && match[1]) cleanAddr = match[1].trim();
              }

              combinedMap.set(name.toLowerCase(), {
                id: v.id,
                isRealLead: false,
                companyName: name.toUpperCase(),
                contactPerson: v.contactPerson || v.contact_person || '',
                phone: v.phoneNumber || v.phone_number || v.phone || '',
                address: cleanAddr,
                category: v.category || 'COMMERCIAL COMPLEX',
                estimatedValue: ''
              });
            }
          });
        }

        setAccountList(Array.from(combinedMap.values()));
      } catch (err) {
        console.error('Failed to load pipeline accounts:', err);
      } finally {
        setIsAccountLoading(false);
      }
    };

    fetchAvailableAccounts();
  }, [user, isAdmin]);

  const handleLeadSelection = (accountId: string) => {
    setSelectedAccountId(accountId);
    if (!accountId) {
      setFormData((prev) => ({
        ...prev,
        leadId: null,
        companyName: '',
        address: '',
        phone: '',
        contactPerson: ''
      }));
      return;
    }
    const selected = accountList.find((l) => l.id === accountId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        leadId: selected.isRealLead ? selected.id : null,
        companyName: selected.companyName,
        phone: (selected.phone || '').replace(/\D/g, '').slice(0, 10),
        contactPerson: selected.contactPerson,
        address: selected.address || '',
        category: selected.category || prev.category,
        visitPurpose: 'FOLLOW_UP',
        estimatedValue: selected.estimatedValue ? selected.estimatedValue.toString() : prev.estimatedValue
      }));
    }
  };

  const handleCaptureRealLocation = async () => {
    setIsGpsLocking(true);
    setLocationError('');

    try {
      // @ts-ignore
      if (window?.Capacitor?.isPluginAvailable?.('Geolocation')) {
        // @ts-ignore
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });

        if (pos?.coords) {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 5)
          });
          setIsGpsLocking(false);
          return;
        }
      }
    } catch (nativeErr) {
      console.warn('Native GPS fallback to navigator:', nativeErr);
    }

    if (!navigator.geolocation) {
      setLocationError('GPS sensor not available on this terminal.');
      setIsGpsLocking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          latitude,
          longitude,
          accuracy: Math.round(accuracy || 5)
        });
        setLocationError('');
        setIsGpsLocking(false);
      },
      (error) => {
        let msg = 'Failed to lock coordinates. Verify device GPS is active.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location in settings.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Satellite acquisition timed out. Ensure open sky view.';
        }
        setLocationError(msg);
        setIsGpsLocking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const startCamera = async (type: 'board' | 'rep') => {
    setCameraActive({ active: true, type });
    try {
      const constraints = {
        video: {
          facingMode: type === 'board' ? 'environment' : 'user',
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert('Camera access is required for inspection visual verification.');
      setCameraActive({ active: false, type: 'board' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive({ active: false, type: 'board' });
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          video,
          (video.videoWidth - size) / 2,
          (video.videoHeight - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );
        const dataUrl = canvasToCompressedDataUrl(canvas, { maxSize: 1024, quality: 0.7 });
        setPhotos((prev) => ({ ...prev, [cameraActive.type]: dataUrl }));
        stopCamera();
      }
    }
  };

const handlePrintSurveyLetter = () => {
    if (!formData.companyName.trim()) {
      alert('Please fill the establishment name first.');
      return;
    }

    const activeManning = [
      ...Object.values(serviceRequirements)
        .filter((s) => s.enabled)
        .map((s) => `${s.count} ${s.role} (${s.shift === '12_HOURS' ? '12 Hrs' : '8 Hrs'})`),
      ...customRoles.map((c) => `${c.count} ${c.name} (${c.shift === '12_HOURS' ? '12 Hrs' : '8 Hrs'})`)
    ].join(', ');

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const companyTitle = settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES';
    const companyAddress = settings?.address || '012 A BLOCK TREASURE TOWN INDORE, MP';
    const psaraLic = settings?.psaraLicense || 'PSA/L/74/MP/2023/FEB/3/425';
    const directorName = settings?.directorName || 'Anil Dhariwal';
    // Resolves to Vite served asset path or settings logo
    const logoSrc = settings?.logo || '/assets/logo.png';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>VSF - Site Inspection Requisition - ${esc(formData.companyName)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { padding: 36px; color: #0f172a; line-height: 1.5; background: #fff; }
            .sheet { border: 2px solid #b91c1c; padding: 32px; border-radius: 14px; max-width: 780px; margin: 0 auto; min-height: 960px; display: flex; flex-direction: column; justify-content: space-between; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fecdd3; padding-bottom: 16px; gap: 16px; }
            .brand-left { display: flex; align-items: center; gap: 14px; }
            .logo-img { width: 62px; height: 62px; object-fit: contain; }
            .logo-title { font-size: 15px; font-weight: 900; color: #b91c1c; text-transform: uppercase; line-height: 1.2; }
            .license { font-size: 9.5px; font-family: monospace; font-weight: 700; color: #9a3412; margin-top: 3px; }
            .client-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 18px 0; }
            .subject { background: #fef2f2; border: 1px solid #fecaca; padding: 9px 12px; font-weight: 900; color: #991b1b; font-size: 11.5px; border-radius: 8px; margin: 14px 0; text-transform: uppercase; }
            .table-box { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11.5px; }
            .table-box th, .table-box td { border: 1px solid #cbd5e1; padding: 8px 10px; }
            .table-box th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; text-align: left; }
            .auth-box { border: 2px dashed #94a3b8; border-radius: 10px; padding: 16px; margin-top: 20px; background: #fafafa; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
            .sig-line { border-top: 1px solid #475569; width: 200px; text-align: center; font-size: 9.5px; font-weight: bold; text-transform: uppercase; padding-top: 5px; }
            @media print { body { padding: 0; } .sheet { border: 2px solid #000; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div>
              <div class="header">
                <div class="brand-left">
                  <img
                    src="${logoSrc}"
                    alt="VSF Logo"
                    class="logo-img"
                    onerror="this.style.display='none'"
                  />
                  <div>
                    <div class="logo-title">${esc(companyTitle)}</div>
                    <div style="font-size: 11px; font-weight: 900; color: #1e3a8a; margin-top: 2px;">संरक्षण एवं सुरक्षा &bull; PSARA MP LICENSED</div>
                    <div class="license">LIC: ${esc(psaraLic)} &bull; INDORE HQ</div>
                  </div>
                </div>
                <div style="text-align: right; font-size: 10px; font-weight: bold; shrink-0;">
                  <div>DATE: ${new Date().toLocaleDateString('en-IN')}</div>
                  <div style="color: #b91c1c; margin-top: 2px;">REF: VSF/SVR/${Math.floor(100000 + Math.random() * 900000)}</div>
                </div>
              </div>

              <div class="client-card">
                <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">To Organization:</span>
                <div style="font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${esc(formData.companyName)}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">Attention: <strong>${esc(formData.contactPerson || 'Authorized Authority')}</strong> &bull; Contact: +91 ${esc(formData.phone || 'N/A')}</div>
                <div style="font-size: 10px; color: #64748b;">Premises: ${esc(formData.address || 'Site Premises')}</div>
              </div>

              <div class="subject">
                Subject: Advance Authorization &amp; Site Security Survey Docket
              </div>

              <p style="font-size: 11.5px; color: #334155; margin-bottom: 12px; text-align: justify;">
                Dear Sir/Madam,<br><br>
                Pursuant to communication regarding security guarding deployment at your establishment, ${esc(companyTitle)} has scheduled an on-site physical inspection to review security post positions, entry/exit gates, and manning specifications.
              </p>

              <table class="table-box">
                <tr><th width="35%">Proposed Inspection Date</th><td><strong>${formData.nextFollowUp || new Date().toISOString().split('T')[0]}</strong></td></tr>
                <tr><th>Manning Post Scopes</th><td>${esc(activeManning || 'Static Guard Manning')}</td></tr>
                <tr><th>Assigned Officer</th><td>${esc(user?.name || directorName)} (HQ Direct: +91 9826259292)</td></tr>
              </table>

              <div class="auth-box">
                <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase;">Client Site Visit Requisition &amp; Gate Entry Authorization</div>
                <p style="font-size: 10.5px; color: #475569; margin-top: 4px;">
                  We hereby confirm the proposed site visit and authorize the representative of ${esc(companyTitle)} to inspect our premises for physical survey and commercial quotation presentation.
                </p>
                <div class="sig-row">
                  <div class="sig-line">Client Stamp &amp; Signature<br><span style="font-size: 8px; color: #64748b; font-weight: normal;">(Authorized Management)</span></div>
                  <div class="sig-line">For ${esc(companyTitle)}<br><span style="font-size: 8px; color: #64748b; font-weight: normal;">Central Command Desk &bull; ${esc(directorName)}</span></div>
                </div>
              </div>
            </div>

            <div style="text-align: center; font-size: 8.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
              HEAD OFFICE: ${esc(companyAddress)} &bull; Phone: 9826259292 &bull; contact@vidhyasecurityforce.in
            </div>
          </div>
          <script>
            // Ensure image loads before firing window.print
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const validateStep = (): boolean => {
    const currentStep = STEPS[currentStepIndex];

    if (currentStep === 'VISIT_TYPE' && visitType === 'followup' && !selectedAccountId) {
      alert('Please choose an existing client or visit from the pipeline dropdown.');
      return false;
    }

    if (currentStep === 'CLIENT_DETAILS') {
      if (!formData.companyName.trim()) {
        alert('Please provide the company or establishment name.');
        return false;
      }
      if (!formData.address.trim()) {
        alert('Please provide the physical site / premises address.');
        return false;
      }
      if (!formData.contactPerson.trim()) {
        alert('Please provide the contact person name.');
        return false;
      }
      if (formData.phone.length !== 10) {
        alert('Contact number must be exactly 10 digits.');
        return false;
      }
    }

    if (currentStep === 'MEETING_OUTCOME') {
      const totalSelected = [
        ...Object.values(serviceRequirements).filter((s) => s.enabled),
        ...customRoles
      ].reduce((acc, s) => acc + s.count, 0);

      if (totalSelected === 0) {
        alert('Please select at least 1 service personnel requirement.');
        return false;
      }

      if (
        (formData.interactionOutcome === 'CALLBACK' || formData.interactionOutcome === 'DEMO_SCHEDULED') &&
        !formData.nextFollowUp
      ) {
        alert('Please select the next follow-up/survey date.');
        return false;
      }
    }
    return true;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateStep()) {
      setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      if (!location) {
        alert('PSARA Audit Requirement: Real-time satellite GPS coordinates lock is mandatory for field officers.');
        return;
      }
      if (!photos.board) {
        alert('PSARA Audit Requirement: On-site photo of the signboard or entrance is mandatory.');
        return;
      }
      if (!photos.rep) {
        alert('PSARA Audit Requirement: Officer biometric verification selfie on site is mandatory.');
        return;
      }
    }

    setIsLoading(true);
    const generatedVisitId = `VISIT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const cleanAddress = formData.address.trim();

    const requirementsArray: string[] = [];
    Object.entries(serviceRequirements).forEach(([, s]) => {
      if (s.enabled && s.count > 0) {
        requirementsArray.push(`${s.count} ${s.role} (${s.shift})`);
      }
    });
    customRoles.forEach((c) => {
      if (c.count > 0) {
        requirementsArray.push(`${c.count} ${c.name} (${c.shift})`);
      }
    });

    const guardCountSum = serviceRequirements.guard.enabled ? serviceRequirements.guard.count : 0;
    const formattedNotes = `Address: ${cleanAddress} | Notes: ${formData.notes.trim()} | Guards: ${guardCountSum} | Requirements: ${requirementsArray.join(', ')}`;

    const safeLeadId = formData.leadId && formData.leadId.startsWith('LEAD-')
      ? formData.leadId
      : null;

    const manningSpecs = {
      guard: serviceRequirements.guard.enabled ? serviceRequirements.guard : null,
      supervisor: serviceRequirements.supervisor.enabled ? serviceRequirements.supervisor : null,
      gunman: serviceRequirements.gunman.enabled ? serviceRequirements.gunman : null,
      housekeeping: serviceRequirements.housekeeping.enabled ? serviceRequirements.housekeeping : null,
      custom: customRoles
    };

    const visitPayload = {
      id: generatedVisitId,
      representative_id: user?.id || null,
      representative_name: isAdmin ? `${user?.name || 'Director'} (HQ Admin)` : (user?.name || 'Field Representative'),
      company_name: formData.companyName.toUpperCase().trim(),
      category: formData.category,
      phone_number: formData.phone,
      contact_person: formData.contactPerson.trim(),
      timestamp: new Date().toISOString(),
      location: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || 10
          }
        : {
            latitude: 22.7196,
            longitude: 75.8577,
            accuracy: 50
          },
      board_photo: photos.board,
      rep_photo: photos.rep,
      notes: formattedNotes,
      manning_specs: manningSpecs,
      lead_id: safeLeadId,
      visit_purpose: formData.visitPurpose,
      interaction_outcome: formData.interactionOutcome,
      next_follow_up: formData.nextFollowUp || null
    };

    try {
      const response = await api.request('/visits', {
        method: 'POST',
        body: JSON.stringify(visitPayload)
      });

      if (!response) {
        throw new Error('Database server failed to return confirmation.');
      }

      if (!safeLeadId && ['INTERESTED', 'DEMO_SCHEDULED', 'CALLBACK'].includes(formData.interactionOutcome)) {
        const freshLeadPayload = {
          id: `LEAD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          company_name: formData.companyName.toUpperCase().trim(),
          contact_person: formData.contactPerson.trim(),
          phone: formData.phone,
          address: cleanAddress,
          status: isAdmin ? 'QUALIFIED_LEAD' : (formData.interactionOutcome === 'INTERESTED' ? 'INTERESTED' : 'PROSPECT'),
          estimated_value: Number(formData.estimatedValue || 0),
          assigned_to: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        try {
          await api.request('/leads', {
            method: 'POST',
            body: JSON.stringify(freshLeadPayload)
          });
        } catch (leadErr) {
          console.warn('Visit saved, but the lead could not be created:', leadErr);
        }
      }

      alert('Visit record successfully logged to central database.');
      navigate('/visits');
    } catch (err: any) {
      console.error('Submission failed:', err);

      const looksOffline =
        !navigator.onLine ||
        err?.name === 'TypeError' ||
        /failed to fetch|network|timeout|load failed/i.test(err?.message || '');

      if (looksOffline) {
        await saveVisitOffline(visitPayload);
        alert('No connection: the visit is saved on this device and will upload automatically when you are back online.');
        navigate('/visits');
      } else {
        alert(`The visit could not be saved: ${err?.message || 'unknown error'}. Please check the details and try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeStep = STEPS[currentStepIndex];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16 px-1 sm:px-2 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {isAdmin ? (
              <Crown size={14} className="text-amber-600" />
            ) : (
              <ShieldAlert size={14} className="text-red-700" />
            )}
            <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-widest">
              {isAdmin ? 'Directorial Command Intake' : 'Commercial Field Patrol'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            Log Site Visit
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Step {currentStepIndex + 1} of {STEPS.length} &bull; {activeStep.replace('_', ' ')}
            {isAdmin && <span className="ml-1 text-amber-700 font-bold">(Admin Mode)</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {formData.companyName && (
            <button
              type="button"
              onClick={handlePrintSurveyLetter}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-mono font-bold text-red-700 uppercase flex items-center gap-1 transition cursor-pointer"
              title="Print Pre-Visit Authorization Letter"
            >
              <Printer size={12} />
              <span>Survey Letter</span>
            </button>
          )}

          <div className="px-3 py-1 rounded-xl bg-[#FBFBF9] border border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center gap-1.5">
            <Navigation size={12} className="text-red-700" />
            <span>GPS Satellite Lock</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {STEPS.map((step, idx) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              idx <= currentStepIndex ? 'bg-red-700' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeStep === 'VISIT_TYPE' && (
          <div className="space-y-4">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <HelpCircle className="text-red-700" size={18} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Target Establishment History
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVisitType('new');
                    handleLeadSelection('');
                  }}
                  className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    visitType === 'new'
                      ? 'border-red-700 bg-red-50/40 text-red-950 shadow-xs ring-1 ring-red-700'
                      : 'border-slate-200 bg-[#FBFBF9] text-slate-700 hover:bg-slate-100/80'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase">Initial Site Inspection (Cold Drop)</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      First-time meeting and introduction of VSF guarding services.
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      visitType === 'new' ? 'border-red-700 bg-red-700' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {visitType === 'new' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisitType('followup')}
                  className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    visitType === 'followup'
                      ? 'border-red-700 bg-red-50/40 text-red-950 shadow-xs ring-1 ring-red-700'
                      : 'border-slate-200 bg-[#FBFBF9] text-slate-700 hover:bg-slate-100/80'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase">Re-Visit / Commercial Follow-Up</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Ongoing negotiation or rate proposal discussion with existing client.
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      visitType === 'followup' ? 'border-red-700 bg-red-700' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {visitType === 'followup' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              </div>
            </div>

            {visitType === 'followup' && (
              <div className="bg-slate-900 p-6 rounded-3xl shadow-xs text-white space-y-3 border border-slate-800 animate-in fade-in duration-200">
                <label className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  Select Existing Client / Past Visit:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleLeadSelection(e.target.value)}
                  disabled={isAccountLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white text-xs font-bold focus:border-amber-400 cursor-pointer"
                >
                  <option value="">
                    {isAccountLoading ? '-- Loading Pipeline Accounts... --' : '-- Choose Client Account / Past Site --'}
                  </option>
                  {accountList.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.companyName} {account.contactPerson ? `(${account.contactPerson})` : ''} {account.address ? `• ${account.address}` : ''}
                    </option>
                  ))}
                </select>
                {accountList.length === 0 && !isAccountLoading && (
                  <p className="text-[10px] text-amber-300/80 font-mono mt-1">
                    No previous visits or assigned leads found. Switch to &quot;Initial Site Inspection&quot; above to log a new client.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeStep === 'CLIENT_DETAILS' && (
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building2 className="text-red-700" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Establishment Specifics
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Company / Organization Name <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 text-amber-700" size={15} />
                  <input
                    required
                    disabled={visitType === 'followup' && Boolean(selectedAccountId)}
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                    placeholder="e.g. TREASURE ISLAND MALL / GRIP SURYA"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Site / Premises Physical Address <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 text-amber-700" size={15} />
                  <input
                    required
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                    placeholder="e.g. Plot No. 12, Scheme 78, Vijay Nagar, Indore (M.P.)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Site Facility Sector
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-3 text-amber-700" size={15} />
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition cursor-pointer"
                  >
                    <option value="COMMERCIAL COMPLEX">COMMERCIAL COMPLEX / RESIDENTIAL</option>
                    <option value="INDUSTRIAL WAREHOUSE">INDUSTRIAL WAREHOUSE / FACTORY</option>
                    <option value="RETAIL SHOWROOM">RETAIL SHOWROOM / JEWELRY STORE</option>
                    <option value="CORPORATE OFFICE">CORPORATE TECH PARK / IT DESK</option>
                    <option value="HOSPITALITY / HOTEL">HOSPITALITY / RESORT / HOSPITAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Contact Person Met <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      required
                      value={formData.contactPerson}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                      placeholder="e.g. MR. VERMA (HR HEAD)"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Mobile Number <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                      }
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                      placeholder="98XXXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'MEETING_OUTCOME' && (
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Target className="text-red-700" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Meeting Outcome &amp; Service Manning Requirements
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Purpose of Visit
                  </label>
                  <select
                    required
                    value={formData.visitPurpose}
                    onChange={(e) => setFormData((prev) => ({ ...prev, visitPurpose: e.target.value as VisitPurpose }))}
                    className="w-full px-3.5 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition cursor-pointer"
                  >
                    {VISIT_PURPOSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Client Response / Verdict
                  </label>
                  <select
                    required
                    value={formData.interactionOutcome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, interactionOutcome: e.target.value as InteractionOutcome }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition cursor-pointer"
                  >
                    {INTERACTION_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-900 tracking-wider block">
                      Services Required (सेवा आवश्यकताएँ)
                    </label>
                    <p className="text-[9.5px] text-slate-400">Select roles, headcount, and shift durations requested by client</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomRoles((prev) => [
                        ...prev,
                        { id: `CUSTOM-${Date.now()}`, name: 'Peon / Office Boy', count: 1, shift: '8_HOURS' }
                      ]);
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} className="text-amber-300" />
                    <span>+ Custom Role</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(serviceRequirements).map(([key, s]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-2xl border transition ${
                        s.enabled ? 'bg-white border-red-700/60 shadow-xs ring-1 ring-red-700/20' : 'bg-[#FBFBF9] border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={s.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setServiceRequirements((p) => ({
                                ...p,
                                [key]: { ...p[key], enabled: checked, count: checked && p[key].count === 0 ? 1 : p[key].count }
                              }));
                            }}
                            className="w-4 h-4 rounded text-red-700 focus:ring-red-700"
                          />
                          <span className="text-xs font-black uppercase text-slate-900 truncate">
                            {s.role}
                          </span>
                        </label>

                        {s.enabled && (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Shift:</span>
                              <select
                                value={s.shift}
                                onChange={(e) => {
                                  const shift = e.target.value as '12_HOURS' | '8_HOURS';
                                  setServiceRequirements((p) => ({
                                    ...p,
                                    [key]: { ...p[key], shift }
                                  }));
                                }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 outline-none"
                              >
                                <option value="12_HOURS">12 Hrs</option>
                                <option value="8_HOURS">08 Hrs</option>
                              </select>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Posts:</span>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={s.count}
                                onChange={(e) => {
                                  const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setServiceRequirements((p) => ({
                                    ...p,
                                    [key]: { ...p[key], count }
                                  }));
                                }}
                                className="w-14 px-2 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-red-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {customRoles.map((custom) => (
                    <div key={custom.id} className="p-3 rounded-2xl border border-amber-300 bg-amber-50/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={custom.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomRoles((p) => p.map((r) => (r.id === custom.id ? { ...r, name: val } : r)));
                          }}
                          placeholder="e.g. Peon / Bouncer / Driver"
                          className="flex-1 px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold uppercase text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomRoles((p) => p.filter((r) => r.id !== custom.id))}
                          className="p-1 text-slate-400 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Shift:</span>
                          <select
                            value={custom.shift}
                            onChange={(e) => {
                              const shift = e.target.value as '12_HOURS' | '8_HOURS';
                              setCustomRoles((p) => p.map((r) => (r.id === custom.id ? { ...r, shift: shift } : r)));
                            }}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          >
                            <option value="8_HOURS">08 Hrs</option>
                            <option value="12_HOURS">12 Hrs</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Posts:</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={custom.count}
                            onChange={(e) => {
                              const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setCustomRoles((p) => p.map((r) => (r.id === custom.id ? { ...r, count: count } : r)));
                            }}
                            className="w-14 px-2 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {['INTERESTED', 'DEMO_SCHEDULED'].includes(formData.interactionOutcome) && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                    Expected Contract Value (₹ / Month)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-3 text-amber-600" size={15} />
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedValue: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
                      placeholder="Approximate monthly contract budget"
                    />
                  </div>
                </div>
              )}

              {['CALLBACK', 'DEMO_SCHEDULED'].includes(formData.interactionOutcome) && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-red-900 uppercase tracking-wider">
                    Next Follow-Up / Survey Date <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-red-700" size={15} />
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.nextFollowUp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, nextFollowUp: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-red-50/40 border border-red-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Site Observation Notes
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 text-slate-400" size={15} />
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                    placeholder="Specific security observations (Boom barrier, night patrol, armed guards, lady bouncers)..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'VERIFICATION' && (
          <div className="space-y-4">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Crosshair size={14} className="text-red-700" />
                  <label className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                    Satellite Geolocation Sensor Lock
                  </label>
                </div>
                <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest">
                  {isAdmin ? 'Admin Discretionary' : 'Mandatory *'}
                </span>
              </div>

              {location ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 bg-emerald-50 text-emerald-950 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                    <CheckCircle2 size={24} className="text-emerald-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                          Active Satellite Coordinates Locked
                        </span>
                        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          &plusmn;{location.accuracy || 5}m Accuracy
                        </span>
                      </div>
                      <p className="text-sm font-mono font-black text-slate-900 mt-0.5 tracking-wider truncate">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocation(null)}
                      className="p-2 bg-white text-slate-400 hover:text-red-700 rounded-xl shadow-xs transition cursor-pointer"
                      title="Re-acquire Location"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                    <iframe
                      title="Real-Time Locked GPS Location"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&hl=en&z=18&output=embed`}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="pt-1 flex justify-end">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-mono font-bold text-red-700 hover:text-red-800 uppercase tracking-wider hover:underline"
                    >
                      <span>Open Full Coordinates in Google Maps</span>
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureRealLocation}
                  disabled={isGpsLocking}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isGpsLocking ? (
                    <>
                      <Loader2 className="animate-spin text-amber-300" size={16} />
                      <span>Acquiring Hardware Satellite GPS...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair size={16} className="text-amber-300" />
                      <span>Lock Current GPS Position Now</span>
                    </>
                  )}
                </button>
              )}

              {isAdmin && !location && (
                <p className="text-[10px] font-mono text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  Director Override: As an authorized administrator, GPS lock will fallback to Indore HQ coordinates if logging from the desk.
                </p>
              )}

              {locationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Site Signboard / Gate Pic {isAdmin ? '(Optional for Admin)' : <span className="text-red-600">*</span>}
                  </h4>
                  <p className="text-[9px] text-slate-400">Exterior evidence of client visit</p>
                </div>

                {photos.board ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={photos.board} alt="Signboard" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => ({ ...prev, board: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera('board')}
                    className="flex flex-col items-center justify-center aspect-video w-full border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl bg-[#FBFBF9] hover:bg-red-50/30 transition py-6 cursor-pointer group"
                  >
                    <Building2 size={24} className="text-slate-400 group-hover:text-red-700 mb-1 transition" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-red-700 uppercase tracking-wider">
                      Capture Signboard
                    </span>
                  </button>
                )}
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Officer On-Site Selfie {isAdmin ? '(Optional for Admin)' : <span className="text-red-600">*</span>}
                  </h4>
                  <p className="text-[9px] text-slate-400">Frontal biometric audit proof</p>
                </div>

                {photos.rep ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={photos.rep} alt="Officer" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => ({ ...prev, rep: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg shadow-xs transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera('rep')}
                    className="flex flex-col items-center justify-center aspect-video w-full border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl bg-[#FBFBF9] hover:bg-red-50/30 transition py-6 cursor-pointer group"
                  >
                    <User size={24} className="text-slate-400 group-hover:text-red-700 mb-1 transition" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-red-700 uppercase tracking-wider">
                      Capture Frontal Selfie
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <ChevronLeft size={15} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer ml-auto"
            >
              <span>Next Step</span>
              <ChevronRight size={15} className="text-amber-300" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-red-700/20 cursor-pointer ml-auto disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin text-amber-300" size={15} />
                  <span>Submitting Docket...</span>
                </>
              ) : (
                <>
                  <Send size={14} className="text-amber-300" />
                  <span>{isAdmin ? 'Record Executive Visit Docket' : 'Authorize & Submit Log'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {cameraActive.active && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-2 border-amber-400 shadow-2xl">
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
              <div className="bg-black/60 px-2.5 py-1 rounded-lg text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                Live Sensor Feed
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1.5 bg-black/60 hover:bg-red-700 text-white rounded-xl transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: cameraActive.type === 'rep' ? 'scaleX(-1)' : 'none' }}
            />

            <div className="absolute inset-8 border-2 border-dashed border-amber-400/60 rounded-2xl pointer-events-none" />

            <div className="absolute bottom-6 inset-x-0 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center text-white">
                  <CameraIcon size={20} />
                </div>
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="mt-4 text-amber-300 font-mono font-bold text-[10px] uppercase tracking-widest text-center">
            Align {cameraActive.type === 'board' ? 'Site Signboard' : 'Face'} within frame &bull; Click to capture
          </p>
        </div>
      )}
    </div>
  );
};

export default AddVisit;
