import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Counts of work waiting for an admin (GET /admin/attention). */
export interface AdminAttention {
  pendingRegistrations: number;
  profileRequests: number;
  quizAnswersToReview: number;
  examsToGrade: number;
  failedNotifications: number;
  newStudents7d: number;
  activeStudents7d: number;
  unusedCodes: number;
  draftCourses: number;
  deviceRequests: number;
}

/** Shared by the sidebar badges and the dashboard; refreshes every minute while the tab is open. */
export function useAdminAttention(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'attention'],
    enabled,
    queryFn: async () => (await api.get<AdminAttention>('/admin/attention', { timeout: 15_000 })).data,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    retry: 1,
  });
}
