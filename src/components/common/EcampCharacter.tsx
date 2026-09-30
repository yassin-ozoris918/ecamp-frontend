/**
 * EcampCharacter — reusable animated character for eCamp LMS.
 *
 * Usage:
 *   <EcampCharacter state="idle" />
 *   <EcampCharacter state="happy" size="lg" />
 *
 * All animation is driven by CSS classes in index.css.
 * No external animation library is used or required.
 * Respects prefers-reduced-motion automatically via CSS.
 */

import { memo, useEffect, useRef } from 'react';

// ─── State types ────────────────────────────────────────────────────────────

export type CharacterState =
  | 'idle'
  | 'looking'
  | 'pulling'
  | 'opening'
  | 'typing'
  | 'thinking'
  | 'confused'
  | 'worried'
  | 'happy'
  | 'success'
  | 'celebrating'
  | 'waving'
  | 'loading'
  | 'empty-state';

export type CharacterSize = 'sm' | 'md' | 'lg' | 'xl';

interface EcampCharacterProps {
  state?: CharacterState;
  size?: CharacterSize;
  className?: string;
  /** Mirror the character horizontally (e.g. for RTL layouts) */
  flip?: boolean;
}

// ─── Size map ───────────────────────────────────────────────────────────────

const SIZE_CLS: Record<CharacterSize, string> = {
  sm: 'w-20 h-20',
  md: 'w-28 h-28 sm:w-32 sm:h-32',
  lg: 'w-36 h-36 sm:w-40 sm:h-40',
  xl: 'w-44 h-44 sm:w-52 sm:h-52',
};

// ─── Animation class map ─────────────────────────────────────────────────────

const STATE_ANIM: Record<CharacterState, string> = {
  idle:          'ecamp-char-idle',
  looking:       'ecamp-char-looking',
  pulling:       'ecamp-char-pulling',
  opening:       'ecamp-char-opening',
  typing:        'ecamp-char-typing',
  thinking:      'ecamp-char-thinking',
  confused:      'ecamp-char-confused',
  worried:       'ecamp-char-worried',
  happy:         'ecamp-char-happy',
  success:       'ecamp-char-success',
  celebrating:   'ecamp-char-celebrating',
  waving:        'ecamp-char-waving',
  loading:       'ecamp-char-loading',
  'empty-state': 'ecamp-char-empty',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMouthPath(state: CharacterState): string {
  switch (state) {
    case 'happy':
    case 'success':
    case 'celebrating':
    case 'waving':
      return 'M 44 78 Q 56 90 68 78';
    case 'confused':
      return 'M 44 82 Q 56 78 68 82';
    case 'worried':
      return 'M 44 84 Q 56 78 68 84';
    case 'thinking':
    case 'loading':
      return 'M 47 80 Q 56 82 65 80';
    case 'pulling':
    case 'opening':
      return 'M 48 79 Q 56 84 64 79';
    default:
      return 'M 44 79 Q 56 85 68 79';
  }
}

function getEyebrows(state: CharacterState): [string, string] {
  switch (state) {
    case 'confused':
      return ['M 34 45 Q 41 40 48 44', 'M 64 44 Q 71 41 78 46'];
    case 'worried':
      return ['M 34 48 Q 41 44 48 48', 'M 64 48 Q 71 44 78 48'];
    case 'thinking':
      return ['M 34 46 Q 41 42 48 45', 'M 64 45 Q 71 43 78 47'];
    case 'happy':
    case 'success':
    case 'celebrating':
      return ['M 34 44 Q 41 40 48 43', 'M 64 43 Q 71 40 78 44'];
    default:
      return ['M 34 47 Q 41 44 48 47', 'M 64 47 Q 71 44 78 47'];
  }
}

function getPupilOffset(state: CharacterState): [number, number] {
  // [dx, dy] from center
  switch (state) {
    case 'looking':    return [3, 2];
    case 'typing':     return [0, 4];
    case 'thinking':   return [-4, -3];
    case 'confused':   return [2, -2];
    case 'worried':    return [0, 2];
    case 'pulling':
    case 'opening':    return [4, 0];
    default:           return [0, 0];
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export const EcampCharacter = memo(function EcampCharacter({
  state = 'idle',
  size = 'md',
  className = '',
  flip = false,
}: EcampCharacterProps) {
  const animClass = STATE_ANIM[state];
  const sizeCls   = SIZE_CLS[size];

  const mouthPath = getMouthPath(state);
  const [leftBrow, rightBrow] = getEyebrows(state);
  const [pdx, pdy] = getPupilOffset(state);

  const isSquinted    = ['happy', 'success', 'celebrating'].includes(state);
  const isWaving      = state === 'waving';
  const isCelebrating = state === 'celebrating';
  const showThink     = state === 'thinking' || state === 'loading';
  const showConfused  = state === 'confused';
  const showWorried   = state === 'worried';
  const showSparkles  = state === 'success' || state === 'celebrating';

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Re-trigger animation when state changes
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.classList.remove(animClass);
    void el.offsetWidth; // reflow
    el.classList.add(animClass);
  }, [state, animClass]);

  const eyeRy = isSquinted ? 2 : 7;
  const pupilR = isSquinted ? 1.5 : 3.5;

  return (
    <div
      ref={wrapperRef}
      className={`${sizeCls} ${animClass} select-none pointer-events-none ${flip ? '[transform:scaleX(-1)]' : ''} ${className}`}
      aria-hidden="true"
      role="presentation"
      style={{ display: 'inline-block' }}
    >
      <svg
        viewBox="0 0 112 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <radialGradient id="ec-skin" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FDDCB5" />
            <stop offset="100%" stopColor="#F5B87A" />
          </radialGradient>
          <linearGradient id="ec-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <radialGradient id="ec-shadow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <filter id="ec-glow-f" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="56" cy="155" rx="28" ry="5" fill="url(#ec-shadow-grad)" />

        {/* Body */}
        <rect x="28" y="100" width="56" height="50" rx="12" fill="url(#ec-body-grad)" />

        {/* Shirt collar */}
        <path d="M 42 100 L 56 116 L 70 100" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />

        {/* eCamp label on shirt */}
        <text x="56" y="128" textAnchor="middle" fontSize="9" fontWeight="800"
          fontFamily="Outfit, system-ui, sans-serif" fill="rgba(255,255,255,0.82)" letterSpacing="1">
          E.C
        </text>

        {/* Left arm */}
        <g className="ecamp-char-arm-left">
          <rect x="10" y="102" width="18" height="36" rx="9" fill="url(#ec-body-grad)" />
          <circle cx="19" cy="140" r="7" fill="url(#ec-skin)" />
        </g>

        {/* Right arm — wave / celebrate or rest */}
        <g className={isCelebrating ? 'ecamp-char-arm-celebrate' : isWaving ? 'ecamp-char-arm-wave' : ''}>
          <rect x="84" y="102" width="18" height="36" rx="9" fill="url(#ec-body-grad)"
            style={{ transformOrigin: '93px 102px' }} />
          <circle cx="93" cy="140" r="7" fill="url(#ec-skin)" />
        </g>

        {/* Neck */}
        <rect x="48" y="90" width="16" height="14" rx="4" fill="url(#ec-skin)" />

        {/* Head */}
        <ellipse cx="56" cy="66" rx="30" ry="32" fill="url(#ec-skin)" className="ecamp-char-head" />

        {/* Hair */}
        <path d="M 28 58 Q 26 34 56 30 Q 86 34 84 58 Q 82 46 56 44 Q 30 46 28 58 Z" fill="#1c2440" />
        <path d="M 38 40 Q 46 36 58 38" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Eyebrows */}
        <path d={leftBrow}  stroke="#1c2440" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d={rightBrow} stroke="#1c2440" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Left eye */}
        <ellipse cx={41} cy={60} rx="6" ry={eyeRy} fill="white" />
        <circle cx={41 + pdx} cy={60 + pdy} r={pupilR} fill="#1c2440" />
        {!isSquinted && <circle cx={43 + pdx} cy={58 + pdy} r="1.2" fill="white" />}

        {/* Right eye */}
        <ellipse cx={71} cy={60} rx="6" ry={eyeRy} fill="white" />
        <circle cx={71 + pdx} cy={60 + pdy} r={pupilR} fill="#1c2440" />
        {!isSquinted && <circle cx={73 + pdx} cy={58 + pdy} r="1.2" fill="white" />}

        {/* Nose */}
        <ellipse cx="56" cy="71" rx="2.5" ry="1.5" fill="#E8A566" opacity="0.5" />

        {/* Mouth */}
        <path d={mouthPath} stroke="#C47B40" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Cheek blush (happy states) */}
        {isSquinted && (
          <>
            <ellipse cx="33" cy="70" rx="6" ry="3.5" fill="#f87171" opacity="0.3" />
            <ellipse cx="79" cy="70" rx="6" ry="3.5" fill="#f87171" opacity="0.3" />
          </>
        )}

        {/* Thinking bubble */}
        {showThink && (
          <g className="ecamp-char-think-bubble">
            <circle cx="82" cy="42" r="2"   fill="#06b6d4" opacity="0.5" />
            <circle cx="88" cy="34" r="3.5" fill="#06b6d4" opacity="0.6" />
            <circle cx="96" cy="26" r="6"   fill="#06b6d4" opacity="0.5" />
            <circle cx="93" cy="26" r="1.2" fill="white"   opacity="0.85" />
            <circle cx="96" cy="26" r="1.2" fill="white"   opacity="0.85" />
            <circle cx="99" cy="26" r="1.2" fill="white"   opacity="0.85" />
          </g>
        )}

        {/* Confused mark */}
        {showConfused && (
          <g className="ecamp-char-confused-mark">
            <circle cx="88" cy="34" r="11" fill="#fbbf24" opacity="0.15" />
            <text x="88" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#f59e0b" fontFamily="system-ui">?</text>
          </g>
        )}

        {/* Worried mark */}
        {showWorried && (
          <g className="ecamp-char-worried-mark">
            <circle cx="88" cy="34" r="11" fill="#fb7185" opacity="0.15" />
            <text x="88" y="39" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f43f5e" fontFamily="system-ui">!</text>
          </g>
        )}

        {/* Sparkles */}
        {showSparkles && (
          <g className="ecamp-char-sparkles" filter="url(#ec-glow-f)">
            <text x="8"  y="50" fontSize="10" fill="#fbbf24" className="ecamp-sparkle-1">✦</text>
            <text x="90" y="38" fontSize="8"  fill="#22d3ee" className="ecamp-sparkle-2">✦</text>
            <text x="96" y="58" fontSize="6"  fill="#fbbf24" className="ecamp-sparkle-3">✦</text>
            <text x="4"  y="72" fontSize="7"  fill="#22d3ee" className="ecamp-sparkle-4">✦</text>
          </g>
        )}

        {/* Legs */}
        <rect x="36" y="146" width="16" height="12" rx="6" fill="#1c2440" />
        <rect x="60" y="146" width="16" height="12" rx="6" fill="#1c2440" />
        {/* Shoes */}
        <ellipse cx="44" cy="158" rx="9" ry="4" fill="#0f172a" />
        <ellipse cx="68" cy="158" rx="9" ry="4" fill="#0f172a" />
      </svg>
    </div>
  );
});

EcampCharacter.displayName = 'EcampCharacter';
