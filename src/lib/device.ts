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

export function generateDeviceFingerprint(): string {
  const IDENTITY_KEY = 'ecamp_device_identity';
  let identity = localStorage.getItem(IDENTITY_KEY);
  
  if (identity) {
    return identity;
  }

  // Determine if this is an existing device transitioning to the new stable identity
  const OLD_KEY = 'ecamp_device_id';
  const hasOldStorage = localStorage.getItem(OLD_KEY) !== null;
  const storageId = getStorageId(); // Creates OLD_KEY if it didn't exist

  if (hasOldStorage) {
    // Migration path: compute the legacy volatile djb2 hash one last time
    // to match the exact string stored in the database for existing devices.
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
    
    const screenW = Math.max(screen.width, screen.height);
    const screenH = Math.min(screen.width, screen.height);
    signals.push(`${screenW}x${screenH}`);
    
    signals.push(String(screen.colorDepth));
    signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    signals.push(storageId);

    identity = djb2(signals.join('||'));
  } else {
    // New devices strictly use the stable, non-volatile persistent UUID.
    identity = storageId;
  }

  // Persist the generated identity permanently so it never changes due to browser updates or resizing.
  localStorage.setItem(IDENTITY_KEY, identity);
  return identity;
}
