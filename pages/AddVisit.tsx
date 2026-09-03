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
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Location, Lead, VisitPurpose, InteractionOutcome } from '../types';
import { api } from '../services/apiService';
import { saveVisitOffline } from '../services/offlineSync';

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

type FormStep = 'VISIT_TYPE' | 'CLIENT_DETAILS' | 'MEETING_OUTCOME' | 'VERIFICATION';
const STEPS: FormStep[] = ['VISIT_TYPE', 'CLIENT_DETAILS', 'MEETING_OUTCOME', 'VERIFICATION'];

export const AddVisit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGpsLocking, setIsGpsLocking] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState('');

  const [visitType, setVisitType] = useState<'new' | 'followup'>('new');
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [isLeadLoading, setIsLeadLoading] = useState(false);

  // Camera Settings
  const [cameraActive, setCameraActive] = useState<{ active: boolean; type: 'board' | 'rep' }>({
    active: false,
    type: 'board'
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    category: 'COMMERCIAL COMPLEX',
    phone: '',
    contactPerson: '',
    notes: '',
    leadId: '',
    visitPurpose: 'COLD_CALL' as VisitPurpose,
    interactionOutcome: 'DISCUSSED' as InteractionOutcome,
    estimatedValue: '',
    nextFollowUp: '',
    guardRequirement: '2',
    shiftRequirement: '12_HOURS'
  });

  const [photos, setPhotos] = useState<{ board: string | null; rep: string | null }>({
    board: null,
    rep: null
  });

  useEffect(() => {
    const fetchAssignedLeads = async () => {
      if (!user?.id) return;
      setIsLeadLoading(true);
      try {
        const data = await api.request(`/leads?assignedTo=${user.id}`);
        if (Array.isArray(data)) {
          setActiveLeads(data.filter((l: Lead) => l.status !== 'CONVERTED' && l.status !== 'COLD'));
        }
      } catch (err) {
        console.error('Failed to load active leads pipeline:', err);
      } finally {
        setIsLeadLoading(false);
      }
    };
    fetchAssignedLeads();
  }, [user]);

  const handleLeadSelection = (leadId: string) => {
    if (!leadId) {
      setFormData((prev) => ({ ...prev, leadId: '', companyName: '', phone: '', contactPerson: '' }));
      return;
    }
    const selectedLead = activeLeads.find((l) => l.id === leadId);
    if (selectedLead) {
      setFormData((prev) => ({
        ...prev,
        leadId: selectedLead.id,
        companyName: selectedLead.companyName,
        phone: selectedLead.phone,
        contactPerson: selectedLead.contactPerson,
        visitPurpose: 'FOLLOW_UP',
        estimatedValue: selectedLead.estimatedValue ? selectedLead.estimatedValue.toString() : ''
      }));
    }
  };

  // High-precision hardware GPS lock
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
      console.warn('Native GPS skipped, falling back to navigator geolocation:', nativeErr);
    }

    if (!navigator.geolocation) {
      setLocationError('GPS receiver not available on this browser/terminal.');
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
        console.error('Hardware GPS Error:', error);
        let msg = 'Failed to lock satellite coordinates. Please verify device GPS is active.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission rejected. Allow location access in browser/device settings.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Satellite acquisition timed out. Ensure open sky view and retry.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Position unavailable. Turn on Wi-Fi and mobile location services.';
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
      alert('Camera permissions are required for PSARA visual verification.');
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotos((prev) => ({ ...prev, [cameraActive.type]: dataUrl }));
        stopCamera();
      }
    }
  };

  const validateStep = (): boolean => {
    const currentStep = STEPS[currentStepIndex];

    if (currentStep === 'VISIT_TYPE' && visitType === 'followup' && !formData.leadId) {
      alert('Please pick an active account from your assigned pipeline.');
      return false;
    }

    if (currentStep === 'CLIENT_DETAILS') {
      if (!formData.companyName.trim()) {
        alert('Please provide the company or establishment name.');
        return false;
      }
      if (!formData.contactPerson.trim()) {
        alert('Please provide the decision-maker contact person name.');
        return false;
      }
      if (formData.phone.length !== 10) {
        alert('Contact number must be exactly 10 digits.');
        return false;
      }
    }

    if (currentStep === 'MEETING_OUTCOME') {
      if (
        (formData.interactionOutcome === 'CALLBACK' || formData.interactionOutcome === 'DEMO_SCHEDULED') &&
        !formData.nextFollowUp
      ) {
        alert('Please assign the next follow-up/survey date.');
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

    if (!location) {
      alert('Locking real-time satellite GPS coordinates is required.');
      return;
    }
    if (!photos.board) {
      alert('An on-site photo of the signboard or premises entrance is required.');
      return;
    }
    if (!photos.rep) {
      alert('An officer verification selfie on site is mandatory.');
      return;
    }

    setIsLoading(true);
    const generatedVisitId = `VISIT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const visitPayload = {
      id: generatedVisitId,
      representative_id: user?.id || null,
      representative_name: user?.name || 'Field Representative',
      company_name: formData.companyName.toUpperCase().trim(),
      category: formData.category,
      phone_number: formData.phone,
      contact_person: formData.contactPerson.trim(),
      timestamp: new Date().toISOString(),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 10
      },
      board_photo: photos.board,
      rep_photo: photos.rep,
      notes: `${formData.notes.trim()} | Requirements: ${formData.guardRequirement} Guards (${formData.shiftRequirement})`,
      lead_id: formData.leadId || null,
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
        throw new Error('Database server failed to return receipt confirmation.');
      }

      // Automatically register lead in pipeline if commercial interest expressed
      if (!formData.leadId && ['INTERESTED', 'DEMO_SCHEDULED', 'CALLBACK'].includes(formData.interactionOutcome)) {
        const freshLeadPayload = {
          id: `LEAD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          company_name: formData.companyName.toUpperCase().trim(),
          contact_person: formData.contactPerson.trim(),
          phone: formData.phone,
          status: formData.interactionOutcome === 'INTERESTED' ? 'INTERESTED' : 'PROSPECT',
          estimated_value: Number(formData.estimatedValue || 0),
          assigned_to: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await api.request('/leads', {
          method: 'POST',
          body: JSON.stringify(freshLeadPayload)
        });
      }

      alert('✅ Real GPS location and patrol docket logged to database!');
      navigate('/visits');
    } catch (err: any) {
      console.error('Submission failed:', err);
      await saveVisitOffline(visitPayload);
      alert(`Saved Offline: Saved locally on device due to network limitations. (${err.message})`);
      navigate('/visits');
    } finally {
      setIsLoading(false);
    }
  };

  const activeStep = STEPS[currentStepIndex];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16 px-1 sm:px-2 animate-in fade-in duration-200">

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert size={14} className="text-red-700" />
            <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-widest">
              Commercial Field Intake
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            Log Site Visit
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Step {currentStepIndex + 1} of {STEPS.length} &bull; {activeStep.replace('_', ' ')}
          </p>
        </div>

        <div className="px-3 py-1 rounded-xl bg-[#FBFBF9] border border-slate-200 text-[10px] font-mono font-bold text-slate-600 uppercase self-start sm:self-auto flex items-center gap-1.5">
          <Navigation size={12} className="text-red-700" />
          <span>Live GPS Satellite Lock</span>
        </div>
      </div>

      {/* Progress Indicator */}
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

        {/* STEP 1: VISIT SELECTION TYPE */}
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
                      Ongoing negotiation or rate proposal discussion.
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
              <div className="bg-slate-900 p-6 rounded-3xl shadow-xs text-white space-y-3 border border-slate-800">
                <label className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  Select Existing Client From Assigned Pipeline:
                </label>
                <select
                  value={formData.leadId}
                  onChange={(e) => handleLeadSelection(e.target.value)}
                  disabled={isLeadLoading}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white text-xs font-bold focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- Choose Assigned Lead Account --</option>
                  {activeLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.companyName} ({lead.contactPerson})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CLIENT DETAILS */}
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
                    disabled={visitType === 'followup'}
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                    placeholder="e.g. TREASURE ISLAND MALL / AGARWAL PACKERS"
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
                      disabled={visitType === 'followup'}
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
                      disabled={visitType === 'followup'}
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

        {/* STEP 3: MEETING METRICS & QUOTATION SPECS */}
        {activeStep === 'MEETING_OUTCOME' && (
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Target className="text-red-700" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Meeting Outcome &amp; Manning Specs
              </h3>
            </div>

            <div className="space-y-3.5">
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

              {/* Security Guards Specification */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Guards Required
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      type="number"
                      min={1}
                      value={formData.guardRequirement}
                      onChange={(e) => setFormData((prev) => ({ ...prev, guardRequirement: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Shift Configuration
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <select
                      value={formData.shiftRequirement}
                      onChange={(e) => setFormData((prev) => ({ ...prev, shiftRequirement: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 cursor-pointer"
                    >
                      <option value="12_HOURS">12 Hours (Day/Night)</option>
                      <option value="8_HOURS">8 Hours (3-Shift Rotation)</option>
                      <option value="24_HOURS_LIVE">24-Hour Embedded Garrison</option>
                    </select>
                  </div>
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
                    placeholder="Specific security observations (Armed guard, lady bouncers, boom barrier, night patrol)..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: GEOLOCATION & IDENTITY VERIFICATION */}
        {activeStep === 'VERIFICATION' && (
          <div className="space-y-4">

            {/* REAL SATELLITE GPS LOCK CARD */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Crosshair size={14} className="text-red-700" />
                  <label className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                    Satellite Geolocation Sensor Lock
                  </label>
                </div>
                <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest">
                  Mandatory *
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

                  {/* Embedded Live Street Map View (Visual Confirmation) */}
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

                  {/* Full Location External Link */}
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

              {locationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            {/* Photo Captures Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Signboard Photo */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Site Signboard / Gate Pic <span className="text-red-600">*</span>
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

              {/* Officer Selfie Verification */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Officer On-Site Selfie <span className="text-red-600">*</span>
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

        {/* Navigation Action Buttons */}
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
                  <span>Authorize &amp; Submit Log</span>
                </>
              )}
            </button>
          )}
        </div>

      </form>

      {/* Live Viewfinder Modal */}
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
