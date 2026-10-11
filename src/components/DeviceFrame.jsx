import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export default function DeviceFrame({ children, title, subtitle }) {
  return (
    <div className="flex flex-col items-center">
      {title && (
        <div className="mb-3 text-center">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
      
      {/* Phone chassis */}
      <div className="w-[390px] h-[844px] bg-[#F4F6F8] rounded-[44px] shadow-2xl ring-1 ring-slate-900/10 border-[8px] border-slate-900 relative overflow-hidden flex flex-col select-none transition-all duration-200">
        
        {/* Notch / Dynamic Island */}
        <div className="w-full h-11 bg-transparent px-6 pt-2 flex items-center justify-between text-[#0F1B2D] text-xs font-semibold z-50 shrink-0">
          <span>9:41</span>
          
          <div className="w-24 h-5 bg-black rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-end px-2">
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-700"></div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal size={13} strokeWidth={2.5} />
            <Wifi size={13} strokeWidth={2.5} />
            <Battery size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 w-full overflow-hidden flex flex-col relative">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="w-full h-5 flex justify-center items-center pb-1 bg-transparent pointer-events-none shrink-0 z-50">
          <div className="w-32 h-1 bg-slate-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
