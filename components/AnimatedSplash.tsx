import React, { useEffect, useState } from 'react';

interface SplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<SplashProps> = ({ onFinish }) => {
  // Animation stage controllers
  const [step, setStep] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    // Sequence Timeline:
    // 0ms: Container mounts on pure warm cream/white canvas
    // 150ms: Step 1 -> Emblem zooms in & glows
    const t1 = setTimeout(() => setStep(1), 150);

    // 700ms: Step 2 -> Brand Title "VIDHYA SECURITY FORCE" slides up
    const t2 = setTimeout(() => setStep(2), 700);

    // 1200ms: Step 3 -> Hindi Motto "संरक्षण एवं सुरक्षा" & Subtext reveal
    const t3 = setTimeout(() => setStep(3), 1200);

    // 2200ms: Step 4 -> Smooth exit fade-out transition
    const t4 = setTimeout(() => setIsExiting(true), 2200);

    // 2600ms: Unmount completely and reveal Login Page
    const t5 = setTimeout(() => onFinish(), 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-[#FBFBF9] px-6 py-10 sm:py-16 select-none transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top PSARA Badge */}
      <div
        className={`transition-all duration-700 ease-out transform ${
          step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 font-mono text-[9.5px] sm:text-[11px] font-black uppercase tracking-widest text-amber-800 shadow-xs">
          Govt. Registered Agency &bull; MP PSARA Licensed
        </span>
      </div>

      {/* Center Cinematic Branding Block */}
      <div className="flex flex-col items-center text-center max-w-lg w-full px-4 space-y-4 sm:space-y-6">

        {/* 1. Animated Logo Container */}
        <div className="relative flex items-center justify-center">
          {/* Subtle gold radial pulse */}
          <div
            className={`absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-amber-200/40 blur-2xl transition-all duration-1000 ${
              step >= 1 ? 'scale-110 opacity-100' : 'scale-75 opacity-0'
            }`}
          />

          {/* Emblem Wrapper */}
          <div
            className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white p-2.5 shadow-[0_15px_35px_-10px_rgba(185,28,28,0.15)] border border-slate-100 flex items-center justify-center transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${
              step >= 1
                ? 'opacity-100 scale-100 translate-y-0 rotate-0'
                : 'opacity-0 scale-50 translate-y-8 -rotate-6'
            }`}
          >
            <img
              src="/assets/logo.png"
              onError={(e) => {
                // Fallback if logo is served directly from root public folder
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
              alt="Vidhya Security Force Emblem"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
        </div>

        {/* 2. Sequential Text Block */}
        <div className="space-y-2">
          {/* Main Brand Name */}
          <h1
            className={`text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 font-sans transition-all duration-700 ease-out transform ${
              step >= 2
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            Vidhya Security Force
            <span className="block text-xs sm:text-sm font-bold text-slate-500 tracking-normal capitalize mt-0.5">
              &amp; Housekeeping Services
            </span>
          </h1>

          {/* Hindi Statutory Motto */}
          <div
            className={`pt-1 transition-all duration-700 ease-out transform ${
              step >= 3
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-50 border border-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold text-red-700 tracking-wider font-hindi">
                संरक्षण एवं सुरक्षा
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Progress Bar & Field Portal Tag */}
      <div
        className={`w-full max-w-xs space-y-2 text-center transition-all duration-700 ${
          step >= 2 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="h-1 w-full bg-slate-200/70 rounded-full overflow-hidden">
          <div
            className={`h-full bg-red-700 rounded-full transition-all duration-1000 ease-out ${
              step >= 3 ? 'w-full' : step >= 2 ? 'w-2/3' : 'w-1/4'
            }`}
          />
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-400 block tracking-wider uppercase">
          Initializing Field Officer Terminal...
        </span>
      </div>

    </div>
  );
};
