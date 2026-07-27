import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl glass">
      {icon && <div className="mb-4 p-3 rounded-2xl bg-white/[0.04] text-neutral-300">{icon}</div>}
      <p className="text-lg font-display font-semibold text-neutral-100">{title}</p>
      {description && <p className="mt-2 text-sm text-neutral-400 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'warning' | 'success' | 'error' | 'gold';
  className?: string;
}) {
  const variants = {
    default: 'bg-white/[0.06] text-neutral-300 border border-white/[0.08]',
    accent: 'bg-accent-500/10 text-accent-300 border border-accent-500/20',
    warning: 'bg-warning-500/10 text-warning-300 border border-warning-500/20',
    success: 'bg-secondary-500/10 text-secondary-300 border border-secondary-500/20',
    error: 'bg-error-500/10 text-error-300 border border-error-500/20',
    gold: 'bg-gold-500/10 text-gold-300 border border-gold-500/20',
  };
  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
}

export function ProgressBar({
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
    <div className={`h-2 w-full rounded-full bg-white/[0.05] overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${colors[variant]} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
