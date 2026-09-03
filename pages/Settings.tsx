import React, { useState, useEffect } from 'react';
import {
  Save,
  Building2,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Stamp,
  UserCheck,
  MapPin,
  Mail,
  Loader2,
  Trash2,
  ShieldAlert,
  Scale,
  Percent,
  IndianRupee,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/apiService';
import { useToast } from '../components/ToastContext';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    // Core Identity & Accreditations
    companyName: 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
    contactNo: '9826259020',
    email: 'vidhyasecurity@gmail.com',
    address: '012 A BLOCK TREASURE TOWN INDORE, MP',
    gstNumber: '23AQRPD0652Q2ZI',
    psaraLicense: 'PSA/L/74/MP/2023/FEB/3/425',
    directorName: 'Anil Dhariwal',
    logo: '/assets/img/logo/logo.png',
    sealImage: '',

    // Government Statutory Registrations
    labourRegNo: 'INDO220426SE009839',
    epfCode: 'MPIND1462732000 / 18000232770',
    esicRegNo: '18000237700000999',
    ptLicenseNo: '79479022051',
    panNumber: 'AQRPD0652Q',

    // Madhya Pradesh Minimum Wages (26 Days Basis)
    guardBasic12: 13421,
    guardBasic8: 12425,
    supervisorBasic12: 14869,
    supervisorBasic8: 13800,
    gunmanBasic12: 16500,
    gunmanBasic8: 15000,
    housekeepingBasic12: 12425,
    housekeepingBasic8: 11500,

    // Commercial Flat Rates Baseline (Monthly Per Head)
    flatGuard12: 15500,
    flatGuard8: 12500,
    flatSupervisor12: 18500,
    flatSupervisor8: 15500,
    flatGunman12: 23000,
    flatGunman8: 19500,
    flatHousekeeping12: 14000,
    flatHousekeeping8: 11000,

    // Statutory Formulas & Percentages
    overtimePercent: 35,
    reliverPercent: 16.67,
    epfPercent: 13,
    esicPercent: 3.25,
    lwfAmount: 12,
    uniformKitAmount: 125,
    defaultServiceMargin: 8
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'logo' | 'sealImage' | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // 1. Fetch live settings directly from the Supabase database
  const fetchDBSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const mappedData = {
          companyName: data.company_name ?? formData.companyName,
          contactNo: data.contact_no ?? formData.contactNo,
          email: data.email ?? formData.email,
          address: data.address ?? formData.address,
          gstNumber: data.gst_number ?? formData.gstNumber,
          psaraLicense: data.psara_license ?? formData.psaraLicense,
          directorName: data.director_name ?? formData.directorName,
          logo: data.logo ?? formData.logo,
          sealImage: data.seal_image ?? formData.sealImage,

          labourRegNo: data.labour_reg_no ?? formData.labourRegNo,
          epfCode: data.epf_code ?? formData.epfCode,
          esicRegNo: data.esic_reg_no ?? formData.esicRegNo,
          ptLicenseNo: data.pt_license_no ?? formData.ptLicenseNo,
          panNumber: data.pan_number ?? formData.panNumber,

          guardBasic12: Number(data.guard_basic_12 ?? 13421),
          guardBasic8: Number(data.guard_basic_8 ?? 12425),
          supervisorBasic12: Number(data.supervisor_basic_12 ?? 14869),
          supervisorBasic8: Number(data.supervisor_basic_8 ?? 13800),
          gunmanBasic12: Number(data.gunman_basic_12 ?? 16500),
          gunmanBasic8: Number(data.gunman_basic_8 ?? 15000),
          housekeepingBasic12: Number(data.housekeeping_basic_12 ?? 12425),
          housekeepingBasic8: Number(data.housekeeping_basic_8 ?? 11500),

          flatGuard12: Number(data.flat_guard_12 ?? 15500),
          flatGuard8: Number(data.flat_guard_8 ?? 12500),
          flatSupervisor12: Number(data.flat_supervisor_12 ?? 18500),
          flatSupervisor8: Number(data.flat_supervisor_8 ?? 15500),
          flatGunman12: Number(data.flat_gunman_12 ?? 23000),
          flatGunman8: Number(data.flat_gunman_8 ?? 19500),
          flatHousekeeping12: Number(data.flat_housekeeping_12 ?? 14000),
          flatHousekeeping8: Number(data.flat_housekeeping_8 ?? 11000),

          overtimePercent: Number(data.overtime_percent ?? 35),
          reliverPercent: Number(data.reliver_percent ?? 16.67),
          epfPercent: Number(data.epf_percent ?? 13),
          esicPercent: Number(data.esic_percent ?? 3.25),
          lwfAmount: Number(data.lwf_amount ?? 12),
          uniformKitAmount: Number(data.uniform_kit_amount ?? 125),
          defaultServiceMargin: Number(data.default_service_margin ?? 8)
        };

        setFormData(mappedData);
        updateSettings(mappedData);
      }
    } catch (err: any) {
      console.warn('Failed to load settings from Supabase, using context/local fallback:', err);
      if (settings) {
        setFormData((prev) => ({ ...prev, ...settings }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDBSettings();
  }, []);

  // 2. Direct Supabase Storage Upload
  const handleFileUploadToBucket = (key: 'logo' | 'sealImage') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File exceeds 5MB limit. Please upload a smaller image.', 'error');
      return;
    }

    setUploadingTarget(key);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${key}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload file directly to the 'agency-assets' bucket
      const { error: uploadError } = await supabase.storage
        .from('agency-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('agency-assets')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;
      setFormData((prev) => ({ ...prev, [key]: publicUrl }));
      showToast(`${key === 'logo' ? 'Logo' : 'Official Seal'} uploaded to cloud storage.`, 'success');
    } catch (err: any) {
      console.error('Upload failed:', err);
      showToast(`Upload failed: ${err.message || 'Check storage bucket permissions.'}`, 'error');
    } finally {
      setUploadingTarget(null);
    }
  };

  // 3. Commit settings changes to Supabase database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      id: 1,
      company_name: formData.companyName,
      contact_no: formData.contactNo,
      email: formData.email,
      address: formData.address,
      gst_number: formData.gstNumber,
      psara_license: formData.psaraLicense,
      director_name: formData.directorName,
      logo: formData.logo,
      seal_image: formData.sealImage,

      labour_reg_no: formData.labourRegNo,
      epf_code: formData.epfCode,
      esic_reg_no: formData.esicRegNo,
      pt_license_no: formData.ptLicenseNo,
      pan_number: formData.panNumber,

      guard_basic_12: formData.guardBasic12,
      guard_basic_8: formData.guardBasic8,
      supervisor_basic_12: formData.supervisorBasic12,
      supervisor_basic_8: formData.supervisorBasic8,
      gunman_basic_12: formData.gunmanBasic12,
      gunman_basic_8: formData.gunmanBasic8,
      housekeeping_basic_12: formData.housekeepingBasic12,
      housekeeping_basic_8: formData.housekeepingBasic8,

      flat_guard_12: formData.flatGuard12,
      flat_guard_8: formData.flatGuard8,
      flat_supervisor_12: formData.flatSupervisor12,
      flat_supervisor_8: formData.flatSupervisor8,
      flat_gunman_12: formData.flatGunman12,
      flat_gunman_8: formData.flatGunman8,
      flat_housekeeping_12: formData.flatHousekeeping12,
      flat_housekeeping_8: formData.flatHousekeeping8,

      overtime_percent: formData.overtimePercent,
      reliver_percent: formData.reliverPercent,
      epf_percent: formData.epfPercent,
      esic_percent: formData.esicPercent,
      lwf_amount: formData.lwfAmount,
      uniform_kit_amount: formData.uniformKitAmount,
      default_service_margin: formData.defaultServiceMargin,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('settings')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      // Update state and local storage
      updateSettings(formData);
      localStorage.setItem('vsf_app_settings', JSON.stringify(formData));

      setShowSuccess(true);
      showToast('Master wage matrix & settings committed to database.', 'success');
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (err: any) {
      console.error('Settings database save error:', err);
      updateSettings(formData);
      localStorage.setItem('vsf_app_settings', JSON.stringify(formData));
      showToast(`Database write failed: ${err.message}. Saved locally.`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 bg-[#FBFBF9]">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-xs">
          <Loader2 className="animate-spin text-red-700" size={26} />
        </div>
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Master Settings from Database...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 pb-20 px-1 sm:px-2 animate-in fade-in duration-200">

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 p-6 sm:p-7 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-red-700 mb-1">
            <ShieldAlert size={16} />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-red-800">
              Database Master Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            System &amp; Statutory Setup
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Configure Madhya Pradesh PSARA minimum wages, commercial flat rates, bucket assets, and accreditation numbers
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[10px] font-mono font-bold text-amber-900 uppercase self-start sm:self-auto flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-amber-700" />
          <span>PSARA MP Licensed</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column: Cloud Bucket Brand Assets (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Cloud Logo Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs text-center space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <label className="text-[10.5px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  Official Agency Logo (Cloud Bucket)
                </label>
                <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                  Stored in <code className="text-red-700">agency-assets</code> bucket
                </p>
              </div>

              <div className="relative inline-block my-2">
                <div className="w-36 h-36 bg-[#FBFBF9] rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden shadow-inner p-2">
                  {uploadingTarget === 'logo' ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="animate-spin text-red-700" size={24} />
                      <span className="text-[9px] font-mono font-bold text-slate-500">Uploading...</span>
                    </div>
                  ) : formData.logo ? (
                    <img src={formData.logo} alt="Agency Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 size={44} className="text-slate-300" />
                  )}
                </div>

                <div className="absolute -bottom-2 -right-2 flex gap-1.5">
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logo: '' }))}
                      className="p-2 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 rounded-xl shadow-xs transition cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <label className="p-2 bg-red-700 text-white rounded-xl shadow-xs cursor-pointer hover:bg-red-800 transition active:scale-95">
                    <UploadCloud size={16} className="text-amber-300" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUploadToBucket('logo')} />
                  </label>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 font-mono break-all px-2">
                {formData.logo.startsWith('http') ? 'Cloud URL Synced' : 'Default Asset'}
              </p>
            </div>

            {/* Cloud Seal Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs text-center space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <label className="text-[10.5px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                  Authorized Signatory Seal (Cloud Bucket)
                </label>
                <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                  Stored in <code className="text-red-700">agency-assets</code> bucket
                </p>
              </div>

              <div className="relative inline-block my-2">
                <div className="w-36 h-36 bg-[#FBFBF9] rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden shadow-inner p-2">
                  {uploadingTarget === 'sealImage' ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="animate-spin text-amber-600" size={24} />
                      <span className="text-[9px] font-mono font-bold text-slate-500">Uploading...</span>
                    </div>
                  ) : formData.sealImage ? (
                    <img src={formData.sealImage} alt="Agency Seal" className="w-full h-full object-contain" />
                  ) : (
                    <Stamp size={44} className="text-slate-300" />
                  )}
                </div>

                <div className="absolute -bottom-2 -right-2 flex gap-1.5">
                  {formData.sealImage && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, sealImage: '' }))}
                      className="p-2 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 rounded-xl shadow-xs transition cursor-pointer"
                      title="Remove Seal"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <label className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs cursor-pointer transition active:scale-95">
                    <UploadCloud size={16} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUploadToBucket('sealImage')} />
                  </label>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 font-mono break-all px-2">
                {formData.sealImage ? 'Cloud URL Synced' : 'No seal uploaded yet'}
              </p>
            </div>

            {/* Formula Coefficients Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-red-700 border-b border-slate-100 pb-3">
                <Percent size={16} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Statutory Rule Multipliers
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Overtime 4-Hour Ratio (%)[cite: 5]
                  </label>
                  <input
                    type="number"
                    value={formData.overtimePercent}
                    onChange={(e) => setFormData((p) => ({ ...p, overtimePercent: Number(e.target.value) }))}
                    className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Reliever Weekly Rest (%)[cite: 5]
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reliverPercent}
                    onChange={(e) => setFormData((p) => ({ ...p, reliverPercent: Number(e.target.value) }))}
                    className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                      EPF (%)[cite: 5]
                    </label>
                    <input
                      type="number"
                      value={formData.epfPercent}
                      onChange={(e) => setFormData((p) => ({ ...p, epfPercent: Number(e.target.value) }))}
                      className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                      ESIC (%)[cite: 5]
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.esicPercent}
                      onChange={(e) => setFormData((p) => ({ ...p, esicPercent: Number(e.target.value) }))}
                      className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                      LWF (₹)[cite: 5]
                    </label>
                    <input
                      type="number"
                      value={formData.lwfAmount}
                      onChange={(e) => setFormData((p) => ({ ...p, lwfAmount: Number(e.target.value) }))}
                      className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                      Uniform Kit (₹)[cite: 5]
                    </label>
                    <input
                      type="number"
                      value={formData.uniformKitAmount}
                      onChange={(e) => setFormData((p) => ({ ...p, uniformKitAmount: Number(e.target.value) }))}
                      className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Default Agency Service Margin (%)[cite: 5]
                  </label>
                  <input
                    type="number"
                    value={formData.defaultServiceMargin}
                    onChange={(e) => setFormData((p) => ({ ...p, defaultServiceMargin: Number(e.target.value) }))}
                    className="w-full p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Master Wages & Company Legal Profile (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. MASTER MINIMUM WAGE MATRIX (Madhya Pradesh Labour Dept) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-red-700">
                  <Scale size={18} />
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      M.P. PSARA Master Minimum Wage Benchmark (26 Days Basis)
                    </h3>
                    <p className="text-[9.5px] text-slate-400 font-medium">
                      Stored in database; changes dynamically populate throughout the quotation engine
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                  Labour Dept M.P.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Security Guard */}
                <div className="p-3.5 bg-[#FBFBF9] border border-slate-200/90 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase text-slate-900 block">Security Guard</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        12-Hour Basic (₹)[cite: 5]
                      </label>
                      <input
                        type="number"
                        value={formData.guardBasic12}
                        onChange={(e) => setFormData((p) => ({ ...p, guardBasic12: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        08-Hour Basic (₹)[cite: 5]
                      </label>
                      <input
                        type="number"
                        value={formData.guardBasic8}
                        onChange={(e) => setFormData((p) => ({ ...p, guardBasic8: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Supervisor */}
                <div className="p-3.5 bg-[#FBFBF9] border border-slate-200/90 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase text-slate-900 block">Security Field Supervisor</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        12-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.supervisorBasic12}
                        onChange={(e) => setFormData((p) => ({ ...p, supervisorBasic12: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        08-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.supervisorBasic8}
                        onChange={(e) => setFormData((p) => ({ ...p, supervisorBasic8: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Armed Gunman */}
                <div className="p-3.5 bg-[#FBFBF9] border border-slate-200/90 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase text-slate-900 block">Armed Gunman (12 Bore / .32)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        12-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.gunmanBasic12}
                        onChange={(e) => setFormData((p) => ({ ...p, gunmanBasic12: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        08-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.gunmanBasic8}
                        onChange={(e) => setFormData((p) => ({ ...p, gunmanBasic8: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Housekeeping & Sanitation */}
                <div className="p-3.5 bg-[#FBFBF9] border border-slate-200/90 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase text-slate-900 block">Housekeeping &amp; Sanitation[cite: 5]</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        12-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.housekeepingBasic12}
                        onChange={(e) => setFormData((p) => ({ ...p, housekeepingBasic12: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">
                        08-Hour Basic (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.housekeepingBasic8}
                        onChange={(e) => setFormData((p) => ({ ...p, housekeepingBasic8: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MASTER FLAT RATES BENCHMARK (Monthly Per Head) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center space-x-2 text-amber-800 border-b border-slate-100 pb-3">
                <IndianRupee size={18} />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Commercial Flat Rate Standards (Per Head / Monthly)
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-medium">
                    Pre-fills the Flat Rate mode inside Create Quotation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Guard 12-Hr (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.flatGuard12}
                    onChange={(e) => setFormData((p) => ({ ...p, flatGuard12: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Guard 8-Hr (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.flatGuard8}
                    onChange={(e) => setFormData((p) => ({ ...p, flatGuard8: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Supervisor 12-Hr (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.flatSupervisor12}
                    onChange={(e) => setFormData((p) => ({ ...p, flatSupervisor12: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] font-mono font-bold text-slate-600 uppercase block mb-1">
                    Gunman 12-Hr (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.flatGunman12}
                    onChange={(e) => setFormData((p) => ({ ...p, flatGunman12: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl font-mono font-bold text-xs outline-none focus:border-red-700"
                  />
                </div>
              </div>
            </div>

            {/* 3. CORE AGENCY OPERATIONAL IDENTITY */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center space-x-2 text-red-700 border-b border-slate-100 pb-3">
                <Building2 size={18} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Organization Operational Identity
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Full Legal Registered Name <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData((p) => ({ ...p, companyName: e.target.value.toUpperCase() }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition uppercase"
                      placeholder="VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Direct Command Phone <span className="text-red-600">*</span>[cite: 5]
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 text-amber-700" size={15} />
                      <input
                        required
                        value={formData.contactNo}
                        onChange={(e) => setFormData((p) => ({ ...p, contactNo: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                        placeholder="9826259020"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Operations Email Address[cite: 5]
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 text-amber-700" size={15} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 focus:bg-white transition"
                        placeholder="vidhyasecurity@gmail.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Registered Headquarters Address[cite: 5]
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value.toUpperCase() }))}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-red-700 focus:bg-white transition uppercase"
                      placeholder="012 A BLOCK TREASURE TOWN INDORE, MP"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. STATUTORY ACCREDITATION & LICENSE DOSSIER */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center space-x-2 text-amber-800 border-b border-slate-100 pb-3">
                <FileCheck2 size={18} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Statutory Registrations &amp; Government Accreditations[cite: 5]
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    1. PSARA License Number[cite: 5]
                  </label>
                  <input
                    value={formData.psaraLicense}
                    onChange={(e) => setFormData((p) => ({ ...p, psaraLicense: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="PSA/L/74/MP/2023/FEB/3/425"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    2. Labour Commissioner Registration No[cite: 5]
                  </label>
                  <input
                    value={formData.labourRegNo}
                    onChange={(e) => setFormData((p) => ({ ...p, labourRegNo: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="INDO220426SE009839"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    3. Employee Provident Fund (EPF Code)[cite: 5]
                  </label>
                  <input
                    value={formData.epfCode}
                    onChange={(e) => setFormData((p) => ({ ...p, epfCode: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="MPIND1462732000 / 18000232770"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    4. ESIC Corporation Registration[cite: 5]
                  </label>
                  <input
                    value={formData.esicRegNo}
                    onChange={(e) => setFormData((p) => ({ ...p, esicRegNo: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="18000237700000999"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    5. GST Registration Number (GSTIN)[cite: 5]
                  </label>
                  <input
                    value={formData.gstNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="23AQRPD0652Q2ZI"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    6. Professional Tax (P.T.) License[cite: 5]
                  </label>
                  <input
                    value={formData.ptLicenseNo}
                    onChange={(e) => setFormData((p) => ({ ...p, ptLicenseNo: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="79479022051"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    7. Income Tax PAN Card[cite: 5]
                  </label>
                  <input
                    value={formData.panNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                    className="w-full px-3.5 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                    placeholder="AQRPD0652Q"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    8. Managing Director / Signatory Name[cite: 5]
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-3 text-amber-700" size={15} />
                    <input
                      value={formData.directorName}
                      onChange={(e) => setFormData((p) => ({ ...p, directorName: e.target.value.toUpperCase() }))}
                      className="w-full pl-10 pr-4 py-2 bg-[#FBFBF9] border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-red-700 uppercase"
                      placeholder="ANIL DHARIWAL"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:flex-1 py-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xs transition active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin text-amber-300" size={16} />
                    <span>Saving Directly to Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} className="text-amber-300" />
                    <span>Commit All System &amp; Wage Configurations</span>
                  </>
                )}
              </button>

              {showSuccess && (
                <div className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold uppercase tracking-wide">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Database Synced!</span>
                </div>
              )}
            </div>

          </div>

        </div>
      </form>
    </div>
  );
};

export default Settings;
