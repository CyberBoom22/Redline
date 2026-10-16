import React from 'react';

const BODY =
  'M60 200 L60 170 Q62 150 100 144 L230 132 Q290 84 360 74 L500 72 Q560 76 620 124 L700 136 Q740 142 744 170 L744 200 L662 200 A52 52 0 0 0 558 200 L262 200 A52 52 0 0 0 158 200 Z';
const WINDOWS = 'M258 130 Q300 94 362 86 L480 85 Q530 90 566 124 Z';

const Lines: React.FC = () => (
  <>
    <path d={BODY} />
    <path d={WINDOWS} />
    <line x1="420" y1="85" x2="420" y2="128" />
    <circle cx="210" cy="200" r="42" />
    <circle cx="210" cy="200" r="20" />
    <circle cx="610" cy="200" r="42" />
    <circle cx="610" cy="200" r="20" />
  </>
);

/**
 * Side profile engraved into a plate: a dark cut line with a 1px highlight
 * offset below-right, the way light catches the far wall of an engraving.
 * Purely decorative.
 */
export const CarOutline: React.FC<{ className?: string; markEngineBay?: boolean }> = ({
  className = '',
  markEngineBay = true,
}) => (
  <svg viewBox="0 0 800 260" aria-hidden="true" focusable="false" className={className}>
    {markEngineBay && (
      <rect x="96" y="148" width="116" height="40" rx="3" fill="var(--accent)" fillOpacity="0.15" />
    )}
    <g transform="translate(1 1)" fill="none" stroke="var(--engrave-highlight)" strokeWidth="1" opacity="0.7">
      <Lines />
    </g>
    <g fill="none" stroke="var(--engrave)" strokeWidth="3" strokeLinejoin="round">
      <Lines />
    </g>
  </svg>
);
