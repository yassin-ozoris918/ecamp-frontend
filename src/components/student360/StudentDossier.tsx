import toast from 'react-hot-toast';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileText,
  History,
  KeyRound,
  LayoutGrid,
  LogOut,
  Mail,
  Phone,
  PlayCircle,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  TimerReset,
  Users as UsersIcon,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { client } from '../../lib/api';
import { useRouter } from '../../lib/router';
import { Badge, Button, Modal, ProgressBar, Skeleton } from '../ui';
import { ActionsMenu, type ActionItem } from '../common/ActionsMenu';
import { ConfirmDialog, useConfirm } from '../../hooks/useConfirm';
import { QuizAttemptReviewModal } from '../QuizAttemptReviewModal';
import { useTranslation } from 'react-i18next';
import { DeviceLabel, OutcomeBadge, RiskBadge, useReasonText } from '../admin/AdminDevices';
import { formatAcademicProfile, formatDateTime, formatDuration, formatRelative, formatShort } from './format';

export type DossierTab = 'overview' | 'courses' | 'assessments' | 'access' | 'devices' | 'timeline';

type LectureState = 'inProgress' | 'notStarted' | 'done' | 'expired' | 'locked';

const LECTURE_STATE: Record<LectureState, { label: string; variant: 'success' | 'accent' | 'warning' | 'error' | 'default'; dot: string }> = {
  done: { label: 'Completed', variant: 'success', dot: 'bg-secondary-500' },
  inProgress: { label: 'In progress', variant: 'accent', dot: 'bg-accent-500' },
  notStarted: { label: 'Not started', variant: 'warning', dot: 'bg-warning-500' },
  expired: { label: 'Expired', variant: 'error', dot: 'bg-error-500' },
  locked: { label: 'Locked', variant: 'default', dot: 'bg-theme-muted/50' },
};

function lectureState(l: any): LectureState {
  if (!l.isUnlocked) return 'locked';
  if (l.isExpired) return 'expired';
  if (l.totalVideosCount > 0 && l.completedVideosCount >= l.totalVideosCount) return 'done';
  if (l.isStarted || l.watchedVideosCount > 0) return 'inProgress';
  return 'notStarted';
}

const isLimited = (v: any) => v.maxViews !== null && v.maxViews !== undefined;
const isExhausted = (v: any) => isLimited(v) && (v.remainingViews ?? 0) <= 0;
const lectureLimitReached = (l: any) => (l.videos ?? []).some(isExhausted);

const TIMELINE_LABELS: Record<string, string> = {
  REGISTRATION: 'Registration',
  COURSE_ACCESS: 'Course access',
  LECTURE_ACCESS: 'Lecture access',
  CODE_REDEMPTION: 'Codes',
  VIDEO_WATCH: 'Video watches',
  VIDEO_COMPLETE: 'Video completions',
  QUIZ_ATTEMPT: 'Quizzes',
  EXAM_ATTEMPT: 'Exams',
  FILE_ACCESS: 'Files',
  DEVICE_EVENT: 'Device',
  ADMIN_ACTION: 'Admin actions',
  CERTIFICATE: 'Certificates',
  BADGE: 'Badges',
};

interface Props {
  studentId: string;
  tab: DossierTab;
  onTabChange: (tab: DossierTab) => void;
  onClose: () => void;
  /** Called after an account-level change (e.g. suspend) so the directory can refresh. */
  onAccountChanged?: () => void;
  onPrint: (data: any) => void;
  onExportCsv: (data: any) => void;
}

/**
 * Student 360 dossier: everything about one student, grouped by job.
 * Overview (what needs doing) → Courses & videos → Quizzes & exams → Access & codes → Devices → Timeline.
 * Every control sits next to the thing it changes.
 */
export function StudentDossier({ studentId, tab, onTabChange, onClose, onAccountChanged, onPrint, onExportCsv }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const [grantViewsFor, setGrantViewsFor] = useState<any | null>(null);
  const [extendFor, setExtendFor] = useState<any | null>(null);
  const [grantAccessOpen, setGrantAccessOpen] = useState(false);
  const [focusCourseId, setFocusCourseId] = useState<string | null>(null);
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();
  const { navigate } = useRouter();

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [user, progress] = await Promise.all([
          client.get<any>(`/admin/users/${studentId}`),
          client.get<any>(`/admin/users/${studentId}/progress`),
        ]);
        setData({ ...user, ...progress });
      } catch (e) {
        console.error(e);
        toast.error('Could not load this student');
      }
      setLoading(false);
    },
    [studentId],
  );

  useEffect(() => {
    setData(null);
    setFocusCourseId(null);
    load();
  }, [load]);

  /** Run an admin action, show the result, and refresh the dossier in place. */
  const run = async (fn: () => Promise<unknown>, success: string, accountLevel = false) => {
    try {
      await fn();
      toast.success(success);
      await load(true);
      if (accountLevel) onAccountChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Action failed');
    }
  };

  const actions = useMemo(() => {
    const base = `/admin/users/${studentId}`;
    return {
      toggleActive: async (active: boolean) => {
        const ok = await confirm(
          active ? 'Activate account' : 'Suspend account',
          active
            ? 'The student will be able to sign in again.'
            : 'The student will be signed out and cannot sign in until you activate the account again.',
        );
        if (ok) await run(() => client.put(base, { isActive: active }), active ? 'Account activated' : 'Account suspended', true);
      },
      forceLogout: async () => {
        const ok = await confirm('Sign out everywhere', 'The student will have to sign in again on their device.');
        if (ok) await run(() => client.post(`${base}/force-logout`), 'Student signed out');
      },
      resetDevice: async () => {
        const ok = await confirm('Reset device lock', 'The student can then sign in from a new device. The old device is unbound.');
        if (ok) await run(() => client.post(`${base}/reset-device`), 'Device lock reset');
      },
      removeLecture: async (lec: any) => {
        const ok = await confirm('Remove lecture access', `"${lec.lectureTitle}" will be locked for this student. Watch history is kept.`);
        if (ok) await run(() => client.post(`${base}/remove-lecture`, { lectureId: lec.lectureId }), 'Lecture access removed');
      },
      removeCourse: async (course: any) => {
        const ok = await confirm('Remove course access', `Full access to "${course.courseTitle}" will end now. Lectures unlocked with their own code stay unlocked.`);
        if (ok) await run(() => client.post(`${base}/remove-course`, { courseId: course.courseId }), 'Course access removed');
      },
      grantCourse: async (course: any) => {
        const ok = await confirm('Give full course access', `Unlock every lecture of "${course.courseTitle}" for this student, with no expiry.`);
        if (ok) await run(() => client.post(`${base}/grant-course`, { courseId: course.courseId }), 'Course unlocked');
      },
      grantLecture: async (lec: any) => {
        const ok = await confirm('Unlock lecture', `Unlock "${lec.lectureTitle}" for this student, with no expiry.`);
        if (ok) await run(() => client.post(`${base}/grant-lecture`, { lectureId: lec.lectureId }), 'Lecture unlocked');
      },
      resetQuiz: async (quizId: string, title: string) => {
        const ok = await confirm('Reset quiz attempts', `All of this student's attempts at "${title}" will be deleted so they can take it again.`);
        if (ok) await run(() => client.post(`${base}/reset-quiz-attempts`, { quizId }), 'Quiz attempts reset');
      },
      resetExam: async (examId: string, title: string) => {
        const ok = await confirm('Reset exam attempts', `All of this student's attempts at "${title}" will be deleted so they can take it again.`);
        if (ok) await run(() => client.post(`${base}/reset-exam-attempts`, { examId }), 'Exam attempts reset');
      },
    };
  }, [studentId, confirm, load]);

  const openCourse = (courseId: string) => {
    setFocusCourseId(courseId);
    onTabChange('courses');
  };

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const courses: any[] = data.coursesHistory ?? [];
  const quizAttempts: any[] = data.quizAttempts ?? [];
  const examAttempts: any[] = data.examAttempts ?? [];
  const codes: any[] = (data.codeHistory?.length ? data.codeHistory : data.redeemedCodes) ?? [];
  const timeline: any[] = data.timeline ?? [];
  const deviceHistory: any[] = data.deviceHistory ?? [];

  const tabs: { id: DossierTab; label: string; icon: ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" />, count: courses.length },
    { id: 'assessments', label: 'Quizzes & exams', icon: <ClipboardList className="w-4 h-4" />, count: quizAttempts.length + examAttempts.length },
    { id: 'access', label: 'Access', icon: <KeyRound className="w-4 h-4" />, count: codes.length },
    { id: 'devices', label: 'Device', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <History className="w-4 h-4" />, count: timeline.length },
  ];

  const accountItems: ActionItem[] = [
    data.isActive
      ? { label: 'Suspend account', icon: <ShieldOff className="w-4 h-4" />, onClick: () => actions.toggleActive(false), danger: true }
      : { label: 'Activate account', icon: <ShieldCheck className="w-4 h-4" />, onClick: () => actions.toggleActive(true) },
    { label: 'Sign out everywhere', icon: <LogOut className="w-4 h-4" />, onClick: actions.forceLogout },
    {
      label: 'Reset device lock',
      icon: <Smartphone className="w-4 h-4" />,
      onClick: actions.resetDevice,
    },
    {
      label: 'Copy link to this student',
      icon: <Copy className="w-4 h-4" />,
      separated: true,
      onClick: () => copy(`${window.location.origin}${window.location.pathname}#/admin/student-360/${studentId}`, 'Link copied'),
    },
    { label: 'Open users list', icon: <UsersIcon className="w-4 h-4" />, onClick: () => navigate('/admin/users') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header: who + the account-level controls ───────────────────────────── */}
      <header className="shrink-0 border-b border-theme-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <button type="button" onClick={onClose} className="xl:hidden p-2 -ms-2 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-card" aria-label="Back to the list">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <span className="hidden sm:block">
            <Avatar url={data.profilePictureUrl} name={data.fullName} size="lg" />
          </span>
          <div className="flex-1 min-w-[12rem] space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-theme-text truncate">{data.fullName}</h2>
              <Badge variant={data.isActive ? 'success' : 'error'}>{data.isActive ? 'Active' : 'Suspended'}</Badge>
              {data.isDemo && <Badge variant="accent">Demo</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-theme-muted">
              <CopyField icon={<Mail className="w-3.5 h-3.5" />} value={data.email} />
              <CopyField icon={<Phone className="w-3.5 h-3.5" />} value={data.phoneNumber} mono />
              {data.parentPhoneNumber && <CopyField icon={<UsersIcon className="w-3.5 h-3.5" />} label="Parent" value={data.parentPhoneNumber} mono />}
            </div>
            <p className="text-xs text-theme-muted">
              Joined {formatShort(data.createdAt)} · Last sign-in{' '}
              <span title={formatDateTime(data.lastLoginAt)}>{data.lastLoginAt ? formatRelative(data.lastLoginAt) : 'never'}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ms-auto">
            <span className="me-1">
              <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setGrantAccessOpen(true)}>
                Give access
              </Button>
            </span>
            <IconButton title="Print full history / PDF" onClick={() => onPrint(data)}>
              <Printer className="w-4 h-4" />
            </IconButton>
            <IconButton title="Export CSV" onClick={() => onExportCsv(data)}>
              <Download className="w-4 h-4" />
            </IconButton>
            <ActionsMenu items={accountItems} label="Account actions" />
            <IconButton title="Close" onClick={onClose} className="hidden xl:inline-flex">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto scrollbar-thin -mb-1 pb-1" aria-label="Student sections">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-accent-500/15 text-accent-700 dark:text-accent-200' : 'text-theme-muted hover:text-theme-text hover:bg-theme-card'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[11px] px-1.5 rounded-full ${active ? 'bg-accent-500/20' : 'bg-theme-card'}`}>{t.count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 sm:p-5">
        {tab === 'overview' && (
          <OverviewTab
            data={data}
            courses={courses}
            quizAttempts={quizAttempts}
            examAttempts={examAttempts}
            timeline={timeline}
            onOpenCourse={openCourse}
            onGrantViews={setGrantViewsFor}
            onExtend={setExtendFor}
            onActivate={() => actions.toggleActive(true)}
            onResetQuiz={actions.resetQuiz}
            onGoTo={onTabChange}
            onGoGrading={() => navigate('/instructor/grading')}
          />
        )}
        {tab === 'courses' && (
          <CoursesTab
            courses={courses}
            watched={data.allVideosWatched ?? []}
            focusCourseId={focusCourseId}
            onGrantViews={setGrantViewsFor}
            onExtend={setExtendFor}
            actions={actions}
          />
        )}
        {tab === 'assessments' && (
          <AssessmentsTab
            quizAttempts={quizAttempts}
            examAttempts={examAttempts}
            onReview={setReviewAttemptId}
            onResetQuiz={actions.resetQuiz}
            onResetExam={actions.resetExam}
            onGoGrading={() => navigate('/instructor/grading')}
          />
        )}
        {tab === 'access' && (
          <AccessTab courses={courses} codes={codes} onGrant={() => setGrantAccessOpen(true)} onExtend={setExtendFor} actions={actions} />
        )}
        {tab === 'devices' && (
          <DevicesTab studentId={studentId} data={data} history={deviceHistory} onReset={actions.resetDevice} onSignOut={actions.forceLogout} />
        )}
        {tab === 'timeline' && <TimelineTab timeline={timeline} />}
      </div>

      <GrantViewsModal
        video={grantViewsFor}
        onClose={() => setGrantViewsFor(null)}
        onSubmit={async (n) => {
          const v = grantViewsFor;
          setGrantViewsFor(null);
          await run(() => client.post(`/admin/users/${studentId}/sessions/${v.sessionId}/grant-views`, { additionalViews: n }), `Granted ${n} more view${n === 1 ? '' : 's'}`);
        }}
      />
      <ExtendAccessModal
        lecture={extendFor}
        onClose={() => setExtendFor(null)}
        onSubmit={async (days) => {
          const l = extendFor;
          setExtendFor(null);
          await run(() => client.post(`/admin/users/${studentId}/extend-lecture`, { lectureId: l.lectureId, extraDays: days }), `Access extended by ${days} day${days === 1 ? '' : 's'}`);
        }}
      />
      <GrantAccessModal
        open={grantAccessOpen}
        studentName={data.fullName}
        onClose={() => setGrantAccessOpen(false)}
        onGrant={async (type, id, days) => {
          setGrantAccessOpen(false);
          await run(
            () => client.post(`/admin/users/${studentId}/${type === 'COURSE' ? 'grant-course' : 'grant-lecture'}`, type === 'COURSE' ? { courseId: id, validityDays: days } : { lectureId: id, validityDays: days }),
            type === 'COURSE' ? 'Course unlocked' : 'Lecture unlocked',
          );
        }}
      />
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />
      {reviewAttemptId && <QuizAttemptReviewModal attemptId={reviewAttemptId} onClose={() => setReviewAttemptId(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Overview
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({
  data,
  courses,
  quizAttempts,
  examAttempts,
  timeline,
  onOpenCourse,
  onGrantViews,
  onExtend,
  onActivate,
  onResetQuiz,
  onGoTo,
  onGoGrading,
}: {
  data: any;
  courses: any[];
  quizAttempts: any[];
  examAttempts: any[];
  timeline: any[];
  onOpenCourse: (id: string) => void;
  onGrantViews: (v: any) => void;
  onExtend: (l: any) => void;
  onActivate: () => void;
  onResetQuiz: (quizId: string, title: string) => void;
  onGoTo: (t: DossierTab) => void;
  onGoGrading: () => void;
}) {
  const stats = data.summaryStats ?? {};
  const totalVideos = courses.reduce((s, c) => s + (c.totalVideosCount ?? 0), 0);
  const watchedVideos = courses.reduce((s, c) => s + (c.watchedVideosCount ?? 0), 0);
  const graded = [...quizAttempts, ...examAttempts].filter((a) => a.status === 'PASSED' || a.status === 'FAILED');
  const avgScore = graded.length ? Math.round(graded.reduce((s, a) => s + (a.score ?? 0), 0) / graded.length) : null;

  // Things an admin may need to act on, most urgent first.
  const todo: { key: string; tone: 'error' | 'warning' | 'accent'; icon: ReactNode; text: ReactNode; action?: { label: string; onClick: () => void } }[] = [];
  if (!data.isActive) {
    todo.push({ key: 'suspended', tone: 'error', icon: <ShieldOff className="w-4 h-4" />, text: 'This account is suspended. The student cannot sign in.', action: { label: 'Activate', onClick: onActivate } });
  }
  for (const c of courses) {
    for (const l of c.lectures ?? []) {
      for (const v of l.videos ?? []) {
        if (isExhausted(v)) {
          todo.push({
            key: `views-${v.sessionId}`,
            tone: 'warning',
            icon: <Video className="w-4 h-4" />,
            text: (
              <>
                No views left for <strong className="text-theme-text">{v.sessionTitle}</strong> <span className="text-theme-muted">({l.lectureTitle} · {c.courseTitle})</span>
              </>
            ),
            action: { label: 'Grant views', onClick: () => onGrantViews(v) },
          });
        }
      }
      if (l.isExpired && l.hasLectureAccess) {
        todo.push({
          key: `exp-${l.lectureId}`,
          tone: 'warning',
          icon: <CalendarClock className="w-4 h-4" />,
          text: (
            <>
              Access to <strong className="text-theme-text">{l.lectureTitle}</strong> expired {formatRelative(l.expiresAt)} <span className="text-theme-muted">({c.courseTitle})</span>
            </>
          ),
          action: { label: 'Extend', onClick: () => onExtend(l) },
        });
      }
    }
    if (c.hasDirectCourseAccess && c.isExpired) {
      todo.push({
        key: `cexp-${c.courseId}`,
        tone: 'warning',
        icon: <CalendarClock className="w-4 h-4" />,
        text: (
          <>
            Full access to <strong className="text-theme-text">{c.courseTitle}</strong> expired {formatRelative(c.expiresAt)}
          </>
        ),
        action: { label: 'Open course', onClick: () => onOpenCourse(c.courseId) },
      });
    }
  }
  const pendingExams = examAttempts.filter((a) => a.status === 'PENDING' && a.submittedAt);
  if (pendingExams.length) {
    todo.push({
      key: 'grading',
      tone: 'accent',
      icon: <ClipboardList className="w-4 h-4" />,
      text: `${pendingExams.length} exam answer${pendingExams.length === 1 ? '' : 's'} waiting for grading`,
      action: { label: 'Grade', onClick: onGoGrading },
    });
  }
  // Quizzes failed with no attempts left
  const seenQuiz = new Set<string>();
  for (const c of courses) {
    for (const l of c.lectures ?? []) {
      for (const q of l.quizzes ?? []) {
        if (seenQuiz.has(q.quizId)) continue;
        seenQuiz.add(q.quizId);
        if (!q.isPassed && q.maxAttempts > 0 && q.attemptsCount >= q.maxAttempts) {
          todo.push({
            key: `quiz-${q.quizId}`,
            tone: 'warning',
            icon: <XCircle className="w-4 h-4" />,
            text: (
              <>
                Used all {q.maxAttempts} attempt{q.maxAttempts === 1 ? '' : 's'} at <strong className="text-theme-text">{q.quizTitle}</strong> without passing
              </>
            ),
            action: { label: 'Reset attempts', onClick: () => onResetQuiz(q.quizId, q.quizTitle) },
          });
        }
      }
    }
  }

  const toneClass = {
    error: 'bg-error-500/10 text-error-600 dark:text-error-300',
    warning: 'bg-warning-500/10 text-warning-700 dark:text-warning-300',
    accent: 'bg-accent-500/10 text-accent-700 dark:text-accent-300',
  };

  return (
    <div className="space-y-6">
      {/* Key numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        <Stat label="Courses" value={courses.length} icon={<BookOpen className="w-4 h-4" />} onClick={() => onGoTo('courses')} />
        <Stat label="Lectures unlocked" value={stats.totalLecturesUnlocked ?? 0} sub={`${stats.totalLecturesStarted ?? 0} started`} icon={<KeyRound className="w-4 h-4" />} onClick={() => onGoTo('access')} />
        <Stat label="Videos watched" value={`${watchedVideos}/${totalVideos}`} sub={`${stats.totalVideosCompleted ?? 0} completed`} icon={<PlayCircle className="w-4 h-4" />} onClick={() => onGoTo('courses')} />
        <Stat label="Total watches" value={stats.totalConfirmedVideoWatches ?? 0} sub={`${stats.totalVideoStreamOpens ?? 0} stream opens`} icon={<Eye className="w-4 h-4" />} onClick={() => onGoTo('courses')} />
        <Stat label="Quizzes & exams" value={quizAttempts.length + examAttempts.length} sub={avgScore !== null ? `avg ${avgScore}%` : 'no grades yet'} icon={<ClipboardList className="w-4 h-4" />} onClick={() => onGoTo('assessments')} />
        <Stat label="XP · streak" value={data.xp ?? 0} sub={`${data.streakDays ?? 0} day streak`} icon={<Award className="w-4 h-4" />} />
      </div>

      {/* Needs attention */}
      <Section title="Needs attention" icon={<AlertTriangle className="w-4 h-4" />}>
        {todo.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-secondary-500/10 p-3 text-sm text-secondary-700 dark:text-secondary-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Nothing to fix for this student.
          </div>
        ) : (
          <ul className="space-y-2">
            {todo.slice(0, 8).map((item) => (
              <li key={item.key} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-card/50 p-3">
                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${toneClass[item.tone]}`}>{item.icon}</span>
                <p className="flex-1 min-w-0 text-sm text-theme-muted">{item.text}</p>
                {item.action && (
                  <Button size="sm" variant="secondary" onClick={item.action.onClick} className="shrink-0">
                    {item.action.label}
                  </Button>
                )}
              </li>
            ))}
            {todo.length > 8 && <li className="text-xs text-theme-muted ps-1">+{todo.length - 8} more. See Courses & videos.</li>}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        {/* Course progress */}
        <Section title="Course progress" icon={<BookOpen className="w-4 h-4" />} action={courses.length > 0 ? { label: 'All courses', onClick: () => onGoTo('courses') } : undefined}>
          {courses.length === 0 ? (
            <Empty text="This student hasn't opened any course yet." />
          ) : (
            <ul className="space-y-2">
              {courses.map((c) => (
                <li key={c.courseId}>
                  <button type="button" onClick={() => onOpenCourse(c.courseId)} className="w-full text-start rounded-xl border border-theme-border bg-theme-card/50 hover:border-accent-500/40 p-3 transition-colors group">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 font-semibold text-theme-text truncate">{c.courseTitle}</span>
                      <CourseAccessBadge course={c} />
                      <ChevronRight className="w-4 h-4 text-theme-muted rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar value={c.watchedVideosCount} max={c.totalVideosCount || 1} className="flex-1 !h-1.5" />
                      <span className="text-xs text-theme-muted whitespace-nowrap">
                        {c.watchedVideosCount}/{c.totalVideosCount} videos · {c.unlockedLecturesCount}/{c.totalLecturesCount} lectures
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Profile + recent activity */}
        <div className="space-y-6">
          <Section title="Profile" icon={<FileText className="w-4 h-4" />}>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Academic" value={formatAcademicProfile(data)} wide />
              <Field label="Registered" value={formatDateTime(data.createdAt)} />
              <Field label="Last sign-in" value={formatDateTime(data.lastLoginAt)} />
              <Field label="Device" value={data.deviceId ? 'Bound to one device' : 'Not bound yet'} />
              <Field label="Codes redeemed" value={String(stats.totalCodesRedeemed ?? 0)} />
            </dl>
          </Section>
          <Section title="Recent activity" icon={<Activity className="w-4 h-4" />} action={timeline.length > 0 ? { label: 'Full timeline', onClick: () => onGoTo('timeline') } : undefined}>
            {timeline.length === 0 ? (
              <Empty text="No activity yet." />
            ) : (
              <ol className="relative border-s border-theme-border ms-1.5 space-y-3">
                {[...timeline]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 6)
                  .map((ev, i) => (
                    <li key={ev.id || i} className="ms-4">
                      <span className="absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full bg-accent-500/70 border-2 border-theme-bg" />
                      <p className="text-sm text-theme-text">{ev.title}</p>
                      <p className="text-xs text-theme-muted" title={formatDateTime(ev.timestamp)}>
                        {formatRelative(ev.timestamp)}
                        {ev.details ? ` · ${ev.details}` : ''}
                      </p>
                    </li>
                  ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Courses & videos
// ═══════════════════════════════════════════════════════════════════════════

type LectureFilter = 'all' | LectureState | 'limit';

function CoursesTab({
  courses,
  watched,
  focusCourseId,
  onGrantViews,
  onExtend,
  actions,
}: {
  courses: any[];
  watched: any[];
  focusCourseId: string | null;
  onGrantViews: (v: any) => void;
  onExtend: (l: any) => void;
  actions: any;
}) {
  const [view, setView] = useState<'structure' | 'history'>('structure');
  const [filter, setFilter] = useState<LectureFilter>('all');
  const [query, setQuery] = useState('');
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>(() => {
    if (focusCourseId) return { [focusCourseId]: true };
    return courses.length <= 2 ? Object.fromEntries(courses.map((c) => [c.courseId, true])) : courses[0] ? { [courses[0].courseId]: true } : {};
  });
  const [openLectures, setOpenLectures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (focusCourseId) {
      setOpenCourses((p) => ({ ...p, [focusCourseId]: true }));
      requestAnimationFrame(() => document.getElementById(`course-${focusCourseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [focusCourseId]);

  const allLectures = courses.flatMap((c) => c.lectures ?? []);
  const counts: Record<LectureFilter, number> = {
    all: allLectures.length,
    inProgress: allLectures.filter((l) => lectureState(l) === 'inProgress').length,
    notStarted: allLectures.filter((l) => lectureState(l) === 'notStarted').length,
    done: allLectures.filter((l) => lectureState(l) === 'done').length,
    expired: allLectures.filter((l) => lectureState(l) === 'expired').length,
    limit: allLectures.filter(lectureLimitReached).length,
    locked: allLectures.filter((l) => lectureState(l) === 'locked').length,
  };
  const filters: { id: LectureFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'inProgress', label: 'In progress' },
    { id: 'notStarted', label: 'Not started' },
    { id: 'done', label: 'Completed' },
    { id: 'limit', label: 'No views left' },
    { id: 'expired', label: 'Expired' },
    { id: 'locked', label: 'Locked' },
  ];

  const q = query.trim().toLowerCase();
  const matches = (l: any) => {
    if (filter === 'limit' ? !lectureLimitReached(l) : filter !== 'all' && lectureState(l) !== filter) return false;
    if (!q) return true;
    return (
      String(l.lectureTitle ?? '').toLowerCase().includes(q) ||
      String(l.chapterTitle ?? '').toLowerCase().includes(q) ||
      (l.videos ?? []).some((v: any) => String(v.sessionTitle ?? '').toLowerCase().includes(q))
    );
  };
  const narrowing = filter !== 'all' || !!q;

  const setAll = (open: boolean) => {
    setOpenCourses(Object.fromEntries(courses.map((c) => [c.courseId, open])));
    if (!open) setOpenLectures({});
  };

  if (courses.length === 0) return <Empty text="This student hasn't opened any course yet." />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'structure' | 'history')}
          options={[
            { id: 'structure', label: 'By course' },
            { id: 'history', label: `Watch history (${watched.length})` },
          ]}
        />
        {view === 'structure' && (
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="Find a lecture or video…" />
            <div className="flex gap-2 lg:ms-auto">
              <Button size="sm" variant="ghost" onClick={() => setAll(true)}>
                Expand all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAll(false)}>
                Collapse all
              </Button>
            </div>
          </>
        )}
      </div>

      {view === 'history' ? (
        <WatchHistory watched={watched} onGrantViews={onGrantViews} />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} count={counts[f.id]} disabled={f.id !== 'all' && counts[f.id] === 0}>
                {f.label}
              </Chip>
            ))}
          </div>

          {courses.map((course) => {
            const lectures = (course.lectures ?? []).filter(matches);
            if (narrowing && lectures.length === 0) return null;
            const open = narrowing || !!openCourses[course.courseId];
            const courseItems: ActionItem[] = [
              course.hasDirectCourseAccess && !course.isExpired
                ? { label: 'Remove full course access', icon: <XCircle className="w-4 h-4" />, danger: true, onClick: () => actions.removeCourse(course) }
                : { label: course.isExpired ? 'Give full access again' : 'Give full course access', icon: <KeyRound className="w-4 h-4" />, onClick: () => actions.grantCourse(course), disabled: course.isFree, hint: 'Free course: everyone has access' },
            ];
            return (
              <section key={course.courseId} id={`course-${course.courseId}`} className="rounded-2xl border border-theme-border overflow-hidden scroll-mt-4">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-theme-card/60">
                  <button
                    type="button"
                    onClick={() => setOpenCourses((p) => ({ ...p, [course.courseId]: !open }))}
                    className="flex-1 min-w-0 flex items-center gap-3 text-start"
                    aria-expanded={open}
                  >
                    {open ? <ChevronDown className="w-4 h-4 text-accent-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-theme-muted shrink-0 rtl:rotate-180" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-theme-text">{course.courseTitle}</span>
                        <CourseAccessBadge course={course} />
                      </div>
                      <p className="text-xs text-theme-muted mt-0.5">
                        {course.unlockedAt ? `Unlocked ${formatShort(course.unlockedAt)}` : 'Lecture-by-lecture access'}
                        {course.hasDirectCourseAccess && (course.expiresAt ? ` · ${course.isExpired ? 'Expired' : 'Expires'} ${formatShort(course.expiresAt)}` : ' · No expiry')}
                        {course.codesUsed?.length > 0 && (
                          <span title={course.codesUsed.map((c: any) => c.code).join(', ')}>
                            {' '}
                            · {course.codesUsed.length === 1 ? `Code ${course.codesUsed[0].code}` : `${course.codesUsed.length} codes`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="hidden md:block w-48 shrink-0">
                      <div className="flex justify-between text-[11px] text-theme-muted mb-1">
                        <span>
                          {course.watchedVideosCount}/{course.totalVideosCount} videos
                        </span>
                        <span>
                          {course.unlockedLecturesCount}/{course.totalLecturesCount} lectures
                        </span>
                      </div>
                      <ProgressBar value={course.watchedVideosCount} max={course.totalVideosCount || 1} className="!h-1.5" />
                    </div>
                  </button>
                  <ActionsMenu items={courseItems} label="Course actions" />
                </div>

                {open && (
                  <div className="divide-y divide-theme-border">
                    {groupByChapter(lectures).map((group) => (
                      <div key={group.key}>
                        <div className="px-4 py-2 bg-theme-bg/40 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
                          <span className="truncate">{group.title}</span>
                          <span className="font-normal normal-case tracking-normal">· {group.lectures.length} lecture{group.lectures.length === 1 ? '' : 's'}</span>
                        </div>
                        <ul className="divide-y divide-theme-border/60">
                          {group.lectures.map((lec: any) => (
                            <LectureRow
                              key={lec.lectureId}
                              lec={lec}
                              open={!!openLectures[lec.lectureId] || (!!q && (lec.videos ?? []).some((v: any) => String(v.sessionTitle ?? '').toLowerCase().includes(q)))}
                              onToggle={() => setOpenLectures((p) => ({ ...p, [lec.lectureId]: !p[lec.lectureId] }))}
                              onGrantViews={onGrantViews}
                              onExtend={onExtend}
                              actions={actions}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                    {lectures.length === 0 && <p className="p-4 text-sm text-theme-muted">This course has no lectures.</p>}
                  </div>
                )}
              </section>
            );
          })}
          {narrowing && courses.every((c) => (c.lectures ?? []).filter(matches).length === 0) && <Empty text="No lectures match." />}
        </>
      )}
    </div>
  );
}

function groupByChapter(lectures: any[]) {
  const groups = new Map<string, { key: string; title: string; order: number; lectures: any[] }>();
  lectures.forEach((l, i) => {
    const key = l.chapterId ?? '__none__';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: l.chapterTitle ?? 'Without chapter',
        order: l.chapterId ? (l.chapterOrder ?? 1e6 + i) : 1e9,
        lectures: [],
      });
    }
    groups.get(key)!.lectures.push(l);
  });
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

function LectureRow({
  lec,
  open,
  onToggle,
  onGrantViews,
  onExtend,
  actions,
}: {
  lec: any;
  open: boolean;
  onToggle: () => void;
  onGrantViews: (v: any) => void;
  onExtend: (l: any) => void;
  actions: any;
}) {
  const state = lectureState(lec);
  const meta = LECTURE_STATE[state];
  const limitHit = lectureLimitReached(lec);
  const items: ActionItem[] = [];
  if (lec.hasLectureAccess && lec.expiresAt) items.push({ label: 'Extend access', icon: <TimerReset className="w-4 h-4" />, onClick: () => onExtend(lec) });
  if (state === 'locked' || (lec.isExpired && !lec.hasLectureAccess)) items.push({ label: 'Unlock this lecture', icon: <KeyRound className="w-4 h-4" />, onClick: () => actions.grantLecture(lec) });
  if (lec.hasLectureAccess && !lec.isExpired) items.push({ label: 'Remove lecture access', icon: <XCircle className="w-4 h-4" />, danger: true, separated: items.length > 0, onClick: () => actions.removeLecture(lec) });

  const accessLine = [
    lec.accessSource === 'LECTURE' ? 'Own access' : lec.accessSource === 'COURSE' ? 'Via course' : lec.accessSource === 'FREE' ? 'Free' : null,
    lec.activatedAt ? `Started ${formatShort(lec.activatedAt)}` : lec.unlockedAt ? `Unlocked ${formatShort(lec.unlockedAt)}` : null,
    lec.expiresAt ? `${lec.isExpired ? 'Expired' : 'Expires'} ${formatRelative(lec.expiresAt)}` : lec.isUnlocked ? 'No expiry' : null,
    lec.maxViews !== null && lec.maxViews !== undefined ? `${lec.maxViews} views per video` : null,
    lec.codesUsed?.length ? (lec.codesUsed.length === 1 ? `Code ${lec.codesUsed[0].code}` : `${lec.codesUsed.length} codes`) : null,
  ].filter(Boolean);

  return (
    <li>
      <div className={`flex items-center gap-3 px-4 py-3 ${open ? 'bg-theme-card/40' : 'hover:bg-theme-card/30'}`}>
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 flex items-center gap-3 text-start" aria-expanded={open}>
          {open ? <ChevronDown className="w-4 h-4 text-theme-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-theme-muted shrink-0 rtl:rotate-180" />}
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-theme-text">{lec.lectureTitle}</span>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {limitHit && <Badge variant="error">No views left</Badge>}
            </div>
            <p className="text-xs text-theme-muted mt-0.5 truncate" title={lec.expiresAt ? formatDateTime(lec.expiresAt) : undefined}>
              {accessLine.join(' · ')}
            </p>
          </div>
          <div className="hidden sm:block w-36 shrink-0 text-end">
            <p className="text-xs text-theme-muted">
              <span className="text-theme-text font-semibold">
                {lec.watchedVideosCount}/{lec.totalVideosCount}
              </span>{' '}
              videos · {lec.totalWatchesCount} watch{lec.totalWatchesCount === 1 ? '' : 'es'}
            </p>
            <ProgressBar value={lec.watchedVideosCount} max={lec.totalVideosCount || 1} className="!h-1 mt-1" />
          </div>
        </button>
        {items.length > 0 ? <ActionsMenu items={items} label="Lecture actions" /> : <span className="w-8" />}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 bg-theme-card/40">
          {lec.videos?.length ? (
            <div className="rounded-xl border border-theme-border overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_auto] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-theme-muted bg-theme-bg/40">
                <span>Video</span>
                <span>Views used</span>
                <span>Status</span>
                <span>Last watched</span>
                <span className="w-40 text-end">Controls</span>
              </div>
              <ul className="divide-y divide-theme-border/60">
                {lec.videos.map((v: any) => (
                  <VideoRow key={v.sessionId} v={v} onGrantViews={onGrantViews} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-theme-muted">No videos in this lecture.</p>
          )}

          {lec.quizzes?.length > 0 && (
            <div className="rounded-xl border border-theme-border divide-y divide-theme-border/60">
              {lec.quizzes.map((qz: any) => (
                <div key={qz.quizId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <ClipboardList className="w-4 h-4 text-theme-muted shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-theme-text">{qz.quizTitle}</span>
                  <span className="text-xs text-theme-muted whitespace-nowrap">
                    {qz.attemptsCount}/{qz.maxAttempts || '∞'} attempts{qz.bestScore !== null ? ` · best ${Math.round(qz.bestScore)}%` : ''}
                  </span>
                  {qz.attemptsCount === 0 ? <Badge>Not taken</Badge> : qz.isPassed ? <Badge variant="success">Passed</Badge> : <Badge variant="error">Not passed</Badge>}
                  <Button size="sm" variant="ghost" icon={<RotateCcw className="w-3.5 h-3.5" />} disabled={qz.attemptsCount === 0} onClick={() => actions.resetQuiz(qz.quizId, qz.quizTitle)} title="Delete this student's attempts so they can retake it">
                    Reset
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function VideoRow({ v, onGrantViews }: { v: any; onGrantViews: (v: any) => void }) {
  const [showLog, setShowLog] = useState(false);
  const limited = isLimited(v);
  const used = v.usedViews ?? 0;
  const max = v.effectiveMaxViews ?? 0;
  const exhausted = isExhausted(v);
  return (
    <li className={exhausted ? 'bg-error-500/[0.04]' : ''}>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_auto] gap-x-3 gap-y-2 px-3 py-2.5 items-center text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <PlayCircle className={`w-4 h-4 shrink-0 ${v.isWatched ? 'text-secondary-500' : 'text-theme-muted'}`} />
          <div className="min-w-0">
            <p className="text-theme-text truncate">{v.sessionTitle}</p>
            <p className="text-[11px] text-theme-muted">
              {formatDuration(v.duration)}
              {v.hasVideo === false && ' · no video'}
            </p>
          </div>
        </div>
        <div className="min-w-0">
          {limited ? (
            <>
              <div className="flex items-baseline justify-between text-xs">
                <span className={exhausted ? 'text-error-500 font-semibold' : 'text-theme-text font-semibold'}>
                  {used}/{max}
                </span>
                <span className="text-theme-muted">
                  {v.remainingViews ?? 0} left{v.grantedViews > 0 ? ` · +${v.grantedViews} granted` : ''}
                </span>
              </div>
              <ProgressBar value={used} max={max || 1} variant={exhausted ? 'gold' : 'accent'} className="!h-1 mt-1" />
            </>
          ) : (
            <span className="text-xs text-theme-muted">
              {v.watchCount ?? used}× watched · unlimited
            </span>
          )}
          <p className="text-[11px] text-theme-muted mt-0.5">{v.streamOpensCount ?? 0} stream opens</p>
        </div>
        <div>{v.isCompleted ? <Badge variant="success">Completed</Badge> : v.isWatched ? <Badge variant="accent">Watched</Badge> : <Badge>Not watched</Badge>}</div>
        <div className="text-xs text-theme-muted" title={`First: ${formatDateTime(v.firstWatchedAt)}\nLast: ${formatDateTime(v.lastWatchedAt)}`}>
          {v.lastWatchedAt ? (
            <>
              <p className="text-theme-text">{formatRelative(v.lastWatchedAt)}</p>
              <p>first {formatShort(v.firstWatchedAt)}</p>
            </>
          ) : (
            '—'
          )}
        </div>
        <div className="flex items-center gap-1.5 md:w-40 md:justify-end">
          {v.playbackLogs?.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowLog((s) => !s)} aria-expanded={showLog}>
              {showLog ? 'Hide log' : `Log (${v.playbackLogs.length})`}
            </Button>
          )}
          {limited && (
            <Button size="sm" variant={exhausted ? 'primary' : 'secondary'} icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onGrantViews(v)}>
              Views
            </Button>
          )}
        </div>
      </div>
      {showLog && (
        <div className="px-3 pb-3">
          <div className="rounded-lg bg-theme-bg/50 p-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {v.playbackLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] bg-theme-card">
                <span className="text-theme-muted">
                  <strong className="text-theme-text">#{log.index}</strong> {formatDateTime(log.openedAt)}
                </span>
                <span className={log.consumed ? 'text-secondary-600 dark:text-secondary-300' : 'text-theme-muted'}>{log.consumed ? 'counted' : 'opened'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function WatchHistory({ watched, onGrantViews }: { watched: any[]; onGrantViews: (v: any) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = [...watched]
    .filter((v) => !q || [v.sessionTitle, v.lectureTitle, v.courseTitle].some((s) => String(s ?? '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.lastWatchedAt ?? 0).getTime() - new Date(a.lastWatchedAt ?? 0).getTime());
  if (watched.length === 0) return <Empty text="No videos watched yet." />;
  return (
    <div className="space-y-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Find a video…" />
      <Table head={['Video', 'Course · lecture', 'Watched', 'Views left', 'Last watched', '']}>
        {rows.map((v) => (
          <tr key={v.sessionId} className="hover:bg-theme-card/40">
            <td className="p-2.5 font-medium text-theme-text">{v.sessionTitle}</td>
            <td className="p-2.5 text-theme-muted">
              {v.courseTitle}
              <span className="block text-[11px]">{v.lectureTitle}</span>
            </td>
            <td className="p-2.5 text-theme-text">
              {v.watchCount ?? v.usedViews ?? 0}× {v.isCompleted && <Badge variant="success" className="ms-1">Done</Badge>}
            </td>
            <td className="p-2.5">{isLimited(v) ? <span className={isExhausted(v) ? 'text-error-500 font-semibold' : 'text-theme-text'}>{v.remainingViews}</span> : <span className="text-theme-muted">∞</span>}</td>
            <td className="p-2.5 text-theme-muted" title={formatDateTime(v.lastWatchedAt)}>
              {formatRelative(v.lastWatchedAt)}
            </td>
            <td className="p-2.5 text-end">
              {isLimited(v) && (
                <Button size="sm" variant="ghost" onClick={() => onGrantViews(v)}>
                  + Views
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quizzes & exams
// ═══════════════════════════════════════════════════════════════════════════

function AssessmentsTab({
  quizAttempts,
  examAttempts,
  onReview,
  onResetQuiz,
  onResetExam,
  onGoGrading,
}: {
  quizAttempts: any[];
  examAttempts: any[];
  onReview: (id: string) => void;
  onResetQuiz: (id: string, title: string) => void;
  onResetExam: (id: string, title: string) => void;
  onGoGrading: () => void;
}) {
  type F = 'all' | 'quiz' | 'exam' | 'PASSED' | 'FAILED' | 'PENDING';
  const [filter, setFilter] = useState<F>('all');
  const rows = [
    ...quizAttempts.map((a) => ({ ...a, kind: 'quiz' as const, title: a.quizTitle || 'Quiz', refId: a.quizId })),
    ...examAttempts.map((a) => ({ ...a, kind: 'exam' as const, title: a.examTitle || 'Exam', refId: a.examId })),
  ].sort((a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
  const count = (f: F) => rows.filter((r) => f === 'all' || r.kind === f || r.status === f).length;
  const shown = rows.filter((r) => filter === 'all' || r.kind === filter || r.status === filter);
  const filters: { id: F; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'quiz', label: 'Quizzes' },
    { id: 'exam', label: 'Exams' },
    { id: 'PASSED', label: 'Passed' },
    { id: 'FAILED', label: 'Failed' },
    { id: 'PENDING', label: 'To grade' },
  ];

  if (rows.length === 0) return <Empty text="No quiz or exam attempts yet." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} count={count(f.id)} disabled={f.id !== 'all' && count(f.id) === 0}>
            {f.label}
          </Chip>
        ))}
      </div>
      <Table head={['', 'Title', 'Score', 'Result', 'Submitted', 'Controls']}>
        {shown.map((a, i) => {
          const items: ActionItem[] = [];
          if (a.kind === 'quiz' && a.attemptId) items.push({ label: 'Review answers', icon: <Eye className="w-4 h-4" />, onClick: () => onReview(a.attemptId) });
          if (a.kind === 'exam' && a.status === 'PENDING') items.push({ label: 'Open grading queue', icon: <ClipboardList className="w-4 h-4" />, onClick: onGoGrading });
          if (a.refId)
            items.push({
              label: `Reset all attempts at this ${a.kind}`,
              icon: <RotateCcw className="w-4 h-4" />,
              danger: true,
              separated: items.length > 0,
              onClick: () => (a.kind === 'quiz' ? onResetQuiz(a.refId, a.title) : onResetExam(a.refId, a.title)),
            });
          return (
            <tr key={a.attemptId || `${a.kind}-${i}`} className="hover:bg-theme-card/40">
              <td className="p-2.5">
                <Badge variant={a.kind === 'exam' ? 'gold' : 'info'}>{a.kind === 'exam' ? 'Exam' : 'Quiz'}</Badge>
              </td>
              <td className="p-2.5">
                <p className="font-medium text-theme-text">{a.title}</p>
                <p className="text-[11px] text-theme-muted">{[a.courseTitle, a.lectureTitle].filter(Boolean).join(' · ')}</p>
              </td>
              <td className="p-2.5 text-theme-text whitespace-nowrap">
                {a.status === 'PENDING' ? (
                  <span className="text-theme-muted">—</span>
                ) : a.totalPoints > 0 ? (
                  <>
                    {a.earnedPoints}/{a.totalPoints} <span className="text-theme-muted">({Math.round(a.score ?? 0)}%)</span>
                  </>
                ) : (
                  `${Math.round(a.score ?? 0)}%`
                )}
              </td>
              <td className="p-2.5">
                <Badge variant={a.status === 'PASSED' ? 'success' : a.status === 'FAILED' ? 'error' : 'warning'} className="whitespace-nowrap">
                  {a.status === 'PASSED' ? 'Passed' : a.status === 'FAILED' ? 'Failed' : 'To grade'}
                </Badge>
              </td>
              <td className="p-2.5 text-theme-muted whitespace-nowrap" title={formatDateTime(a.submittedAt || a.startedAt)}>
                {formatShort(a.submittedAt || a.startedAt)}
              </td>
              <td className="p-2.5 text-end">
                <div className="flex items-center justify-end gap-1">
                  {a.kind === 'quiz' && a.attemptId && (
                    <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => onReview(a.attemptId)}>
                      Review
                    </Button>
                  )}
                  {items.length > 0 && <ActionsMenu items={items} label="Attempt actions" />}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Access & codes
// ═══════════════════════════════════════════════════════════════════════════

function AccessTab({ courses, codes, onGrant, onExtend, actions }: { courses: any[]; codes: any[]; onGrant: () => void; onExtend: (l: any) => void; actions: any }) {
  const ownLectures = courses.flatMap((c) => (c.lectures ?? []).filter((l: any) => l.hasLectureAccess).map((l: any) => ({ ...l, courseTitle: c.courseTitle })));
  const fullCourses = courses.filter((c) => c.hasDirectCourseAccess || c.isFree);
  return (
    <div className="space-y-6">
      <Section
        title="What this student can open"
        icon={<KeyRound className="w-4 h-4" />}
        action={{ label: 'Give access', onClick: onGrant }}
      >
        {fullCourses.length === 0 && ownLectures.length === 0 ? (
          <Empty text="No access granted yet." />
        ) : (
          <div className="space-y-2">
            {fullCourses.map((c) => (
              <div key={c.courseId} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-card/50 p-3 text-sm">
                <BookOpen className="w-4 h-4 text-theme-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-theme-text truncate">{c.courseTitle}</p>
                  <p className="text-xs text-theme-muted">
                    Whole course
                    {c.unlockedAt ? ` · since ${formatShort(c.unlockedAt)}` : ''}
                    {c.expiresAt ? ` · ${c.isExpired ? 'expired' : 'expires'} ${formatShort(c.expiresAt)}` : ' · no expiry'}
                  </p>
                </div>
                <CourseAccessBadge course={c} />
                {c.hasDirectCourseAccess && !c.isExpired && (
                  <Button size="sm" variant="ghost" onClick={() => actions.removeCourse(c)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {ownLectures.map((l) => (
              <div key={l.lectureId} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-card/50 p-3 text-sm">
                <PlayCircle className="w-4 h-4 text-theme-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-theme-text truncate">{l.lectureTitle}</p>
                  <p className="text-xs text-theme-muted truncate">
                    {l.courseTitle}
                    {l.chapterTitle ? ` · ${l.chapterTitle}` : ''}
                    {l.expiresAt ? ` · ${l.isExpired ? 'expired' : 'expires'} ${formatRelative(l.expiresAt)}` : ' · no expiry'}
                  </p>
                </div>
                <Badge variant={l.isExpired ? 'error' : 'accent'}>{l.isExpired ? 'Expired' : 'Lecture'}</Badge>
                {l.expiresAt && (
                  <Button size="sm" variant="ghost" icon={<TimerReset className="w-3.5 h-3.5" />} onClick={() => onExtend(l)}>
                    Extend
                  </Button>
                )}
                {!l.isExpired && (
                  <Button size="sm" variant="ghost" onClick={() => actions.removeLecture(l)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Codes redeemed (${codes.length})`} icon={<KeyRound className="w-4 h-4" />}>
        {codes.length === 0 ? (
          <Empty text="No activation codes redeemed yet." />
        ) : (
          <Table head={['Code', 'Action', 'For', 'When', 'IP · browser']}>
            {codes.map((c: any) => (
              <tr key={c.id} className="hover:bg-theme-card/40">
                <td className="p-2.5">
                  <button type="button" onClick={() => copy(c.code, 'Code copied')} className="font-mono font-semibold text-gold-700 dark:text-gold-300 hover:underline" title="Copy">
                    {c.code}
                  </button>
                </td>
                <td className="p-2.5">
                  <Badge variant="success">{String(c.action || c.status || 'REDEEMED').replace(/_/g, ' ').toLowerCase()}</Badge>
                </td>
                <td className="p-2.5">
                  <p className="text-theme-text">{c.courseTitle || '—'}</p>
                  {(c.lectureTitle || c.attachmentTitle) && <p className="text-[11px] text-theme-muted">{c.lectureTitle || c.attachmentTitle}</p>}
                </td>
                <td className="p-2.5 text-theme-muted whitespace-nowrap" title={formatDateTime(c.createdAt || c.redeemedAt)}>
                  {formatShort(c.createdAt || c.redeemedAt)}
                </td>
                <td className="p-2.5 text-theme-muted text-[11px] max-w-[16rem] truncate" title={c.browser}>
                  {[c.ipAddress, c.browser].filter(Boolean).join(' · ') || '—'}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Device & sign-in
// ═══════════════════════════════════════════════════════════════════════════

function DevicesTab({ studentId, data, history, onReset, onSignOut }: { studentId: string; data: any; history: any[]; onReset: () => void; onSignOut: () => void }) {
  const { t, i18n } = useTranslation();
  const reasons = useReasonText();
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();
  const [info, setInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setInfo(await client.get<any>(`/admin/devices/students/${studentId}`));
    } catch {
      setInfo(null);
    }
    setLoading(false);
  }, [studentId]);
  useEffect(() => {
    load();
  }, [load]);

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString(i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Action failed');
    }
  };
  const removeBrowser = async (b: any) => {
    if (await confirm(t('devicesAdmin.removeBrowserTitle'), t('devicesAdmin.removeBrowserMsg', { browser: b.name })))
      run(() => client.post(`/admin/devices/browsers/${b.id}/revoke`), t('devicesAdmin.browserRemoved'));
  };
  const review = async (r: any, action: 'approve' | 'reject') => {
    const ok = await confirm(
      action === 'approve' ? t('devicesAdmin.approveTitle') : t('devicesAdmin.rejectTitle'),
      action === 'approve' ? t('devicesAdmin.approveMsg', { name: data.fullName, device: r.label }) : t('devicesAdmin.rejectMsg', { name: data.fullName }),
    );
    if (ok) run(() => client.post(`/admin/devices/requests/${r.id}/${action}`, {}), action === 'approve' ? t('devicesAdmin.approved') : t('devicesAdmin.rejected'));
  };

  if (loading) return <Skeleton className="h-48" />;
  const active = info?.activeDevice;
  const pending = info?.requests?.find((r: any) => r.status === 'PENDING');
  const liveBrowsers = (active?.browsers ?? []).filter((b: any) => !b.revokedAt);

  return (
    <div className="space-y-6">
      {/* Pending change request */}
      {pending && (
        <div className="rounded-2xl border border-warning-500/30 bg-warning-500/5 p-4 space-y-3">
          <p className="font-semibold text-theme-text">{t('devicesAdmin.pendingForStudent')}</p>
          <DeviceLabel kind={pending.kind} label={pending.label} sub={[pending.browserName, fmt(pending.createdAt)].filter(Boolean).join(' · ')} />
          {pending.note && <p className="text-sm text-theme-muted" dir="auto">“{pending.note}”</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => review(pending, 'approve')}>{t('devicesAdmin.approve')}</Button>
            <Button size="sm" variant="ghost" onClick={() => review(pending, 'reject')}>{t('devicesAdmin.reject')}</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Trusted device */}
        <div className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">{t('devicesAdmin.trustedDevice')}</p>
            {info?.risk && info.risk.level !== 'low' && <RiskBadge level={info.risk.level} score={info.risk.score} />}
          </div>
          {active ? (
            <>
              <DeviceLabel kind={active.kind} label={active.label} sub={`${t('devicesAdmin.linkedSince', { when: fmt(active.createdAt) })} · ${t('devicesAdmin.lastUsed', { when: fmt(active.lastSeenAt) })}`} />
              <div>
                <p className="text-[11px] text-theme-muted mb-1.5">{t('devicesAdmin.browsersOn', { count: liveBrowsers.length, max: info.maxBrowsers })}</p>
                <ul className="space-y-1.5">
                  {active.browsers.map((b: any) => (
                    <li key={b.id} className={`flex items-center gap-2 rounded-xl bg-theme-bg/40 px-3 py-2 text-sm ${b.revokedAt ? 'opacity-50' : ''}`}>
                      <span className="flex-1 min-w-0">
                        <span className="text-theme-text">{b.name}</span>
                        <span className="block text-[11px] text-theme-muted truncate">
                          {b.revokedAt ? t('devicesAdmin.removedOn', { when: fmt(b.revokedAt) }) : `${t('devicesAdmin.lastUsed', { when: fmt(b.lastSeenAt) })}${b.lastIp ? ` · ${b.lastIp}` : ''}`}
                        </span>
                      </span>
                      {!b.revokedAt && (
                        <Button size="sm" variant="ghost" onClick={() => removeBrowser(b)}>
                          {t('devicesAdmin.remove')}
                        </Button>
                      )}
                    </li>
                  ))}
                  {active.browsers.length === 0 && <li className="text-xs text-theme-muted">{t('devicesAdmin.noBrowsers')}</li>}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-theme-muted">{data.deviceId ? t('devicesAdmin.oldLinkOnly') : t('devicesAdmin.noDeviceYet')}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={async () => { await onReset(); await load(); }}>
              {t('devicesAdmin.resetDevice')}
            </Button>
            <Button size="sm" variant="ghost" icon={<LogOut className="w-3.5 h-3.5" />} onClick={onSignOut}>
              {t('devicesAdmin.signOutEverywhere')}
            </Button>
          </div>
        </div>

        {/* Risk */}
        <div className="rounded-2xl border border-theme-border bg-theme-card/50 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-muted">{t('devicesAdmin.sharingCheck')}</p>
          {info?.risk?.reasons?.length ? (
            <ul className="space-y-1">
              {info.risk.reasons.map((r: any, i: number) => (
                <li key={i} className="text-sm text-theme-text">• {reasons.risk(r)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-secondary-700 dark:text-secondary-300">{t('devicesAdmin.noSigns')}</p>
          )}
          {info?.pastDevices?.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] text-theme-muted mb-1">{t('devicesAdmin.pastDevices')}</p>
              <ul className="space-y-1">
                {info.pastDevices.map((d: any) => (
                  <li key={d.id} className="text-xs text-theme-muted">
                    {d.label} · {fmt(d.createdAt)} → {fmt(d.endedAt)} ({t(`devicesAdmin.ended.${d.endReason}`, d.endReason ?? '')})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Section title={t('devicesAdmin.recentSignIns')} icon={<History className="w-4 h-4" />}>
        {!info?.attempts?.length ? (
          <Empty text={t('devicesAdmin.noActivity')} />
        ) : (
          <Table head={[t('devicesAdmin.col.when'), t('devicesAdmin.col.result'), t('devicesAdmin.col.device'), t('devicesAdmin.col.why')]}>
            {info.attempts.map((a: any) => (
              <tr key={a.id} className="hover:bg-theme-card/40 align-top">
                <td className="p-2.5 text-theme-muted whitespace-nowrap">{fmt(a.createdAt)}</td>
                <td className="p-2.5"><OutcomeBadge outcome={a.outcome} /></td>
                <td className="p-2.5"><DeviceLabel kind={a.kind} label={a.label} sub={[a.browserName, a.ipAddress].filter(Boolean).join(' · ')} /></td>
                <td className="p-2.5 text-theme-muted">{reasons.attempt(a.reason)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {history.length > 0 && (
        <Section title={t('devicesAdmin.olderHistory', { count: history.length })} icon={<History className="w-4 h-4" />}>
          <Table head={['Event', 'IP address', 'Browser', 'When']}>
            {history.map((dh: any) => (
              <tr key={dh.id} className="hover:bg-theme-card/40">
                <td className="p-2.5">
                  <Badge variant={dh.action === 'RESET' ? 'warning' : dh.action === 'REGISTERED' ? 'success' : 'default'}>{String(dh.action).toLowerCase()}</Badge>
                </td>
                <td className="p-2.5 text-theme-muted">{dh.ipAddress || '—'}</td>
                <td className="p-2.5 text-theme-muted max-w-xs truncate" title={dh.browser}>{dh.browser || '—'}</td>
                <td className="p-2.5 text-theme-muted whitespace-nowrap">{fmt(dh.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Timeline
// ═══════════════════════════════════════════════════════════════════════════

function TimelineTab({ timeline }: { timeline: any[] }) {
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const ev of timeline) m.set(ev.category, (m.get(ev.category) ?? 0) + 1);
    return [...m.entries()];
  }, [timeline]);
  const q = query.trim().toLowerCase();
  const rows = timeline
    .filter((ev) => category === 'ALL' || ev.category === category)
    .filter((ev) => !q || `${ev.title} ${ev.details ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * (newestFirst ? -1 : 1));

  if (timeline.length === 0) return <Empty text="No activity yet." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search events…" />
        <Button size="sm" variant="ghost" onClick={() => setNewestFirst((v) => !v)} className="sm:ms-auto">
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={category === 'ALL'} onClick={() => setCategory('ALL')} count={timeline.length}>
          All
        </Chip>
        {categories.map(([cat, n]) => (
          <Chip key={cat} active={category === cat} onClick={() => setCategory(cat)} count={n}>
            {TIMELINE_LABELS[cat] ?? cat}
          </Chip>
        ))}
      </div>
      <Table head={['When', 'Type', 'Event', 'Details']}>
        {rows.map((ev: any, i: number) => (
          <tr key={ev.id || i} className="hover:bg-theme-card/40 align-top">
            <td className="p-2.5 font-mono text-[11px] text-theme-text whitespace-nowrap">{formatDateTime(ev.timestamp)}</td>
            <td className="p-2.5">
              <Badge>{TIMELINE_LABELS[ev.category] ?? ev.category}</Badge>
            </td>
            <td className="p-2.5 font-medium text-theme-text">{ev.title}</td>
            <td className="p-2.5 text-theme-muted">{ev.details}</td>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty text="No events match." />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modals
// ═══════════════════════════════════════════════════════════════════════════

function GrantViewsModal({ video, onClose, onSubmit }: { video: any | null; onClose: () => void; onSubmit: (n: number) => void }) {
  const [amount, setAmount] = useState('1');
  useEffect(() => {
    if (video) setAmount('1');
  }, [video]);
  if (!video) return null;
  const n = parseInt(amount, 10);
  const valid = Number.isInteger(n) && n > 0 && n <= 100;
  const used = video.usedViews ?? 0;
  const limit = video.effectiveMaxViews ?? 0;
  const after = valid ? limit + n : limit;
  return (
    <Modal
      open
      onClose={onClose}
      title="Grant more views"
      description={`${video.sessionTitle}${video.lectureTitle ? ` · ${video.lectureTitle}` : ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => onSubmit(n)}>
            Grant {valid ? n : ''} view{n === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 5].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${amount === String(p) ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-200' : 'border-theme-border text-theme-muted hover:text-theme-text'}`}
            >
              +{p}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input w-20 text-center"
            aria-label="Number of views"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <MiniStat label="Used" value={used} />
          <MiniStat label="Limit now" value={limit} sub={video.grantedViews > 0 ? `incl. +${video.grantedViews}` : undefined} />
          <MiniStat label="Limit after" value={after} highlight sub={`${Math.max(0, after - used)} left`} />
        </div>
      </div>
    </Modal>
  );
}

function ExtendAccessModal({ lecture, onClose, onSubmit }: { lecture: any | null; onClose: () => void; onSubmit: (days: number) => void }) {
  const [days, setDays] = useState('7');
  useEffect(() => {
    if (lecture) setDays('7');
  }, [lecture]);
  if (!lecture) return null;
  const n = parseInt(days, 10);
  const valid = Number.isInteger(n) && n > 0 && n <= 3650;
  const current = lecture.expiresAt ? new Date(lecture.expiresAt) : null;
  const base = current && current.getTime() > Date.now() ? current : new Date();
  const after = valid ? new Date(base.getTime() + n * 86400000) : null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Extend lecture access"
      description={lecture.lectureTitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => onSubmit(n)}>
            Extend
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {[3, 7, 14, 30].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(String(p))}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${days === String(p) ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-200' : 'border-theme-border text-theme-muted hover:text-theme-text'}`}
            >
              {p}d
            </button>
          ))}
          <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="input w-20 text-center" aria-label="Days" />
        </div>
        <div className="rounded-xl bg-theme-card p-3 text-sm space-y-1">
          <p className="text-theme-muted">
            Now: <span className="text-theme-text">{current ? `${lecture.isExpired ? 'expired' : 'expires'} ${formatShort(current)}` : 'no expiry'}</span>
          </p>
          <p className="text-theme-muted">
            After: <span className="text-theme-text font-semibold">{after ? `expires ${formatShort(after)}` : '—'}</span>
          </p>
          {lecture.isExpired && <p className="text-xs text-theme-muted">Already expired, so the extension counts from today.</p>}
        </div>
      </div>
    </Modal>
  );
}

function GrantAccessModal({ open, studentName, onClose, onGrant }: { open: boolean; studentName: string; onClose: () => void; onGrant: (type: 'COURSE' | 'LECTURE', id: string, days?: number) => void }) {
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('');
  const [results, setResults] = useState<{ courses: any[]; lectures: any[] }>({ courses: [], lectures: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDays('');
      setResults({ courses: [], lectures: [] });
    }
  }, [open]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults({ courses: [], lectures: [] });
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      client
        .get<any>(`/admin/catalog/search?q=${encodeURIComponent(search.trim())}`)
        .then((r) => setResults({ courses: r?.courses ?? [], lectures: r?.lectures ?? [] }))
        .catch(() => setResults({ courses: [], lectures: [] }))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const validity = days ? parseInt(days, 10) : undefined;
  const daysValid = validity === undefined || (Number.isInteger(validity) && validity > 0);

  return (
    <Modal open={open} onClose={onClose} title="Give access" description={`Unlock a course or a single lecture for ${studentName}.`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search courses and lectures…" autoFocus />
          </div>
          <label className="flex items-center gap-2 text-sm text-theme-muted">
            Valid for
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} placeholder="∞" className="input w-20 text-center" />
            days
          </label>
        </div>
        {search.trim().length < 2 ? (
          <p className="text-sm text-theme-muted text-center py-6">Type at least 2 letters. Leave days empty for no expiry.</p>
        ) : loading ? (
          <Skeleton className="h-32" />
        ) : results.courses.length === 0 && results.lectures.length === 0 ? (
          <p className="text-sm text-theme-muted text-center py-6">Nothing found.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto scrollbar-thin rounded-xl border border-theme-border divide-y divide-theme-border">
            {results.courses.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3">
                <Badge variant="gold">Course</Badge>
                <span className="flex-1 min-w-0 truncate text-sm text-theme-text">{c.title}</span>
                <Button size="sm" variant="secondary" disabled={!daysValid} onClick={() => onGrant('COURSE', c.id, validity)}>
                  Unlock course
                </Button>
              </li>
            ))}
            {results.lectures.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3">
                <Badge variant="accent">Lecture</Badge>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-theme-text">{l.title}</p>
                  <p className="truncate text-[11px] text-theme-muted">{l.courseTitle}</p>
                </div>
                <Button size="sm" variant="secondary" disabled={!daysValid} onClick={() => onGrant('LECTURE', l.id, validity)}>
                  Unlock lecture
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Small building blocks
// ═══════════════════════════════════════════════════════════════════════════

function copy(text: string, msg: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(msg),
    () => toast.error('Could not copy'),
  );
}

export function Avatar({ url, name, size = 'md' }: { url?: string | null; name?: string | null; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-base';
  return url ? (
    <img src={url} alt="" className={`${cls} rounded-full object-cover border border-theme-border shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function CopyField({ icon, value, label, mono }: { icon: ReactNode; value?: string | null; label?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <button type="button" onClick={() => copy(value, 'Copied')} className="group inline-flex items-center gap-1.5 hover:text-theme-text transition-colors min-w-0" title="Copy">
      {icon}
      {label && <span>{label}:</span>}
      <span className={`truncate ${mono ? 'font-mono text-[13px]' : ''}`} dir="ltr">
        {value}
      </span>
      <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function IconButton({ children, title, onClick, className = '' }: { children: ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={`p-2 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-card transition-colors ${className}`}>
      {children}
    </button>
  );
}

function Section({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-theme-text flex items-center gap-2">
          <span className="text-theme-muted">{icon}</span>
          {title}
        </h3>
        {action && (
          <button type="button" onClick={action.onClick} className="text-xs font-semibold text-accent-700 dark:text-accent-300 hover:underline">
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, icon, onClick }: { label: string; value: ReactNode; sub?: string; icon: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-theme-muted text-xs">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-theme-text mt-1 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-theme-muted truncate">{sub}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="text-start rounded-xl border border-theme-border bg-theme-card/50 p-3 hover:border-accent-500/40 transition-colors">
      {body}
    </button>
  ) : (
    <div className="rounded-xl border border-theme-border bg-theme-card/50 p-3">{body}</div>
  );
}

function MiniStat({ label, value, sub, highlight }: { label: string; value: ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${highlight ? 'bg-accent-500/10' : 'bg-theme-card'}`}>
      <p className="text-[11px] text-theme-muted">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-accent-700 dark:text-accent-200' : 'text-theme-text'}`}>{value}</p>
      {sub && <p className="text-[10px] text-theme-muted">{sub}</p>}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[11px] text-theme-muted">{label}</dt>
      <dd className="text-theme-text">{value || '—'}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-theme-border p-6 text-center text-sm text-theme-muted">{text}</p>;
}

function Chip({ active, onClick, count, disabled, children }: { active: boolean; onClick: () => void; count?: number; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !active}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-accent-500 text-white border-accent-500' : 'border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-card'
      }`}
    >
      {children}
      {count !== undefined && <span className={active ? 'opacity-90' : 'opacity-70'}>{count}</span>}
    </button>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-theme-border p-0.5 bg-theme-card/50 shrink-0">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${value === o.id ? 'bg-accent-500 text-white' : 'text-theme-muted hover:text-theme-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <div className="relative flex-1 min-w-[12rem] max-w-md">
      <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-theme-muted" />
      <input
        dir="auto"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full ps-9 pe-3 py-2 bg-theme-card border border-theme-border rounded-xl text-sm text-theme-text focus:outline-none focus:border-accent-400"
      />
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-theme-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-theme-card/60 text-theme-muted border-b border-theme-border">
            {head.map((h, i) => (
              <th key={i} className={`p-2.5 font-semibold text-start whitespace-nowrap ${i === head.length - 1 && h === '' ? 'text-end' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-theme-border/60">{children}</tbody>
      </table>
    </div>
  );
}

function CourseAccessBadge({ course }: { course: any }) {
  if (course.isFree) return <Badge variant="success">Free</Badge>;
  if (course.hasDirectCourseAccess) return <Badge variant={course.isExpired ? 'error' : 'accent'}>{course.isExpired ? 'Full access expired' : 'Full access'}</Badge>;
  return <Badge>Per lecture</Badge>;
}
