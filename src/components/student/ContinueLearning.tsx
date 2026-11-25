import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlarmClock, ChevronRight, FolderOpen, PlayCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { Link } from '../../lib/router';
import { percent, timeLeft } from '../../lib/format';
import { ProgressRing } from '../common/ProgressRing';

interface LectureState {
  lectureId: string;
  lectureTitle: string;
  chapterTitle: string | null;
  courseId: string;
  courseTitle: string;
  done: number;
  total: number;
  nextItemTitle: string | null;
  accessEndsAt: string | null;
}

interface ContinueData {
  resume: LectureState | null;
  endingSoon: LectureState[];
  coursesEndingSoon: { courseId: string; courseTitle: string; accessEndsAt: string }[];
}

function Where({ l }: { l: Pick<LectureState, 'courseTitle' | 'chapterTitle'> }) {
  return (
    <p className="flex items-center gap-1 min-w-0 text-xs text-theme-muted">
      <FolderOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span dir="auto" className="truncate">{l.courseTitle}</span>
      {l.chapterTitle && (
        <>
          <ChevronRight className="w-3 h-3 shrink-0 rtl:rotate-180" aria-hidden="true" />
          <span dir="auto" className="truncate">{l.chapterTitle}</span>
        </>
      )}
    </p>
  );
}

/** Dashboard block: resume the last lecture + lectures/courses whose access ends soon. */
export function ContinueLearning() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['progress', 'continue'],
    queryFn: async () => (await api.get<ContinueData>('/progress/continue')).data,
    staleTime: 30_000,
  });

  const resume = data?.resume ?? null;
  // The resume card already shows its own countdown, so don't list that lecture twice.
  const ending = (data?.endingSoon ?? []).filter((l) => l.lectureId !== resume?.lectureId);
  const courses = data?.coursesEndingSoon ?? [];
  if (!resume && ending.length === 0 && courses.length === 0) return null;

  const resumeLeft = resume ? timeLeft(resume.accessEndsAt, t) : null;
  const pct = resume ? percent(resume.done, resume.total) : 0;

  return (
    <div className={`grid gap-4 ${resume && (ending.length || courses.length) ? 'lg:grid-cols-5' : ''}`}>
      {resume && (
        <Link
          to={`/lecture/${resume.lectureId}`}
          className="group lg:col-span-3 relative overflow-hidden rounded-2xl border border-accent-500/25 bg-gradient-to-br from-accent-500/15 via-theme-card to-theme-card p-5 sm:p-6 flex items-center gap-5 hover:border-accent-500/50 transition-colors"
        >
          <div className="absolute -top-20 -end-20 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
          <ProgressRing value={pct} size={64} stroke={5} label={t('dashboard.itemsDone', { done: resume.done, total: resume.total })}>
            <span className="text-sm font-bold text-theme-text">{pct}%</span>
          </ProgressRing>
          <div className="relative flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-300">
              {t('dashboard.continueTitle')}
            </p>
            <h2 dir="auto" className="mt-1 text-lg sm:text-xl font-display font-bold text-theme-text truncate">
              {resume.lectureTitle}
            </h2>
            <div className="mt-1"><Where l={resume} /></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-theme-muted">
              {resume.nextItemTitle && <span dir="auto" className="truncate">{t('dashboard.upNext', { title: resume.nextItemTitle })}</span>}
              {resumeLeft && (
                <span className={`inline-flex items-center gap-1 font-semibold ${resumeLeft.urgent ? 'text-warning-600 dark:text-warning-300' : ''}`}>
                  <AlarmClock className="w-3.5 h-3.5" />
                  {t('time.endsIn', { time: resumeLeft.label })}
                </span>
              )}
            </div>
          </div>
          <span className="relative btn-primary hidden sm:inline-flex shrink-0">
            <PlayCircle className="w-4 h-4" />
            {t('dashboard.resume')}
          </span>
        </Link>
      )}

      {(ending.length > 0 || courses.length > 0) && (
        <div className={`${resume ? 'lg:col-span-2' : ''} rounded-2xl border border-warning-500/25 bg-warning-500/[0.06] p-5`}>
          <div className="flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-warning-600 dark:text-warning-300" />
            <h2 className="font-display font-bold text-theme-text">{t('dashboard.endingSoonTitle')}</h2>
          </div>
          <p className="text-xs text-theme-muted mt-1">{t('dashboard.endingSoonDesc')}</p>
          <ul className="mt-3 space-y-2">
            {ending.slice(0, 4).map((l) => {
              const left = timeLeft(l.accessEndsAt, t);
              return (
                <li key={l.lectureId}>
                  <Link
                    to={`/lecture/${l.lectureId}`}
                    className="flex items-center gap-3 rounded-xl bg-theme-card border border-theme-border px-3 py-2 hover:border-warning-500/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p dir="auto" className="text-sm font-semibold text-theme-text truncate">{l.lectureTitle}</p>
                      <Where l={l} />
                    </div>
                    {left && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${left.urgent ? 'bg-warning-500/15 text-warning-700 dark:text-warning-300' : 'bg-theme-secondary text-theme-muted'}`}>
                        {left.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            {courses.map((c) => {
              const left = timeLeft(c.accessEndsAt, t);
              return (
                <li key={c.courseId}>
                  <Link
                    to={`/course/${c.courseId}`}
                    className="flex items-center gap-3 rounded-xl bg-theme-card border border-theme-border px-3 py-2 hover:border-warning-500/40 transition-colors"
                  >
                    <p dir="auto" className="flex-1 min-w-0 text-sm text-theme-text truncate">
                      {t('dashboard.courseEndsSoon', { course: c.courseTitle })}
                    </p>
                    {left && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold bg-warning-500/15 text-warning-700 dark:text-warning-300">{left.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
