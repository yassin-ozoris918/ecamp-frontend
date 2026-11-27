import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Check, ExternalLink, Fingerprint, Inbox, Laptop, Search, ShieldAlert, Smartphone, Tablet, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { Badge, Button, EmptyState, Skeleton } from '../ui';
import { ConfirmDialog, useConfirm } from '../../hooks/useConfirm';
import { useDeviceName } from '../DeviceBlockedCard';

export interface RiskReason {
  code: string;
  count?: number;
}

const errMsg = (e: any) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Error';
};

export function DeviceKindIcon({ kind, className = 'w-4 h-4' }: { kind?: string | null; className?: string }) {
  if (kind === 'iphone' || kind === 'android_phone') return <Smartphone className={className} />;
  if (kind === 'ipad' || kind === 'android_tablet') return <Tablet className={className} />;
  return <Laptop className={className} />;
}

/** Plain-words device: icon + "Windows computer (Intel Iris Xe Graphics)". */
export function DeviceLabel({ kind, label, sub }: { kind?: string | null; label?: string | null; sub?: string | null }) {
  const name = useDeviceName();
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className="w-7 h-7 rounded-lg bg-theme-card border border-theme-border flex items-center justify-center text-theme-muted shrink-0">
        <DeviceKindIcon kind={kind} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-theme-text truncate">{name(kind ?? undefined, label)}</span>
        {sub && <span className="block text-[11px] text-theme-muted truncate">{sub}</span>}
      </span>
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const { t } = useTranslation();
  const variant = outcome === 'BLOCKED' || outcome === 'NEEDS_APPROVAL' ? 'error' : outcome === 'NEW_BROWSER' ? 'accent' : outcome === 'BOUND' ? 'gold' : outcome === 'LEGACY' ? 'default' : 'success';
  return (
    <Badge variant={variant as any} className="whitespace-nowrap">
      {t(`devicesAdmin.outcome.${outcome}`, outcome)}
    </Badge>
  );
}

export function RiskBadge({ level, score }: { level: string; score: number }) {
  const { t } = useTranslation();
  return (
    <Badge variant={level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'default'} className="whitespace-nowrap">
      {t(`devicesAdmin.risk.${level}`)} · {score}
    </Badge>
  );
}

export function useReasonText() {
  const { t } = useTranslation();
  return {
    attempt: (reason?: string | null) => {
      if (!reason) return '';
      const key = reason.replace(/_bad_proof$/, '');
      return t(`devicesAdmin.reason.${key}`, key) + (reason.endsWith('_bad_proof') && reason !== 'bad_proof' ? ` · ${t('devicesAdmin.reason.bad_proof')}` : '');
    },
    risk: (r: RiskReason) => t(`devicesAdmin.riskReason.${r.code}`, { count: r.count ?? 1, defaultValue: r.code }),
  };
}

function when(d: string, lang: string) {
  return new Date(d).toLocaleString(lang.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Admin › System › Devices: change requests, accounts that look shared, and every sign-in decision. */
export function AdminDevices() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'requests' | 'suspicious' | 'activity' | 'watermark'>('requests');
  const overview = useQuery({ queryKey: ['devices', 'overview'], queryFn: async () => (await api.get('/admin/devices/overview')).data });
  const o = overview.data;

  const stats = [
    { label: t('devicesAdmin.stats.requests'), value: o?.pendingRequests, tone: (o?.pendingRequests ?? 0) > 0 ? 'warning' : '' },
    { label: t('devicesAdmin.stats.blocked24h'), value: o?.blocked24h },
    { label: t('devicesAdmin.stats.newBrowsers7d'), value: o?.newBrowsers7d },
    { label: t('devicesAdmin.stats.highRisk'), value: o?.highRisk, tone: (o?.highRisk ?? 0) > 0 ? 'error' : '' },
    { label: t('devicesAdmin.stats.linked'), value: o?.studentsWithDevice },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-display font-bold text-theme-text flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-accent-700 dark:text-accent-300" /> {t('devicesAdmin.title')}
        </h1>
        <p className="text-sm text-theme-muted mt-1 max-w-3xl">{t('devicesAdmin.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border p-4 ${s.tone === 'warning' ? 'border-warning-500/30 bg-warning-500/5' : s.tone === 'error' ? 'border-error-500/30 bg-error-500/5' : 'border-theme-border bg-theme-card/50'}`}
          >
            <p className="text-xs text-theme-muted">{s.label}</p>
            <p className="text-2xl font-bold text-theme-text mt-1">{overview.isLoading ? '…' : (s.value ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-theme-border overflow-x-auto">
        {(
          [
            ['requests', t('devicesAdmin.tabs.requests'), o?.pendingRequests],
            ['suspicious', t('devicesAdmin.tabs.suspicious'), (o?.highRisk ?? 0) + (o?.mediumRisk ?? 0)],
            ['activity', t('devicesAdmin.tabs.activity'), undefined],
            ['watermark', t('devicesAdmin.tabs.watermark'), undefined],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-accent-500 text-accent-700 dark:text-accent-200' : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            {label}
            {count ? <span className="text-[11px] px-1.5 rounded-full bg-theme-card">{count}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'requests' && <Requests />}
      {tab === 'suspicious' && <Suspicious />}
      {tab === 'activity' && <Activity />}
      {tab === 'watermark' && <WatermarkLookup />}
    </div>
  );
}

function Requests() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const name = useDeviceName();
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();
  const q = useQuery({ queryKey: ['devices', 'requests', status], queryFn: async () => (await api.get(`/admin/devices/requests?status=${status}`)).data as any[] });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['devices'] });
    qc.invalidateQueries({ queryKey: ['admin', 'attention'] });
  };
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => api.post(`/admin/devices/requests/${id}/${action}`, {}),
    onSuccess: (_r, v) => {
      toast.success(v.action === 'approve' ? t('devicesAdmin.approved') : t('devicesAdmin.rejected'));
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const decide = async (r: any, action: 'approve' | 'reject') => {
    const ok = await confirm(
      action === 'approve' ? t('devicesAdmin.approveTitle') : t('devicesAdmin.rejectTitle'),
      action === 'approve'
        ? t('devicesAdmin.approveMsg', { name: r.student.fullName, device: name(r.kind, r.label) })
        : t('devicesAdmin.rejectMsg', { name: r.student.fullName }),
    );
    if (ok) act.mutate({ id: r.id, action });
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-theme-border p-0.5 bg-theme-card/50">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === s ? 'bg-accent-500 text-white' : 'text-theme-muted hover:text-theme-text'}`}
          >
            {t(`devicesAdmin.status.${s}`)}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : !q.data?.length ? (
        <EmptyState icon={<Inbox className="w-8 h-8" />} title={status === 'PENDING' ? t('devicesAdmin.noRequests') : t('devicesAdmin.nothingHere')} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((r) => (
            <li key={r.id} className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/admin/student-360/${r.student.id}`} className="font-semibold text-theme-text hover:underline">
                    {r.student.fullName}
                  </Link>
                  <p className="text-xs text-theme-muted" dir="ltr">
                    {[r.student.email, r.student.phoneNumber].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-xs text-theme-muted">{when(r.createdAt, i18n.language)}</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex-1 min-w-0 rounded-xl bg-theme-bg/40 p-2.5">
                  <p className="text-[11px] text-theme-muted mb-1">{t('devicesAdmin.currentDevice')}</p>
                  {r.currentDevice ? (
                    <DeviceLabel kind={r.currentDevice.kind} label={r.currentDevice.label} sub={t('devicesAdmin.lastUsed', { when: when(r.currentDevice.lastSeenAt, i18n.language) })} />
                  ) : (
                    <span className="text-sm text-theme-muted">{t('devicesAdmin.noDevice')}</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-theme-muted shrink-0 self-center rtl:rotate-180 hidden md:block" />
                <div className="flex-1 min-w-0 rounded-xl bg-accent-500/5 border border-accent-500/20 p-2.5">
                  <p className="text-[11px] text-theme-muted mb-1">{t('devicesAdmin.requestedDevice')}</p>
                  <DeviceLabel kind={r.kind} label={r.label} sub={[r.browserName, r.ipAddress].filter(Boolean).join(' · ')} />
                </div>
              </div>
              {r.note && (
                <p className="text-sm text-theme-muted rounded-xl bg-theme-bg/40 p-2.5" dir="auto">
                  “{r.note}”
                </p>
              )}
              {status === 'PENDING' ? (
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" icon={<X className="w-3.5 h-3.5" />} onClick={() => decide(r, 'reject')}>
                    {t('devicesAdmin.reject')}
                  </Button>
                  <Button size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => decide(r, 'approve')} loading={act.isPending}>
                    {t('devicesAdmin.approve')}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-theme-muted text-end">
                  {t(`devicesAdmin.status.${r.status}`)} · {r.reviewedAt ? when(r.reviewedAt, i18n.language) : ''}
                  {r.reviewNote ? ` · ${r.reviewNote}` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={state.open} title={state.title} message={state.message} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

/** Paste the code seen on a leaked screenshot or recording to find whose account it was. */
function WatermarkLookup() {
  const { t, i18n } = useTranslation();
  const reasons = useReasonText();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState('');
  const clean = code.replace(/[^0-9a-f]/gi, '').toUpperCase();
  const q = useQuery({
    queryKey: ['devices', 'watermark', submitted],
    enabled: submitted.length === 8,
    queryFn: async () => (await api.get(`/admin/devices/watermark/${submitted}`)).data as any[],
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 space-y-3">
        <p className="text-sm text-theme-muted flex items-start gap-2">
          <Fingerprint className="w-4 h-4 mt-0.5 shrink-0 text-accent-600 dark:text-accent-300" />
          {t('devicesAdmin.watermark.hint')}
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length === 8) setSubmitted(clean);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="4F9A2C1B"
            dir="ltr"
            maxLength={12}
            className="input flex-1 font-mono tracking-widest uppercase"
            aria-label={t('devicesAdmin.watermark.label')}
          />
          <Button type="submit" disabled={clean.length !== 8} icon={<Search className="w-4 h-4" />}>
            {t('devicesAdmin.watermark.find')}
          </Button>
        </form>
        <p className="text-[11px] text-theme-muted">{t('devicesAdmin.watermark.faintTip')}</p>
      </div>

      {submitted && (q.isLoading ? (
        <Skeleton className="h-28" />
      ) : q.isError ? (
        <p className="text-sm text-error-600">{errMsg(q.error)}</p>
      ) : !q.data?.length ? (
        <EmptyState icon={<Fingerprint className="w-8 h-8" />} title={t('devicesAdmin.watermark.none')} description={t('devicesAdmin.watermark.noneDesc')} />
      ) : (
        <ul className="space-y-2">
          {q.data.map((s) => (
            <li key={s.id} className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-theme-text">{s.fullName}</span>
                  {s.risk?.level !== 'low' && <RiskBadge level={s.risk.level} score={s.risk.score} />}
                  {!s.isActive && <Badge variant="warning">{t('devicesAdmin.watermark.inactive')}</Badge>}
                </div>
                <p className="text-xs text-theme-muted" dir="ltr">
                  {[s.email, s.phoneNumber].filter(Boolean).join(' · ')}
                </p>
                {s.risk?.reasons?.length > 0 && (
                  <ul className="pt-1 space-y-0.5">
                    {s.risk.reasons.map((r: RiskReason, i: number) => (
                      <li key={i} className="text-sm text-theme-muted">• {reasons.risk(r)}</li>
                    ))}
                  </ul>
                )}
                {s.tampers?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-theme-muted">{t('devicesAdmin.watermark.tamperedVideos')}</p>
                    <ul className="space-y-0.5">
                      {s.tampers.map((tp: any, i: number) => (
                        <li key={i} className="text-xs text-theme-muted">
                          {tp.video ?? '—'} · {tp.at ? when(tp.at, i18n.language) : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Link to={`/admin/student-360/${s.id}`} className="btn-secondary !py-2 text-sm shrink-0">
                <ExternalLink className="w-4 h-4" />
                {t('devicesAdmin.openStudent')}
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function Suspicious() {
  const { t } = useTranslation();
  const reasons = useReasonText();
  const q = useQuery({ queryKey: ['devices', 'suspicious'], queryFn: async () => (await api.get('/admin/devices/suspicious')).data as any[] });
  if (q.isLoading) return <Skeleton className="h-40" />;
  if (!q.data?.length) return <EmptyState icon={<ShieldAlert className="w-8 h-8" />} title={t('devicesAdmin.noSuspicious')} description={t('devicesAdmin.noSuspiciousDesc')} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-theme-muted flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning-500" />
        {t('devicesAdmin.suspiciousHint')}
      </p>
      <ul className="space-y-2">
        {q.data.map((r) => (
          <li key={r.studentId} className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-theme-text">{r.student?.fullName ?? '—'}</span>
                <RiskBadge level={r.level} score={r.score} />
              </div>
              <p className="text-xs text-theme-muted" dir="ltr">
                {[r.student?.email, r.student?.phoneNumber].filter(Boolean).join(' · ')}
              </p>
              <ul className="mt-2 space-y-0.5">
                {r.reasons.map((reason: RiskReason, i: number) => (
                  <li key={i} className="text-sm text-theme-muted">
                    • {reasons.risk(reason)}
                  </li>
                ))}
              </ul>
            </div>
            <Link to={`/admin/student-360/${r.studentId}`} className="btn-secondary !py-2 text-sm shrink-0">
              <ExternalLink className="w-4 h-4" />
              {t('devicesAdmin.openStudent')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Activity() {
  const { t, i18n } = useTranslation();
  const reasons = useReasonText();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['devices', 'attempts', filter, query],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await api.get('/admin/devices/attempts', { params: { outcome: filter === 'all' ? undefined : filter, search: query || undefined, skip: pageParam, take: 50 } })).data as {
        items: any[];
        total: number;
      },
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  const filters = [
    ['all', t('devicesAdmin.filter.all')],
    ['problems', t('devicesAdmin.filter.problems')],
    ['NEW_BROWSER', t('devicesAdmin.outcome.NEW_BROWSER')],
    ['BOUND', t('devicesAdmin.outcome.BOUND')],
    ['ALLOWED', t('devicesAdmin.outcome.ALLOWED')],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <form
          className="relative flex-1 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            dir="auto"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => setQuery(search.trim())}
            placeholder={t('devicesAdmin.searchPlaceholder')}
            className="w-full ps-9 pe-3 py-2 bg-theme-card border border-theme-border rounded-xl text-sm text-theme-text focus:outline-none focus:border-accent-400"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === id ? 'bg-accent-500 text-white border-accent-500' : 'border-theme-border text-theme-muted hover:text-theme-text'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Inbox className="w-8 h-8" />} title={t('devicesAdmin.noActivity')} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-theme-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-theme-card/60 text-theme-muted text-xs border-b border-theme-border">
                <th className="p-3 text-start font-semibold">{t('devicesAdmin.col.when')}</th>
                <th className="p-3 text-start font-semibold">{t('devicesAdmin.col.student')}</th>
                <th className="p-3 text-start font-semibold">{t('devicesAdmin.col.result')}</th>
                <th className="p-3 text-start font-semibold">{t('devicesAdmin.col.device')}</th>
                <th className="p-3 text-start font-semibold">{t('devicesAdmin.col.why')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-theme-card/40 align-top">
                  <td className="p-3 text-xs text-theme-muted whitespace-nowrap">{when(a.createdAt, i18n.language)}</td>
                  <td className="p-3">
                    <Link to={`/admin/student-360/${a.student.id}`} className="text-theme-text hover:underline">
                      {a.student.fullName}
                    </Link>
                    <span className="block text-[11px] text-theme-muted" dir="ltr">
                      {a.student.email}
                    </span>
                  </td>
                  <td className="p-3">
                    <OutcomeBadge outcome={a.outcome} />
                  </td>
                  <td className="p-3">
                    <DeviceLabel kind={a.kind} label={a.label} sub={[a.browserName, a.ipAddress].filter(Boolean).join(' · ')} />
                  </td>
                  <td className="p-3 text-xs text-theme-muted">
                    {reasons.attempt(a.reason)}
                    {typeof a.matchScore === 'number' && a.matchScore > 0 && a.outcome !== 'BOUND' && <span className="block">{t('devicesAdmin.match', { pct: Math.round(a.matchScore * 100) })}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.hasNextPage && (
        <div className="text-center">
          <Button variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            {t('devicesAdmin.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
