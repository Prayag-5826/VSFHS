import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Upload,
  Trash2,
  Loader2,
  Building2,
  Factory,
  GraduationCap,
  Trees,
  Briefcase,
  Plus,
  Eye,
  X,
  MapPin,
  ArrowLeft,
  UserCheck,
  Search,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { compressImage } from '../services/imageCompress';
import { supabase } from '../services/apiService';

export type PremiseType = 'COLONY' | 'INDUSTRY' | 'SCHOOL' | 'UNIVERSITY' | 'CORPORATE';

interface AuditSlot {
  key: string;
  label: string;
  required?: boolean;
}

interface CapturedImageItem {
  id: string;
  previewUrl: string;
  blob: Blob;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string;
}

const TEMPLATES: Record<PremiseType, { title: string; icon: LucideIcon; slots: AuditSlot[] }> = {
  COLONY: {
    title: 'Colony / Township',
    icon: Trees,
    slots: [
      { key: 'MAIN_GATE', label: 'Main Entry Gate', required: true },
      { key: 'BOOM_BARRIER', label: 'Boom Barrier & Cabin' },
      { key: 'VISITOR_DESK', label: 'Visitor Sign-in Desk' },
      { key: 'BOUNDARY_WALL', label: 'Boundary Wall & Fencing' },
      { key: 'CLUB_PARK', label: 'Clubhouse / Children Park' },
      { key: 'BACK_EXIT', label: 'Rear / Service Exit Gate' },
      { key: 'STP_WTP', label: 'STP Plant / Water Pump' }
    ]
  },
  INDUSTRY: {
    title: 'Industrial Plant / Warehouse',
    icon: Factory,
    slots: [
      { key: 'SECURITY_GATE', label: 'Main Security Gate', required: true },
      { key: 'WEIGHBRIDGE', label: 'Weighbridge & Inward' },
      { key: 'LOADING_DOCK', label: 'Material Loading Bays' },
      { key: 'DG_SUBSTATION', label: 'DG Set & High Voltage Substation' },
      { key: 'FIRE_HYDRANT', label: 'Fire Hydrant & Pump Network' },
      { key: 'RAW_YARD', label: 'Raw Stockyard' },
      { key: 'SCRAP_YARD', label: 'Scrap Yard & Perimeter' },
      { key: 'ASSEMBLY_POINT', label: 'Emergency Evacuation Area' }
    ]
  },
  SCHOOL: {
    title: 'School / Institution',
    icon: GraduationCap,
    slots: [
      { key: 'MAIN_GATE', label: 'Main Gate & Bus Drop-off Bay', required: true },
      { key: 'ADMIN_RECEPTION', label: 'Reception & Admin Lobby' },
      { key: 'SPORTS_GROUND', label: 'Playground Boundary Fencing' },
      { key: 'GROUND_CORRIDOR', label: 'Ground Floor Corridor' },
      { key: 'FIRST_FLOOR', label: 'First Floor Corridors & Stairs' },
      { key: 'SECOND_FLOOR', label: 'Second Floor Corridors' },
      { key: 'WASHROOM_BLOCK', label: 'Washroom Facilities' },
      { key: 'TERRACE_GATE', label: 'Terrace Access / Locked Doors' }
    ]
  },
  UNIVERSITY: {
    title: 'University / Large Campus',
    icon: Building2,
    slots: [
      { key: 'ARCH_GATE', label: 'Main Campus Gate', required: true },
      { key: 'HOSTEL_BOYS', label: 'Boys Hostel Gate' },
      { key: 'HOSTEL_GIRLS', label: 'Girls Hostel Gate & Guard Post' },
      { key: 'LIBRARY_BLOCK', label: 'Library & Academic Block' },
      { key: 'CANTEEN_MESS', label: 'Canteen / Mess Area' },
      { key: 'PARKING_LOT', label: 'Vehicle Parking Zone' },
      { key: 'PERIMETER_PATROL', label: 'Rear Boundary Patrolling Track' },
      { key: 'DG_ELECTRICAL', label: 'Electrical Substation' }
    ]
  },
  CORPORATE: {
    title: 'Corporate Office / IT Park',
    icon: Briefcase,
    slots: [
      { key: 'MAIN_LOBBY', label: 'Lobby & Turnstile Gates', required: true },
      { key: 'PARKING_ENTRY', label: 'Basement Parking Entry' },
      { key: 'BASEMENT', label: 'Basement Parking B1/B2' },
      { key: 'FIRE_STAIRS', label: 'Fire Exit Staircase Doors' },
      { key: 'SERVER_ROOM', label: 'Server Room Security Access' },
      { key: 'LIFT_LOBBY', label: 'Passenger Lift Lobbies' },
      { key: 'TERRACE_ACCESS', label: 'Terrace Access Door' },
      { key: 'CAFETERIA', label: 'Cafeteria / Food Court' }
    ]
  }
};

export default function SiteAuditPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Client Selection State
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState(searchParams.get('client') || '');
  const [isManualClient, setIsManualClient] = useState(false);
  const [manualClientName, setManualClientName] = useState('');

  // Deck State
  const [premiseType, setPremiseType] = useState<PremiseType>('COLONY');
  const [customSlots, setCustomSlots] = useState<AuditSlot[]>([]);
  const [capturedStacks, setCapturedStacks] = useState<Record<string, CapturedImageItem[]>>({});
  const [viewingSlotKey, setViewingSlotKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingSpot, setAddingSpot] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<AuditSlot | null>(null);
  const stacksRef = useRef(capturedStacks);
  stacksRef.current = capturedStacks;

  // Real-time GPS Tracking
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (err) => console.warn('GPS signal warning:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  // Cleanup temporary object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(stacksRef.current).forEach((stack) =>
        stack.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      );
    };
  }, []);

  // Fetch registered clients & recent visit establishments
  useEffect(() => {
    const loadClients = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          supabase.from('clients').select('company_name').order('company_name'),
          supabase.from('visits').select('company_name').order('timestamp', { ascending: false }).limit(25)
        ]);

        const map = new Map<string, string>();
        (cRes.data || []).forEach((c: any) => {
          if (c.company_name?.trim()) map.set(c.company_name.trim().toUpperCase(), c.company_name.trim());
        });
        (vRes.data || []).forEach((v: any) => {
          if (v.company_name?.trim()) map.set(v.company_name.trim().toUpperCase(), v.company_name.trim());
        });

        setClients(Array.from(map.values()).map((name) => ({ id: name, name })));
      } catch (err) {
        console.warn('Could not load client roster:', err);
      }
    };
    loadClients();
  }, []);

  // Resolved Inspector Identity
  const inspectorFormatted = useMemo(() => {
    if (user?.role === Role.ADMIN) return 'Anil Dhariwal (Managing Director)';
    if (user?.name) {
      const desig = user.role === Role.SR_FIELD_EXECUTIVE ? 'Sr. Field Representative' : 'Field Representative';
      return `${user.name} (${desig})`;
    }
    return 'Field Officer (VSF Operations)';
  }, [user]);

  const targetClient = isManualClient ? manualClientName.trim().toUpperCase() : selectedClient.trim().toUpperCase();
  const currentSlots = useMemo(() => [...TEMPLATES[premiseType].slots, ...customSlots], [premiseType, customSlots]);
  const totalPhotos = Object.values(capturedStacks).reduce((sum, arr) => sum + arr.length, 0);

  const openPicker = (slot: AuditSlot) => {
    activeSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const slot = activeSlotRef.current;
    activeSlotRef.current = null;
    const input = e.target;
    const files = input.files ? Array.from(input.files) : [];

    if (files.length === 0 || !slot) {
      input.value = '';
      return;
    }

    const { lat, lng } = coordsRef.current;
    const nowIso = new Date().toISOString();
    const batch: CapturedImageItem[] = [];

    for (const file of files) {
      try {
        const compressed = await compressImage(file, {
          maxWidth: 1600,
          quality: 0.82,
          watermark: {
            clientName: targetClient,
            tagLabel: slot.label,
            inspectorName: inspectorFormatted,
            timestamp: new Date().toLocaleString('en-IN'),
            latitude: lat,
            longitude: lng
          }
        });
        batch.push({
          id: `IMG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          previewUrl: URL.createObjectURL(compressed),
          blob: compressed,
          latitude: lat,
          longitude: lng,
          capturedAt: nowIso
        });
      } catch (err) {
        console.error('Compression error:', err);
      }
    }

    if (batch.length > 0) {
      setCapturedStacks((prev) => ({
        ...prev,
        [slot.key]: [...(prev[slot.key] || []), ...batch]
      }));
    }
    input.value = '';
  };

  const removePhoto = (slotKey: string, photo: CapturedImageItem) => {
    URL.revokeObjectURL(photo.previewUrl);
    setCapturedStacks((prev) => {
      const list = (prev[slotKey] || []).filter((p) => p.id !== photo.id);
      if (list.length === 0) {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      }
      return { ...prev, [slotKey]: list };
    });

    if ((stacksRef.current[slotKey] || []).length <= 1) {
      setViewingSlotKey((cur) => (cur === slotKey ? null : cur));
    }
  };

  const handleConfirmQuickSpot = () => {
    const label = newSpotName.trim();
    if (!label) return;
    const extraSlot: AuditSlot = { key: `EXTRA_${Date.now()}`, label };
    setCustomSlots((prev) => [...prev, extraSlot]);
    setNewSpotName('');
    setAddingSpot(false);
    openPicker(extraSlot);
  };

  const handleSaveAudit = async () => {
    if (totalPhotos === 0) {
      alert('Take at least one photo before submitting.');
      return;
    }
    if (!targetClient) {
      alert('Please select or specify the Target Establishment name.');
      return;
    }

    setSaving(true);

    // 1. Resolve user from AuthContext/localStorage instead of supabase.auth.getUser()
    const storedUser = user || (() => {
      try {
        const cached = localStorage.getItem('vs_active_user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    })();

    const cleanClient = targetClient
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'UNASSIGNED';

    const tasks = Object.keys(capturedStacks).flatMap((key) => {
      const label = currentSlots.find((s) => s.key === key)?.label || key;
      return (capturedStacks[key] || []).map((item, idx) => ({ key, label, item, angle: idx + 1 }));
    });

    let uploadedCount = 0;
    const errors: string[] = [];

    for (const task of tasks) {
      const { key, label, item, angle } = task;
      const filePath = `site-audits/${cleanClient}/${premiseType}_${key}_${angle}_${item.id}.jpg`;

      try {
        // 2. Upload photo to private client-vault bucket
        const { error: storageErr } = await supabase.storage
          .from('client-vault')
          .upload(filePath, item.blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false
          });

        if (storageErr) throw storageErr;

        // 3. Generate 1-year private signed link
        const { data: signedData, error: signErr } = await supabase.storage
          .from('client-vault')
          .createSignedUrl(filePath, 31536000);

        if (signErr || !signedData?.signedUrl) throw new Error('Signed URL generation failed');

        // 4. Insert audit ledger row using active user's credentials
        const { error: dbErr } = await supabase.from('site_visit_photos').insert({
          id: `AUDIT-${item.id}`,
          client_name: cleanClient,
          premise_type: premiseType,
          tag_key: key,
          tag_label: `${label} (Angle ${angle})`,
          photo_url: signedData.signedUrl,
          file_path: filePath,
          latitude: item.latitude,
          longitude: item.longitude,
          captured_by: inspectorFormatted,
          captured_by_user_id: storedUser?.id || null,
          captured_at: item.capturedAt
        });

        if (dbErr) {
          // Rollback file if db insert fails
          await supabase.storage.from('client-vault').remove([filePath]);
          throw dbErr;
        }

        uploadedCount++;
        removePhoto(key, item);
      } catch (err: any) {
        errors.push(err.message || 'Sync error');
        break;
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      alert(`Save interrupted: ${errors[0]}. ${uploadedCount} photos synced. Tap save again to retry remainder.`);
    } else {
      alert(`Site Inspection Audit Saved! ${uploadedCount} photos verified for ${cleanClient}.`);
      navigate('/visits');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Hidden Mobile Native Camera Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleCapture}
        className="hidden"
      />

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-[10px] font-mono font-bold text-slate-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 mb-1 transition"
          >
            <ArrowLeft size={13} className="text-red-700" />
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
            <Camera size={18} className="text-red-700" />
            <span>Site Inspection Photo Engine</span>
          </h2>
          <p className="text-xs text-slate-500">
            Rapid, multi-angle geotagged evidence capture for schools, colonies, and industrial facilities.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <UserCheck size={12} className="text-red-700" />
            <span>{inspectorFormatted}</span>
          </span>
          {coords.lat && (
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin size={10} className="text-emerald-700" />
              <span>GPS Connected</span>
            </span>
          )}
        </div>
      </div>

      {/* Establishment Selector Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Target Establishment:
          </label>
          <button
            type="button"
            onClick={() => setIsManualClient(!isManualClient)}
            className="text-[10px] font-mono font-bold text-red-700 hover:underline uppercase"
          >
            {isManualClient ? 'Pick Registered Client' : '+ Enter Prospect / Unlisted Name'}
          </button>
        </div>

        {isManualClient ? (
          <input
            type="text"
            value={manualClientName}
            onChange={(e) => setManualClientName(e.target.value)}
            placeholder="Type Client Name (e.g., THE SANSKRITI SCHOOL, AGRAWAL WAREHOUSE)..."
            className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase outline-none focus:border-red-700"
          />
        ) : (
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 cursor-pointer uppercase"
            >
              <option value="">-- Choose Target Client / Premise --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Premise Sector Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
          Premise Architecture Type:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(TEMPLATES) as PremiseType[]).map((typeKey) => {
            const item = TEMPLATES[typeKey];
            const Icon = item.icon;
            const isSelected = premiseType === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => {
                  if (totalPhotos > 0) {
                    const ok = confirm(`Switching premise type will discard ${totalPhotos} unsaved photo(s). Continue?`);
                    if (!ok) return;
                    Object.values(capturedStacks).forEach((arr) => arr.forEach((p) => URL.revokeObjectURL(p.previewUrl)));
                    setCapturedStacks({});
                  }
                  setPremiseType(typeKey);
                  setCustomSlots([]);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${isSelected
                    ? 'border-red-800 bg-red-50 text-red-950 font-bold ring-1 ring-red-800'
                    : 'border-slate-200 bg-[#FAF9F5] text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Icon size={15} className={isSelected ? 'text-red-700' : 'text-slate-400'} />
                <span className="text-xs truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Tap Spot to Snap Photo (Multi-Angle Supported):
          </label>
          <button
            type="button"
            onClick={() => setAddingSpot((v) => !v)}
            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={11} className="text-amber-300" />
            <span>Add Extra Spot</span>
          </button>
        </div>

        {addingSpot && (
          <div className="flex gap-2 items-center p-2 rounded-xl border border-slate-200 bg-[#FAF9F5]">
            <input
              autoFocus
              value={newSpotName}
              onChange={(e) => setNewSpotName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmQuickSpot();
                if (e.key === 'Escape') setAddingSpot(false);
              }}
              placeholder="e.g. Generator Room, Back Canal Wall, Canteen Backdoor"
              className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-red-700"
            />
            <button
              type="button"
              onClick={handleConfirmQuickSpot}
              disabled={!newSpotName.trim()}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1"
            >
              <Camera size={11} />
              <span>Add &amp; Snap</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {currentSlots.map((slot) => {
            const stack = capturedStacks[slot.key] || [];
            const hasPhotos = stack.length > 0;
            const latest = stack[stack.length - 1];

            return (
              <div
                key={slot.key}
                onClick={() => openPicker(slot)}
                className={`relative rounded-2xl border-2 transition-all p-3 flex flex-col justify-between cursor-pointer min-h-[120px] overflow-hidden ${hasPhotos
                    ? 'border-emerald-600 bg-emerald-50/20'
                    : 'border-dashed border-slate-300 hover:border-red-600 bg-[#FAF9F5] hover:bg-red-50/20'
                  }`}
              >
                {hasPhotos ? (
                  <>
                    <img src={latest.previewUrl} alt={slot.label} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                    <div className="relative z-10 flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>{stack.length} Photo{stack.length > 1 ? 's' : ''}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingSlotKey(slot.key);
                        }}
                        className="p-1 rounded-md bg-black/70 hover:bg-slate-900 text-white transition cursor-pointer"
                        title="View All Photos in this Slot"
                      >
                        <Eye size={12} />
                      </button>
                    </div>

                    <div className="relative z-10 mt-auto">
                      <p className="text-xs font-bold text-white uppercase leading-tight truncate">
                        {slot.label}
                      </p>
                      <span className="text-[9.5px] font-mono text-amber-300 font-bold block mt-0.5">
                        + Tap to Add More Angles
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="w-8 h-8 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-600">
                        <Camera size={16} />
                      </span>
                      {slot.required && (
                        <span className="text-[8.5px] font-mono font-bold uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-800 uppercase leading-snug">{slot.label}</p>
                      <span className="text-[9.5px] font-mono text-slate-400 block mt-0.5">Tap to Snap</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Modal for Angles */}
      {viewingSlotKey && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setViewingSlotKey(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="text-sm font-black uppercase text-slate-900">
                {currentSlots.find((s) => s.key === viewingSlotKey)?.label} ({capturedStacks[viewingSlotKey]?.length || 0} Photos)
              </h4>
              <button type="button" onClick={() => setViewingSlotKey(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {(capturedStacks[viewingSlotKey] || []).map((pic, idx) => (
                <div key={pic.id} className="relative rounded-xl border overflow-hidden aspect-video group">
                  <img src={pic.previewUrl} alt="Inspection" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded bg-black/75 text-white font-mono text-[9px] font-bold">
                      Angle {idx + 1}
                    </span>
                    {pic.latitude !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[8px] font-semibold flex items-center gap-0.5">
                        <MapPin size={8} /> GPS
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(viewingSlotKey, pic)}
                    className="absolute top-1 right-1 p-1 bg-red-700 text-white rounded-md opacity-90 hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  const s = currentSlots.find((x) => x.key === viewingSlotKey);
                  setViewingSlotKey(null);
                  if (s) openPicker(s);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Camera size={13} />
                <span>Add Another Angle</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSlotKey(null)}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync to Vault Button */}
      {totalPhotos > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div>
            <p className="text-xs font-bold uppercase">
              {totalPhotos} Photos Ready for {targetClient || 'Premises'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Auditor: <span className="text-amber-300 font-bold">{inspectorFormatted}</span> &bull; 1-Year Private Signed Link Sync
            </p>
          </div>

          <button
            type="button"
            disabled={saving || !targetClient}
            onClick={handleSaveAudit}
            className="w-full sm:w-auto px-6 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {saving ? <Loader2 size={14} className="animate-spin text-amber-300" /> : <Upload size={14} />}
            <span>{saving ? 'Encrypting & Uploading...' : 'Save Audit to Client Vault'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
