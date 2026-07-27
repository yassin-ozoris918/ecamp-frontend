import { memo, type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = memo(function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl glass">
      {icon && <div className="mb-4 p-3 rounded-2xl bg-theme-card text-theme-muted">{icon}</div>}
      <p className="text-lg font-display font-semibold text-theme-text">{title}</p>
      {description && <p className="mt-2 text-sm text-theme-muted max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
});
