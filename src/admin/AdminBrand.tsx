import React from 'react';

/** Wordmark block at the top of the admin forms (light plate variant). */
export const AdminBrand: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="space-y-1 border-b border-black/15 pb-4">
    <div className="font-display text-[24px] leading-none tracking-[2px] text-ink etch">
      STAGE<span className="text-accent">0</span>
    </div>
    <div className="label-ui pt-2 text-ink">{title}</div>
    <p className="text-[15px] text-text-2">{subtitle}</p>
  </div>
);
