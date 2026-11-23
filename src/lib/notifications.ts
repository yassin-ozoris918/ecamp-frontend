import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from './api';

export type StudentNotificationType = 'LECTURE_ADDED' | 'SESSION_ADDED' | 'MATERIAL_ADDED';

export interface StudentNotification {
  id: string;
  type: StudentNotificationType;
  courseId: string;
  lectureId: string;
  link: string;
  params: { courseTitle?: string; lectureTitle?: string; itemTitle?: string; count?: number };
  readAt: string | null;
  createdAt: string;
}

interface NotificationPage {
  items: StudentNotification[];
  nextCursor: string | null;
  unreadCount: number;
}

/** How often the bell badge refreshes while the tab is visible (paused automatically in background tabs). */
export const NOTIFICATION_POLL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

export const notificationKeys = {
  count: ['notifications', 'unread-count'] as const,
  list: ['notifications', 'list'] as const,
};

export function useUnreadNotificationCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.count,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count', { timeout: REQUEST_TIMEOUT_MS });
      return typeof data?.count === 'number' ? data.count : 0;
    },
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    staleTime: 15_000,
  });
}

export function useNotificationList(enabled: boolean) {
  const qc = useQueryClient();
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<NotificationPage>('/notifications', {
        params: { limit: 15, ...(pageParam ? { cursor: pageParam } : {}) },
        timeout: REQUEST_TIMEOUT_MS,
      });
      // Every page carries the authoritative unread count — keep the badge in sync with what is shown.
      if (typeof data?.unreadCount === 'number') qc.setQueryData(notificationKeys.count, data.unreadCount);
      return { items: Array.isArray(data?.items) ? data.items : [], nextCursor: data?.nextCursor ?? null, unreadCount: data?.unreadCount ?? 0 };
    },
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
    retry: 1,
  });
}

type ListCache = InfiniteData<NotificationPage, string | null>;

function patchList(qc: ReturnType<typeof useQueryClient>, fn: (n: StudentNotification) => StudentNotification) {
  qc.setQueryData<ListCache>(notificationKeys.list, (old) =>
    old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(fn) })) } : old,
  );
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch<{ unreadCount: number }>(`/notifications/${id}/read`)).data,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationKeys.count });
      const now = new Date().toISOString();
      let wasUnread = false;
      patchList(qc, (n) => {
        if (n.id !== id || n.readAt) return n;
        wasUnread = true;
        return { ...n, readAt: now };
      });
      if (wasUnread) qc.setQueryData<number>(notificationKeys.count, (c) => Math.max(0, (c ?? 0) - 1));
    },
    onSuccess: (data) => {
      if (typeof data?.unreadCount === 'number') qc.setQueryData(notificationKeys.count, data.unreadCount);
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ unreadCount: number }>('/notifications/read-all')).data,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.count });
      const now = new Date().toISOString();
      patchList(qc, (n) => (n.readAt ? n : { ...n, readAt: now }));
      qc.setQueryData(notificationKeys.count, 0);
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Only in-app hash routes are followed; anything else falls back to the dashboard. */
export function safeNotificationLink(link: string | undefined | null): string {
  if (typeof link === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(link)) return link;
  return '/dashboard';
}
