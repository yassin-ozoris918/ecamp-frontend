import { memo, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold transition-all rounded-lg';

  const variants = {
    primary: 'bg-accent-500 hover:bg-accent-400 text-white shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30',
    secondary: 'bg-theme-card hover:bg-white/[0.1] text-theme-text border border-theme-border hover:border-white/[0.15]',
    danger: 'bg-error-500 hover:bg-error-400 text-theme-text shadow-lg shadow-error-500/20',
    success: 'bg-secondary-500 hover:bg-secondary-400 text-theme-text shadow-lg shadow-secondary-500/20',
    ghost: 'text-theme-muted hover:text-white hover:bg-theme-card',
  };

  const sizes = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-sm py-2.5 px-5 gap-2',
    lg: 'text-base py-3 px-7 gap-2.5',
  };

  const cls = [
    base,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    loading || disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
});
