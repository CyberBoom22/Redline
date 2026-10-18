import React from 'react';
import { Rivets } from './Rivets';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  /** Right-hand slot: primary action, search box. */
  actions?: React.ReactNode;
  /** Full-width slot under the description: filters. */
  children?: React.ReactNode;
}

/** Riveted plate that opens every tab other than the planner. */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, children }) => (
  <header className="plate relative px-6 py-9 sm:px-10">
    <Rivets />
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-3">
        <p className="eyebrow etch">{eyebrow}</p>
        <h1 className="h-page etch">{title}</h1>
        {description && <p className="max-w-2xl text-[17px] text-text-2">{description}</p>}
      </div>
      {actions && <div className="w-full shrink-0 md:w-auto">{actions}</div>}
    </div>
    {children && <div className="mt-6 border-t border-black/15 pt-5">{children}</div>}
  </header>
);
