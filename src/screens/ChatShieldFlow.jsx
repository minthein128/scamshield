import React, { useState } from 'react';
import { ArrowLeft, Shield, AlertOctagon, Volume2, VolumeX, Users, Ban, Clock, ChevronUp, Image as ImageIcon } from 'lucide-react';

export default function ChatShieldFlow({ onNavigate, initialStep = 1, accent = '#1D4ED8' }) {
  const [step, setStep] = useState(initialStep);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [blocked, setBlocked] = useState(false);

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
          {['G', 'H', 'I', 'J'].map((label, idx) => (
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
          Step {step}/4
        </span>
      </div>

      {/* Screen Content */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col relative">

        {/* STEP 1 (Board G: Strange chat) */}
        {step === 1 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Kevin · Online</span>
              <span>Any chat app · sample</span>
            </div>

            {/* Chat Thread */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-3 flex flex-col gap-3 min-h-[360px] shadow-xs">
              <div className="text-center text-[10px] text-slate-400 font-semibold my-1">Today</div>

              <div className="flex flex-col items-start gap-1 max-w-[80%]">
                <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-xs text-slate-800">
                  Good morning my dear. Did you sleep well?
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 ml-auto max-w-[80%]">
                <div className="bg-blue-600 text-white p-2.5 rounded-2xl rounded-tr-sm text-xs">
                  Yes, thank you!
                </div>
              </div>

              <div className="flex flex-col items-start gap-1 max-w-[85%]">
                <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-xs text-slate-800 flex flex-col gap-2">
                  <span>I made big profit again on my trading app today! 📈</span>
                  <div className="w-48 h-24 bg-emerald-900 rounded-lg flex flex-col items-center justify-center text-white p-2">
                    <span className="text-[10px] text-emerald-300">GOLD TRADING PRO</span>
                    <span className="text-sm font-bold text-emerald-400">+$4,820.50 (98%)</span>
                    <span className="text-[9px] text-slate-300">Account: Kevin_VIP</span>
                  </div>
                  <span>You should join, I will guide you. Just top up first. Send the money today, price goes up tomorrow. Trust me.</span>
                </div>
              </div>
            </div>

            {/* Floating Shield Bubble */}
            <div 
              onClick={() => setStep(2)}
              className="absolute right-0 top-48 z-30 flex items-center gap-2 cursor-pointer animate-bounce"
            >
              <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg">
                Tap to check this chat
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl ring-4 ring-blue-400/40">
                <Shield size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 (Board H: Need older messages modal) */}
        {step === 2 && (
          <div className="flex flex-col gap-3 relative">
            <div className="opacity-40 pointer-events-none blur-[1px]">
              <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-2">
                <span className="text-xs font-bold">Kevin</span>
                <p className="text-xs">Send the money today, price goes up tomorrow. Trust me...</p>
              </div>
            </div>

            {/* Modal */}
            <div className="bg-white rounded-2xl border-2 border-purple-500 p-5 flex flex-col gap-3.5 shadow-2xl z-40 mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-900">Found: chat with online friend</span>
                </div>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Money talk
                </span>
              </div>

              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 text-xs text-purple-900 font-medium">
                He talks about money. Show me how you first met.
              </div>

              <div className="flex flex-col gap-2 text-xs text-slate-700 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">1</span>
                  <span>Scroll up to older messages</span>
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
                  <ChevronUp size={16} /> Scroll up to older messages
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

        {/* STEP 3 (Board I: Older messages, tap again) */}
        {step === 3 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Kevin · Full History</span>
              <span className="text-purple-600 font-bold">Scrolled up 3 weeks</span>
            </div>

            <div className="bg-white rounded-2xl border-2 border-purple-400 p-3 flex flex-col gap-2.5 max-h-[380px] overflow-y-auto text-xs shadow-xs">
              <span className="text-[10px] text-center text-slate-400 font-bold">3 weeks ago</span>
              <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-slate-800">
                Hello, sorry wrong number. But your photo looks kind.
              </div>
              <div className="bg-blue-600 text-white p-2.5 rounded-2xl rounded-tr-sm ml-auto">
                Haha it's ok 😊
              </div>
              <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-slate-800">
                I am an engineer working overseas. It is lonely here.
              </div>

              <span className="text-[10px] text-center text-slate-400 font-bold pt-1">2 weeks ago</span>
              <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-slate-800">
                I think I am falling for you. God sent you to me. One day I want to build our future together ❤️
              </div>

              <span className="text-[10px] text-center text-slate-400 font-bold pt-1">Last week</span>
              <div className="bg-slate-100 p-2.5 rounded-2xl rounded-tl-sm text-slate-800">
                My uncle showed me a secret trading app. Very safe.
              </div>
            </div>

            {/* Pulsing prompt */}
            <div 
              onClick={() => setStep(4)}
              className="mt-2 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white ring-4 ring-purple-400/40 animate-pulse">
                  <Shield size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold">Tap again to add this</span>
                  <span className="text-[10px] text-slate-400">Captured: 2 screens context</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-purple-500 px-3 py-1.5 rounded-xl">
                Scan story
              </span>
            </div>
          </div>
        )}

        {/* STEP 4 (Board J: Chat danger verdict) */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#9A3412] text-white rounded-2xl p-5 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  Danger
                </span>
                <span className="text-xs font-semibold text-orange-200">2 screens analyzed</span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">Love and money trap</h2>
                <p className="text-xs text-orange-100 font-medium leading-relaxed">
                  Do not send money. People you only know online can lie about who they are.
                </p>
              </div>

              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-full h-10 rounded-xl bg-black/30 hover:bg-black/40 border border-white/20 flex items-center justify-between px-3 text-xs font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isPlayingAudio ? 'Explaining pig butchering trap...' : 'Listen audio explanation'}</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                  {isPlayingAudio ? 'Stop' : 'Audio'}
                </span>
              </button>
            </div>

            {/* Grooming Timeline */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900">How it happened (Sha Zhu Pan Pattern)</span>
              
              <div className="flex flex-col gap-2.5 text-xs">
                {[
                  { stage: '"Wrong number" first message', time: '3 wk ago', tag: 'Hook' },
                  { stage: 'Says he loves you, fast', time: '2 wk ago', tag: 'Romance' },
                  { stage: '"Secret" trading app lure', time: '1 wk ago', tag: 'Platform' },
                  { stage: 'Asks you to send money today', time: 'Today', tag: 'Steal' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{item.stage}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{item.time}</span>
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

              <button
                onClick={() => setBlocked(true)}
                className="w-full h-11 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Ban size={16} />
                {blocked ? '✓ Contact Blocked & Reported' : 'Block and report this person'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
