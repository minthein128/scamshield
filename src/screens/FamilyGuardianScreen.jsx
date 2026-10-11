import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Phone, Send, ShieldAlert, CheckCircle2, Clock, Lock, ExternalLink } from 'lucide-react';

export default function FamilyGuardianScreen({ onNavigate, accent = '#1D4ED8' }) {
  const [embassySent, setEmbassySent] = useState(false);
  const [calling, setCalling] = useState(false);

  const checkins = [
    { label: 'Departed home airport', time: 'Yesterday 08:40', done: true },
    { label: 'Landed in Bangkok', time: 'Yesterday 14:10', done: true },
    { label: 'Picked up by company car', time: 'Yesterday 15:30', done: true },
    { label: 'Morning check-in missed', time: 'Today 09:00', missed: true }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-[#F4F6F8] text-[#0F1B2D]">
      <div className="flex flex-col gap-4 p-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between h-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('home')}
              className="w-9 h-9 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-900">Family circle</h1>
              <span className="text-[11px] text-slate-500">Ibu's phone view</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#1E3A8A] bg-[#DBE5FF] px-2.5 py-1 rounded-full">
            Active Guardian
          </span>
        </div>

        {/* Urgent Alert Banner */}
        <div className="bg-[#9A3412] text-white rounded-2xl p-4 flex flex-col gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-300 shrink-0" />
            <h2 className="text-base font-bold">Rina missed a check-in</h2>
          </div>
          <p className="text-xs text-orange-100 leading-relaxed">
            Expected at 09:00 today. Her job offer was rated <span className="font-bold underline">high risk</span> before she left.
          </p>
        </div>

        {/* Trip details on file */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Trip details on file</h3>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500">Destination</span>
              <span className="font-semibold text-slate-800">Bangkok, Thailand</span>
            </div>

            <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500">Employer</span>
              <span className="font-semibold text-slate-800">Apex Global Logistics</span>
            </div>

            <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-500">Recruiter handle</span>
              <span className="font-semibold text-slate-800 font-mono">@thai_jobs_hr</span>
            </div>

            <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-red-50 border border-red-100">
              <span className="text-[10px] text-red-600 font-bold">Risk check</span>
              <span className="font-bold text-[#C2410C]">High risk (trafficking)</span>
            </div>
          </div>
        </div>

        {/* Check-ins Timeline */}
        <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900">Check-in timeline</h3>

          <div className="relative pl-6 flex flex-col gap-4 border-l-2 border-slate-200 ml-2">
            {checkins.map((item, index) => (
              <div key={index} className="relative flex items-start justify-between">
                {/* Node icon */}
                <div className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                  item.missed 
                    ? 'bg-red-500 text-white ring-4 ring-red-100 animate-pulse' 
                    : 'bg-emerald-500 text-white ring-4 ring-emerald-50'
                }`}>
                  {item.missed ? <AlertTriangle size={12} strokeWidth={2.5} /> : <CheckCircle2 size={12} strokeWidth={2.5} />}
                </div>

                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${item.missed ? 'text-red-700' : 'text-slate-800'}`}>
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.time}</span>
                </div>

                {item.missed && (
                  <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
                    Missed!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => {
              setCalling(true);
              setTimeout(() => setCalling(false), 2000);
            }}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Phone size={16} />
            {calling ? 'Dialing Rina (+62 812-3456-7890)...' : 'Call Rina'}
          </button>

          <button
            onClick={() => setEmbassySent(true)}
            className="w-full h-11 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Send size={16} />
            {embassySent ? '✓ SOS Dossier Sent to Embassy' : 'Send case to Embassy & Consular Police'}
          </button>

          <button
            className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <ShieldAlert size={16} className="text-amber-600" />
            Contact Anti-Trafficking NGO Partner
          </button>
        </div>

        {/* Covert Privacy Note */}
        <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-500" />
          <p className="text-[11px] leading-tight">
            Nothing about this circle shows on Rina's phone. (Protects against device inspection by handlers).
          </p>
        </div>
      </div>
    </div>
  );
}
