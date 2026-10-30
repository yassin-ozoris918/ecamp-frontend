const RETRY_KEY = 'retry_lazy_import';

/**
 * Detects module/chunk load failures across all browsers:
 * - Chrome / Chromium: "Failed to fetch dynamically imported module"
 * - iOS Safari / WebKit / Google App on iOS (when SPA fallback returns index.html):
 *   "'text/html' is not a valid JavaScript MIME type."
 * - iOS Safari / WebKit (when 404 or network failure):
 *   "Importing a module script failed."
 * - Firefox: "error loading dynamically imported module"
 * - Vite CSS/asset preload failures: "Unable to preload CSS"
 */
export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('is not a valid javascript mime type') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('unable to preload css') ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading chunk')
  );
}

/**
 * Performs a cache-busting reload that bypasses iOS WKWebView / Safari / CDN caches
 * for index.html while preserving the current hash route.
 */
export function forceCacheBustingReload(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now().toString());
  window.location.replace(url.toString());
}

/**
 * Attempts a single automatic cache-busting reload when a stale chunk is encountered
 * after a new deployment. Returns true if a reload was initiated.
 */
export function tryAutoReloadOnChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;

  const lastRetry = sessionStorage.getItem(RETRY_KEY);
  const now = Date.now();

  // Allow retry if we haven't retried in the last 15 seconds
  if (!lastRetry || now - Number(lastRetry) > 15000) {
    sessionStorage.setItem(RETRY_KEY, String(now));
    forceCacheBustingReload();
    return true;
  }

  return false;
}

/**
 * Clears the retry lock and removes temporary cache-busting query params once loaded.
 */
export function clearChunkReloadState(): void {
  sessionStorage.removeItem(RETRY_KEY);
  if (typeof window !== 'undefined' && window.location.search.includes('_v=')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('_v');
    const cleanUrl = url.pathname + url.search + url.hash;
    window.history.replaceState(null, '', cleanUrl);
  }
}

