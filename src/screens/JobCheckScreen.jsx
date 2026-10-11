import React, { useState } from 'react';
import { ArrowLeft, Plus, CheckCircle, Video, MapPin, Plane, Globe, AlertTriangle } from 'lucide-react';

export default function JobCheckScreen({ onNavigate, accent = '#1D4ED8' }) {
  const [selectedLang, setSelectedLang] = useState('English');
  const [analyzing, setAnalyzing] = useState(false);

  const languages = ['English', 'Bahasa', 'Tagalog', 'Myanmar', 'More'];

  const handleAnalyse = () => {
    setAnalyzing(true);
    setTimeout(() => {
      onNavigate('risk_report');
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D]">
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-center gap-3 h-10">
          <button 
            onClick={() => onNavigate('home')}
            className="w-9 h-9 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Check a job offer</h1>
        </div>

        {/* Media Preview Card */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-2xs">
          <div className="bg-slate-900 h-44 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-10"></div>
            
            {/* Mock Video Graphic */}
            <div className="z-20 text-center p-4 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
                <Video size={20} />
              </div>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-red-600/90 px-2 py-0.5 rounded">
                TikTok Video Ad
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 z-20 text-white">
              <span className="text-[10px] text-slate-300">Source: TikTok · @overseas_jobs_asia</span>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2.5">
            <div className="text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-mono">
              "Urgent! Data entry staff needed in Thailand. High salary, free flight, hotel and visa. No experience needed. DM us on Telegram today."
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition">
                <Plus size={14} /> Add more screenshots
              </button>
            </div>
          </div>
        </div>

        {/* Context questions */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Additional details</span>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-[#DCE3EC] p-3 rounded-xl text-left hover:border-slate-300">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">Destination</div>
                <div className="font-semibold text-slate-800">Bangkok, Thailand</div>
              </div>
            </button>
            <button className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-[#DCE3EC] p-3 rounded-xl text-left hover:border-slate-300">
              <Plane size={16} className="text-slate-400 shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-400">Transport</div>
                <div className="font-semibold text-slate-800">Flight provided</div>
              </div>
            </button>
          </div>
        </div>

        {/* Report Language Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Globe size={14} />
            <span>Report language</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                  selectedLang === lang
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-[#DCE3EC] text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* What we will check */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
          <span className="text-xs font-bold text-slate-900">What we will check</span>
          <div className="flex flex-col gap-2.5">
            {[
              { num: '1', text: 'Read the ad, video and chat text' },
              { num: '2', text: 'Confirm the employer really exists in registries' },
              { num: '3', text: 'Scan every link and contact for danger' },
              { num: '4', text: 'Compare with known border trafficking patterns' },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[var(--accent)] text-xs font-bold flex items-center justify-center shrink-0">
                  {item.num}
                </span>
                <span className="text-xs text-slate-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-5 bg-white border-t border-[#DCE3EC] shrink-0">
        <button
          onClick={handleAnalyse}
          disabled={analyzing}
          style={{ backgroundColor: accent }}
          className="w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition active:scale-[0.98] shadow"
        >
          {analyzing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Scanning threat signals...</span>
            </div>
          ) : (
            'Analyse offer'
          )}
        </button>
      </div>
    </div>
  );
}
