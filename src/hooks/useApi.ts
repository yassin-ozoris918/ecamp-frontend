import { useState, useCallback, useEffect, useRef } from 'react';
import { client, normalizeError, ApiError } from '../lib/api';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface UseApiState<T> {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
}

export function useApi<T = unknown>(startLoading: boolean = false) {
  const [state, setState] = useState<UseApiState<T>>({
    loading: startLoading,
    error: null,
    data: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(
    async (method: HttpMethod, url: string, body?: unknown): Promise<T | null> => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await (client[method] as (u: string, b?: unknown) => Promise<T>)(url, body);
        if (mountedRef.current) {
          setState({ loading: false, error: null, data: result });
        }
        return result;
      } catch (err) {
        const normalized = normalizeError(err);
        if (mountedRef.current) {
          setState({ loading: false, error: normalized, data: null });
        }
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
