import React, { useState } from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, ExternalLink, Users, FileCheck, Building2 } from 'lucide-react';

export default function AgencyShieldFlow({ onNavigate, initialStep = 1, accent = '#1D4ED8' }) {
  const [step, setStep] = useState(initialStep);

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
          {['M', 'N'].map((label, idx) => (
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

        {/* STEP 1 (Board M: Agency profile page) */}
        {step === 1 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Recruitment Agency Page</span>
              <span>Social profile · sample</span>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-xs flex flex-col">
              <div className="h-24 bg-gradient-to-r from-blue-900 to-indigo-800 relative p-3 text-white flex items-end">
                <span className="text-xs font-bold">PT Sinar Kerja Global</span>
              </div>

              <div className="p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center -mt-8 border-2 border-white shadow">
                    SK
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">Official licensed overseas placement agency</span>
                    <span className="text-[11px] text-slate-500 font-mono">License no. KEMNAKER-9941/2026</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 leading-relaxed text-slate-700">
                  <p><strong>Jobs:</strong> factory, caregiver, hotel & restaurant</p>
                  <p><strong>Countries:</strong> Taiwan, Malaysia, Japan</p>
                  <p><strong>Fee:</strong> Rp 5.000.000 deposit to reserve an overseas interview slot.</p>
                  <p className="text-blue-900 font-medium">Departure guaranteed in 2 weeks. Pay the deposit to our account and send your documents by WhatsApp.</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button className="flex-1 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs">
                    Message
                  </button>
                  <button className="px-4 h-9 rounded-xl border border-slate-300 font-bold text-xs text-slate-700">
                    Follow
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Shield Prompt */}
            <div 
              onClick={() => setStep(2)}
              className="mt-3 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 ring-4 ring-amber-300/40 animate-pulse">
                  <Shield size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold">Is this agency real?</span>
                  <span className="text-[10px] text-slate-400">Tap to verify license registry</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-500 text-slate-900 px-3 py-1.5 rounded-xl">
                Check agency
              </span>
            </div>
          </div>
        )}

        {/* STEP 2 (Board N: Agency check verdict - Careful) */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#D97706] text-white rounded-2xl p-5 flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  Careful
                </span>
                <span className="text-xs font-semibold text-amber-100">Official check</span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold leading-tight">We could not confirm this agency</h2>
                <p className="text-xs text-amber-100 font-medium leading-relaxed">
                  Do not pay a deposit yet. Ask at your local migrant worker office first.
                </p>
              </div>
            </div>

            {/* What we checked */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900">What we checked</span>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="font-bold text-slate-900">License not in official list</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Gov Registry</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 border border-red-200">
                  <span className="font-bold text-slate-900">Deposit goes to a personal account</span>
                  <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">High Risk</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800">Page is only a few weeks old</span>
                  <span className="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded">Recent creation</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-semibold text-slate-800">Company name is registered</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Business record</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => alert("Showing certified P3MI / licensed overseas employment agencies via Ministry of Manpower.")}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Building2 size={16} />
                Find licensed agencies
              </button>

              <button
                onClick={() => onNavigate('family_guardian')}
                className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Users size={16} />
                Tell my family
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
