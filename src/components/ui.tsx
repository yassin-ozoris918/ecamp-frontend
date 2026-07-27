import { memo } from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = memo(function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
});

export { Badge, EmptyState, Button, Card, Modal, LoadingSpinner, ErrorMessage, SectionHeader } from './common';

export const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
});

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  className = '',
  variant = 'accent',
}: {
  value: number;
  max?: number;
  className?: string;
  variant?: 'accent' | 'gold' | 'secondary';
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors = {
    accent: 'bg-gradient-to-r from-accent-500 to-accent-400',
    gold: 'bg-gradient-to-r from-gold-500 to-gold-300',
    secondary: 'bg-gradient-to-r from-secondary-600 to-secondary-400',
  };
  return (
    <div className={`h-2 w-full rounded-full bg-theme-card overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${colors[variant]} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
});
