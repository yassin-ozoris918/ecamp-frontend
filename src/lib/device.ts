// Hardware-based browser fingerprint generator.
// Collects stable device-level signals (OS, CPU, GPU, screen, timezone) that are
// identical across all browsers (Chrome, Edge, Firefox, Brave) on the same physical
// machine — so a student can log in from any browser without being locked out.
//
// The random localStorage seed is intentionally EXCLUDED from the hash so that
// different browsers on the same device produce the exact same Device ID.
// The GPU renderer string (WebGL) is included as an extra discriminator to
// distinguish devices that share the same OS, CPU count, and screen resolution.

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned 32-bit hex.
  return (hash >>> 0).toString(16);
}

/**
 * Returns a normalized OS family string that is browser-agnostic.
 * e.g. "Windows", "Android", "iOS", "macOS", "Linux"
 */
function getOSType(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua       = navigator.userAgent || '';
  const platform = navigator.platform  || '';

  // iPads running iOS 13+ report platform as "MacIntel" with touch support
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iOS';
  }
  if (/Android/i.test(ua))                                     return 'Android';
  if (/Windows/i.test(ua)  || /Win/i.test(platform))          return 'Windows';
  if (/Macintosh|MacIntel|MacPPC/i.test(ua) || /Mac/i.test(platform)) return 'macOS';
  if (/Linux/i.test(ua)    || /Linux/i.test(platform))        return 'Linux';
  return 'Unknown';
}

/**
 * Returns a normalized platform string using either the modern
 * userAgentData API (Chrome/Edge) or the legacy navigator.platform.
 * Both produce the same family name on the same machine regardless of browser.
 */
function getPlatformInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const uaData   = (navigator as any).userAgentData;
  const platform = uaData?.platform || navigator.platform || '';

  if (/Win/i.test(platform))              return 'Windows';
  if (/Mac/i.test(platform))              return 'macOS';
  if (/Android/i.test(platform))          return 'Android';
  if (/Linux/i.test(platform))            return 'Linux';
  if (/iPhone|iPad|iPod/i.test(platform)) return 'iOS';
  return platform || 'Unknown';
}

/**
 * Reads the unmasked GPU renderer string via WebGL.
 * This string identifies the physical graphics chip (e.g. "Intel Iris Xe Graphics",
 * "NVIDIA GeForce RTX 3050", "Apple M2", "Adreno 640") and is identical across
 * Chrome, Edge, and Firefox on the same machine.
 * Returns an empty string if WebGL is unavailable or blocked by the browser.
 */
function getGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string || '';
  } catch {
    return '';
  }
}

/**
 * Generates a stable, hardware-level device fingerprint that is:
 *  - Identical across Chrome, Edge, Firefox, and Brave on the same physical device.
 *  - Different from fingerprints generated on other devices (different GPU, screen, CPU).
 *  - Cached in localStorage per browser so it is only computed once.
 *  - Preserved for existing students via the 'ecamp_device_identity' key migration guard.
 */
export function generateDeviceFingerprint(): string {
  const IDENTITY_KEY = 'ecamp_device_identity';

  // Return the cached identity immediately — preserves existing students' bound Device IDs
  // and avoids recomputing on every call in the same browser session.
  const cached = localStorage.getItem(IDENTITY_KEY);
  if (cached) return cached;

  const signals: string[] = [];

  // 1. OS Type (Windows / Android / iOS / macOS / Linux)
  signals.push(getOSType());

  // 2. Logical CPU core count — hardware property, identical across all browsers
  signals.push(String(navigator.hardwareConcurrency ?? 0));

  // 3. Approximate device RAM in GB — Chromium standard; Safari/Firefox return undefined → "0"
  const nav = navigator as Navigator & { deviceMemory?: number };
  signals.push(String(nav.deviceMemory ?? 0));

  // 4. Normalized platform family (Win32 → "Windows", MacIntel → "macOS", etc.)
  signals.push(getPlatformInfo());

  // 5. Orientation-agnostic screen resolution — always max×min so portrait/landscape match
  const screenW = Math.max(screen.width, screen.height);
  const screenH = Math.min(screen.width, screen.height);
  signals.push(`${screenW}x${screenH}`);

  // 6. Screen color depth — display hardware property (almost always 24)
  signals.push(String(screen.colorDepth ?? 24));

  // 7. IANA time zone — system-level setting, browser-agnostic (e.g. "Africa/Cairo")
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // 8. GPU renderer — physical chip string, identical across browsers on same machine.
  //    Strongest signal for disambiguating identical-spec devices (same OS/CPU/screen).
  const gpu = getGpuRenderer();
  if (gpu) signals.push(gpu);

  const identity = djb2(signals.join('||'));

  // Persist so all subsequent calls — even in other browser tabs — return the same value.
  localStorage.setItem(IDENTITY_KEY, identity);
  return identity;
}

/**
 * Detects whether the user is inside a sandboxed in-app browser (Facebook, Instagram,
 * WhatsApp, Telegram, etc.). These webviews wipe localStorage between sessions, which
 * would cause device binding failures. Users should be redirected to a real browser.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (!ua) return false;

  const rules = [
    'FBAN', 'FBAV',      // Facebook
    'Instagram',          // Instagram
    'WhatsApp',           // WhatsApp
    'Telegram',           // Telegram
    'Line',               // Line
    'MicroMessenger',     // WeChat
    'Snapchat',           // Snapchat
    'Viber',              // Viber
  ];

  const regex = new RegExp(`(${rules.join('|')})`, 'i');
  return Boolean(ua.match(regex));
}
