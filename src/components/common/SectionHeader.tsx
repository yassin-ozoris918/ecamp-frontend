import { memo, type ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  /** Stack title and actions vertically at every width (e.g. inside a narrow column). */
  stacked?: boolean;
}

export const SectionHeader = memo(function SectionHeader({ title, subtitle, actions, stacked = false }: SectionHeaderProps) {
  return (
    <div className={stacked ? 'flex flex-col gap-3' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-4'}>
      <div>
        <div className="text-2xl font-display font-bold text-theme-text">{title}</div>
        {subtitle && <p className="text-sm text-theme-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className={stacked ? 'flex items-center gap-2 w-full' : 'shrink-0 flex items-center gap-2'}>{actions}</div>}
    </div>
  );
});
