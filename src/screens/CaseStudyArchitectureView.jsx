import React, { useState } from 'react';
import { DETECTION_STAGES } from '../data/mockData';
import { ArrowLeft, Cpu, ShieldCheck, Database, Volume2, VolumeX, AlertOctagon, CheckCircle2, ChevronRight } from 'lucide-react';

export default function CaseStudyArchitectureView({ onNavigate, accent = '#1D4ED8' }) {
  const [activeStage, setActiveStage] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F8] p-6 lg:p-8 text-[#0F1B2D]">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
              <Cpu size={16} />
              <span>Technical Pipeline Walkthrough</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
              Case study: gambling bonus lure on Viber
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              How one screenshot moves through the six stages. <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">[RESULT]</code> marks a live lookup whose answer depends on the day it runs.
            </p>
          </div>

          <button
            onClick={() => onNavigate('scam_matrix')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition self-start md:self-auto"
          >
            <ArrowLeft size={14} />
            <span>Back to Taxonomy</span>
          </button>
        </div>

        {/* 6 Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* STAGE 1: Capture */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                1 · Capture
              </span>
              <span className="text-[11px] text-slate-500 font-medium">On the phone</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-900">Viber · not in contacts</span>
              
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 flex flex-col gap-1.5 font-mono text-xs">
                <div className="text-[10px] text-purple-700 font-bold">[BURMESE NAME] +95 966 876 ****</div>
                <div className="text-slate-800 leading-relaxed font-sans text-xs">
                  "12 free red envelopes! 200% bonus on your first top-up. Limited slots, first come, first served. <span className="text-purple-700 font-bold">dljie[.]vip/kzfs</span>"
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic leading-snug">
                Message summarised. Number masked and link broken with [.] so nobody opens it from this board.
              </p>
            </div>
          </div>

          {/* STAGE 2: Extract */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                2 · Extract
              </span>
              <span className="text-[11px] text-slate-500 font-medium">OCR + Gemini Multimodal</span>
            </div>

            <div className="flex flex-col gap-1.5 bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed">
              <div><span className="text-indigo-400">app:</span> "Viber"</div>
              <div><span className="text-indigo-400">sender:</span> "+95 966 876 ****"</div>
              <div><span className="text-indigo-400">in_contacts:</span> false</div>
              <div><span className="text-indigo-400">display_name:</span> "Unfaithful person" <span className="text-slate-400">(from Burmese)</span></div>
              <div><span className="text-indigo-400">url:</span> "dljie[.]vip/kzfs"</div>
              <div><span className="text-indigo-400">tld:</span> ".vip"</div>
              <div><span className="text-indigo-400">offers:</span> "12 free envelopes; 200% bonus"</div>
              <div><span className="text-indigo-400">pressure:</span> "limited slots, first come"</div>
            </div>
          </div>

          {/* STAGE 3: Detect */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                3 · Detect
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Gemini Classification</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Gambling bonus lure</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">4 families</span>
              </div>
              <p className="text-[11px] text-slate-600">Takes deposits and personal data</p>

              <div className="flex flex-col gap-1 text-[11px] pt-1">
                <div className="flex justify-between p-1.5 rounded bg-slate-50">
                  <span className="text-slate-700">Unsolicited, unverified sender</span>
                  <span className="font-bold text-blue-700">Identity</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50">
                  <span className="text-slate-700">Link on obscure domain (.vip)</span>
                  <span className="font-bold text-rose-700">Link risk</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50">
                  <span className="text-slate-700">Free credit & 200% bonus</span>
                  <span className="font-bold text-amber-700">Too good</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50">
                  <span className="text-slate-700">Limited slots, first come</span>
                  <span className="font-bold text-red-700">Pressure</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded mt-1">
                ✓ Complete message, so no ask-for-more step
              </span>
            </div>
          </div>

          {/* STAGE 4: Correlate */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                4 · Correlate
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Live Threat Intelligence</span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">Link → Web Risk</span>
                <span className="text-[10px] font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded">MALICIOUS HIT</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">Domain → age (RDAP)</span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">6 days old</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">.vip → risky domain list</span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">High abuse TLD</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800">Number → report graph</span>
                <span className="text-[10px] font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded">14 Reports</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-400">
                <span>Display name → search</span>
                <span className="text-[10px]">Pruned (low info)</span>
              </div>
            </div>
          </div>

          {/* STAGE 5: Score */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                5 · Score
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Rules Engine</span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex flex-col gap-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex justify-between"><span>Base: unsolicited</span><span className="text-slate-500">-1.0</span></div>
                <div className="flex justify-between"><span>Identity flag</span><span className="text-red-600">+0.8</span></div>
                <div className="flex justify-between"><span>Link risk (.vip)</span><span className="text-red-600">+1.4</span></div>
                <div className="flex justify-between"><span>Too good (200% bonus)</span><span className="text-red-600">+1.4</span></div>
                <div className="flex justify-between"><span>Pressure (urgency)</span><span className="text-red-600">+0.6</span></div>
                <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-slate-900">
                  <span>Total Calculated Score</span>
                  <span className="text-red-700 text-sm">3.2</span>
                </div>
              </div>

              <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-[11px] text-red-900 leading-snug">
                <strong>Danger threshold (≥ 3.0):</strong> 3.2 is over the 3.0 line and 4 flag families agree. <em>(A Web Risk hit sets Danger immediately by itself).</em>
              </div>
            </div>
          </div>

          {/* STAGE 6: Explain */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                6 · Explain
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Gemini + Voice Synthesis</span>
            </div>

            <div className="bg-[#9A3412] text-white rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase bg-white/20 px-2 py-0.5 rounded">Danger</span>
                <span className="text-xs font-bold">Gambling trap</span>
              </div>
              <p className="text-xs leading-relaxed text-orange-100">
                Do not open the link or top up. The bonus is a trick to take your money.
              </p>
            </div>

            <button
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition"
            >
              {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isPlayingAudio ? 'Playing in Myanmar...' : 'Listen in Myanmar (Voice)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button 
                onClick={() => alert("Burmese translation: လင့်ခ်ကို မဖွင့်ပါနှင့်၊ ငွေမသွင်းပါနှင့်။")}
                className="p-2 bg-slate-100 rounded-lg font-semibold text-slate-700 hover:bg-slate-200 text-center"
              >
                Read in Myanmar
              </button>
              <button 
                onClick={() => alert("Number +95 966 876 **** added to blocklist.")}
                className="p-2 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 text-center"
              >
                Block & Report
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
