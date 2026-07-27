import { memo, type ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}

export const SectionHeader = memo(function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="text-2xl font-display font-bold text-theme-text">{title}</div>
        {subtitle && <p className="text-sm text-theme-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
});
