import React, { useState } from 'react';
import { Part, PartCategory, PartTier, EngineId } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { ShoppingBag, Search, ExternalLink, Youtube, Wrench, Filter, Tag, Check, CheckSquare, Square } from 'lucide-react';

interface PartsMarketplaceProps {
  engineId: EngineId;
  ownedPartIds: string[];
  onTogglePartOwned: (partId: string) => void;
}

export const PartsMarketplace: React.FC<PartsMarketplaceProps> = ({
  engineId,
  ownedPartIds,
  onTogglePartOwned
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const engineParts = ALL_PARTS.filter(p => p.engineIds.includes(engineId));

  const filteredParts = engineParts.filter(part => {
    const matchesCat = selectedCategory === 'all' || part.category === selectedCategory;
    const matchesTier = selectedTier === 'all' || part.tier === selectedTier;
    const matchesSearch = searchQuery === '' || 
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.verdict.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesTier && matchesSearch;
  });

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'tune', label: 'Tunes & Flashes' },
    { id: 'downpipe', label: 'Downpipes' },
    { id: 'intake', label: 'Intakes' },
    { id: 'chargepipe_intercooler', label: 'Cooling & Chargepipes' },
    { id: 'fueling', label: 'Fueling & HPFP' },
    { id: 'turbo', label: 'Turbos' },
    { id: 'exhaust', label: 'Exhaust Systems' },
    { id: 'drivetrain', label: 'Drivetrain' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wider">
                Curated Performance Parts Catalog
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Curated performance hardware with honest per-part verdict lines, real install time estimates, manufacturer guides, and parts care intervals.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts, brands..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white border-red-500 font-bold shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-red-500"
            >
              <option value="all">All Tiers (Cheap / Mid / Expensive / OEM)</option>
              <option value="cheap">Cheap / Budget</option>
              <option value="mid">Mid-Tier</option>
              <option value="expensive">Expensive / Premium</option>
              <option value="oem">OEM Upgrade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredParts.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
            No parts match your filter criteria. Try adjusting your search query.
          </div>
        ) : (
          filteredParts.map(part => {
            const isOwned = ownedPartIds.includes(part.id);

            const tierBadge = {
              cheap: 'Budget Tier',
              mid: 'Mid-Tier',
              expensive: 'Premium Tier',
              oem: 'OEM Upgrade'
            }[part.tier];

            return (
              <div
                key={part.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between ${
                  isOwned
                    ? 'border-emerald-700/80 bg-slate-900/90 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-red-400 uppercase">{part.brand}</span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {tierBadge}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white mt-0.5">{part.name}</h3>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <div className="font-mono text-xl font-black text-emerald-400">${part.price}</div>
                      <div className="text-[10px] text-slate-400 font-mono">+{part.whpGain} WHP Gain</div>
                    </div>
                  </div>

                  {/* Verdict Line */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-0.5">
                      REDLINE HONEST VERDICT:
                    </span>
                    <p className="text-xs text-red-300 italic font-medium">
                      "{part.verdict}"
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {part.description}
                  </p>
                </div>

                {/* Specs Footer */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Install Labor: ~${part.estLaborCost} ({part.installTimeHours}h)</span>
                    <span className="text-slate-300">Difficulty: {part.difficulty}</span>
                  </div>

                  {/* Buttons & Checkbox */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <div className="flex items-center gap-2">
                      {part.installGuideUrl && (
                        <a
                          href={part.installGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-800 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-red-400" />
                          <span>Guide</span>
                        </a>
                      )}
                      {part.youtubeGuideUrl && (
                        <a
                          href={part.youtubeGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-800 flex items-center gap-1 transition-colors"
                        >
                          <Youtube className="w-3 h-3 text-red-500" />
                          <span>YouTube</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => onTogglePartOwned(part.id)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isOwned
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isOwned ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                      <span>{isOwned ? 'Added to Build' : 'Add to Build'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
