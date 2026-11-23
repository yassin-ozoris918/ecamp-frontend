import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface TreeCourse {
  id: string;
  title: string;
  type: 'NORMAL' | 'MATERIALS_ONLY';
  status: string;
  chapters: { id: string; title: string }[];
  lectures: { id: string; title: string; chapterId: string | null; requiresOwnCode: boolean }[];
}

/** All courses with their chapters and lectures, for the "move / copy to…" pickers (admin only). */
export function useContentTree(enabled: boolean) {
  return useQuery({
    queryKey: ['content', 'tree'],
    enabled,
    staleTime: 0,
    queryFn: async () => (await api.get<TreeCourse[]>('/content/tree')).data,
  });
}

export type MaterialKind = 'lecture' | 'chapter' | 'course';

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}
