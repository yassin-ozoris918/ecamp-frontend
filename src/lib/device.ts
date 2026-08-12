// Lightweight browser fingerprint generator.
// Combines stable browser signals into a hash. Not as strong as FingerprintJS,
// but sufficient for the anti-piracy binding demo without adding deps.

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned hex.
  return (hash >>> 0).toString(16);
}

function getStorageId(): string {
  const KEY = 'ecamp_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      crypto.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

let cachedFingerprint: string | null = null;

export function generateDeviceFingerprint(): string {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  const signals: string[] = [];

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { platform?: string };
  };

  signals.push(navigator.userAgent);
  signals.push(navigator.language);
  signals.push(String(navigator.languages?.join(',') ?? ''));
  signals.push(String(navigator.hardwareConcurrency ?? 0));
  signals.push(String(nav.deviceMemory ?? 0));
  signals.push(String(nav.userAgentData?.platform ?? ''));
  
  // Make dimensions orientation-agnostic
  const screenW = Math.max(screen.width, screen.height);
  const screenH = Math.min(screen.width, screen.height);
  signals.push(`${screenW}x${screenH}`);
  
  signals.push(String(screen.colorDepth));
  
  // We omit availWidth and availHeight as they are highly volatile 
  // (e.g. mobile address bar hiding, taskbar resizing)
  
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  signals.push(getStorageId());

  cachedFingerprint = djb2(signals.join('||'));
  return cachedFingerprint;
}
