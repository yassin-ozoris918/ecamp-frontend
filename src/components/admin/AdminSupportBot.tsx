import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CheckCircle2, Edit2, FlaskConical, Inbox, MessageCircleQuestion, Plus, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, EmptyState, Modal, Skeleton } from '../ui';
import { ActionsMenu } from '../common/ActionsMenu';
import { ConfirmDialog, useConfirm } from '../../hooks/useConfirm';

interface Faq {
  id: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  phrasings: string[];
  category: string | null;
  linkUrl: string | null;
  linkLabelEn: string | null;
  linkLabelAr: string | null;
  isActive: boolean;
  sortOrder: number;
  timesShown: number;
  helpfulCount: number;
  unhelpfulCount: number;
}

interface Unanswered {
  id: string;
  question: string;
  language: string;
  createdAt: string;
}

interface Stats {
  total: number;
  answered: number;
  noMatch: number;
  refused: number;
  helpful: number;
  unhelpful: number;
  unansweredOpen: number;
  aiEnabled: boolean;
  ai?: { gemini: 'ok' | 'rejected' | 'not_set'; groq: 'ok' | 'rejected' | 'not_set' };
}

type Draft = Omit<Faq, 'id' | 'timesShown' | 'helpfulCount' | 'unhelpfulCount'> & { id?: string };

const EMPTY: Draft = {
  questionEn: '',
  questionAr: '',
  answerEn: '',
  answerAr: '',
  phrasings: [],
  category: '',
  linkUrl: '',
  linkLabelEn: '',
  linkLabelAr: '',
  isActive: true,
  sortOrder: 0,
};

const errMsg = (e: any) => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Error';
};

/** Admin page: the support assistant's questions and answers, unanswered questions and a test box. */
export function AdminSupportBot() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language?.startsWith('ar');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'faqs' | 'unanswered' | 'test'>('faqs');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  const faqsQ = useQuery({ queryKey: ['support-bot', 'faqs'], queryFn: async () => (await api.get('/admin/support-bot/faqs')).data as Faq[] });
  const unansweredQ = useQuery({ queryKey: ['support-bot', 'unanswered'], queryFn: async () => (await api.get('/admin/support-bot/unanswered')).data as Unanswered[] });
  const statsQ = useQuery({ queryKey: ['support-bot', 'stats'], queryFn: async () => (await api.get('/admin/support-bot/stats')).data as Stats });
  const refresh = () => qc.invalidateQueries({ queryKey: ['support-bot'] });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const body = {
        questionEn: d.questionEn,
        questionAr: d.questionAr,
        answerEn: d.answerEn,
        answerAr: d.answerAr,
        phrasings: d.phrasings,
        category: d.category || null,
        linkUrl: d.linkUrl || null,
        linkLabelEn: d.linkLabelEn || null,
        linkLabelAr: d.linkLabelAr || null,
        isActive: d.isActive,
        sortOrder: Number(d.sortOrder) || 0,
      };
      return d.id ? api.patch(`/admin/support-bot/faqs/${d.id}`, body) : api.post('/admin/support-bot/faqs', body);
    },
    onSuccess: () => {
      toast.success(t('supportAdmin.saved'));
      setDraft(null);
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggle = useMutation({
    mutationFn: (f: Faq) => api.patch(`/admin/support-bot/faqs/${f.id}`, { isActive: !f.isActive }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  const starter = useMutation({
    mutationFn: () => api.post('/admin/support-bot/faqs/starter'),
    onSuccess: (r) => {
      toast.success(t('supportAdmin.starterAdded', { count: r.data?.added ?? 0 }));
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const resolve = useMutation({
    mutationFn: (ids: string[]) => api.post('/admin/support-bot/unanswered/resolve', { ids }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  const remove = async (f: Faq) => {
    const ok = await confirm(t('supportAdmin.deleteTitle'), t('supportAdmin.deleteMsg', { q: ar ? f.questionAr || f.questionEn : f.questionEn || f.questionAr }));
    if (!ok) return;
    try {
      await api.delete(`/admin/support-bot/faqs/${f.id}`);
      refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const faqs = faqsQ.data ?? [];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => [f.questionEn, f.questionAr, f.answerEn, f.answerAr, f.category ?? '', ...f.phrasings].some((s) => s.toLowerCase().includes(q)));
  }, [faqs, query]);
  const stats = statsQ.data;
  const unanswered = unansweredQ.data ?? [];
  const rated = (stats?.helpful ?? 0) + (stats?.unhelpful ?? 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-theme-text flex items-center gap-2">
            <Bot className="w-6 h-6 text-accent-700 dark:text-accent-300" /> {t('supportAdmin.title')}
          </h1>
          <p className="text-sm text-theme-muted mt-1 max-w-2xl">{t('supportAdmin.subtitle')}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setDraft({ ...EMPTY })}>
          {t('supportAdmin.add')}
        </Button>
      </div>

      {/* How it stays safe */}
      <div className="rounded-2xl border border-secondary-500/20 bg-secondary-500/5 p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-secondary-600 dark:text-secondary-300 shrink-0 mt-0.5" />
        <p className="text-sm text-theme-muted">{t('supportAdmin.safety')}</p>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('supportAdmin.stats.questions')} value={stats?.total ?? '—'} sub={t('supportAdmin.stats.last30')} />
        <Stat label={t('supportAdmin.stats.answered')} value={stats && stats.total ? `${Math.round((stats.answered / stats.total) * 100)}%` : '—'} sub={t('supportAdmin.stats.refused', { count: stats?.refused ?? 0 })} />
        <Stat label={t('supportAdmin.stats.unanswered')} value={stats?.unansweredOpen ?? '—'} sub={t('supportAdmin.stats.toReview')} highlight={(stats?.unansweredOpen ?? 0) > 0} />
        <Stat
          label={t('supportAdmin.stats.helpful')}
          value={rated ? `${Math.round(((stats?.helpful ?? 0) / rated) * 100)}%` : '—'}
          sub={stats ? aiLabel(stats, t) : ''}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-theme-border">
        {(
          [
            ['faqs', t('supportAdmin.tabs.faqs'), <MessageCircleQuestion key="i" className="w-4 h-4" />, faqs.length],
            ['unanswered', t('supportAdmin.tabs.unanswered'), <Inbox key="i" className="w-4 h-4" />, unanswered.length],
            ['test', t('supportAdmin.tabs.test'), <FlaskConical key="i" className="w-4 h-4" />, undefined],
          ] as const
        ).map(([id, label, icon, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-accent-500 text-accent-700 dark:text-accent-200' : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            {icon}
            {label}
            {count !== undefined && count > 0 && <span className="text-[11px] px-1.5 rounded-full bg-theme-card">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                dir="auto"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('supportAdmin.search')}
                className="w-full ps-9 pe-3 py-2 bg-theme-card border border-theme-border rounded-xl text-sm text-theme-text focus:outline-none focus:border-accent-400"
              />
            </div>
            <Button variant="secondary" icon={<Sparkles className="w-4 h-4" />} loading={starter.isPending} onClick={() => starter.mutate()} className="sm:ms-auto">
              {t('supportAdmin.starter')}
            </Button>
          </div>

          {faqsQ.isLoading ? (
            <Skeleton className="h-48" />
          ) : faqs.length === 0 ? (
            <EmptyState icon={<MessageCircleQuestion className="w-8 h-8" />} title={t('supportAdmin.emptyTitle')} description={t('supportAdmin.emptyDesc')} />
          ) : (
            <ul className="space-y-2">
              {shown.map((f) => {
                const votes = f.helpfulCount + f.unhelpfulCount;
                return (
                  <li key={f.id} className={`rounded-2xl border border-theme-border bg-theme-card/50 p-4 flex gap-3 ${f.isActive ? '' : 'opacity-60'}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-theme-text" dir="auto">
                          {ar ? f.questionAr || f.questionEn : f.questionEn || f.questionAr}
                        </p>
                        {f.category && <Badge>{f.category}</Badge>}
                        {!f.isActive && <Badge variant="warning">{t('supportAdmin.off')}</Badge>}
                      </div>
                      <p className="text-sm text-theme-muted line-clamp-2 whitespace-pre-line" dir="auto">
                        {ar ? f.answerAr || f.answerEn : f.answerEn || f.answerAr}
                      </p>
                      <p className="text-[11px] text-theme-muted">
                        {t('supportAdmin.shown', { count: f.timesShown })}
                        {votes > 0 && ` · ${t('supportAdmin.helpfulPct', { pct: Math.round((f.helpfulCount / votes) * 100), count: votes })}`}
                        {f.phrasings.length > 0 && ` · ${t('supportAdmin.phrasingsCount', { count: f.phrasings.length })}`}
                        {(!f.questionAr || !f.answerAr) && ` · ${t('supportAdmin.missingAr')}`}
                        {(!f.questionEn || !f.answerEn) && ` · ${t('supportAdmin.missingEn')}`}
                      </p>
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <Button size="sm" variant="ghost" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => setDraft({ ...f, category: f.category ?? '', linkUrl: f.linkUrl ?? '', linkLabelEn: f.linkLabelEn ?? '', linkLabelAr: f.linkLabelAr ?? '' })}>
                        {t('common.edit', 'Edit')}
                      </Button>
                      <ActionsMenu
                        items={[
                          { label: f.isActive ? t('supportAdmin.turnOff') : t('supportAdmin.turnOn'), onClick: () => toggle.mutate(f) },
                          { label: t('common.delete', 'Delete'), icon: <Trash2 className="w-4 h-4" />, danger: true, separated: true, onClick: () => remove(f) },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
              {shown.length === 0 && <p className="text-sm text-theme-muted text-center py-6">{t('supportAdmin.noResults')}</p>}
            </ul>
          )}
        </div>
      )}

      {tab === 'unanswered' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-theme-muted">{t('supportAdmin.unansweredHint')}</p>
            {unanswered.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => resolve.mutate(unanswered.map((u) => u.id))}>
                {t('supportAdmin.dismissAll')}
              </Button>
            )}
          </div>
          {unansweredQ.isLoading ? (
            <Skeleton className="h-32" />
          ) : unanswered.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="w-8 h-8" />} title={t('supportAdmin.allAnswered')} />
          ) : (
            <ul className="space-y-2">
              {unanswered.map((u) => (
                <li key={u.id} className="rounded-xl border border-theme-border bg-theme-card/50 p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-text break-words" dir="auto">
                      {u.question}
                    </p>
                    <p className="text-[11px] text-theme-muted">{new Date(u.createdAt).toLocaleString(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDraft({
                        ...EMPTY,
                        ...(u.language === 'ar' ? { questionAr: u.question } : { questionEn: u.question }),
                        phrasings: [u.question],
                        resolveId: u.id,
                      } as Draft & { resolveId: string });
                    }}
                  >
                    {t('supportAdmin.writeAnswer')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve.mutate([u.id])}>
                    {t('supportAdmin.dismiss')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'test' && <TestBox />}

      {draft && (
        <FaqEditor
          draft={draft}
          saving={save.isPending}
          onClose={() => setDraft(null)}
          onSave={(d) => {
            const resolveId = (draft as any).resolveId as string | undefined;
            save.mutate(d, { onSuccess: () => resolveId && resolve.mutate([resolveId]) });
          }}
        />
      )}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

function FaqEditor({ draft, saving, onClose, onSave }: { draft: Draft; saving: boolean; onClose: () => void; onSave: (d: Draft) => void }) {
  const { t } = useTranslation();
  const [d, setD] = useState<Draft>(draft);
  const [phrasingsText, setPhrasingsText] = useState(draft.phrasings.join('\n'));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const valid = (d.questionEn.trim() || d.questionAr.trim()) && (d.answerEn.trim() || d.answerAr.trim());
  const linkOk = !d.linkUrl || /^\/(?!\/)[A-Za-z0-9\-_/]*$/.test(d.linkUrl) || /^https:\/\/\S+$/.test(d.linkUrl);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={d.id ? t('supportAdmin.editTitle') : t('supportAdmin.addTitle')}
      description={t('supportAdmin.editorHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            loading={saving}
            disabled={!valid || !linkOk}
            onClick={() =>
              onSave({
                ...d,
                phrasings: phrasingsText
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 30),
              })
            }
          >
            {t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('supportAdmin.f.questionAr')}>
            <input dir="rtl" className="input w-full" maxLength={300} value={d.questionAr} onChange={(e) => set('questionAr', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.questionEn')}>
            <input dir="ltr" className="input w-full" maxLength={300} value={d.questionEn} onChange={(e) => set('questionEn', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.answerAr')}>
            <textarea dir="rtl" rows={6} className="input w-full" maxLength={3000} value={d.answerAr} onChange={(e) => set('answerAr', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.answerEn')}>
            <textarea dir="ltr" rows={6} className="input w-full" maxLength={3000} value={d.answerEn} onChange={(e) => set('answerEn', e.target.value)} />
          </Field>
        </div>
        <Field label={t('supportAdmin.f.phrasings')} hint={t('supportAdmin.f.phrasingsHint')}>
          <textarea dir="auto" rows={4} className="input w-full" value={phrasingsText} onChange={(e) => setPhrasingsText(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={t('supportAdmin.f.link')} hint={linkOk ? t('supportAdmin.f.linkHint') : t('supportAdmin.f.linkBad')} bad={!linkOk}>
            <input dir="ltr" className="input w-full" maxLength={500} placeholder="/contact" value={d.linkUrl ?? ''} onChange={(e) => set('linkUrl', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.linkLabelAr')}>
            <input dir="rtl" className="input w-full" maxLength={60} value={d.linkLabelAr ?? ''} onChange={(e) => set('linkLabelAr', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.linkLabelEn')}>
            <input dir="ltr" className="input w-full" maxLength={60} value={d.linkLabelEn ?? ''} onChange={(e) => set('linkLabelEn', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Field label={t('supportAdmin.f.category')}>
            <input dir="auto" className="input w-full" maxLength={60} value={d.category ?? ''} onChange={(e) => set('category', e.target.value)} />
          </Field>
          <Field label={t('supportAdmin.f.order')}>
            <input type="number" min={0} className="input w-full" value={d.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-theme-text pb-2">
            <input type="checkbox" checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 accent-accent-500" />
            {t('supportAdmin.f.active')}
          </label>
        </div>
      </div>
    </Modal>
  );
}

function TestBox() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      setResult((await api.post('/admin/support-bot/test', { message })).data);
    } catch (e) {
      toast.error(errMsg(e));
    }
    setBusy(false);
  };
  const how: Record<string, string> = {
    keyword: t('supportAdmin.how.keyword'),
    ai: t('supportAdmin.how.ai'),
    security: t('supportAdmin.how.security'),
    off_topic: t('supportAdmin.how.offTopic'),
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-theme-muted">{t('supportAdmin.testHint')}</p>
      <div className="flex gap-2">
        <input
          dir="auto"
          className="input flex-1"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder={t('supportAdmin.testPlaceholder')}
        />
        <Button loading={busy} onClick={run} disabled={!message.trim()}>
          {t('supportAdmin.testRun')}
        </Button>
      </div>
      {result && (
        <div className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={result.type === 'answer' ? 'success' : result.type === 'refused' ? 'warning' : 'default'}>
              {result.type === 'answer' ? t('supportAdmin.result.answer') : result.type === 'refused' ? t('supportAdmin.result.refused') : t('supportAdmin.result.noMatch')}
            </Badge>
            {result.matchedBy && <span className="text-xs text-theme-muted">{how[result.matchedBy] ?? result.matchedBy}</span>}
            {typeof result.score === 'number' && <span className="text-xs text-theme-muted">· {t('supportAdmin.result.score', { pct: Math.round(result.score * 100) })}</span>}
          </div>
          <p className="text-sm text-theme-text whitespace-pre-line" dir="auto">
            {result.text}
          </p>
          {result.link && <p className="text-xs text-theme-muted">↳ {result.link.label} ({result.link.url})</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-warning-500/30 bg-warning-500/5' : 'border-theme-border bg-theme-card/50'}`}>
      <p className="text-xs text-theme-muted">{label}</p>
      <p className="text-2xl font-bold text-theme-text mt-1">{value}</p>
      {sub && <p className="text-[11px] text-theme-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, hint, bad, children }: { label: string; hint?: string; bad?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-theme-text">{label}</span>
      {children}
      {hint && <span className={`block text-[11px] ${bad ? 'text-error-500' : 'text-theme-muted'}`}>{hint}</span>}
    </label>
  );
}

/** "AI matching on", "AI off", or which key was rejected (and whether the other one is covering). */
function aiLabel(stats: Stats, t: (k: string, o?: Record<string, unknown>) => string) {
  if (!stats.aiEnabled) return t('supportAdmin.stats.aiOff');
  const ai = stats.ai;
  if (!ai) return t('supportAdmin.stats.aiOn');
  const rejected = (['gemini', 'groq'] as const).filter((p) => ai[p] === 'rejected');
  if (rejected.length === 0) return t('supportAdmin.stats.aiOn');
  const names = rejected.map((p) => (p === 'gemini' ? 'Gemini' : 'Groq')).join(' + ');
  const backup = (['gemini', 'groq'] as const).some((p) => ai[p] === 'ok');
  return t(backup ? 'supportAdmin.stats.keyRejectedBackup' : 'supportAdmin.stats.keyRejected', { names });
}
