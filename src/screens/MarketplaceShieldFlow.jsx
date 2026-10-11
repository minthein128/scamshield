import React, { useState } from 'react';
import { ArrowLeft, Shield, AlertOctagon, Smartphone, Store, ChevronRight, HelpCircle, Flag, ExternalLink } from 'lucide-react';

export default function MarketplaceShieldFlow({ onNavigate, initialStep = 1, accent = '#1D4ED8' }) {
  const [step, setStep] = useState(initialStep);
  const [reported, setReported] = useState(false);

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
          {['O', 'P', 'Q', 'R'].map((label, idx) => (
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

        {/* STEP 1 (Board O: Cheap listing) */}
        {step === 1 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Marketplace</span>
              <span>Shopping App · sample</span>
            </div>

            {/* Product Card */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] overflow-hidden shadow-xs flex flex-col gap-3 pb-3">
              <div className="h-44 bg-slate-800 relative flex items-center justify-center text-white">
                <div className="w-16 h-28 bg-slate-700 rounded-2xl border-4 border-slate-500 flex flex-col items-center justify-between p-2 shadow-inner">
                  <div className="w-6 h-1 bg-slate-400 rounded-full"></div>
                  <Smartphone size={24} className="text-slate-300" />
                  <div className="w-3 h-3 rounded-full border border-slate-400"></div>
                </div>
                <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  80% OFF
                </span>
              </div>

              <div className="px-4 flex flex-col gap-2">
                <h2 className="text-sm font-bold text-slate-900">Flagship Smartphone 256GB, Like New</h2>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-red-600">Rp 3.500.000</span>
                  <span className="text-xs text-slate-400 line-through">Rp 17.000.000</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  Need money fast, selling cheap. Transfer directly to my bank and I ship today. Chat me on WhatsApp for extra discount.
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                      T
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">Toko Murah88</span>
                      <span className="text-[10px] text-slate-400">Seller</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                    Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Shield Bubble */}
            <div 
              onClick={() => setStep(2)}
              className="absolute right-0 top-36 z-30 flex items-center gap-2 cursor-pointer animate-bounce"
            >
              <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg">
                Too cheap? Tap to check
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl ring-4 ring-blue-400/40">
                <Shield size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 (Board P: Show the seller modal) */}
        {step === 2 && (
          <div className="flex flex-col gap-3 relative">
            <div className="opacity-40 pointer-events-none blur-[1px]">
              <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-2">
                <span className="text-xs font-bold">Flagship Smartphone 256GB</span>
                <span className="text-xs font-bold text-red-600">Rp 3.500.000</span>
              </div>
            </div>

            {/* Modal */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 flex flex-col gap-3.5 shadow-2xl z-40 mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-900">Found: online shopping</span>
                </div>
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  Extremely low price
                </span>
              </div>

              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-xs text-blue-900 font-medium">
                This price is suspiciously low. Show me the seller profile.
              </div>

              <div className="flex flex-col gap-2 text-xs text-slate-700 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">1</span>
                  <span>Tap the seller's name (<strong>Toko Murah88</strong>)</span>
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
                  <Store size={16} /> Tap seller profile now
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

        {/* STEP 3 (Board Q: Seller profile, tap again) */}
        {step === 3 && (
          <div className="flex flex-col gap-3 relative">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span className="font-bold text-slate-800">Seller Profile</span>
              <span className="text-red-600 font-bold">Unverified</span>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border-2 border-red-300 p-4 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm">
                    T
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Toko Murah88</span>
                    <span className="text-[10px] text-red-600 font-semibold">Joined 4 days ago · 0 Sold</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400">Rating: —</span>
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-800">Other items from this seller:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg">Laptop, brand new (80% off)</div>
                  <div className="p-2 bg-slate-50 rounded-lg">Game console PS5 (75% off)</div>
                  <div className="p-2 bg-slate-50 rounded-lg">Smartwatch Ultra (78% off)</div>
                  <div className="p-2 bg-slate-50 rounded-lg">Tablet 128GB (82% off)</div>
                </div>
              </div>
            </div>

            {/* Pulsing prompt */}
            <div 
              onClick={() => setStep(4)}
              className="mt-3 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white ring-4 ring-blue-400/40 animate-pulse">
                  <Shield size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold">Tap again to add this</span>
                  <span className="text-[10px] text-slate-400">Captured: 2 screens (item + seller)</span>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-500 px-3 py-1.5 rounded-xl">
                Scan seller
              </span>
            </div>
          </div>
        )}

        {/* STEP 4 (Board R: Shopping danger verdict) */}
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
                <h2 className="text-xl font-bold leading-tight">Fake seller</h2>
                <p className="text-xs text-orange-100 font-medium leading-relaxed">
                  Only pay inside the shopping app. Never transfer to the seller's own bank.
                </p>
              </div>
            </div>

            {/* Red flags */}
            <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 flex flex-col gap-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-900">4 Red-flag findings</span>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/70 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                  <span className="font-semibold">Price far too low (80% below MSRP)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/70 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                  <span className="font-semibold">New seller account, nothing sold</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/70 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                  <span className="font-semibold">Demands direct bank transfer / WhatsApp</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50/70 text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                  <span className="font-semibold">Same product photos reported before</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400">Sources: listing, seller page, SafeRoute fraud reports</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setReported(true)}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Flag size={16} />
                {reported ? '✓ Seller Reported to Marketplace' : 'Report this seller'}
              </button>

              <button
                onClick={() => alert("If you transferred funds outside the platform, immediately file a fraud report with your bank mentioning the beneficiary account number.")}
                className="w-full h-11 rounded-xl bg-white border border-[#DCE3EC] hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <HelpCircle size={16} />
                I already paid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
