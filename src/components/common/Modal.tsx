import { memo, useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = memo(function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-theme-bg backdrop-blur-sm animate-scale-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widthClass} max-h-[92vh] overflow-y-auto scrollbar-thin glass-strong rounded-t-3xl sm:rounded-2xl p-6 animate-scale-in`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-xl font-display font-bold text-theme-text">{title}</h2>}
            {description && <p className="mt-1 text-sm text-theme-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-theme-muted hover:text-white hover:bg-theme-card transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-theme-border">{footer}</div>}
      </div>
    </div>,
    document.body
  );
});
