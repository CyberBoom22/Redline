import React from 'react';

/** STAGE0 wordmark. The zero is anodized red; at 24px+ it clears 3:1 on ink. */
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-display text-[24px] leading-none tracking-[2px] text-on-dark ${className}`}>
    STAGE<span className="text-accent">0</span>
  </span>
);
