import React, { useState } from 'react';
import { ArrowLeft, Shield, AlertOctagon, Volume2, VolumeX, Users, PhoneCall, CheckCircle, ThumbsUp, MessageCircle, Share2, AlertTriangle, Eye } from 'lucide-react';

export default function JobShieldFlow({ onNavigate, initialStep = 1, accent = '#1D4ED8' }) {
  const [step, setStep] = useState(initialStep);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [lang, setLang] = useState('Bahasa');

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
          {['B', 'C', 'D', 'E', 'F'].map((label, idx) => (
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
          Step {step}/5
        </span>
      </div>

      {/* Screen Content depending on Step */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col relative">

        {/* STEP 1 (Board B: Spot a job post) */}
        {step === 1 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Overseas Jobs Group</span>
              <span>Any social app · sample</span>
            </div>

            {/* Post Card */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Agent Siti</span>
                  <span className="text-[10px] text-slate-500">2 hours ago · Public</span>
                </div>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed font-sans">
                Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week...
                <button 
                  onClick={() => setStep(3)}
                  className="font-bold text-blue-600 hover:underline ml-1"
                >
                  See more
                </button>
              </div>

              {/* Photo placeholder */}
              <div className="h-40 rounded-xl bg-slate-800 relative overflow-hidden flex items-center justify-center text-white">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="z-10 text-center p-3">
                  <span className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-900 px-2 py-0.5 rounded">
                    HIGH SALARY OVERSEAS
                  </span>
                  <p className="text-[11px] text-slate-200 mt-1">Bangkok Office Logistics Staff Wanted</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500 text-xs">
                <span className="flex items-center gap-1"><ThumbsUp size={14} /> 12</span>
                <span className="flex items-center gap-1"><MessageCircle size={14} /> 3 comments</span>
                <span className="flex items-center gap-1"><Share2 size={14} /> Share</span>
              </div>
            </div>

            {/* Second post in feed */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-2 opacity-60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs">
                  B
                </div>
                <span className="text-xs font-bold text-slate-800">Budi</span>
              </div>
              <p className="text-xs text-slate-700">Anyone know if the Malaysia factory jobs are real?</p>
            </div>

            {/* Floating Shield Bubble */}
            <div 
              onClick={() => setStep(2)}
              className="absolute right-0 top-36 z-30 flex items-center gap-2 cursor-pointer animate-bounce"
            >
              <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg">
                Tap to check this
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl ring-4 ring-blue-400/40">
                <Shield size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 (Board C: Text is cut off dialog) */}
        {step === 2 && (
          <div className="flex flex-col gap-3 relative">
            <div className="opacity-40 pointer-events-none blur-[1px]">
              <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3">
                <span className="text-xs font-bold">Agent Siti</span>
                <p className="text-xs">Work in Thailand! Big salary, free flight and visa... See more</p>
              </div>
            </div>

            {/* Floating Modal Prompt */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 flex flex-col gap-3.5 shadow-2xl z-40 mt-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-900">Found: job offer abroad</span>
                </div>
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Incomplete
                </span>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-900 font-medium">
                Part of this post is hidden under "See more".
              </div>

              <div className="flex flex-col gap-2 text-xs text-slate-700 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">1</span>
                  <span>Tap <strong>See more</strong> to show full text</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">2</span>
                  <span>Tap the shield again</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => setStep(3)}
                  style={{ backgroundColor: accent }}
                  className="w-full h-11 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Eye size={16} /> Tap "See more" now
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Check what I have now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 (Board D: Full post expanded, tap again) */}
        {step === 3 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Overseas Jobs Group</span>
              <span>Expanded View</span>
            </div>

            <div className="bg-white rounded-2xl border-2 border-amber-400 p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Agent Siti</span>
                  <span className="text-[10px] text-slate-500">Full post</span>
                </div>
              </div>

              <div className="text-xs text-slate-800 leading-relaxed font-sans bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                Work in Thailand! Big salary, free flight and visa. No experience needed. Leave this week. <span className="font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded">Send a photo of your passport to book your seat.</span> Our driver picks you up at Bangkok airport and takes you to the office. Only 5 places left. Message me on Telegram now!
              </div>

              <div className="h-32 rounded-xl bg-slate-800 flex items-center justify-center text-white text-xs">
                [Job Photo Banner]
              </div>
            </div>

            {/* Pulsing Shield Prompt */}
            <div 
              onClick={() => setStep(4)}
              className="mt-4 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white ring-4 ring-blue-400/40 animate-pulse">
                  <Shield size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold">Tap again to add this</span>
                  <span className="text-[10px] text-slate-400">Captured: 1 new screen area</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-500 px-3 py-1.5 rounded-xl">
                Scan now
              </span>
            </div>
          </div>
        )}

        {/* STEP 4 (Board E: Auto-check animation) */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center p-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-[var(--accent)] relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute"></div>
              <Shield size={36} style={{ color: accent }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-bold text-slate-900">Checking the screenshot...</h2>
              <p className="text-xs text-slate-500">OCR extraction, company lookup & border risk analysis</p>
            </div>

            <div className="w-full bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-2.5 text-left text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Found: job offer abroad</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Done</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Passport confiscation signal</span>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Detected</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Airport border pickup route</span>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Flagged</span>
              </div>
            </div>

            <button
              onClick={() => setStep(5)}
              style={{ backgroundColor: accent }}
              className="w-full h-12 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
            >
              See result
            </button>
          </div>
        )}

        {/* STEP 5 (Board F: Picture verdict - Danger) */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#9A3412] text-white rounded-2xl p-5 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                    Danger
                  </span>
                  <span className="text-xs font-semibold text-orange-200">Job offer abroad</span>
                </div>
                <button 
                  onClick={() => setLang(lang === 'Bahasa' ? 'English' : 'Bahasa')}
                  className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded"
                >
                  {lang}
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">This job is likely a trap. Do not go.</h2>
                <p className="text-xs text-orange-100 font-medium">Keep your passport with you.</p>
              </div>

              {/* Audio Verdict Bar */}
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-full h-10 rounded-xl bg-black/30 hover:bg-black/40 border border-white/20 flex items-center justify-between px-3 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isPlayingAudio ? 'Playing voice warning (Bahasa)...' : 'Listen audio verdict'}</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                  {isPlayingAudio ? 'Tap to stop' : 'Audio'}
                </span>
              </button>
            </div>

            {/* Critical Reasons */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900">Why this was flagged</span>
              
              <div className="flex flex-col gap-2">
                {[
                  { text: 'Pay too good to be true', detail: 'Above normal market salary for unskilled work' },
                  { text: 'Company not found', detail: 'No registered company exists with this name' },
                  { text: 'Asks for your passport', detail: 'Handlers will seize it upon border arrival' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-red-50/50">
                    <span className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{item.text}</span>
                      <span className="text-[11px] text-slate-600">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => onNavigate('family_guardian')}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Users size={16} />
                Tell my family circle
              </button>
              <a
                href="tel:1500454"
                className="w-full h-11 rounded-xl bg-red-50 border border-red-200 text-[#9A3412] font-bold text-xs flex items-center justify-center gap-2 transition text-center"
              >
                <PhoneCall size={16} />
                Call for emergency help
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
