import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  KeyRound,
  Layers,
  Lock,
  MessageCircle,
  Search,
  ShieldAlert,
  Unlock,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link } from '../lib/router';
import { describeCodeError, tidyCode, type CodeProblem } from '../lib/codeErrors';
import { Button, EmptyState, ErrorMessage, ProgressBar, Spinner } from './ui';
import { SecureFileViewer } from './SecureFileViewer';

const SUPPORT_WHATSAPP = '201221822703';
const CODE_PLACEHOLDER = 'XXXXXXXX-XXXXXXXX-XXXXXXXX';

interface StudentFile {
  id: string;
  title: string;
  type: string;
  course: { id: string; title: string; type?: string };
  lecture: { id: string; title: string; orderIndex?: number; locked?: boolean };
  chapter: { id: string; title: string; orderIndex: number } | null;
  accessStatus: 'LOCKED' | 'UNLOCKED';
  accessSource: string | null;
  canDownload: boolean;
}

type Status = 'ALL' | 'UNLOCKED' | 'LOCKED';

interface Attempt {
  code: string;
  courseId?: string;
  attachmentId?: string;
  confirm?: boolean;
}

/** One code box (top panel or a file's own box): sends the code and keeps the outcome to show. */
function useCodeBox() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CodeProblem | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const last = useRef<Attempt | null>(null);

  const submit = async (attempt: Attempt) => {
    last.current = attempt;
    setBusy(true);
    setProblem(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/activation-codes/redeem-files', { ...attempt, code: tidyCode(attempt.code) });
      const msg = t(`codes.success.${data.type}`, { title: data.title, defaultValue: t('files.redeemSuccess') });
      setSuccess(msg);
      toast.success(msg);
      await queryClient.invalidateQueries({ queryKey: ['student_files'] });
      queryClient.invalidateQueries({ queryKey: ['student_courses'] });
      return true;
    } catch (e) {
      setProblem(describeCodeError(t, e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    problem,
    success,
    submit,
    confirm: () => last.current && submit({ ...last.current, confirm: true }),
    pickFile: (attachmentId: string) => last.current && submit({ ...last.current, attachmentId }),
    reset: () => {
      setProblem(null);
      setSuccess(null);
    },
  };
}

export function FilesTab({ hideHeader = false }: { hideHeader?: boolean }) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [status, setStatus] = useState<Status>('ALL');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ id: string; title: string } | null>(null);
  const [panelCourse, setPanelCourse] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInputRef = useRef<HTMLInputElement>(null);

  const { data: courses } = useQuery({
    queryKey: ['student_courses'],
    queryFn: async () => {
      const res = await api.get('/courses/student?includeMaterialsOnly=true');
      return (Array.isArray(res.data) ? res.data : []) as { id: string; title: string }[];
    },
    enabled: !!profile,
  });

  const { data: files, isLoading, error } = useQuery({
    queryKey: ['student_files'],
    queryFn: async () => (await api.get('/attachments/student/files')).data as StudentFile[],
    enabled: !!profile,
  });

  const all = useMemo(() => files ?? [], [files]);
  const counts = useMemo(() => {
    const scoped = courseFilter ? all.filter((f) => f.course.id === courseFilter) : all;
    return { ALL: scoped.length, UNLOCKED: scoped.filter((f) => f.accessStatus === 'UNLOCKED').length, LOCKED: scoped.filter((f) => f.accessStatus === 'LOCKED').length };
  }, [all, courseFilter]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (f) =>
        (!courseFilter || f.course.id === courseFilter) &&
        (status === 'ALL' || f.accessStatus === status) &&
        (!q || f.title.toLowerCase().includes(q) || f.lecture.title.toLowerCase().includes(q) || (f.chapter?.title ?? '').toLowerCase().includes(q)),
    );
  }, [all, courseFilter, status, search]);

  // Course → chapter → lecture → files, in course order.
  const groups = useMemo(() => buildGroups(visible, all, courses ?? []), [visible, all, courses]);

  // Courses that have files, for the code panel's course picker.
  const fileCourses = useMemo(() => {
    const ids = new Set(all.map((f) => f.course.id));
    const fromList = (courses ?? []).filter((c) => ids.has(c.id));
    const missing = [...ids].filter((id) => !fromList.some((c) => c.id === id)).map((id) => all.find((f) => f.course.id === id)!.course);
    return [...fromList, ...missing];
  }, [all, courses]);
  const defaultPanelCourse = courseFilter || (fileCourses.length === 1 ? fileCourses[0].id : '');
  const chosenPanelCourse = panelCourse || defaultPanelCourse;

  const focusPanel = (courseId: string) => {
    setPanelCourse(courseId);
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => panelInputRef.current?.focus(), 350);
  };

  const handleOpen = async (id: string, title: string, download = false) => {
    try {
      const res = await api.get(`/attachments/${id}/view${download ? '?download=true' : ''}`);
      if (res.data.viewOnly) setViewer({ id, title });
      else if (res.data.url) window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('files.openFailed'));
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-theme-muted">{t('files.signInFirst')}</p>
      </div>
    );
  }

  const lockedInCourse = (courseId: string) => all.filter((f) => f.course.id === courseId && f.accessStatus === 'LOCKED');

  return (
    <div className={`space-y-6 animate-fade-up ${hideHeader ? '' : 'pb-20 max-w-5xl mx-auto'}`}>
      {!hideHeader && (
        <div>
          <h1 className="text-3xl font-display font-bold text-theme-text mb-1">{t('files.title')}</h1>
          <p className="text-theme-muted">{t('files.subtitle')}</p>
        </div>
      )}

      {/* ── The code box ─────────────────────────────────────────────── */}
      <div ref={panelRef}>
        <CodePanel
          courses={fileCourses}
          courseId={chosenPanelCourse}
          onCourseChange={setPanelCourse}
          inputRef={panelInputRef}
          lockedFiles={lockedInCourse}
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
          <input
            dir="auto"
            type="search"
            placeholder={t('files.search')}
            className="input ps-10 py-2.5 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input py-2.5 lg:w-60" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label={t('files.course')}>
          <option value="">{t('files.allCourses')}</option>
          {fileCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-xl border border-theme-border bg-theme-card/50 p-1 shrink-0" role="tablist" aria-label={t('files.status')}>
          {(['ALL', 'UNLOCKED', 'LOCKED'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === s ? 'bg-accent-500 text-white shadow' : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              {t(`files.filter.${s}`)} <span className={status === s ? 'opacity-80' : 'opacity-60'}>{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Files ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-accent-400" />
        </div>
      ) : error ? (
        <ErrorMessage message={t('files.loadFailed')} />
      ) : all.length === 0 ? (
        <EmptyState icon={<FolderOpen className="w-10 h-10" />} title={t('files.noFilesYet')} description={t('files.noFilesYetDesc')} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<Search className="w-10 h-10" />} title={t('files.noFilesFound')} description={t('files.noMatchDesc')} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const isCollapsed = collapsed.has(g.course.id);
            return (
              <section key={g.course.id} className="glass rounded-2xl overflow-hidden">
                <header className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-theme-border">
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 min-w-0 text-start"
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.course.id)) next.delete(g.course.id);
                        else next.add(g.course.id);
                        return next;
                      })
                    }
                    aria-expanded={!isCollapsed}
                  >
                    <span className="w-10 h-10 rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-300 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-theme-text text-lg truncate">{g.course.title}</span>
                      <span className="flex items-center gap-2 mt-1">
                        <ProgressBar value={g.open} max={g.total} className="max-w-[160px] !h-1.5" variant="secondary" />
                        <span className="text-xs text-theme-muted whitespace-nowrap">{t('files.openOf', { open: g.open, total: g.total })}</span>
                      </span>
                    </span>
                    <ChevronDown className={`w-5 h-5 text-theme-muted transition-transform shrink-0 ${isCollapsed ? '-rotate-90 rtl:rotate-90' : ''}`} />
                  </button>
                  {g.lockedForCode > 0 && (
                    <Button size="sm" variant="secondary" icon={<KeyRound className="w-4 h-4" />} onClick={() => focusPanel(g.course.id)}>
                      {t('files.unlockAllHere')}
                    </Button>
                  )}
                </header>

                {!isCollapsed && (
                  <div className="p-2 sm:p-3 space-y-3">
                    {g.chapters.map((ch) => (
                      <div key={ch.key}>
                        {(g.chapters.length > 1 || ch.title) && (
                          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-muted">
                            {ch.title ?? t('files.otherFiles')}
                          </p>
                        )}
                        <div className="space-y-2">
                          {ch.lectures.map((lec) => (
                            <div key={lec.id} className="rounded-xl border border-theme-border bg-theme-bg">
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-theme-border">
                                <p className="text-sm font-semibold text-theme-text truncate flex-1">
                                  {lec.title}
                                </p>
                                {lec.locked && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-warning-500/10 text-warning-700 dark:text-warning-300"
                                    title={t('files.soldWithLectureHint')}
                                  >
                                    <Lock className="w-3 h-3" />
                                    {t('files.soldWithLecture')}
                                  </span>
                                )}
                              </div>
                              <ul className="divide-y divide-theme-border">
                                {lec.files.map((f) => (
                                  <FileRow
                                    key={f.id}
                                    file={f}
                                    open={openRow === f.id}
                                    onToggle={() => setOpenRow(openRow === f.id ? null : f.id)}
                                    onOpen={handleOpen}
                                    lockedFiles={lockedInCourse}
                                  />
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      <SecureFileViewer open={!!viewer} onClose={() => setViewer(null)} title={viewer?.title} attachmentId={viewer?.id} />
    </div>
  );
}

// ─── Code panel (top of the page) ─────────────────────────────────────────────

function CodePanel({
  courses,
  courseId,
  onCourseChange,
  inputRef,
  lockedFiles,
}: {
  courses: { id: string; title: string }[];
  courseId: string;
  onCourseChange: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  lockedFiles: (courseId: string) => StudentFile[];
}) {
  const { t } = useTranslation();
  const box = useCodeBox();
  const [code, setCode] = useState('');
  const [needCourse, setNeedCourse] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!courseId) {
      setNeedCourse(true);
      return;
    }
    setNeedCourse(false);
    if (await box.submit({ code, courseId })) setCode('');
  };

  return (
    <div className="rounded-2xl border-2 border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-theme-card/60 to-transparent p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-accent-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-accent-500/20">
          <KeyRound className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-bold text-theme-text text-lg">{t('files.codePanel.title')}</h2>
          <p className="text-sm text-theme-muted">{t('files.codePanel.desc')}</p>
        </div>
      </div>

      <form onSubmit={send} className="grid grid-cols-1 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] gap-2">
        <select
          className={`input py-2.5 ${needCourse && !courseId ? 'border-error-500 ring-1 ring-error-500/40' : ''}`}
          value={courseId}
          onChange={(e) => {
            onCourseChange(e.target.value);
            setNeedCourse(false);
            box.reset();
          }}
          aria-label={t('files.codePanel.course')}
        >
          <option value="">{t('files.codePanel.chooseCourse')}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <CodeInput value={code} onChange={(v) => { setCode(v); if (box.problem) box.reset(); }} inputRef={inputRef} />
        <Button type="submit" disabled={!code.trim() || box.busy} loading={box.busy} icon={<Unlock className="w-4 h-4" />}>
          {t('files.codePanel.unlock')}
        </Button>
      </form>
      {needCourse && !courseId && <p className="text-sm text-error-600 dark:text-error-400">{t('codes.errors.PICK_COURSE.body')}</p>}
      <p className="text-xs text-theme-muted">{t('files.codePanel.hint')}</p>

      <Outcome box={box} code={code} lockedFiles={lockedFiles} courseId={courseId} />
    </div>
  );
}

function CodeInput({ value, onChange, inputRef, autoFocus }: { value: string; onChange: (v: string) => void; inputRef?: React.RefObject<HTMLInputElement>; autoFocus?: boolean }) {
  const { t } = useTranslation();
  return (
    <input
      ref={inputRef}
      autoFocus={autoFocus}
      dir="ltr"
      inputMode="text"
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      maxLength={40}
      placeholder={CODE_PLACEHOLDER}
      aria-label={t('files.codePanel.codeLabel')}
      className="input py-2.5 font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal text-center md:text-start"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── What happened with the code: success, a question, or a clear explanation ──

function Outcome({
  box,
  code,
  courseId,
  lockedFiles,
  compact = false,
}: {
  box: ReturnType<typeof useCodeBox>;
  code: string;
  courseId?: string;
  lockedFiles: (courseId: string) => StudentFile[];
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState('');

  if (box.success) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-success-500/30 bg-success-500/10 p-3 text-sm text-success-700 dark:text-success-300" role="status">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{box.success}</span>
      </div>
    );
  }
  const p = box.problem;
  if (!p) return null;

  const tone = p.needsChoice ? 'border-accent-500/40 bg-accent-500/10' : 'border-error-500/30 bg-error-500/10';
  const support = ['CODE_ALREADY_USED', 'CODE_WRONG_LEVEL', 'NOT_ELIGIBLE', 'UNKNOWN', 'COURSE_CODE_MATERIALS_ONLY'].includes(p.code);
  const wa = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(t('codes.whatsappText', { code: tidyCode(code) || '-' }))}`;
  const pickList = p.code === 'FILE_CODE_PICK_FILE' ? lockedFiles(p.details.courseId ?? courseId ?? '') : [];

  return (
    <div className={`rounded-xl border p-3 sm:p-4 space-y-3 ${tone} ${compact ? 'text-sm' : ''}`} role="alert">
      <div className="flex items-start gap-2">
        {p.needsChoice ? (
          <KeyRound className="w-4 h-4 mt-0.5 shrink-0 text-accent-600 dark:text-accent-300" />
        ) : (
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-error-600 dark:text-error-400" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-theme-text">{p.title}</p>
          <p className="text-sm text-theme-muted mt-0.5" dir="auto">
            {p.body}
          </p>
          {p.code === 'CODE_NOT_FOUND' && (
            <p className="text-xs text-theme-muted mt-2">
              {t('codes.formatLabel')}{' '}
              <code dir="ltr" className="font-mono px-1.5 py-0.5 rounded bg-theme-card text-theme-text">
                1A2B3C4D-5E6F7A8B-9C0D1E2F
              </code>
            </p>
          )}
        </div>
      </div>

      {p.code === 'FILE_CODE_PICK_FILE' &&
        (pickList.length ? (
          <div className="space-y-2">
            <ul className="max-h-60 overflow-y-auto rounded-lg border border-theme-border bg-theme-bg divide-y divide-theme-border">
              {pickList.map((f) => (
                <li key={f.id}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-theme-card">
                    <input type="radio" name="pick-file" value={f.id} checked={picked === f.id} onChange={() => setPicked(f.id)} className="accent-accent-500" />
                    <TypeIcon type={f.type} small />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-theme-text truncate">{f.title}</span>
                      <span className="block text-[11px] text-theme-muted truncate">{f.lecture.title}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" disabled={!picked || box.busy} loading={box.busy} onClick={() => box.pickFile(picked)} icon={<Unlock className="w-4 h-4" />}>
                {t('codes.actions.unlockPicked')}
              </Button>
              <Button size="sm" variant="ghost" onClick={box.reset}>
                {t('codes.actions.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-theme-muted">{t('codes.noLockedFiles')}</p>
        ))}

      {['CONFIRM_COURSE_FILES', 'CONFIRM_LECTURE', 'CONFIRM_COURSE'].includes(p.code) && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={box.busy} loading={box.busy} onClick={box.confirm} icon={<Unlock className="w-4 h-4" />}>
            {t(`codes.actions.${p.code}`, { count: p.details.opens ?? 0 })}
          </Button>
          <Button size="sm" variant="ghost" onClick={box.reset}>
            {t('codes.actions.keepCode')}
          </Button>
        </div>
      )}

      {p.code === 'LECTURE_CODE_USE_LECTURE_PAGE' && courseId && (
        <Link to={`/course/${courseId}`} className="btn-secondary !py-2 text-sm inline-flex">
          {t('codes.actions.openCourse')}
        </Link>
      )}

      {support && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 text-sm inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {t('codes.actions.support')}
        </a>
      )}
    </div>
  );
}

// ─── One file ─────────────────────────────────────────────────────────────────

function FileRow({
  file,
  open,
  onToggle,
  onOpen,
  lockedFiles,
}: {
  file: StudentFile;
  open: boolean;
  onToggle: () => void;
  onOpen: (id: string, title: string, download?: boolean) => void;
  lockedFiles: (courseId: string) => StudentFile[];
}) {
  const { t } = useTranslation();
  const box = useCodeBox();
  const [code, setCode] = useState('');
  const unlocked = file.accessStatus === 'UNLOCKED';

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <TypeIcon type={file.type} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-theme-text truncate" title={file.title}>
            {file.title}
          </p>
          <p className="text-[11px] text-theme-muted flex items-center gap-1.5 flex-wrap">
            <span>{t(`files.type.${file.type}`, file.type)}</span>
            <span aria-hidden>·</span>
            {unlocked ? (
              <span className="inline-flex items-center gap-1 text-secondary-700 dark:text-secondary-300">
                <Unlock className="w-3 h-3" />
                {file.accessSource ? t(`files.source.${file.accessSource}`, t('files.unlocked')) : t('files.unlocked')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {t('files.locked')}
              </span>
            )}
          </p>
        </div>
        {unlocked ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={() => onOpen(file.id, file.title)} icon={<Eye className="w-4 h-4" />}>
              <span className="hidden sm:inline">{t('files.view')}</span>
            </Button>
            {file.canDownload !== false && (
              <Button size="sm" variant="secondary" onClick={() => onOpen(file.id, file.title, true)} icon={<Download className="w-4 h-4" />} aria-label={t('files.download')}>
                <span className="hidden sm:inline">{t('files.download')}</span>
              </Button>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            variant={open ? 'ghost' : 'secondary'}
            onClick={() => {
              onToggle();
              box.reset();
            }}
            icon={open ? <X className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
          >
            {open ? t('codes.actions.cancel') : t('files.enterCode')}
          </Button>
        )}
      </div>

      {!unlocked && open && (
        <div className="mt-3 ms-0 sm:ms-12 space-y-2">
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (code.trim() && (await box.submit({ code, attachmentId: file.id }))) setCode('');
            }}
          >
            <div className="flex-1">
              <CodeInput value={code} onChange={(v) => { setCode(v); if (box.problem) box.reset(); }} autoFocus />
            </div>
            <Button type="submit" size="sm" disabled={!code.trim() || box.busy} loading={box.busy} icon={<Unlock className="w-4 h-4" />}>
              {t('files.unlockThis')}
            </Button>
          </form>
          <p className="text-xs text-theme-muted">{file.lecture.locked ? t('files.rowHintLocked') : t('files.rowHint')}</p>
          <Outcome box={box} code={code} courseId={file.course.id} lockedFiles={lockedFiles} compact />
        </div>
      )}
    </li>
  );
}

function TypeIcon({ type, small = false }: { type: string; small?: boolean }) {
  const map: Record<string, { icon: JSX.Element; cls: string }> = {
    PDF: { icon: <FileText />, cls: 'bg-error-500/10 text-error-600 dark:text-error-400' },
    SHEET: { icon: <FileSpreadsheet />, cls: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-300' },
    HOMEWORK: { icon: <ClipboardList />, cls: 'bg-warning-500/10 text-warning-700 dark:text-warning-300' },
    ASSIGNMENT: { icon: <ClipboardList />, cls: 'bg-warning-500/10 text-warning-700 dark:text-warning-300' },
    REFERENCE: { icon: <BookMarked />, cls: 'bg-accent-500/10 text-accent-700 dark:text-accent-300' },
  };
  const m = map[type] ?? { icon: <FileIcon />, cls: 'bg-theme-card text-theme-muted' };
  const size = small ? 'w-7 h-7 [&>svg]:w-3.5 [&>svg]:h-3.5' : 'w-9 h-9 [&>svg]:w-4 [&>svg]:h-4';
  return <span className={`${size} rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>{m.icon}</span>;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

interface LectureGroup {
  id: string;
  title: string;
  order: number;
  locked: boolean;
  files: StudentFile[];
}
interface ChapterGroup {
  key: string;
  title: string | null;
  order: number;
  lectures: LectureGroup[];
}
interface CourseGroup {
  course: { id: string; title: string };
  total: number;
  open: number;
  lockedForCode: number;
  chapters: ChapterGroup[];
}

function buildGroups(visible: StudentFile[], all: StudentFile[], courses: { id: string; title: string }[]): CourseGroup[] {
  const courseOrder = new Map(courses.map((c, i) => [c.id, i]));
  const byCourse = new Map<string, CourseGroup>();
  for (const f of visible) {
    let g = byCourse.get(f.course.id);
    if (!g) {
      const inCourse = all.filter((x) => x.course.id === f.course.id);
      g = {
        course: f.course,
        total: inCourse.length,
        open: inCourse.filter((x) => x.accessStatus === 'UNLOCKED').length,
        lockedForCode: inCourse.filter((x) => x.accessStatus === 'LOCKED').length,
        chapters: [],
      };
      byCourse.set(f.course.id, g);
    }
    const chKey = f.chapter?.id ?? '__none';
    let ch = g.chapters.find((c) => c.key === chKey);
    if (!ch) {
      ch = { key: chKey, title: f.chapter?.title ?? null, order: f.chapter?.orderIndex ?? Number.MAX_SAFE_INTEGER, lectures: [] };
      g.chapters.push(ch);
    }
    let lec = ch.lectures.find((l) => l.id === f.lecture.id);
    if (!lec) {
      lec = { id: f.lecture.id, title: f.lecture.title, order: f.lecture.orderIndex ?? 0, locked: !!f.lecture.locked, files: [] };
      ch.lectures.push(lec);
    }
    lec.files.push(f);
  }
  const groups = [...byCourse.values()];
  for (const g of groups) {
    g.chapters.sort((a, b) => a.order - b.order);
    for (const ch of g.chapters) ch.lectures.sort((a, b) => a.order - b.order);
  }
  return groups.sort((a, b) => (courseOrder.get(a.course.id) ?? 999) - (courseOrder.get(b.course.id) ?? 999) || a.course.title.localeCompare(b.course.title));
}
