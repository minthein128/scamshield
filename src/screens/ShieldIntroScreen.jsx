import React, { useState } from 'react';
import { ArrowLeft, Shield, Check, UserPlus, Globe, Sparkles } from 'lucide-react';

export default function ShieldIntroScreen({ onNavigate, accent = '#1D4ED8' }) {
  const [shieldActive, setShieldActive] = useState(true);
  const [lang, setLang] = useState('Bahasa Indonesia');

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D]">
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between h-10">
          <button 
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          
          <button
            onClick={() => setLang(lang === 'Bahasa Indonesia' ? 'English' : 'Bahasa Indonesia')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#DCE3EC] px-3 py-1.5 rounded-full"
          >
            <Globe size={14} />
            {lang}
          </button>
        </div>

        {/* Hero Card */}
        <div className="bg-[#0F1B2D] text-white rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-lg relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Shield size={36} strokeWidth={2.2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold">Your shield button</h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
              It sits on the side of your screen across social apps, WhatsApp, and browsers. Tap it on anything that looks strange.
            </p>
          </div>

          {/* Interactive Floating Shield Bubble Demo */}
          <div className="w-full bg-[#1E293B] rounded-2xl p-4 border border-slate-700 relative flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg animate-pulse ring-4 ring-blue-500/30">
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Tap the shield</span>
                <span className="text-[11px] text-slate-400">Instant on-device OCR & check</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              Ready
            </span>
          </div>
        </div>

        {/* 3 Verdict Levels */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-900">We check it for you</span>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-emerald-900">Safe</span>
              <span className="text-[10px] text-emerald-700">Verified legit</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900">Careful</span>
              <span className="text-[10px] text-amber-700">Unverified flags</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-50 border border-red-100 text-center">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-xs font-bold text-red-900">Danger</span>
              <span className="text-[10px] text-red-700">High-risk fraud</span>
            </div>
          </div>
        </div>

        {/* Try the flows CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <Sparkles size={16} className="text-blue-600" />
            <span>Interactive Overlay Flow Demos</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => onNavigate('job_spot')}
              className="p-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-slate-800 text-left hover:border-blue-400 transition"
            >
              1. Job Post Trap Flow (B-F)
            </button>
            <button
              onClick={() => onNavigate('chat_strange')}
              className="p-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-slate-800 text-left hover:border-blue-400 transition"
            >
              2. Romance / Chat Scam (G-J)
            </button>
            <button
              onClick={() => onNavigate('notif_warning')}
              className="p-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-slate-800 text-left hover:border-blue-400 transition"
            >
              3. Parcel SMS Phishing (K-L)
            </button>
            <button
              onClick={() => onNavigate('agency_page')}
              className="p-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-slate-800 text-left hover:border-blue-400 transition"
            >
              4. Agency Verification (M-N)
            </button>
            <button
              onClick={() => onNavigate('shop_listing')}
              className="p-2.5 bg-white border border-blue-200 rounded-xl font-semibold text-slate-800 text-left hover:border-blue-400 transition col-span-2"
            >
              5. Cheap Phone Marketplace Scam (O-R)
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-5 bg-white border-t border-[#DCE3EC] flex flex-col gap-2 shrink-0">
        <button
          onClick={() => {
            setShieldActive(!shieldActive);
            onNavigate('job_spot');
          }}
          style={{ backgroundColor: accent }}
          className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition shadow"
        >
          <Shield size={18} />
          {shieldActive ? 'Shield is On — Test Overlays' : 'Turn on shield'}
        </button>

        <button
          onClick={() => onNavigate('family_guardian')}
          className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <UserPlus size={16} />
          Add a family member
        </button>
      </div>
    </div>
  );
}
