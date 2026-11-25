import type { ReactNode } from 'react';

/**
 * Small circular progress indicator. Shows `children` (an icon or a number) in the middle.
 */
export function ProgressRing({
  value,
  size = 40,
  stroke = 3,
  tone = 'accent',
  children,
  label,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  tone?: 'accent' | 'success' | 'muted' | 'warning';
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = {
    accent: 'text-accent-500',
    success: 'text-secondary-500',
    muted: 'text-theme-muted',
    warning: 'text-warning-500',
  }[tone];
  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-theme-border" stroke="currentColor" />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
            className={`${color} transition-[stroke-dashoffset] duration-500`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}
