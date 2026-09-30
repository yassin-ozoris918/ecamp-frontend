/**
 * EcampCharacter — eCamp's official animated character companion "Yassin".
 *
 * Full-body SVG: head · neck · torso · arms (with hands) · legs · feet.
 * All animation driven by CSS classes in index.css.
 * Zero external dependencies. Respects prefers-reduced-motion.
 *
 * Usage:
 *   <EcampCharacter state="idle" showName />
 *   <EcampCharacter state="pushing" size="xl" />
 */

import { memo, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CharacterState =
  | 'idle'
  | 'looking'
  | 'pushing'
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

export type CharacterSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface EcampCharacterProps {
  state?: CharacterState;
  size?: CharacterSize;
  className?: string;
  showName?: boolean;
  /** Mirror horizontally for RTL push direction */
  flip?: boolean;
}

// ─── Size map ────────────────────────────────────────────────────────────────

const SIZE_CLS: Record<CharacterSize, string> = {
  sm:  'w-16',
  md:  'w-24',
  lg:  'w-32',
  xl:  'w-40',
  '2xl': 'w-52',
};

// ─── Animation class map ─────────────────────────────────────────────────────

const STATE_ANIM: Record<CharacterState, string> = {
  idle:          'ecamp-char-idle',
  looking:       'ecamp-char-looking',
  pushing:       'ecamp-char-pushing',
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

// ─── Face expression helpers ──────────────────────────────────────────────────

function getMouth(state: CharacterState): string {
  switch (state) {
    case 'happy': case 'success': case 'celebrating': case 'waving':
      return 'M 38 74 Q 50 84 62 74'; // big smile
    case 'confused':
      return 'M 38 78 Q 50 74 62 78'; // frown tilt
    case 'worried':
      return 'M 38 80 Q 50 74 62 80'; // frown
    case 'pushing': case 'pulling':
      return 'M 41 76 Q 50 80 59 76'; // slight effort open
    case 'thinking': case 'loading':
      return 'M 43 76 Q 50 78 57 76'; // small neutral
    default:
      return 'M 38 75 Q 50 82 62 75'; // gentle smile
  }
}

function getBrows(state: CharacterState): [string, string] {
  switch (state) {
    case 'confused':
      return ['M 28 42 Q 38 37 44 41', 'M 56 41 Q 62 37 72 42'];
    case 'worried':
      return ['M 28 45 Q 38 41 44 45', 'M 56 45 Q 62 41 72 45'];
    case 'thinking': case 'pushing': case 'pulling':
      return ['M 28 43 Q 38 39 44 42', 'M 56 42 Q 62 39 72 43'];
    case 'happy': case 'success': case 'celebrating':
      return ['M 28 41 Q 38 37 44 40', 'M 56 40 Q 62 37 72 41'];
    default:
      return ['M 28 44 Q 38 41 44 44', 'M 56 44 Q 62 41 72 44'];
  }
}

function getPupilOffset(state: CharacterState): [number, number] {
  switch (state) {
    case 'looking': case 'typing': return [3, 3];
    case 'thinking':               return [-3, -3];
    case 'confused':               return [2, -2];
    case 'pushing': case 'pulling': return [5, 1];
    case 'worried':                return [0, 3];
    default:                       return [0, 0];
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const EcampCharacter = memo(function EcampCharacter({
  state = 'idle',
  size = 'lg',
  className = '',
  showName = false,
  flip = false,
}: EcampCharacterProps) {
  const animClass = STATE_ANIM[state];
  const wrapperRef = useRef<HTMLDivElement>(null);

  const mouth = getMouth(state);
  const [lb, rb] = getBrows(state);
  const [pdx, pdy] = getPupilOffset(state);

  const squinted     = ['happy', 'success', 'celebrating'].includes(state);
  const isPushing    = state === 'pushing';
  const isWaving     = state === 'waving';
  const isCelebrate  = state === 'celebrating';
  const showThink    = state === 'thinking' || state === 'loading';
  const showConfused = state === 'confused';
  const showWorried  = state === 'worried';
  const showSparkles = state === 'success' || state === 'celebrating';

  // Re-trigger animation on state change
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.classList.remove(animClass);
    void el.offsetWidth;
    el.classList.add(animClass);
  }, [state, animClass]);

  const eyeRy  = squinted ? 1.8 : 6.5;
  const pupilR = squinted ? 1.2 : 3.2;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div
        ref={wrapperRef}
        className={`${SIZE_CLS[size]} ${animClass} select-none pointer-events-none ${flip ? '[transform:scaleX(-1)]' : ''}`}
        style={{ display: 'inline-block' }}
        aria-hidden="true"
        role="presentation"
      >
        {/*
         * ViewBox: 0 0 100 230
         * ─ Head:    cx=50 cy=32  r=26
         * ─ Neck:    y=56–68
         * ─ Torso:   y=68–130
         * ─ L Arm:   origin (20,75) → hand (8,130)
         * ─ R Arm:   origin (80,75) → hand (92,130)  [pushes right when isPushing]
         * ─ L Leg:   x=32 y=130–195
         * ─ R Leg:   x=55 y=130–195
         * ─ Feet:    ellipses at y=195
         */}
        <svg
          viewBox="0 0 100 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Skin */}
            <radialGradient id="ys-skin" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDDCB5" />
              <stop offset="100%" stopColor="#F0A86E" />
            </radialGradient>
            {/* Body — eCamp teal */}
            <linearGradient id="ys-body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" /> {/* accent-400 */}
              <stop offset="100%" stopColor="#0e7490" /> {/* accent-700 */}
            </linearGradient>
            {/* Pants — dark navy */}
            <linearGradient id="ys-pants" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c2440" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            {/* Ground shadow */}
            <radialGradient id="ys-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            {/* Glow for sparkles */}
            <filter id="ys-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
          </defs>

          {/* ── Ground shadow ── */}
          <ellipse cx="50" cy="224" rx="30" ry="6" fill="url(#ys-shadow)" />

          {/* ═══════════════ LEGS ═══════════════ */}
          {/* Left leg */}
          <rect x="30" y="128" width="17" height="62" rx="8" fill="url(#ys-pants)" />
          {/* Right leg */}
          <rect x="53" y="128" width="17" height="62" rx="8" fill="url(#ys-pants)" />

          {/* Left shoe */}
          <ellipse cx="38.5" cy="192" rx="13" ry="5.5" fill="#0f172a" />
          <ellipse cx="34"   cy="191" rx="6"  ry="3.5" fill="#1c2440" /> {/* toe highlight */}

          {/* Right shoe */}
          <ellipse cx="61.5" cy="192" rx="13" ry="5.5" fill="#0f172a" />
          <ellipse cx="57"   cy="191" rx="6"  ry="3.5" fill="#1c2440" />

          {/* ═══════════════ TORSO ═══════════════ */}
          <rect x="18" y="66" width="64" height="66" rx="14" fill="url(#ys-body)" />

          {/* Shirt collar V */}
          <path d="M 35 66 L 50 84 L 65 66" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />

          {/* eCamp badge on chest */}
          <rect x="36" y="96" width="28" height="16" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <text x="50" y="107" textAnchor="middle" fontSize="7" fontWeight="900"
            fontFamily="Outfit, system-ui, sans-serif" fill="rgba(255,255,255,0.9)" letterSpacing="0.5">
            E.CAMP
          </text>

          {/* Belt line */}
          <rect x="18" y="128" width="64" height="6" rx="3" fill="rgba(0,0,0,0.25)" />
          {/* Belt buckle */}
          <rect x="44" y="128" width="12" height="6" rx="2" fill="#fbbf24" />

          {/* ═══════════════ LEFT ARM ═══════════════ */}
          <g className="ecamp-char-arm-left">
            {/* Upper arm */}
            <path
              d="M 21 78 Q 10 90 10 110 Q 10 122 16 128"
              stroke="url(#ys-body)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Hand (left) */}
            <circle cx="15" cy="131" r="9" fill="url(#ys-skin)" />
            {/* Finger hint */}
            <path d="M 8 128 Q 6 124 10 122" stroke="#E8A566" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 8 131 Q 5 128 8 126" stroke="#E8A566" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* ═══════════════ RIGHT ARM ═══════════════ */}
          {/*
           * In PUSH state: arm extends right (toward form), body leans forward
           * In WAVE state: arm waves up
           * In CELEBRATE state: arm raises up
           * Default: arm hangs naturally
           */}
          <g
            className={
              isPushing   ? 'ecamp-char-arm-push'
              : isWaving  ? 'ecamp-char-arm-wave'
              : isCelebrate ? 'ecamp-char-arm-celebrate'
              : ''
            }
            style={{ transformOrigin: '79px 78px' }}
          >
            {/* Upper arm */}
            <path
              d={
                isPushing
                  ? 'M 79 78 Q 90 82 98 90 Q 104 96 105 106'  // extends right
                  : 'M 79 78 Q 90 90 90 110 Q 90 122 84 128'   // normal hang
              }
              stroke="url(#ys-body)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              style={{ transition: 'd 0.4s ease' }}
            />
            {/* Hand (right) */}
            <circle
              cx={isPushing ? 106 : 85}
              cy={isPushing ? 108 : 131}
              r="9"
              fill="url(#ys-skin)"
              style={{ transition: 'cx 0.4s ease, cy 0.4s ease' }}
            />
            {/* Finger hint */}
            {isPushing ? (
              <>
                <path d="M 112 104 Q 115 100 113 98" stroke="#E8A566" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 113 108 Q 117 106 115 103" stroke="#E8A566" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 111 112 Q 115 112 114 108" stroke="#E8A566" strokeWidth="2" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <path d="M 90 128 Q 94 124 92 122" stroke="#E8A566" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 91 131 Q 95 130 93 127" stroke="#E8A566" strokeWidth="2" strokeLinecap="round" fill="none" />
              </>
            )}
          </g>

          {/* ═══════════════ NECK ═══════════════ */}
          <rect x="43" y="54" width="14" height="16" rx="5" fill="url(#ys-skin)" />

          {/* ═══════════════ HEAD ═══════════════ */}
          <ellipse cx="50" cy="33" rx="26" ry="28" fill="url(#ys-skin)" className="ecamp-char-head" />

          {/* Hair */}
          <path d="M 24 29 Q 23 7 50 4 Q 77 7 76 29 Q 74 17 50 15 Q 26 17 24 29 Z" fill="#1c2440" />
          {/* Hair side part highlight */}
          <path d="M 32 10 Q 40 6 55 8" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Hair style detail */}
          <path d="M 28 18 Q 34 12 44 11" stroke="#273056" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Ear left */}
          <ellipse cx="24" cy="36" rx="5" ry="7" fill="url(#ys-skin)" />
          <ellipse cx="24" cy="36" rx="2.5" ry="4" fill="#E8A566" opacity="0.4" />
          {/* Ear right */}
          <ellipse cx="76" cy="36" rx="5" ry="7" fill="url(#ys-skin)" />
          <ellipse cx="76" cy="36" rx="2.5" ry="4" fill="#E8A566" opacity="0.4" />

          {/* ── Eyebrows ── */}
          <path d={lb} stroke="#1c2440" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d={rb} stroke="#1c2440" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* ── Left Eye ── */}
          <ellipse cx="37" cy="53" rx="5.5" ry={eyeRy} fill="white" />
          <circle  cx={37 + pdx} cy={53 + pdy} r={pupilR} fill="#1c2440" />
          {!squinted && <circle cx={38.5 + pdx} cy={51.5 + pdy} r="1.2" fill="white" />}

          {/* ── Right Eye ── */}
          <ellipse cx="63" cy="53" rx="5.5" ry={eyeRy} fill="white" />
          <circle  cx={63 + pdx} cy={53 + pdy} r={pupilR} fill="#1c2440" />
          {!squinted && <circle cx={64.5 + pdx} cy={51.5 + pdy} r="1.2" fill="white" />}

          {/* ── Nose ── */}
          <ellipse cx="50" cy="62" rx="2.2" ry="1.4" fill="#E8A566" opacity="0.55" />

          {/* ── Mouth ── */}
          <path d={mouth} stroke="#C47B40" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* ── Cheek blush (happy states) ── */}
          {squinted && (
            <>
              <ellipse cx="29" cy="61" rx="5.5" ry="3" fill="#f87171" opacity="0.28" />
              <ellipse cx="71" cy="61" rx="5.5" ry="3" fill="#f87171" opacity="0.28" />
            </>
          )}

          {/* ── Thinking bubble ── */}
          {showThink && (
            <g className="ecamp-char-think-bubble">
              <circle cx="77" cy="22" r="2"   fill="#22d3ee" opacity="0.55" />
              <circle cx="83" cy="14" r="3.5" fill="#22d3ee" opacity="0.65" />
              <circle cx="91" cy="7"  r="6"   fill="#22d3ee" opacity="0.5" />
              <circle cx="88" cy="7"  r="1.3" fill="white" opacity="0.9" />
              <circle cx="91" cy="7"  r="1.3" fill="white" opacity="0.9" />
              <circle cx="94" cy="7"  r="1.3" fill="white" opacity="0.9" />
            </g>
          )}

          {/* ── Confused mark ── */}
          {showConfused && (
            <g className="ecamp-char-confused-mark">
              <circle cx="84" cy="16" r="11" fill="#fbbf24" opacity="0.14" />
              <text x="84" y="21" textAnchor="middle" fontSize="13" fontWeight="900" fill="#f59e0b" fontFamily="system-ui">?</text>
            </g>
          )}

          {/* ── Worried mark ── */}
          {showWorried && (
            <g className="ecamp-char-worried-mark">
              <circle cx="84" cy="16" r="11" fill="#fb7185" opacity="0.14" />
              <text x="84" y="22" textAnchor="middle" fontSize="14" fontWeight="900" fill="#f43f5e" fontFamily="system-ui">!</text>
            </g>
          )}

          {/* ── Sparkles (success / celebrating) ── */}
          {showSparkles && (
            <g className="ecamp-char-sparkles" filter="url(#ys-glow)">
              <text x="4"   y="28" fontSize="10" fill="#fbbf24" className="ecamp-sparkle-1">✦</text>
              <text x="88"  y="20" fontSize="8"  fill="#22d3ee" className="ecamp-sparkle-2">✦</text>
              <text x="93"  y="42" fontSize="6"  fill="#fbbf24" className="ecamp-sparkle-3">✦</text>
              <text x="2"   y="50" fontSize="7"  fill="#22d3ee" className="ecamp-sparkle-4">✦</text>
            </g>
          )}

          {/* ── Push effort lines (when pushing) ── */}
          {isPushing && (
            <g opacity="0.6">
              <path d="M 108 86 L 116 82" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
              <path d="M 110 96 L 119 95" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 109 106 L 117 108" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>

      {/* ── Name badge ── */}
      {showName && (
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(14,116,144,0.1))',
              borderColor: 'rgba(34,211,238,0.35)',
              color: '#22d3ee',
              fontFamily: 'Outfit, system-ui, sans-serif',
              letterSpacing: '0.12em',
            }}
          >
            Yassin
          </span>
          <span className="text-[9px] text-theme-muted font-medium tracking-wider opacity-70">
            eCamp Assistant
          </span>
        </div>
      )}
    </div>
  );
});

EcampCharacter.displayName = 'EcampCharacter';
