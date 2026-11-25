import { memo } from 'react';

/**
 * E.Camp brand mark: the compass with the gear and spring, redrawn as clean vector geometry
 * (64×64 grid) so it stays sharp at every size. Brand colors: navy #12298f, cyan #1cc0d0.
 */
export const EcampMark = memo(function EcampMark({ className = 'w-8 h-8', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="2.5 1.5 59 61.5" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path fill="#12298f" d="M30.9 2.6 L33.1 2.6 L36.2 15.4 L27.8 15.4 Z" />
      <path fill="#12298f" d="M23.73 25.44 L30.67 28.56 L19.03 52.77 L13.37 50.23 Z" />
      <path fill="#12298f" d="M33.36 28.61 L40.24 25.39 L53.36 61.43 L52.64 61.77 Z" />
      <path fill="#12298f" d="M15.5 50.01 L17.7 50.99 L11.74 61.86 L11.46 61.74 Z" />
      <rect x="14.27" y="36.5" width="5.4" height="7.4" rx="1.4" fill="#12298f" transform="rotate(24.68 16.97 40.2)" />
      <path
        fill="none"
        stroke="#12298f"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22.27 45.2 L25.79 42.1 L29.31 48.3 L32.84 42.1 L36.36 48.3 L39.88 42.1 L43.4 45.2"
      />
      <path
        fill="#1cc0d0"
        d="M30.21 14.6 L30.37 12.13 L33.63 12.13 L33.79 14.6 L36.25 15.62 L38.11 13.99 L40.41 16.29 L38.78 18.15 L39.8 20.61 L42.27 20.77 L42.27 24.03 L39.8 24.19 L38.78 26.65 L40.41 28.51 L38.11 30.81 L36.25 29.18 L33.79 30.2 L33.63 32.67 L30.37 32.67 L30.21 30.2 L27.75 29.18 L25.89 30.81 L23.59 28.51 L25.22 26.65 L24.2 24.19 L21.73 24.03 L21.73 20.77 L24.2 20.61 L25.22 18.15 L23.59 16.29 L25.89 13.99 L27.75 15.62 Z"
      />
      <circle cx="32" cy="22.4" r="4.7" fill="#fff" />
      <circle cx="32" cy="22.4" r="2.6" fill="#1cc0d0" />
    </svg>
  );
});

const TILE = {
  sm: { box: 'w-8 h-8 rounded-[10px]', mark: 'w-[27px] h-[27px]' },
  md: { box: 'w-10 h-10 rounded-xl', mark: 'w-[34px] h-[34px]' },
  lg: { box: 'w-14 h-14 rounded-2xl', mark: 'w-12 h-12' },
  xl: { box: 'w-24 h-24 rounded-[1.75rem]', mark: 'w-20 h-20' },
} as const;

/**
 * The mark on a white app-icon tile, so the navy and cyan read the same in light and dark themes.
 */
export const EcampLogo = memo(function EcampLogo({ size = 'md', className = '' }: { size?: keyof typeof TILE; className?: string }) {
  const s = TILE[size];
  return (
    <span
      className={`${s.box} inline-flex items-center justify-center shrink-0 bg-white ring-1 ring-black/5 dark:ring-white/10 shadow-[0_6px_18px_-6px_rgba(18,41,143,0.45)] ${className}`}
    >
      <EcampMark className={s.mark} title="E.Camp" />
    </span>
  );
});
