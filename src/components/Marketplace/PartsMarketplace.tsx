import React, { useState } from 'react';
import { Part, PartCategory, PartTier, EngineId } from '../../types';
import { ALL_PARTS } from '../../data/parts';
import { Search, ExternalLink, Youtube, CheckSquare, Square } from 'lucide-react';
import { PageHeader } from '../billet/PageHeader';

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
      <PageHeader
        eyebrow="Parts catalog"
        title="Curated Performance Parts Catalog"
        description="Curated performance hardware with honest per-part verdict lines, real install time estimates, manufacturer guides, and parts care intervals."
        actions={
          <div className="relative w-full md:w-72">
            <label htmlFor="parts-search" className="field-label">Search</label>
            <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-text-3" aria-hidden="true" />
            <input
              id="parts-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts, brands..."
              className="field pl-9"
            />
          </div>
        }
      >
        {/* Filters Bar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Category Tabs */}
          <div className="min-w-0">
            <span id="category-filter-label" className="field-label">Category</span>
            <div role="group" aria-labelledby="category-filter-label" className="scroll-x -mx-1 flex gap-2 px-1 pb-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={selectedCategory === cat.id}
                  className="toggle shrink-0 whitespace-nowrap text-[14px]"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tier Filter */}
          <div className="w-full lg:w-72 lg:shrink-0">
            <label htmlFor="tier-filter" className="field-label">Tier</label>
            <select
              id="tier-filter"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="field"
            >
              <option value="all">All Tiers (Cheap / Mid / Expensive / OEM)</option>
              <option value="cheap">Cheap / Budget</option>
              <option value="mid">Mid-Tier</option>
              <option value="expensive">Expensive / Premium</option>
              <option value="oem">OEM Upgrade</option>
            </select>
          </div>
        </div>
      </PageHeader>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredParts.length === 0 ? (
          <div className="plate col-span-full p-8 text-center text-text-2">
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
              <article
                key={part.id}
                className={`panel-dark flex flex-col justify-between gap-4 p-5 ${
                  isOwned ? 'outline outline-2 -outline-offset-2 outline-accent' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label-ui text-accent-bright">{part.brand}</span>
                        <span className="chip text-dark-muted">{tierBadge}</span>
                      </div>
                      <h2 className="mt-1 text-[18px] font-bold leading-snug text-on-dark">{part.name}</h2>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="num text-[22px] text-on-dark">${part.price}</div>
                      <div className="text-[14px] text-dark-muted">+{part.whpGain} WHP Gain</div>
                    </div>
                  </div>

                  {/* Verdict Line */}
                  <div className="well-dark p-3">
                    <span className="label-ui mb-1 block text-dark-muted">Stage0 honest verdict:</span>
                    <p className="text-[15px] font-medium italic text-on-dark">"{part.verdict}"</p>
                  </div>

                  <p className="text-[15px] text-dark-muted">{part.description}</p>
                </div>

                {/* Specs Footer */}
                <div className="space-y-2 border-t border-dark-border pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 text-[14px] text-dark-muted">
                    <span>Install Labor: ~${part.estLaborCost} ({part.installTimeHours}h)</span>
                    <span className="text-on-dark">Difficulty: {part.difficulty}</span>
                  </div>

                  {/* Buttons & Checkbox */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4">
                      {part.installGuideUrl && (
                        <a
                          href={part.installGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link text-[14px] text-dark-muted hover:text-on-dark"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          <span>Guide</span>
                        </a>
                      )}
                      {part.youtubeGuideUrl && (
                        <a
                          href={part.youtubeGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link text-[14px] text-dark-muted hover:text-on-dark"
                        >
                          <Youtube className="h-4 w-4" aria-hidden="true" />
                          <span>YouTube</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => onTogglePartOwned(part.id)}
                      aria-pressed={isOwned}
                      className={`btn btn-sm ${isOwned ? 'btn-ghost-dark' : 'btn-primary'}`}
                    >
                      {isOwned ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
                      <span>{isOwned ? 'Added to Build' : 'Add to Build'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
