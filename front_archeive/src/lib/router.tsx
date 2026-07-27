import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface RouterContextValue {
  path: string;
  navigate: (to: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.hash.slice(1) || '/');

  useEffect(() => {
    const onHashChange = () => setPath(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('#') ? to.slice(1) : to;
    if (window.location.hash.slice(1) === target) return;
    window.location.hash = target;
    setPath(target);
    window.scrollTo(0, 0);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({ path, navigate, params: {} }),
    [path, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

// Pattern matching: /course/:id -> /course/abc matches with params.id = abc
function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    const v = pathParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(v);
    } else if (p !== v) {
      return null;
    }
  }
  return params;
}

export interface Route {
  pattern: string;
  element: (params: Record<string, string>) => ReactNode;
}

export function Routes({ routes }: { routes: Route[] }) {
  const { path } = useRouter();
  for (const r of routes) {
    if (r.pattern === '/' || r.pattern === '*') {
      if (path === '/' || r.pattern === '*') {
        return <>{r.element({})}</>;
      }
    }
    const params = matchPattern(r.pattern, path);
    if (params) {
      return <>{r.element(params)}</>;
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-neutral-100">Page not found</p>
        <p className="mt-2 text-neutral-400">The page {path} doesn't exist.</p>
      </div>
    </div>
  );
}

export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
