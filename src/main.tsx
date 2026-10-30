import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import {
  forceCacheBustingReload,
  isChunkLoadError,
  tryAutoReloadOnChunkError,
} from './lib/chunkReload';

// Catch Vite module/CSS preload failures (e.g. stale chunks after deployment)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    tryAutoReloadOnChunkError(
      (event as any)?.payload || new Error('Failed to fetch dynamically imported module')
    );
  });
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function GlobalErrorFallback({ error }: { error: unknown }) {
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    tryAutoReloadOnChunkError(error);
  }, [error]);

  const errorMessage = String((error as any)?.message || error || 'Unknown error');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white text-center">
      <div className="max-w-md w-full space-y-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">
          {isChunkError
            ? 'A new version of E.Camp is available'
            : 'An unexpected error occurred'}
        </h2>
        <p className="text-sm text-neutral-400 break-words">
          {isChunkError
            ? 'Please reload the page to load the latest update.'
            : errorMessage}
        </p>
        <button
          type="button"
          onClick={() => forceCacheBustingReload()}
          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error }) => <GlobalErrorFallback error={error} />}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
