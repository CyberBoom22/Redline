import React from 'react';
import { X } from 'lucide-react';

interface ModalBarProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Extra buttons placed before the close button. */
  actions?: React.ReactNode;
  className?: string;
}

/** Ink title bar used at the top of every modal. */
export const ModalBar: React.FC<ModalBarProps> = ({ title, subtitle, onClose, actions, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 bg-ink px-5 py-3 text-on-dark sm:px-6 ${className}`}>
    <div className="min-w-0">
      <h2 className="h-section text-on-dark">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[15px] text-dark-muted">{subtitle}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {actions}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="icon-btn text-dark-muted hover:border-dark-border hover:text-on-dark"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  </div>
);
