import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Shield, Volume2, VolumeX, Trash2, HelpCircle, Bell, ExternalLink, Lock } from 'lucide-react';

export default function MessageShieldFlow({ onNavigate, initialStep = 1, accent = '#1D4ED8' }) {
  const [step, setStep] = useState(initialStep);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D] relative">
      {/* Top Bar with Step Navigator */}
      <div className="p-3 bg-white border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
        <button 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Exit
        </button>
        <div className="flex items-center gap-1">
          {['K', 'L'].map((label, idx) => (
            <button
              key={label}
              onClick={() => setStep(idx + 1)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold transition ${
                step === idx + 1
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-semibold text-slate-500">
          Step {step}/2
        </span>
      </div>

      {/* Screen Content */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col relative">

        {/* STEP 1 (Board K: Automatic warning notification banner) */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Messages · Just now</span>
              <span>SMS App</span>
            </div>

            {/* Phishing SMS Card */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">+62 812-9844-3211</span>
                <span className="text-[10px] text-slate-400">14:02</span>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-100">
                Your parcel is held at the warehouse. Pay the small delivery fee today or it will be returned: <span className="text-blue-600 underline font-mono">id-express-delivery[.]top/track</span>
              </div>
            </div>

            {/* In-app Automatic Warning Card */}
            <div 
              onClick={() => setStep(2)}
              className="bg-[#9A3412] text-white rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-[#832c0f] transition shadow-lg animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-300" />
                  <span className="text-xs font-bold">Danger: likely fake message</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">
                  Automated
                </span>
              </div>

              <p className="text-xs text-orange-100 leading-snug">
                Do not open the link. Tap here to see why our local scan flagged this.
              </p>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="bg-slate-100 rounded-xl p-3.5 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600 mt-2">
              <Lock size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Checked on your phone first.</strong> SafeRoute preserves SMS privacy; only messages with suspicious patterns are ever sent for deep cloud correlation.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2 (Board L: Message verdict - Fake delivery fee) */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#9A3412] text-white rounded-2xl p-5 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  Danger
                </span>
                <span className="text-xs font-semibold text-orange-200">Parcel Phishing</span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Fake delivery fee</h2>
                <p className="text-xs text-orange-100 font-medium leading-relaxed">
                  Do not open the link. Check your parcel in the courier's own app.
                </p>
              </div>

              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-full h-10 rounded-xl bg-black/30 hover:bg-black/40 border border-white/20 flex items-center justify-between px-3 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isPlayingAudio ? 'Explaining phishing scam...' : 'Listen audio explanation'}</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                  {isPlayingAudio ? 'Stop' : 'Audio'}
                </span>
              </button>
            </div>

            {/* Evidence items */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900">Red-flag signals</span>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 border border-red-100">
                  <span className="font-bold text-slate-900">The link is a known trap</span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Google Web Risk</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 border border-red-100">
                  <span className="font-bold text-slate-900">Number reported by others</span>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Seen before</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="font-bold text-slate-900">Small fee, pay today</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Fake urgency</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setDeleted(true)}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Trash2 size={16} />
                {deleted ? '✓ Message Deleted & Sender Blocked' : 'Delete and block'}
              </button>

              <button
                onClick={() => alert("Emergency Guide: 1. If you entered your card number, contact your bank immediately to freeze the card. 2. If you installed an APK file, disconnect your phone from Wi-Fi/data and run an antivirus scan.")}
                className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <HelpCircle size={16} />
                I already opened it or paid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
