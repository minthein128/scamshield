import React, { useState } from 'react';
import { ArrowLeft, AlertOctagon, Share2, Flag, PhoneCall, Check, ExternalLink, ShieldAlert } from 'lucide-react';

export default function RiskReportScreen({ onNavigate, accent = '#1D4ED8' }) {
  const [shared, setShared] = useState(false);
  const [reported, setReported] = useState(false);

  const flags = [
    {
      title: 'Pay is far above normal for this job',
      source: 'Ad text',
      detail: '$2,500/mo for entry-level data entry with zero experience required is 5x market average.'
    },
    {
      title: 'No work visa or permit mentioned',
      source: 'Ad text',
      detail: 'Entering Thailand on a tourist visa for work is illegal and exposes migrants to immediate detention.'
    },
    {
      title: 'Recruiter account is new and anonymous',
      source: 'Profile',
      detail: 'TikTok account created 2 weeks ago; redirects all communication to Telegram.'
    },
    {
      title: 'No trace of this company online',
      source: 'Google Search & Registry',
      detail: 'No corporate registry in Thailand or overseas matching the claimed business identity.'
    },
    {
      title: 'Car pickup route heads toward the border',
      source: 'Travel plan',
      detail: 'Bangkok airport pickup without return ticket; destination matches known scam compound corridors (Myawaddy/Mae Sot).'
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D]">
      <div className="flex flex-col gap-4 p-5 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 h-10">
          <button 
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Risk report</h1>
        </div>

        {/* Severe Warning Hero Banner */}
        <div className="bg-[#9A3412] text-white rounded-2xl p-5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              High risk
            </span>
            <AlertOctagon size={24} className="text-amber-300" />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold leading-tight">Likely trafficking recruitment</h2>
            <p className="text-xs text-orange-100 leading-relaxed">
              Do not travel or send passport copies. This pattern matches organized scam mill recruitment.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-lg">
              Trafficking risk
            </span>
            <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-lg">
              Border route
            </span>
            <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-lg">
              Anonymous recruiter
            </span>
          </div>
        </div>

        {/* Why we flagged this */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Why we flagged this</h3>
            <span className="text-xs text-slate-500">5 critical signals</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {flags.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl border border-[#DCE3EC] p-3.5 flex flex-col gap-1.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C2410C] shrink-0 mt-0.5"></span>
                    <span className="text-xs font-bold text-slate-900 leading-snug">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    {item.source}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 pl-4">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => {
              setShared(true);
              setTimeout(() => onNavigate('family_guardian'), 600);
            }}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            {shared ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
            {shared ? 'Shared with Family Circle' : 'Share with my family circle'}
          </button>

          <button
            onClick={() => setReported(true)}
            className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            {reported ? <Check size={16} className="text-emerald-600" /> : <Flag size={16} className="text-[#C2410C]" />}
            {reported ? 'Report Submitted to Platform' : 'Report this ad'}
          </button>

          <a
            href="tel:1500454"
            className="w-full h-11 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-[#9A3412] font-bold text-xs flex items-center justify-center gap-2 transition text-center"
          >
            <PhoneCall size={16} />
            Call Anti-Trafficking Hotline (1500-454)
          </a>
        </div>
      </div>
    </div>
  );
}
