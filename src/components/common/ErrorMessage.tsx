import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage = memo(function ErrorMessage({ title, message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl glass">
      <div className="mb-4 p-3 rounded-2xl bg-error-500/10 text-error-300">
        <AlertCircle className="w-8 h-8" />
      </div>
      {title && <p className="text-lg font-display font-semibold text-theme-text mb-1">{title}</p>}
      <p className="text-sm text-error-400 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-6">
          Try Again
        </Button>
      )}
    </div>
  );
});
