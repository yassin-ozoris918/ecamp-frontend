import { memo, type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'warning' | 'success' | 'error' | 'gold' | 'info';
  className?: string;
}

export const Badge = memo(function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-theme-card text-theme-muted border border-theme-border',
    accent: 'bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-500/20',
    warning: 'bg-warning-500/10 text-warning-700 dark:text-warning-300 border border-warning-500/20',
    success: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-300 border border-secondary-500/20',
    error: 'bg-error-500/10 text-error-300 border border-error-500/20',
    gold: 'bg-gold-500/10 text-gold-700 dark:text-gold-300 border border-gold-500/20',
    info: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20',
  };

  return <span className={`badge ${variants[variant]} ${className}`}>{children}</span>;
});
