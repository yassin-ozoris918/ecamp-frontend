import { useEffect, useId, useRef, useState } from 'react';
import { Bell, CheckCheck, FileText, Loader2, PlayCircle, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../lib/router';
import {
  safeNotificationLink,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
  useUnreadNotificationCount,
  type StudentNotification,
} from '../lib/notifications';

const TYPE_ICON = {
  LECTURE_ADDED: <PlayCircle className="w-5 h-5" />,
  SESSION_ADDED: <Video className="w-5 h-5" />,
  MATERIAL_ADDED: <FileText className="w-5 h-5" />,
} as const;

const TYPE_TONE = {
  LECTURE_ADDED: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
  SESSION_ADDED: 'bg-secondary-500/10 text-secondary-600 dark:text-secondary-300',
  MATERIAL_ADDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
} as const;

function useRelativeTime() {
  const { t, i18n } = useTranslation();
  return (iso: string) => {
    const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    if (!Number.isFinite(diffSec)) return '';
    if (Math.abs(diffSec) < 60) return t('notifications.justNow');
    const rtf = new Intl.RelativeTimeFormat(i18n.language?.startsWith('ar') ? 'ar' : 'en', { numeric: 'auto' });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
    ];
    for (const [unit, sec] of units) {
      if (Math.abs(diffSec) >= sec) return rtf.format(Math.round(diffSec / sec), unit);
    }
    return '';
  };
}

function NotificationText({ n }: { n: StudentNotification }) {
  const { t } = useTranslation();
  const p = {
    courseTitle: n.params?.courseTitle ?? '',
    lectureTitle: n.params?.lectureTitle ?? '',
    itemTitle: n.params?.itemTitle ?? '',
    count: Math.max(1, Number(n.params?.count) || 1),
  };
  let title: string;
  let detail: string | null = null;
  if (n.type === 'LECTURE_ADDED') {
    title = t('notifications.lectureAdded', p);
    detail = p.lectureTitle;
  } else if (n.type === 'SESSION_ADDED') {
    title = t('notifications.sessionAdded', p);
    detail = p.count === 1 ? p.itemTitle : null;
  } else {
    title = t('notifications.materialAdded', p);
    detail = p.count === 1 ? p.itemTitle : null;
  }
  return (
    <>
      <p dir="auto" className={`text-sm leading-snug ${n.readAt ? 'text-theme-muted' : 'text-theme-text font-semibold'}`}>
        {title}
      </p>
      {detail && (
        <p dir="auto" className="text-xs text-theme-muted truncate mt-0.5">
          {detail}
        </p>
      )}
    </>
  );
}

/**
 * Student notification bell (YouTube-style): red unread badge, dropdown list, click to open + mark read.
 * The badge polls a cheap count endpoint; the list is only fetched while the panel is open.
 */
export function NotificationBell({ align = 'end' }: { align?: 'start' | 'end' }) {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const relTime = useRelativeTime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const { data: unread = 0 } = useUnreadNotificationCount(true);
  const list = useNotificationList(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Refresh the open list when new notifications arrive while it is open.
  const lastUnread = useRef(unread);
  useEffect(() => {
    if (open && unread > lastUnread.current) void list.refetch();
    lastUnread.current = unread;
  }, [unread, open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const badge = unread > 99 ? '99+' : String(unread);

  const onItemClick = (n: StudentNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    navigate(safeNotificationLink(n.link));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-card transition-colors"
        aria-label={unread > 0 ? t('notifications.unreadAria', { count: unread }) : t('notifications.open')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -end-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold leading-5 text-center ring-2 ring-theme-bg"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('notifications.title')}
          className={`fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 ${
            align === 'end' ? 'sm:end-0' : 'sm:start-0'
          } z-50 sm:w-[24rem] max-h-[75vh] flex flex-col rounded-2xl border border-theme-border bg-theme-secondary shadow-2xl overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-theme-border">
            <p className="font-display font-bold text-theme-text">{t('notifications.title')}</p>
            <button
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-300 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <CheckCheck className="w-4 h-4" />
              {t('notifications.markAllRead')}
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {list.isLoading ? (
              <div className="flex justify-center py-10 text-theme-muted">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : list.isError ? (
              <div className="px-4 py-8 text-center space-y-2">
                <p className="text-sm text-theme-muted">{t('notifications.loadError')}</p>
                <button type="button" onClick={() => list.refetch()} className="text-sm font-semibold text-accent-600 dark:text-accent-300 hover:underline">
                  {t('notifications.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-theme-muted opacity-60" />
                <p className="mt-3 text-sm font-semibold text-theme-text">{t('notifications.empty')}</p>
                <p className="mt-1 text-xs text-theme-muted">{t('notifications.emptyDesc')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-theme-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-theme-card ${
                        n.readAt ? '' : 'bg-accent-500/[0.04]'
                      }`}
                    >
                      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${TYPE_TONE[n.type] ?? TYPE_TONE.LECTURE_ADDED}`}>
                        {TYPE_ICON[n.type] ?? <Bell className="w-5 h-5" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <NotificationText n={n} />
                        <span className="block text-[11px] text-theme-muted mt-1">{relTime(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span aria-hidden="true" className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full bg-red-600" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {list.hasNextPage && (
            <button
              type="button"
              onClick={() => list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="w-full py-2.5 text-sm font-semibold text-accent-600 dark:text-accent-300 border-t border-theme-border hover:bg-theme-card disabled:opacity-50"
            >
              {list.isFetchingNextPage ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : t('notifications.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
