import React, { useState } from 'react';
import { SCREENS_CATALOG } from '../data/mockData';
import { LayoutGrid, Filter, Search, ArrowRight, Smartphone, Eye } from 'lucide-react';

export default function DesignBoardsView({ onSelectScreen, activeScreenId }) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Core App', 'Shield Setup', 'Job Scam Flow', 'Romance Scam Flow', 'SMS Phishing Flow', 'Agency Check Flow', 'E-Commerce Scam Flow', 'Architecture & Guides'];

  const filteredBoards = SCREENS_CATALOG.filter(item => {
    const matchesCat = filterCategory === 'All' || item.category === filterCategory;
    const matchesQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F8] p-6 lg:p-8 text-[#0F1B2D]">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
              <LayoutGrid size={16} />
              <span>Full Screen Catalog</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
              All 24 SafeRoute Mockup Boards
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Click any screen to open it directly in the interactive mobile simulator.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search screens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#DCE3EC] focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 lg:w-64"
              />
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-[#DCE3EC] text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid of 24 Boards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBoards.map(item => {
            const isCurrent = activeScreenId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectScreen(item.id)}
                className={`bg-white rounded-2xl border p-4 flex flex-col justify-between gap-4 cursor-pointer hover:shadow-md transition group ${
                  isCurrent ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-[#DCE3EC] hover:border-slate-400'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition leading-snug">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={14} className="text-slate-400" />
                    <span className="font-mono text-[11px]">{item.screen}</span>
                  </div>
                  <span className="flex items-center gap-1 font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    Open <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
