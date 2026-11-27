// Hardware-based browser fingerprint generator.
// Collects stable device-level signals (OS, CPU, GPU, screen, timezone) that are
// identical across all browsers (Chrome, Edge, Firefox, Brave, Safari) on the same
// physical machine — so a student can log in from any browser without being locked out.
//
// Design decisions (each item below prevents a cross-browser mismatch):
//  1. navigator.deviceMemory is EXCLUDED — Firefox & Safari intentionally return undefined
//     (privacy protection), Chrome returns the real value. This creates a hash mismatch
//     between browsers on the same machine.
//  2. navigator.userAgent / language / languages are EXCLUDED — they change per browser.
//  3. The GPU string is NORMALIZED to strip Chrome's ANGLE wrapper and Direct3D suffixes
//     so Chrome and Firefox agree on the bare chip name (e.g. "Intel Iris Xe Graphics").
//  4. The random localStorage UUID is EXCLUDED from the hash — it is per-browser and
//     cannot be shared across browser sandboxes.

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// ─── Signal helpers ────────────────────────────────────────────────────────────

/**
 * Returns a normalized OS family string that is browser-agnostic.
 * Derived from userAgent + platform patterns, not from the browser brand itself.
 * Result: "Windows" | "Android" | "iOS" | "macOS" | "Linux" | "Unknown"
 */
function getOSType(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua       = navigator.userAgent || '';
  const platform = navigator.platform  || '';

  // iPads on iOS 13+ lie and report "MacIntel" — distinguish via touch capability
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iOS';
  }
  if (/Android/i.test(ua))                                              return 'Android';
  if (/Windows/i.test(ua)  || /Win/i.test(platform))                   return 'Windows';
  if (/Macintosh|MacIntel|MacPPC/i.test(ua) || /Mac/i.test(platform))  return 'macOS';
  if (/Linux/i.test(ua)    || /Linux/i.test(platform))                  return 'Linux';
  return 'Unknown';
}

/**
 * Returns a normalized OS platform family, preferring the modern userAgentData
 * API (Chromium) and falling back to the legacy navigator.platform.
 * Both sources are normalized to the same family names on the same hardware.
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
 * Returns the raw UNMASKED_RENDERER_WEBGL string, or '' if unavailable.
 * The raw string is passed to normalizeGpuRenderer() before use.
 */
function getRawGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    return (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) || '';
  } catch {
    return '';
  }
}

/**
 * Normalizes a raw WebGL renderer string to the bare hardware chip name so that
 * Chrome, Edge, and Firefox produce the SAME string for the same physical GPU.
 *
 * Problem: Chrome/Edge wrap the chip name in an ANGLE descriptor:
 *   "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)"
 * Firefox reports just the chip name:
 *   "Intel(R) Iris(R) Xe Graphics"
 *
 * This function extracts the chip name from both formats and then strips
 * trademark noise so both end up as: "Intel Iris Xe Graphics"
 */
function normalizeGpuRenderer(raw: string): string {
  if (!raw) return '';

  let chip = raw.trim();

  // 1. Strip Chrome/Edge ANGLE wrapper:
  //    "ANGLE (Vendor, Chip (0xHEX) Direct3D11 ..., D3D11)"
  //    → extract the text after the first comma, up to any "(0x...)" or "Direct3D"
  const angleMatch = chip.match(/^ANGLE\s*\([^,]+,\s*(.+?)(?:\s*\(0x[0-9a-fA-F]+\))?(?:\s+Direct3D\S+.*)?(?:,\s*D3D\S*)?\)\s*$/i);
  if (angleMatch) {
    chip = angleMatch[1].trim();
  }

  // 2. Strip any remaining hex hardware IDs like "(0x9A49)"
  chip = chip.replace(/\s*\(0x[0-9a-fA-F]+\)/gi, '');

  // 3. Strip "(R)", "(TM)", "®", "™" trademark markers
  chip = chip.replace(/\s*\(R\)/gi, '').replace(/\s*\(TM\)/gi, '').replace(/[®™]/g, '');

  // 4. Strip trailing Direct3D / OpenGL driver descriptors that may survive
  chip = chip.replace(/\s+Direct3D\S+.*/i, '').replace(/\s+OpenGL\S+.*/i, '');

  // 5. Collapse multiple spaces
  chip = chip.trim().replace(/\s+/g, ' ');

  return chip;
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates a stable hardware-level Device ID that:
 *  ✓ Is IDENTICAL across Chrome, Edge, Firefox, and Brave on the same device.
 *  ✓ Is DIFFERENT on other physical devices (different GPU, screen, or CPU).
 *  ✓ Is CACHED in localStorage so it is only computed once per browser.
 *  ✓ Does NOT change when the user updates their browser or resizes the window.
 *
 * Signals used (all cross-browser safe):
 *   OS type · CPU cores · Platform family · Screen resolution · Color depth · Timezone · GPU chip
 *
 * Signals intentionally excluded:
 *   userAgent, language, languages → per-browser strings
 *   deviceMemory                  → blocked by Firefox & Safari (privacy)
 *   localStorage UUID seed        → per-browser, cannot cross sandbox boundaries
 */
export function generateDeviceFingerprint(): string {
  const IDENTITY_KEY = 'ecamp_device_identity';

  // Return cached identity immediately.
  // This also preserves existing students' Device IDs stored in the database.
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(IDENTITY_KEY);
  } catch {
    /* storage blocked */
  }
  if (cached) return cached;

  const identity = computeLegacyFingerprint();
  try {
    localStorage.setItem(IDENTITY_KEY, identity);
  } catch {
    /* storage blocked */
  }
  return identity;
}

/** The old single-hash device id, computed fresh (used only to upgrade students bound before the new system). */
export function computeLegacyFingerprint(): string {
  const signals: string[] = [];

  // 1. OS family — parsed from UA pattern, browser-agnostic result
  signals.push(getOSType());

  // 2. Logical CPU thread count — hardware property, same in every browser
  signals.push(String(navigator.hardwareConcurrency ?? 0));

  // NOTE: navigator.deviceMemory is intentionally omitted.
  // Firefox and Safari block it (returns undefined → "0"), while Chrome returns
  // the real value (e.g. "8"). Including it would always mismatch between browsers.

  // 3. Platform family — normalized from Win32/MacIntel/etc. to OS family name
  signals.push(getPlatformInfo());

  // 4. Orientation-agnostic screen resolution — max×min so portrait/landscape agree
  const screenW = Math.max(screen.width, screen.height);
  const screenH = Math.min(screen.width, screen.height);
  signals.push(`${screenW}x${screenH}`);

  // 5. Screen color depth — display hardware property, same across browsers
  signals.push(String(screen.colorDepth ?? 24));

  // 6. IANA timezone — OS-level setting, browser-agnostic (e.g. "Africa/Cairo")
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // 7. Normalized GPU chip name — extracts bare chip from Chrome's ANGLE wrapper
  //    so Chrome and Firefox produce the same string (e.g. "Intel Iris Xe Graphics")
  const gpu = normalizeGpuRenderer(getRawGpuRenderer());
  if (gpu) signals.push(gpu);

  return djb2(signals.join('||'));
}

// ─── In-app browser detection ─────────────────────────────────────────────────

/**
 * Returns true if the user is inside a sandboxed in-app browser
 * (Facebook, Instagram, WhatsApp, Telegram, etc.).
 *
 * These webviews wipe localStorage between sessions, so the device fingerprint
 * cannot be persisted. Students must be redirected to a real browser before login.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  if (!ua) return false;

  const rules = [
    'FBAN', 'FBAV',   // Facebook
    'Instagram',       // Instagram
    'WhatsApp',        // WhatsApp
    'Telegram',        // Telegram
    'Line',            // Line
    'MicroMessenger',  // WeChat
    'Snapchat',        // Snapchat
    'Viber',           // Viber
  ];

  const regex = new RegExp(`(${rules.join('|')})`, 'i');
  return Boolean(ua.match(regex));
}

export interface ClientDeviceDetails {
  deviceType: string;
  nameAr: string;
  nameEn: string;
  os: string;
  browser: string;
  category: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

/**
 * Returns structured device details for the current client environment
 * (OS, category, human-readable name in AR/EN, and browser).
 */
export function getClientDeviceDetails(): ClientDeviceDetails {
  if (typeof navigator === 'undefined') {
    return {
      deviceType: 'Unknown Device',
      nameAr: 'جهاز غير محدد',
      nameEn: 'Unknown Device',
      os: 'Unknown',
      browser: 'Unknown',
      category: 'unknown',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const osType = getOSType();

  let category: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  let deviceType = 'PC / Laptop';
  let nameAr = 'كمبيوتر / لابتوب';
  let nameEn = 'PC / Laptop';
  let browser = 'Web Browser';

  if (osType === 'iOS') {
    if (/iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      category = 'tablet';
      deviceType = 'iPad';
      nameAr = 'جهاز لوحي آيباد (iPad)';
      nameEn = 'iPad Tablet';
    } else {
      category = 'mobile';
      deviceType = 'iPhone';
      nameAr = 'هاتف آيفون (iPhone)';
      nameEn = 'iPhone';
    }
  } else if (osType === 'Android') {
    if (/Mobile/i.test(ua)) {
      category = 'mobile';
      deviceType = 'Android Phone';
      nameAr = 'هاتف أندرويد (Android)';
      nameEn = 'Android Phone';
    } else {
      category = 'tablet';
      deviceType = 'Android Tablet';
      nameAr = 'تابلت أندرويد (Android Tablet)';
      nameEn = 'Android Tablet';
    }
  } else if (osType === 'Windows') {
    category = 'desktop';
    deviceType = 'Windows PC';
    nameAr = 'كمبيوتر / لابتوب (Windows)';
    nameEn = 'Windows PC / Laptop';
  } else if (osType === 'macOS') {
    category = 'desktop';
    deviceType = 'Mac';
    nameAr = 'كمبيوتر ماك (MacBook / Mac)';
    nameEn = 'Mac / MacBook';
  } else if (osType === 'Linux') {
    category = 'desktop';
    deviceType = 'Linux PC';
    nameAr = 'كمبيوتر (Linux)';
    nameEn = 'Linux PC';
  }

  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/OPR\/|Opera\//i.test(ua)) {
    browser = 'Opera';
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Brave/i.test(ua)) {
    browser = 'Brave';
  } else if (/Chrome\/|CriOS\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Apple Safari';
  }

  return {
    deviceType,
    nameAr,
    nameEn,
    os: osType,
    browser,
    category,
  };
}



// ─── Trusted device (current system) ──────────────────────────────────────────
//
// 1. Hardware details are sent as separate fields, so the server can recognise the same machine in
//    another browser even when some details differ (external monitor, other graphics chip, Brave…).
// 2. Each browser creates a private key that can't be exported (WebCrypto) and keeps it in IndexedDB.
//    It signs a fresh challenge on sign-in and on login renewal, so copying a value to another device
//    doesn't work.

export interface DeviceSignals {
  v: 1;
  os: string;
  platform: string;
  mobile: boolean;
  cores: number;
  memory: number | null;
  screen: string;
  colorDepth: number;
  touch: number;
  tz: string;
  gpu: string;
  gpuVendor: string;
  model: string | null;
}

export interface DevicePayload {
  signals: DeviceSignals;
  key: { jwk: JsonWebKey; proof: DeviceProof } | null;
  keyError?: string;
  legacyId: string | null;
  legacyFresh: string | null;
}

export interface DeviceProof {
  ts: number;
  nonce: string;
  sig: string;
}

function gpuVendorOf(gpu: string): string {
  const g = gpu.toLowerCase();
  if (/nvidia|geforce|quadro|rtx|gtx/.test(g)) return 'nvidia';
  if (/amd|radeon|ati /.test(g)) return 'amd';
  if (/intel|iris|uhd|hd graphics/.test(g)) return 'intel';
  if (/apple|m1|m2|m3|m4/.test(g)) return 'apple';
  if (/adreno|qualcomm/.test(g)) return 'qualcomm';
  if (/mali|arm/.test(g)) return 'arm';
  if (/powervr|img/.test(g)) return 'imagination';
  return g ? 'other' : '';
}

/** Hardware details of this machine, as separate fields. */
export async function collectDeviceSignals(): Promise<DeviceSignals> {
  const uaData = (navigator as any).userAgentData;
  let model: string | null = null;
  try {
    if (uaData?.getHighEntropyValues) {
      const hv = await uaData.getHighEntropyValues(['model']);
      model = (hv?.model || '').trim() || null;
    }
  } catch {
    /* not available */
  }
  const gpu = normalizeGpuRenderer(getRawGpuRenderer());
  const screenW = Math.max(screen.width, screen.height);
  const screenH = Math.min(screen.width, screen.height);
  const os = getOSType();
  return {
    v: 1,
    os,
    platform: getPlatformInfo(),
    mobile: Boolean(uaData?.mobile) || /Mobi|iPhone|Android.+Mobile/i.test(navigator.userAgent),
    cores: navigator.hardwareConcurrency ?? 0,
    memory: typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : null,
    screen: `${screenW}x${screenH}`,
    colorDepth: screen.colorDepth ?? 24,
    touch: navigator.maxTouchPoints ?? 0,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    gpu,
    gpuVendor: gpuVendorOf(gpu),
    model,
  };
}

// ── Browser key, kept in IndexedDB (CryptoKey objects can be stored but the private key can't be read) ──

const DB_NAME = 'ecamp-device';
const STORE = 'keys';
const KEY_ID = 'browser-key-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idb<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

interface StoredKey {
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}

let keyPromise: Promise<StoredKey> | null = null;

/** This browser's key pair, created once. The private key is non-exportable. */
export function getBrowserKey(): Promise<StoredKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      if (!window.crypto?.subtle || typeof indexedDB === 'undefined') throw new Error('unsupported');
      const existing = await idb<StoredKey | undefined>('readonly', (st) => st.get(KEY_ID)).catch(() => undefined);
      if (existing?.privateKey && existing.publicJwk) return existing;
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
      const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
      const stored: StoredKey = { privateKey: pair.privateKey, publicJwk: { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y } };
      await idb('readwrite', (st) => st.put(stored, KEY_ID));
      return stored;
    })().catch((e) => {
      keyPromise = null;
      throw e;
    });
  }
  return keyPromise;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Signs "purpose|ts|nonce" with this browser's private key. */
export async function signDeviceProof(purpose: 'login' | 'register' | 'refresh'): Promise<{ jwk: JsonWebKey; proof: DeviceProof }> {
  const key = await getBrowserKey();
  const ts = Date.now();
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const data = new TextEncoder().encode(`${purpose}|${ts}|${nonce}`);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key.privateKey, data);
  return { jwk: key.publicJwk, proof: { ts, nonce, sig: b64url(sig) } };
}

/** Everything the server needs to recognise this device, for sign-in, registration and login renewal. */
export async function buildDevicePayload(purpose: 'login' | 'register' | 'refresh'): Promise<DevicePayload> {
  const signals = await collectDeviceSignals();
  let key: DevicePayload['key'] = null;
  let keyError: string | undefined;
  try {
    key = await signDeviceProof(purpose);
  } catch (e: any) {
    keyError = String(e?.message || e).slice(0, 100);
  }
  let legacyId: string | null = null;
  try {
    legacyId = localStorage.getItem('ecamp_device_identity');
  } catch {
    /* storage blocked */
  }
  let legacyFresh: string | null = null;
  try {
    legacyFresh = computeLegacyFingerprint();
  } catch {
    /* ignore */
  }
  return { signals, key, keyError, legacyId, legacyFresh };
}
