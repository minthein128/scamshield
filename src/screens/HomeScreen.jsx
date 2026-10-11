import React from 'react';
import { ShieldCheck, Link as LinkIcon, Image as ImageIcon, MessageSquare, Heart, MapPin, ChevronRight, Home, Shield, Users, BookOpen } from 'lucide-react';

export default function HomeScreen({ onNavigate, accent = '#1D4ED8' }) {
  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D]">
      <div className="flex flex-col gap-4 p-5 pb-3">
        {/* Top Header */}
        <div className="flex items-center justify-between h-11">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-[var(--accent)]">
              <ShieldCheck size={24} style={{ color: accent }} strokeWidth={2.2} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">SafeRoute</span>
          </div>
          <button 
            aria-label="Profile" 
            className="w-10 h-10 rounded-full bg-[#DCE3EC] text-[#0F1B2D] font-bold text-sm flex items-center justify-center hover:bg-slate-300 transition"
          >
            R
          </button>
        </div>

        {/* Greeting */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Good morning, Rina</h1>
          <p className="text-sm text-slate-600">Check any job offer before you say yes.</p>
        </div>

        {/* Hero Card */}
        <div className="bg-[#0F1B2D] text-white rounded-2xl p-5 flex flex-col gap-3.5 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-bold">Got an overseas job offer?</h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Share the ad, a screenshot or the chat. We check it for trafficking and money-mule warning signs.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => onNavigate('job_check')}
              className="h-16 rounded-xl border border-slate-700 bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
            >
              <LinkIcon size={18} />
              Paste link
            </button>
            <button 
              onClick={() => onNavigate('job_check')}
              className="h-16 rounded-xl border border-slate-700 bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
            >
              <ImageIcon size={18} />
              Screenshot
            </button>
            <button 
              onClick={() => onNavigate('job_check')}
              className="h-16 rounded-xl border border-slate-700 bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
            >
              <MessageSquare size={18} />
              Chat
            </button>
          </div>

          <button
            onClick={() => onNavigate('job_check')}
            style={{ backgroundColor: accent }}
            className="h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center hover:opacity-95 transition active:scale-[0.98] shadow"
          >
            Check a job offer
          </button>
        </div>

        {/* More protection */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-bold text-slate-900">More protection</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => onNavigate('chat_strange')}
              className="text-left rounded-2xl border border-[#DCE3EC] bg-white p-3.5 hover:border-slate-300 transition flex flex-col gap-1.5 shadow-2xs"
            >
              <Heart size={20} className="text-[#C2410C]" strokeWidth={2.2} />
              <span className="text-xs font-bold text-slate-900">Online relationship</span>
              <span className="text-[11px] leading-tight text-slate-600">Spot slow romance & investment scams</span>
            </button>
            <button 
              onClick={() => onNavigate('risk_report')}
              className="text-left rounded-2xl border border-[#DCE3EC] bg-white p-3.5 hover:border-slate-300 transition flex flex-col gap-1.5 shadow-2xs"
            >
              <MapPin size={20} style={{ color: accent }} strokeWidth={2.2} />
              <span className="text-xs font-bold text-slate-900">Travel plan</span>
              <span className="text-[11px] leading-tight text-slate-600">Flag risky routes before you leave</span>
            </button>
          </div>
        </div>

        {/* Family circle widget */}
        <button
          onClick={() => onNavigate('family_guardian')}
          className="w-full text-left rounded-2xl border border-[#DCE3EC] bg-white p-3.5 flex items-center gap-3 hover:border-slate-300 transition shadow-2xs"
        >
          <div className="flex -space-x-2.5 shrink-0">
            <span className="w-8 h-8 rounded-full bg-[#FDE4D3] text-[#9A3412] font-bold text-xs flex items-center justify-center border-2 border-white">
              I
            </span>
            <span className="w-8 h-8 rounded-full bg-[#DBE5FF] text-[#1E3A8A] font-bold text-xs flex items-center justify-center border-2 border-white">
              D
            </span>
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900">Family circle</span>
            <span className="text-[11px] text-slate-600 truncate">Ibu and Dewi get your check-ins</span>
          </div>
          <span className="text-[11px] font-bold text-[#1E3A8A] bg-[#DBE5FF] px-2.5 py-1 rounded-full shrink-0">
            On
          </span>
        </button>

        {/* Recent checks */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent checks</h3>
            <span className="text-xs text-slate-500">History</span>
          </div>

          <button
            onClick={() => onNavigate('risk_report')}
            className="w-full text-left flex items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-[#DCE3EC] hover:border-slate-300 transition shadow-2xs"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-900">Data entry staff, Thailand</span>
              <span className="text-[11px] text-slate-500">TikTok · today</span>
            </div>
            <span className="text-[10px] font-bold text-white bg-[#C2410C] px-2.5 py-1 rounded-full whitespace-nowrap">
              High risk
            </span>
          </button>

          <button
            onClick={() => onNavigate('risk_report')}
            className="w-full text-left flex items-center justify-between gap-2.5 p-3 rounded-xl bg-white border border-[#DCE3EC] hover:border-slate-300 transition shadow-2xs"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-900">Hotel receptionist, Malaysia</span>
              <span className="text-[11px] text-slate-500">JobStreet · 3 days ago</span>
            </div>
            <span className="text-[10px] font-bold text-[#1E3A8A] bg-[#DBE5FF] px-2.5 py-1 rounded-full whitespace-nowrap">
              Low risk
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav aria-label="Main" className="h-16 bg-white border-t border-[#DCE3EC] grid grid-cols-4 px-2 py-1 shrink-0 z-10">
        <button
          onClick={() => onNavigate('home')}
          style={{ color: accent }}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold"
        >
          <Home size={20} strokeWidth={2.2} />
          Home
        </button>
        <button
          onClick={() => onNavigate('job_check')}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
        >
          <Shield size={20} />
          Check
        </button>
        <button
          onClick={() => onNavigate('family_guardian')}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
        >
          <Users size={20} />
          Family
        </button>
        <button
          onClick={() => onNavigate('scam_matrix')}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
        >
          <BookOpen size={20} />
          Learn
        </button>
      </nav>
    </div>
  );
}
