import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
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
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Location, Visit, Lead, VisitPurpose, InteractionOutcome } from '../types';
import { api } from '../services/apiService';
import { saveVisitOffline, syncOfflineDataToServer } from '../services/offlineSync';

const VISIT_PURPOSES: { value: VisitPurpose; label: string }[] = [
  { value: 'COLD_CALL', label: 'FIRST TIME INTRODUCTORY MEETING' },
  { value: 'FOLLOW_UP', label: 'FOLLOW UP MEETING' },
  { value: 'CLOSING', label: 'FINAL DEAL CLOSING / PITCH' }
];

const INTERACTION_OUTCOMES: { value: InteractionOutcome; label: string }[] = [
  { value: 'INTERESTED', label: '🔥 CLIENT IS INTERESTED' },
  { value: 'DEMO_SCHEDULED', label: '📅 NEXT MEETING / DEMO FIXED' },
  { value: 'CALLBACK', label: '📞 ASKED TO CALL BACK LATER' },
  { value: 'DISCUSSED', label: '🤝 GENERAL DISCUSSION DONE' },
  { value: 'NOT_INTERESTED', label: '❄️ NOT INTERESTED' }
];

type FormStep = 'VISIT_TYPE' | 'CLIENT_DETAILS' | 'MEETING_OUTCOME' | 'VERIFICATION';
const STEPS: FormStep[] = ['VISIT_TYPE', 'CLIENT_DETAILS', 'MEETING_OUTCOME', 'VERIFICATION'];

const AddVisit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState('');

  // Simplified Visit Type Selection ('new' or 'followup')
  const [visitType, setVisitType] = useState<'new' | 'followup'>('new');
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [isLeadLoading, setIsLeadLoading] = useState(false);

  // Camera Settings
  const [cameraActive, setCameraActive] = useState<{ active: boolean, type: 'board' | 'rep' }>({ active: false, type: 'board' });
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
    nextFollowUp: ''
  });

  const [photos, setPhotos] = useState<{ board: string | null; rep: string | null }>({
    board: null,
    rep: null
  });

  // Fetch clients the officer has already visited before
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
        console.error("Failed to load active user leads pipeline", err);
      } finally {
        setIsLeadLoading(false);
      }
    };
    fetchAssignedLeads();
  }, [user]);

  // When an officer picks an old client, fill details automatically
  const handleLeadSelection = (leadId: string) => {
    if (!leadId) {
      setFormData(prev => ({ ...prev, leadId: '', companyName: '', phone: '', contactPerson: '' }));
      return;
    }
    const selectedLead = activeLeads.find(l => l.id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId: selectedLead.id,
        companyName: selectedLead.companyName,
        phone: selectedLead.phone,
        contactPerson: selectedLead.contactPerson,
        visitPurpose: 'FOLLOW_UP', // Auto-set purpose to follow up
        estimatedValue: selectedLead.estimatedValue ? selectedLead.estimatedValue.toString() : ''
      }));
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('GPS not supported on this phone.');
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setIsLoading(false);
        setLocationError('');
      },
      (err) => {
        setLocationError('GPS Error. Please turn on your phone Location/GPS settings.');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startCamera = async (type: 'board' | 'rep') => {
    setCameraActive({ active: true, type });
    try {
      const constraints = {
        video: {
          facingMode: type === 'board' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera permission is mandatory to upload reports.");
      setCameraActive({ active: false, type: 'board' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive({ active: false, type: 'board' });
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotos(prev => ({ ...prev, [cameraActive.type]: dataUrl }));
        stopCamera();
      }
    }
  };

  const validateStep = (): boolean => {
    const currentStep = STEPS[currentStepIndex];

    if (currentStep === 'VISIT_TYPE' && visitType === 'followup' && !formData.leadId) {
      alert('Please select the client you are visiting from the list.');
      return false;
    }

    if (currentStep === 'CLIENT_DETAILS') {
      if (!formData.companyName.trim()) {
        alert('Please enter the Company/Shop Name.');
        return false;
      }
      if (!formData.contactPerson.trim()) {
        alert('Please enter the Name of the person you met.');
        return false;
      }
      if (formData.phone.length !== 10) {
        alert('Phone number must be exactly 10 digits.');
        return false;
      }
    }

    if (currentStep === 'MEETING_OUTCOME') {
      if ((formData.interactionOutcome === 'CALLBACK' || formData.interactionOutcome === 'DEMO_SCHEDULED') && !formData.nextFollowUp) {
        alert('Please pick a date for the next follow-up call/meeting.');
        return false;
      }
    }
    return true;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateStep()) {
      setCurrentStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      alert('Click the button to lock your GPS Location.');
      return;
    }
    if (!photos.board) {
      alert('Taking a photo of the client signboard/building is mandatory.');
      return;
    }
    if (!photos.rep) {
      alert('Taking an Agent verification selfie is mandatory.');
      return;
    }

    setIsLoading(true);
    const generatedVisitId = `VISIT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const visitPayload: any = {
      id: generatedVisitId,
      representativeId: user!.id,
      representativeName: user!.name,
      companyName: formData.companyName.toUpperCase().trim(),
      category: formData.category,
      phoneNumber: formData.phone,
      contactPerson: formData.contactPerson.trim(),
      timestamp: new Date().toISOString(),
      location: location,
      boardPhoto: photos.board,
      repPhoto: photos.rep,
      notes: formData.notes.trim(),
      leadId: formData.leadId || null,
      visitPurpose: formData.visitPurpose,
      interactionOutcome: formData.interactionOutcome,
      nextFollowUp: formData.nextFollowUp || null
    };

    try {
      if (navigator.onLine) {
        // 🌐 ONLINE: Push straight to database engine
        await api.request('/visits', { method: 'POST', body: JSON.stringify(visitPayload) });

        if (!formData.leadId && ['INTERESTED', 'DEMO_SCHEDULED', 'CALLBACK'].includes(formData.interactionOutcome)) {
          const freshLeadPayload: Lead = {
            id: `LEAD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            companyName: formData.companyName.toUpperCase().trim(),
            contactPerson: formData.contactPerson.trim(),
            phone: formData.phone,
            status: formData.interactionOutcome === 'INTERESTED' ? 'INTERESTED' : 'PROSPECT',
            estimatedValue: Number(formData.estimatedValue || 0),
            assignedTo: user!.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await api.request('/leads', { method: 'POST', body: JSON.stringify(freshLeadPayload) });
        } else if (formData.leadId) {
          let derivedStatus = 'INTERESTED';
          if (formData.interactionOutcome === 'NOT_INTERESTED') derivedStatus = 'COLD';
          await api.request(`/leads/${formData.leadId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: derivedStatus, estimatedValue: Number(formData.estimatedValue || 0) })
          });
        }

        // Trigger background sync loop for older logs
        syncOfflineDataToServer();
      } else {
        // 🚫 OFFLINE: Cache data seamlessly to device IndexedDB
        await saveVisitOffline(visitPayload);
        alert("⚠️ Device Offline: Your report is saved locally on your phone. It will automatically upload to the cloud layout the moment you regain cellular internet connection!");
      }

      navigate('/visits');
    } catch (err: any) {
      console.warn("Connection failure detected during process execution. Caching to local database storage instead.");
      await saveVisitOffline(visitPayload);
      alert("Notice: Report securely stored locally due to active API communication limits.");
      navigate('/visits');
    } finally {
      setIsLoading(false);
    }
  };

  const activeStep = STEPS[currentStepIndex];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">

      {/* Page Heading */}
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Visit Report</h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">
          Step {currentStepIndex + 1} of {STEPS.length} • {activeStep.replace('_', ' ')}
        </p>
      </div>

      {/* Dynamic Progress Indicator Bar */}
      <div className="flex gap-2">
        {STEPS.map((step, idx) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              idx <= currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* STEP 1: VISIT SELECTION TYPE QUESTION */}
        {activeStep === 'VISIT_TYPE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                <HelpCircle className="text-indigo-600" size={20} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Have you visited this client before?</h3>
              </div>

              {/* Selection Blocks */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setVisitType('new'); handleLeadSelection(''); }}
                  className={`p-5 rounded-2xl border text-left font-bold transition-all flex items-center justify-between ${
                    visitType === 'new'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase">No, this is my first time (Cold Call)</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">Fresh introduction setup.</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${visitType === 'new' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                    {visitType === 'new' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisitType('followup')}
                  className={`p-5 rounded-2xl border text-left font-bold transition-all flex items-center justify-between ${
                    visitType === 'followup'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase">Yes, this is a follow-up visit</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">Already visited them 1 or more times earlier.</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${visitType === 'followup' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                    {visitType === 'followup' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              </div>
            </div>

            {/* If they select follow-up, open the drop-down list right below */}
            {visitType === 'followup' && (
              <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white space-y-3 border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Select the company from your list:</label>
                <select
                  value={formData.leadId}
                  onChange={(e) => handleLeadSelection(e.target.value)}
                  disabled={isLeadLoading}
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none text-white text-xs font-bold appearance-none focus:border-indigo-500"
                >
                  <option value="" className="text-slate-900">-- SELECT CLIENT COMPANY NAME --</option>
                  {activeLeads.map(lead => (
                    <option key={lead.id} value={lead.id} className="text-slate-900">
                      🏢 {lead.companyName} ({lead.contactPerson})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ENTER CLIENT INFO DATA */}
        {activeStep === 'CLIENT_DETAILS' && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <Building2 className="text-indigo-600" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Client Profile Details</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Company / Shop Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <input
                    required
                    disabled={visitType === 'followup'}
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs disabled:opacity-60"
                    placeholder="Enter company business name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Category</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs appearance-none"
                  >
                    <option value="COMMERCIAL COMPLEX">COMMERCIAL COMPLEX</option>
                    <option value="RETAIL SHOWROOM">RETAIL SHOWROOM</option>
                    <option value="CORPORATE OFFICE">CORPORATE OFFICE</option>
                    <option value="MANUFACTURING PLANT">MANUFACTURING PLANT</option>
                    <option value="HOSPITALITY / CAFE">HOSPITALITY / CAFE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Person Met (Decision Maker)</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <input
                    required
                    disabled={visitType === 'followup'}
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs disabled:opacity-60"
                    placeholder="Manager Name / Owner Name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <input
                    required
                    type="tel"
                    disabled={visitType === 'followup'}
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs disabled:opacity-60"
                    placeholder="10 digit mobile number"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: MEETING METRIC OUTCOMES */}
        {activeStep === 'MEETING_OUTCOME' && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Target className="text-indigo-600" size={18} />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Meeting Target Status</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Visit</label>
                <select
                  required
                  value={formData.visitPurpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitPurpose: e.target.value as VisitPurpose }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs"
                >
                  {VISIT_PURPOSES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">What was the Client Reaction?</label>
                <select
                  required
                  value={formData.interactionOutcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, interactionOutcome: e.target.value as InteractionOutcome }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs"
                >
                  {INTERACTION_OUTCOMES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {['INTERESTED', 'DEMO_SCHEDULED'].includes(formData.interactionOutcome) && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-1">Expected Deal Value (₹ / Monthly)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-3.5 text-amber-500" size={16} />
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedValue: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border border-amber-200 rounded-xl outline-none text-slate-950 font-bold text-xs"
                      placeholder="Approx contract budget value"
                    />
                  </div>
                </div>
              )}

              {['CALLBACK', 'DEMO_SCHEDULED'].includes(formData.interactionOutcome) && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-1">Next Scheduled Contact/Follow-up Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 text-indigo-500" size={16} />
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.nextFollowUp}
                      onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUp: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-indigo-50/40 border border-indigo-200 rounded-xl outline-none text-slate-950 font-bold text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Meeting Conversation Notes</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-950 font-bold text-xs"
                    placeholder="Type details about what security services/manpower setups they are looking for..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: GEOLOCATION AND LIVE VISUAL CAPTURES */}
        {activeStep === 'VERIFICATION' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* GPS Lock Container Card */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify Your Live GPS Location</label>
              {location ? (
                <div className="flex items-center space-x-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-0.5">GPS Location Locked</p>
                    <p className="text-[11px] font-mono font-bold">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                  </div>
                  <button type="button" onClick={() => setLocation(null)} className="p-2 bg-white rounded-xl shadow-sm hover:text-red-600 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                  <span>Click to Capture GPS Location</span>
                </button>
              )}
              {locationError && <p className="text-red-500 text-[9px] font-bold mt-1 flex items-center"><AlertCircle size={12} className="mr-1"/> {locationError}</p>}
            </div>

            {/* Visual Snapshots Box Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Signboard Capture Asset */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl space-y-3 flex flex-col justify-between">
                <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Client Office/Signboard Pic</h3>
                {photos.board ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border">
                    <img src={photos.board} alt="Board" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => ({ ...prev, board: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera('board')}
                    className="flex flex-col items-center justify-center aspect-video w-full border border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/20 transition-all py-6"
                  >
                    <Building2 size={22} className="text-slate-300 mb-1" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Take Shop Photo</span>
                  </button>
                )}
              </div>

              {/* Rep Selfie Capture Asset */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl space-y-3 flex flex-col justify-between">
                <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Officer Selfie Verification</h3>
                {photos.rep ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border">
                    <img src={photos.rep} alt="Rep" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => ({ ...prev, rep: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera('rep')}
                    className="flex flex-col items-center justify-center aspect-video w-full border border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/20 transition-all py-6"
                  >
                    <User size={22} className="text-slate-300 mb-1" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Take My Selfie</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Master Workflow Actions Control Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center space-x-1.5 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center space-x-1.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all ml-auto shadow-md active:scale-95"
            >
              <span>Next Step</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 px-7 py-3 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all ml-auto shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Send size={14} className="text-indigo-400" />
                  <span>Submit Visit Log</span>
                </>
              )}
            </button>
          )}
        </div>

      </form>

      {/* Live Active Fullscreen Camera Modal Overlay view */}
      {cameraActive.active && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 p-4">
           <div className="relative w-full max-w-xl bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                 <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2.5 animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Camera Stream Active</span>
                 </div>
                 <button onClick={stopCamera} className="p-2 bg-white/10 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all">
                    <X size={16} />
                 </button>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
                style={{ transform: cameraActive.type === 'rep' ? 'scaleX(-1)' : 'none' }}
              />

              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
                 <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full bg-white border-4 border-slate-200 shadow-2xl flex items-center justify-center active:scale-90 transition-all"
                 >
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                       <CameraIcon size={16} />
                    </div>
                 </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
           </div>
        </div>
      )}
    </div>
  );
};

export default AddVisit;
