import { useState, useCallback } from 'react';
import { client, normalizeError, ApiError } from '../lib/api';

interface UseCrudState<T> {
  data: T[];
  loading: boolean;
  error: ApiError | null;
}

export function useCrud<T extends { id: string }>(endpoint: string) {
  const [state, setState] = useState<UseCrudState<T>>({
    data: [],
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await client.get<T[]>(endpoint);
      const safeResult = Array.isArray(result) ? result : [];
      setState({ data: safeResult, loading: false, error: null });
      return safeResult;
    } catch (err) {
      const normalized = normalizeError(err);
      setState({ data: [], loading: false, error: normalized });
      return [];
    }
  }, [endpoint]);

  const create = useCallback(
    async (payload: Partial<T>): Promise<T | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await client.post<T>(endpoint, payload);
        setState((s) => ({ ...s, data: [...s.data, result], loading: false }));
        return result;
      } catch (err) {
        const normalized = normalizeError(err);
        setState((s) => ({ ...s, loading: false, error: normalized }));
        return null;
      }
    },
    [endpoint],
  );

  const update = useCallback(
    async (id: string, payload: Partial<T>): Promise<T | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await client.put<T>(`${endpoint}/${id}`, payload);
        setState((s) => ({
          ...s,
          data: s.data.map((item) => (item.id === id ? result : item)),
          loading: false,
        }));
        return result;
      } catch (err) {
        const normalized = normalizeError(err);
        setState((s) => ({ ...s, loading: false, error: normalized }));
        return null;
      }
    },
    [endpoint],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await client.delete<void>(`${endpoint}/${id}`);
        setState((s) => ({
          ...s,
          data: s.data.filter((item) => item.id !== id),
          loading: false,
        }));
        return true;
      } catch (err) {
        const normalized = normalizeError(err);
        setState((s) => ({ ...s, loading: false, error: normalized }));
        return false;
      }
    },
    [endpoint],
  );

  const refresh = useCallback(() => {
    return load();
  }, [load]);

  return {
    ...state,
    load,
    create,
    update,
    remove,
    refresh,
  };
}
