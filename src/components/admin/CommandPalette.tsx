import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, CornerDownLeft, Loader2, Search, User, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useRouter } from '../../lib/router';
import { useDebounce } from '../../hooks/useDebounce';

export interface PaletteEntry {
  to: string;
  label: string;
  icon: ReactNode;
  /** Extra words that should match (e.g. Arabic + English names of the page). */
  keywords?: string;
  group: string;
}

interface Hit {
  key: string;
  to: string;
  label: string;
  sub?: string;
  icon: ReactNode;
  group: string;
}

/**
 * Quick search for staff (Ctrl/⌘ + K): jump to any page, any student (opens Student 360) or any course.
 */
export function CommandPalette({ open, onClose, entries }: { open: boolean; onClose: () => void; entries: PaletteEntry[] }) {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(q.trim(), 250);
  const searching = debounced.length >= 2;

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const students = useQuery({
    queryKey: ['palette', 'students', debounced],
    enabled: open && searching,
    queryFn: async () => {
      const { data } = await api.get('/admin/users', { params: { search: debounced, take: 6 } });
      return (data?.items ?? data ?? []) as { id: string; full_name?: string; fullName?: string; email: string; role: string; phoneNumber?: string | null }[];
    },
    staleTime: 30_000,
  });
  const courses = useQuery({
    queryKey: ['palette', 'courses', debounced],
    enabled: open && searching,
    queryFn: async () => {
      const { data } = await api.get('/courses', { params: { search: debounced } });
      return ((data?.items ?? data ?? []) as { id: string; title: string; status?: string }[]).slice(0, 5);
    },
    staleTime: 30_000,
  });

  const hits: Hit[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pages = entries
      .filter((e) => !needle || `${e.label} ${e.keywords ?? ''}`.toLowerCase().includes(needle))
      .slice(0, needle ? 6 : entries.length)
      .map((e) => ({ key: `p:${e.to}`, to: e.to, label: e.label, icon: e.icon, group: needle ? t('palette.pages') : e.group }));
    const people = (searching ? students.data ?? [] : []).map((u) => ({
      key: `u:${u.id}`,
      to: u.role === 'STUDENT' ? `/admin/student-360/${u.id}` : `/admin/users`,
      label: u.full_name || u.fullName || u.email,
      sub: [u.email, u.phoneNumber].filter(Boolean).join(' · '),
      icon: <User className="w-4 h-4" />,
      group: t('palette.people'),
    }));
    const courseHits = (searching ? courses.data ?? [] : []).map((c) => ({
      key: `c:${c.id}`,
      to: `/instructor/course/${c.id}`,
      label: c.title,
      sub: c.status ? t(`instructor.status.${c.status}`, c.status) : undefined,
      icon: <BookOpen className="w-4 h-4" />,
      group: t('palette.courses'),
    }));
    return [...people, ...courseHits, ...pages];
  }, [q, entries, searching, students.data, courses.data, t]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    navigate(h.to);
  };

  let lastGroup = '';
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-start justify-center p-3 sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label={t('palette.title')}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-theme-border bg-theme-secondary shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 border-b border-theme-border">
          <Search className="w-5 h-5 text-theme-muted shrink-0" />
          <input
            ref={inputRef}
            dir="auto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(hits[active]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder={t('palette.placeholder')}
            className="flex-1 bg-transparent py-4 text-base text-theme-text placeholder:text-theme-muted outline-none"
            aria-label={t('palette.placeholder')}
          />
          {(students.isFetching || courses.isFetching) && <Loader2 className="w-4 h-4 animate-spin text-theme-muted" />}
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-card" aria-label={t('common.close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto scrollbar-thin py-2">
          {hits.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-theme-muted">
              {searching && (students.isFetching || courses.isFetching) ? t('palette.searching') : t('palette.noResults')}
            </p>
          ) : (
            hits.map((h, i) => {
              const header = h.group !== lastGroup ? h.group : null;
              lastGroup = h.group;
              return (
                <div key={h.key}>
                  {header && <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-theme-muted">{header}</p>}
                  <button
                    type="button"
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                      i === active ? 'bg-accent-500/10 text-theme-text' : 'text-theme-text hover:bg-theme-card'
                    }`}
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${i === active ? 'bg-accent-500/15 text-accent-600 dark:text-accent-300' : 'bg-theme-card text-theme-muted'}`}>
                      {h.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span dir="auto" className="block text-sm font-medium truncate">{h.label}</span>
                      {h.sub && <span dir="auto" className="block text-xs text-theme-muted truncate">{h.sub}</span>}
                    </span>
                    {i === active && <CornerDownLeft className="w-4 h-4 text-theme-muted shrink-0" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-theme-border text-[11px] text-theme-muted">
          <span>↑ ↓ {t('palette.navigate')}</span>
          <span>↵ {t('palette.open')}</span>
          <span>Esc {t('palette.close')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
