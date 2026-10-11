import React from 'react';
import { ShieldCheck, Smartphone, Layers, BookOpen, Cpu, Palette, Monitor, LayoutGrid } from 'lucide-react';
import { SCREENS_CATALOG } from '../data/mockData';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  currentScreenId, 
  setCurrentScreenId,
  accent, 
  setAccent,
  deviceFrameMode,
  setDeviceFrameMode
}) {
  const accentColors = [
    { name: 'Blue', value: '#1D4ED8' },
    { name: 'Cyan', value: '#0E7490' },
    { name: 'Indigo', value: '#4338CA' }
  ];

  return (
    <header className="h-16 bg-white border-b border-[#DCE3EC] px-4 lg:px-6 flex items-center justify-between shrink-0 z-50 shadow-2xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => {
            setCurrentTab('simulator');
            setCurrentScreenId('home');
          }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div 
            style={{ backgroundColor: accent }} 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition"
          >
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-blue-700 transition">
              SafeRoute
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Anti-Fraud React App
            </span>
          </div>
        </div>

        {/* Screen Quick Jump Dropdown */}
        <div className="hidden md:flex items-center ml-4 pl-4 border-l border-slate-200">
          <select
            value={currentScreenId}
            onChange={(e) => {
              setCurrentScreenId(e.target.value);
              if (currentTab !== 'simulator' && e.target.value !== 'scam_matrix' && e.target.value !== 'case_study') {
                setCurrentTab('simulator');
              } else if (e.target.value === 'scam_matrix') {
                setCurrentTab('taxonomy');
              } else if (e.target.value === 'case_study') {
                setCurrentTab('pipeline');
              }
            }}
            className="text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 font-medium text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Core Screens">
              <option value="home">1 · Home Screen</option>
              <option value="job_check">2 · Check a Job Offer</option>
              <option value="risk_report">3 · Risk Report</option>
              <option value="family_guardian">4 · Family Guardian (Ibu's View)</option>
              <option value="shield_intro">A · Turn on Shield</option>
            </optgroup>
            <optgroup label="Job Scam Overlay Flow">
              <option value="job_spot">B · Spot a Job Post</option>
              <option value="job_cutoff">C · Text is Cut Off</option>
              <option value="job_expand">D · Full Post, Tap Again</option>
              <option value="job_scanning">E · Auto-Check Analysis</option>
              <option value="job_verdict">F · Picture Verdict (Danger)</option>
            </optgroup>
            <optgroup label="Romance & Trading Scam Flow">
              <option value="chat_strange">G · Strange Chat</option>
              <option value="chat_older_req">H · Need Older Messages</option>
              <option value="chat_scrolled">I · Older Messages, Tap Again</option>
              <option value="chat_verdict">J · Chat Verdict (Danger)</option>
            </optgroup>
            <optgroup label="SMS Phishing Flow">
              <option value="notif_warning">K · Automatic Warning</option>
              <option value="notif_verdict">L · Message Verdict (Danger)</option>
            </optgroup>
            <optgroup label="Agency Verification Flow">
              <option value="agency_page">M · Recruitment Agency Page</option>
              <option value="agency_verdict">N · Agency Check (Careful)</option>
            </optgroup>
            <optgroup label="E-Commerce Scam Flow">
              <option value="shop_listing">O · Cheap Tech Listing</option>
              <option value="shop_seller_req">P · Show the Seller</option>
              <option value="shop_profile">Q · Seller Profile, Tap Again</option>
              <option value="shop_verdict">R · Shopping Verdict (Danger)</option>
            </optgroup>
            <optgroup label="Architecture & Guides">
              <option value="scam_matrix">Scam Types by Shield Matrix</option>
              <option value="case_study">Case Study: Gambling Lure Pipeline</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Main Tabs */}
      <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setCurrentTab('simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            currentTab === 'simulator'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone size={14} />
          <span className="hidden sm:inline">Mobile Simulator</span>
          <span className="sm:hidden">App</span>
        </button>

        <button
          onClick={() => setCurrentTab('taxonomy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            currentTab === 'taxonomy'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Scam Taxonomy</span>
          <span className="sm:hidden">Taxonomy</span>
        </button>

        <button
          onClick={() => setCurrentTab('pipeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            currentTab === 'pipeline'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu size={14} />
          <span className="hidden sm:inline">6-Stage Pipeline</span>
          <span className="sm:hidden">Pipeline</span>
        </button>

        <button
          onClick={() => setCurrentTab('boards')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            currentTab === 'boards'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">All 24 Boards</span>
          <span className="sm:hidden">Boards</span>
        </button>
      </nav>

      {/* Controls: Color Accent & Device Frame */}
      <div className="flex items-center gap-3">
        {/* Accent Color picker */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
          <Palette size={13} className="text-slate-500" />
          {accentColors.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccent(c.value)}
              title={c.name}
              style={{ backgroundColor: c.value }}
              className={`w-4 h-4 rounded-full transition ${
                accent === c.value ? 'ring-2 ring-offset-1 ring-slate-800 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        {/* Viewport Frame Toggle */}
        {currentTab === 'simulator' && (
          <button
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              deviceFrameMode 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Toggle iPhone Chassis Frame"
          >
            <Smartphone size={14} />
            <span className="hidden xl:inline">{deviceFrameMode ? 'iPhone Frame' : 'Full Frame'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
