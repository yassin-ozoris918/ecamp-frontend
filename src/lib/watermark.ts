/**
 * Video watermark that stays out of the way but can't be quietly removed.
 *
 *  - A small, soft viewer code (8 characters) that fades to a new spot every ~35 s, away from the centre.
 *  - A very faint repeated pattern (code + date/time) across the whole video. It is close to invisible while
 *    watching but shows up when a screenshot or recording is brightened, so a cropped clip is still traceable.
 *  - Both live in a closed shadow root with !important styles, so page CSS, extensions and DevTools selectors
 *    can't reach them by accident. A check every second (plus a DOM observer) notices removal, hiding, shrinking,
 *    covering-style tricks or edits to the text/styles, rebuilds the layer and tells the player.
 */

export type TamperKind = 'removed' | 'hidden' | 'altered';

/** The code shown on the video: first 8 characters of the account id. Admins look it up under Devices. */
export function viewerCode(userId: string): string {
  return userId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

const HOST_STYLE = [
  'position:absolute',
  'inset:0',
  'width:100%',
  'height:100%',
  'display:block',
  'visibility:visible',
  'opacity:1',
  'pointer-events:none',
  'user-select:none',
  'z-index:2147483000',
  'overflow:hidden',
  'transform:none',
  'filter:none',
  'clip-path:none',
  'mix-blend-mode:normal',
  'margin:0',
  'padding:0',
  'border:0',
  'background:none',
]
  .map((d) => `${d} !important`)
  .join(';');

const MARK_OPACITY = 0.5;
const FAINT_OPACITY = 0.045;

const SHADOW_CSS = `
.f, .m { position: absolute; pointer-events: none; user-select: none; margin: 0; transform: none; filter: none; clip-path: none; }
.f { inset: 0; opacity: ${FAINT_OPACITY}; background-repeat: repeat; background-position: 0 0; }
.m {
  font: 600 clamp(11px, 1.15vw, 15px)/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: .08em; color: #fff; white-space: nowrap; opacity: ${MARK_OPACITY};
  text-shadow: 0 0 2px rgba(0,0,0,.85), 0 1px 3px rgba(0,0,0,.6);
  transition: opacity .9s ease;
}
.m.out { opacity: 0; }
`;

function faintTile(text: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="190">` +
    `<text x="170" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" ` +
    `fill="#808080" transform="rotate(-22 170 95)">${text.replace(/[<>&"]/g, '')}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

/** A random spot that keeps clear of the middle of the picture, where the content usually is. */
function randomSpot(): { top: number; left: number } {
  for (let i = 0; i < 20; i++) {
    const top = 4 + Math.random() * 86;
    const left = 3 + Math.random() * 70;
    const central = top > 28 && top < 68 && left > 22 && left < 66;
    if (!central) return { top, left };
  }
  return { top: 6, left: 4 };
}

export interface WatermarkOptions {
  code: string;
  /** Extra text for the faint pattern only, e.g. the date and time playback started. */
  stamp: string;
  onTamper: (kind: TamperKind) => void;
}

export function mountWatermark(container: HTMLElement, opts: WatermarkOptions): () => void {
  let host: HTMLDivElement;
  let mark: HTMLDivElement;
  let faint: HTMLDivElement;
  let style: HTMLStyleElement;
  let fading = false;
  let destroyed = false;
  let rebuilding = false;
  let hostObserver: MutationObserver | undefined;
  const faintText = `${opts.code} · ${opts.stamp}`;
  const faintBg = faintTile(faintText);

  const build = () => {
    host = document.createElement('div');
    host.setAttribute('style', HOST_STYLE);
    host.setAttribute('aria-hidden', 'true');
    const root = host.attachShadow({ mode: 'closed' });
    style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    faint = document.createElement('div');
    faint.className = 'f';
    faint.style.setProperty('background-image', faintBg, 'important');
    mark = document.createElement('div');
    mark.className = 'm';
    mark.textContent = opts.code;
    place();
    root.append(style, faint, mark);
    container.appendChild(host);
    hostObserver?.disconnect();
    hostObserver = new MutationObserver(() => check());
    hostObserver.observe(host, { attributes: true });
  };

  const place = () => {
    const { top, left } = randomSpot();
    mark.style.setProperty('top', `${top.toFixed(1)}%`, 'important');
    mark.style.setProperty('left', `${left.toFixed(1)}%`, 'important');
  };

  // Never let repeated rebuilds turn into a tight loop (e.g. a hostile extension fighting the layer):
  // more than 3 in 3 seconds → just report and pause checking for a few seconds.
  const recent: number[] = [];
  let cooldownUntil = 0;

  const tampered = (kind: TamperKind) => {
    if (destroyed || rebuilding) return;
    const now = Date.now();
    while (recent.length && recent[0] < now - 3000) recent.shift();
    recent.push(now);
    if (recent.length > 3) {
      cooldownUntil = now + 3000;
      opts.onTamper(kind);
      return;
    }
    rebuilding = true;
    try {
      host?.remove();
    } catch {
      /* already gone */
    }
    build();
    rebuilding = false;
    opts.onTamper(kind);
  };

  const check = () => {
    if (destroyed || rebuilding || Date.now() < cooldownUntil) return;
    if (!host.isConnected || host.parentNode !== container) return tampered('removed');
    if (host.getAttribute('style') !== HOST_STYLE || host.attributes.length !== 2) return tampered('altered');
    if (style.textContent !== SHADOW_CSS || mark.textContent !== opts.code || !faint.isConnected || !mark.isConnected || !style.isConnected) return tampered('altered');

    const hs = getComputedStyle(host);
    if (hs.display === 'none' || hs.visibility !== 'visible' || Number(hs.opacity) < 0.99) return tampered('hidden');
    if (hs.transform !== 'none' || hs.filter !== 'none' || hs.clipPath !== 'none' || hs.mixBlendMode !== 'normal') return tampered('hidden');
    const cr = container.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    if (cr.width > 0 && (Math.abs(hr.width - cr.width) > 2 || Math.abs(hr.height - cr.height) > 2 || Math.abs(hr.left - cr.left) > 2 || Math.abs(hr.top - cr.top) > 2)) {
      return tampered('hidden');
    }

    const ms = getComputedStyle(mark);
    const fs = getComputedStyle(faint);
    if (ms.display === 'none' || ms.visibility !== 'visible' || fs.display === 'none' || fs.visibility !== 'visible') return tampered('hidden');
    if (parseFloat(ms.fontSize) < 10 || ms.color.replace(/\s/g, '') !== 'rgb(255,255,255)') return tampered('hidden');
    if (!fading && Math.abs(Number(ms.opacity) - MARK_OPACITY) > 0.02) return tampered('hidden');
    if (Math.abs(Number(fs.opacity) - FAINT_OPACITY) > 0.008 || fs.backgroundImage === 'none') return tampered('hidden');
    if (cr.width > 0) {
      const mr = mark.getBoundingClientRect();
      const inside = mr.width >= 30 && mr.height >= 8 && mr.left >= hr.left - 1 && mr.top >= hr.top - 1 && mr.right <= hr.right + 60 && mr.bottom <= hr.bottom + 1;
      if (!inside) return tampered('hidden');
    }
  };

  build();

  // Instant reaction to removal or edits; the timer catches everything a stylesheet can do.
  const observer = new MutationObserver(() => check());
  observer.observe(container, { childList: true, attributes: true, subtree: false });
  const timer = window.setInterval(check, 1000);

  // Soft relocation: fade out, move, fade back in.
  let moveTimer = 0;
  const scheduleMove = () => {
    moveTimer = window.setTimeout(() => {
      if (destroyed) return;
      fading = true;
      mark.classList.add('out');
      window.setTimeout(() => {
        if (destroyed) return;
        place();
        mark.classList.remove('out');
        window.setTimeout(() => {
          fading = false;
        }, 1100);
        scheduleMove();
      }, 1000);
    }, 28000 + Math.random() * 14000);
  };
  scheduleMove();

  return () => {
    destroyed = true;
    observer.disconnect();
    hostObserver?.disconnect();
    window.clearInterval(timer);
    window.clearTimeout(moveTimer);
    host?.remove();
  };
}
