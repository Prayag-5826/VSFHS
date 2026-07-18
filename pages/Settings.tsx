
import React, { useState } from 'react';
import { 
  Save, 
  Building2, 
  Phone, 
  Image as ImageIcon, 
  ShieldCheck, 
  Lock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useAuth();
  const [formData, setFormData] = useState({ ...settings });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase">System Configuration</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Manage global identity and security parameters.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-4">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">Company Branding</label>
                <div className="relative inline-block">
                  <div className="w-40 h-40 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-200 overflow-hidden shadow-inner">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                    ) : (
                      <Building2 size={48} className="text-slate-200" />
                    )}
                  </div>
                  <label className="absolute -bottom-3 -right-3 p-3 bg-indigo-600 text-white rounded-[1.2rem] shadow-2xl cursor-pointer hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-8 leading-relaxed italic">Square aspect ratio (PNG/JPG)</p>
             </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8">
               <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-6 flex items-center uppercase tracking-tight">
                 <ShieldCheck size={20} className="mr-3 text-indigo-600" />
                 Core Identity Profile
               </h3>
               
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Global Organization Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-4 text-slate-300" size={18} />
                      <input
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value.toUpperCase() }))}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-black text-slate-950 uppercase tracking-tight"
                        placeholder="Organization Name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">System Support Contact</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                      <input
                        required
                        value={formData.contactNo}
                        onChange={(e) => setFormData(p => ({ ...p, contactNo: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-widest"
                        placeholder="+91-XXXXXXXXXX"
                      />
                    </div>
                  </div>
               </div>

               <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pt-4 pb-6 flex items-center uppercase tracking-tight">
                 <Lock size={20} className="mr-3 text-indigo-600" />
                 Global Security Key
               </h3>

               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Master Administrative Passkey</label>
                 <div className="relative">
                   <Lock className="absolute left-4 top-4 text-slate-300" size={18} />
                   <input
                     type="password"
                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none text-slate-950 font-black tracking-widest"
                     placeholder="New System Password"
                   />
                 </div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 ml-1 italic">Leave empty to retain existing security credentials.</p>
               </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="flex-1 bg-slate-950 hover:bg-black text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all flex items-center justify-center uppercase text-xs tracking-[0.2em] active:scale-95"
              >
                <Save size={20} className="mr-3 text-indigo-400" />
                Commit System Configuration
              </button>
              {showSuccess && (
                <div className="flex items-center text-emerald-600 font-black text-xs uppercase tracking-widest animate-bounce px-4">
                  <CheckCircle2 size={18} className="mr-2" />
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
