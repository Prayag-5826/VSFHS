import React, { useState } from 'react';
import {
  Save,
  Building2,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileCheck2,
  Stamp,
  UserCheck,
  MapPin,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useAuth();
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || 'VIDHYA SECURITY FORCE & HOUSEKEEPING SERVICES',
    contactNo: settings?.contactNo || '9826259020',
    email: settings?.email || 'vidhyasecurity@gmail.com',
    address: settings?.address || '012 A BLOCK TREASURE TOWN INDORE',
    gstNumber: settings?.gstNumber || '23AQRPD0652Q2ZI',
    psaraLicense: settings?.psaraLicense || 'PSA/L/74/MP/2023/FEB/3/425',
    directorName: settings?.directorName || 'Anil Dhariwal',
    logo: settings?.logo || '',
    sealImage: settings?.sealImage || ''
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Helper function to handle image file reader uploads
  const handleImageUpload = (key: 'logo' | 'sealImage') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">System & Agency Configuration</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Manage official legal identifiers, branding stamps, and company metadata.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Left Column: Branding Assets (Logo & Seal Uploads) */}
          <div className="md:col-span-1 space-y-6">

            {/* Logo Upload Box */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl text-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Official Agency Logo</label>
              <div className="relative inline-block">
                <div className="w-36 h-36 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-200 overflow-hidden shadow-inner">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Agency Logo" className="w-full h-full object-contain p-3" />
                  ) : (
                    <Building2 size={40} className="text-slate-200" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-xl cursor-pointer hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('logo')} />
                </label>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-4 italic">Appears on letterheads & navigation bar</p>
            </div>

            {/* Stamp/Seal Image Upload Box */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl text-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Official Stamp Seal Image</label>
              <div className="relative inline-block">
                <div className="w-36 h-36 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-200 overflow-hidden shadow-inner">
                  {formData.sealImage ? (
                    <img src={formData.sealImage} alt="Official Stamp" className="w-full h-full object-contain p-3" />
                  ) : (
                    <Stamp size={40} className="text-slate-200" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xl cursor-pointer hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload('sealImage')} />
                </label>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-4 italic">Printed on Quotation proposals</p>
            </div>

          </div>

          {/* Right Column: Form Fields for Company Details & Legal Credentials */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">

              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-4 flex items-center uppercase tracking-widest">
                <ShieldCheck size={18} className="mr-2 text-indigo-600" />
                Core Agency Profile
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Organization Legal Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value.toUpperCase() }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xs text-slate-950 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Contact Phone Line</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input
                      required
                      value={formData.contactNo}
                      onChange={(e) => setFormData(p => ({ ...p, contactNo: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-black text-xs text-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Official Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-950"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Registered Office Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input
                      value={formData.address}
                      onChange={(e) => setFormData(p => ({ ...p, address: e.target.value.toUpperCase() }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-950 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Legal Registrations & Licensing */}
              <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pt-4 pb-4 flex items-center uppercase tracking-widest">
                <FileCheck2 size={18} className="mr-2 text-indigo-600" />
                Statutory & License Accreditation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">GSTIN Number</label>
                  <input
                    value={formData.gstNumber}
                    onChange={(e) => setFormData(p => ({ ...p, gstNumber: e.target.value.toUpperCase() }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-black text-xs text-slate-950 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">PSARA License Number</label>
                  <input
                    value={formData.psaraLicense}
                    onChange={(e) => setFormData(p => ({ ...p, psaraLicense: e.target.value.toUpperCase() }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-black text-xs text-slate-950 uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Director / Authorized Signatory Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input
                      value={formData.directorName}
                      onChange={(e) => setFormData(p => ({ ...p, directorName: e.target.value.toUpperCase() }))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xs text-slate-950 uppercase"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Submit Action Control */}
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="flex-1 bg-slate-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center uppercase text-xs tracking-widest active:scale-95"
              >
                <Save size={18} className="mr-2 text-indigo-400" />
                Commit System Configuration
              </button>
              {showSuccess && (
                <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest animate-bounce px-2">
                  <CheckCircle2 size={18} className="mr-1.5" />
                  Synced!
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
