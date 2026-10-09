import { useState, useCallback, useRef } from 'react';

interface UseConfirmState {
  open: boolean;
  title: string;
  message: React.ReactNode;
  infoMessage?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  infoMessage?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, infoMessage, confirmText, cancelText, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <div className="text-theme-muted text-sm mb-6">{message}</div>
        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm leading-relaxed">
            {infoMessage}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-muted hover:text-theme-text hover:bg-theme-secondary transition-colors"
            onClick={onCancel}
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-error-500 text-white hover:bg-error-400 transition-colors"
            onClick={onConfirm}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<UseConfirmState>({
    open: false,
    title: '',
    message: '',
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((title: string, message: React.ReactNode, infoMessage?: React.ReactNode, confirmText?: string, cancelText?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, message, infoMessage, confirmText, cancelText });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState({ open: false, title: '', message: '' });
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState({ open: false, title: '', message: '' });
  }, []);

  return { confirm, state, handleConfirm, handleCancel };
}
