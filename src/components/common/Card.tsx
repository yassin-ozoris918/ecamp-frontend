import { memo, type ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card = memo(function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  hover = false,
  padding = 'md',
}: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const hoverClass = hover ? 'hover:border-white/[0.12] transition-all hover:-translate-y-0.5' : '';

  return (
    <div className={`glass rounded-2xl overflow-hidden ${paddingClasses[padding]} ${hoverClass} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h3 className="text-lg font-display font-bold text-theme-text">{title}</h3>}
            {subtitle && <p className="text-sm text-theme-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
});
