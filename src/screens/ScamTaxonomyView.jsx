import React from 'react';
import { SCAM_FAMILIES, SCAM_TAXONOMY } from '../data/mockData';
import { ShieldAlert, BookOpen, ArrowRight, ShieldCheck, MessageSquare, ShoppingBag, Briefcase } from 'lucide-react';

export default function ScamTaxonomyView({ onNavigate, accent = '#1D4ED8' }) {
  const jobScams = SCAM_TAXONOMY.filter(s => s.shield === 'Job shield');
  const messageScams = SCAM_TAXONOMY.filter(s => s.shield === 'Message shield');
  const ecomScams = SCAM_TAXONOMY.filter(s => s.shield === 'E-commerce shield');

  const getTagColor = (tagName) => {
    const family = SCAM_FAMILIES.find(f => f.name.toLowerCase() === tagName.toLowerCase());
    return family ? family.color : 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F8] p-6 lg:p-8 text-[#0F1B2D]">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
              <BookOpen size={16} />
              <span>SafeRoute Detection Taxonomy</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
              Scam types SafeRoute detects
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Every type maps to the red-flag families the risk score adds up. One family counts once, however many signals point to it.
            </p>
          </div>

          <button
            onClick={() => onNavigate('case_study')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition self-start md:self-auto"
          >
            <span>View 6-Stage Case Study</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 7 Red-Flag Families Banner */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            The 7 Red-Flag Signal Families
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {SCAM_FAMILIES.map(fam => (
              <div 
                key={fam.id} 
                className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition ${fam.color}`}
              >
                <span className="font-bold">{fam.name}</span>
                <span className="text-[10px] leading-tight opacity-90">{fam.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Shields Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. Job Shield */}
          <div className="flex flex-col gap-4 bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Briefcase size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Job shield</h2>
                <span className="text-xs text-slate-500">Overseas labor & trafficking</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {jobScams.map((scam, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{scam.type}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scam.severity === 'High risk' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {scam.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{scam.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scam.tags.map(tag => (
                      <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Message Shield */}
          <div className="flex flex-col gap-4 bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Message shield</h2>
                <span className="text-xs text-slate-500">SMS, chats & messaging apps</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {messageScams.map((scam, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{scam.type}</h3>
                    {scam.hasCaseStudy && (
                      <button 
                        onClick={() => onNavigate('case_study')}
                        className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition"
                      >
                        Case study →
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{scam.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scam.tags.map(tag => (
                      <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. E-commerce Shield */}
          <div className="flex flex-col gap-4 bg-white rounded-2xl border border-[#DCE3EC] p-5 shadow-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">E-commerce shield</h2>
                <span className="text-xs text-slate-500">Marketplaces, listings & payments</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {ecomScams.map((scam, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{scam.type}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      scam.severity === 'High risk' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {scam.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{scam.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scam.tags.map(tag => (
                      <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
