import React, { useEffect } from 'react';

/**
 * Modal shell that always fits the viewport.
 *
 * The pattern every overlay in this app used before — `fixed inset-0
 * flex items-center justify-center overflow-y-auto` — breaks as soon as the
 * content is taller than the screen: centring happens on the scroll container
 * itself, so the top of the panel overflows *above* the scroll origin and
 * cannot be reached, because scrollTop cannot go negative. The Build Card hit
 * this hardest, having no height cap at all.
 *
 * Two mechanisms, both needed:
 *
 *  1. The panel is capped at `100dvh` minus the gutter and lays out as a flex
 *     column: the header is pinned and the body scrolls inside it. `dvh`
 *     rather than `vh` so mobile browser chrome does not push the footer off
 *     the bottom.
 *  2. The centring flex wrapper sits *inside* the scroll container with
 *     `min-h-full`, so short panels centre and tall ones scroll from the top
 *     instead of being clipped.
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pinned above the scrolling body; stays visible however tall the content. */
  header?: React.ReactNode;
  /** Pinned below it. Action buttons belong here, not in the scroll area. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind max-w-* class for the panel. */
  maxWidth?: string;
  backdropClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  header,
  footer,
  children,
  maxWidth = 'max-w-2xl',
  backdropClassName = 'bg-slate-950/85',
  panelClassName = '',
  bodyClassName = '',
}) => {
  // Escape closes. Registered before the early return so hook order is stable.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock the page behind the overlay, so a scroll gesture over the modal never
  // moves the planner underneath it.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain backdrop-blur-md ${backdropClassName}`}
      onMouseDown={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex w-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl max-h-[calc(100dvh-2rem)] ${maxWidth} ${panelClassName}`}
        >
          {header && <div className="shrink-0">{header}</div>}
          {/* min-h-0 is what allows a flex child to shrink below its content
              height; without it the body refuses to scroll and pushes the
              panel past the bottom of the screen. */}
          <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
          {footer && <div className="shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
