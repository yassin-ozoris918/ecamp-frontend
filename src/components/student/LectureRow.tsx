import { useTranslation } from 'react-i18next';
import { AlarmClock, Check, Clock, FileText, HelpCircle, KeyRound, Lock, PlayCircle, RotateCcw, Video } from 'lucide-react';
import { Link } from '../../lib/router';
import type { Lecture } from '../../lib/types';
import { formatLength, percent, timeLeft } from '../../lib/format';
import { ProgressRing } from '../common/ProgressRing';

export type LectureStatus = 'locked' | 'expired' | 'completed' | 'inProgress' | 'notStarted';

export function lectureStatus(l: Lecture): LectureStatus {
  if (l.isExpired) return 'expired';
  if (!l.isUnlocked) return 'locked';
  const p = l.progress;
  if (p && p.total > 0 && p.done >= p.total) return 'completed';
  if (l.isStarted || (p && p.done > 0)) return 'inProgress';
  return 'notStarted';
}

const STATUS_STYLE: Record<LectureStatus, string> = {
  completed: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-300',
  inProgress: 'bg-accent-500/10 text-accent-700 dark:text-accent-300',
  notStarted: 'bg-theme-secondary text-theme-muted',
  locked: 'bg-theme-secondary text-theme-muted',
  expired: 'bg-error-500/10 text-error-600 dark:text-error-300',
};

/**
 * One lecture in the student's course page: status, progress, what it contains, its timer and
 * the single next action (start / continue / review / unlock / renew).
 */
export function LectureRow({
  lecture,
  index,
  onStart,
  onUnlock,
  onExpired,
}: {
  lecture: Lecture;
  index: number;
  onStart: (l: Lecture) => void;
  onUnlock: (l: Lecture) => void;
  onExpired: () => void;
}) {
  const { t } = useTranslation();
  const status = lectureStatus(lecture);
  const p = lecture.progress ?? { done: 0, total: 0 };
  const pct = percent(p.done, p.total);
  const counts = lecture.counts;
  const left = status === 'inProgress' || status === 'notStarted' ? timeLeft(lecture.accessEndsAt, t) : null;

  const meta: { icon: JSX.Element; text: string }[] = [];
  if (counts?.videos) meta.push({ icon: <Video className="w-3.5 h-3.5" />, text: t('courseView.meta.videos', { count: counts.videos }) });
  if (counts?.quizzes) meta.push({ icon: <HelpCircle className="w-3.5 h-3.5" />, text: t('courseView.meta.quizzes', { count: counts.quizzes }) });
  if (counts?.files) meta.push({ icon: <FileText className="w-3.5 h-3.5" />, text: t('courseView.meta.files', { count: counts.files }) });
  if (lecture.durationSec) meta.push({ icon: <Clock className="w-3.5 h-3.5" />, text: formatLength(lecture.durationSec, t) });

  const indicator =
    status === 'completed' ? (
      <ProgressRing value={100} tone="success" label={t('courseView.status.completed')}>
        <Check className="w-4 h-4 text-secondary-600 dark:text-secondary-300" />
      </ProgressRing>
    ) : status === 'locked' ? (
      <ProgressRing value={0} tone="muted" label={t('courseView.status.locked')}>
        <Lock className="w-4 h-4 text-theme-muted" />
      </ProgressRing>
    ) : status === 'expired' ? (
      <ProgressRing value={0} tone="muted" label={t('courseView.status.expired')}>
        <AlarmClock className="w-4 h-4 text-error-500" />
      </ProgressRing>
    ) : (
      <ProgressRing value={pct} label={t('dashboard.itemsDone', { done: p.done, total: p.total })}>
        <span className="text-xs font-bold text-theme-text">{index + 1}</span>
      </ProgressRing>
    );

  let action: JSX.Element;
  if (status === 'locked') {
    action = (
      <button type="button" onClick={() => onUnlock(lecture)} className="btn-secondary text-sm">
        <KeyRound className="w-4 h-4" />
        {t('courseView.unlockLecture')}
      </button>
    );
  } else if (status === 'expired') {
    action = (
      <button type="button" onClick={onExpired} className="btn-ghost text-sm">
        <RotateCcw className="w-4 h-4" />
        {t('courseView.renewAccess')}
      </button>
    );
  } else if (!lecture.isStarted) {
    action = (
      <button type="button" onClick={() => onStart(lecture)} className="btn-primary text-sm">
        <PlayCircle className="w-4 h-4" />
        {t('courseView.startLecture')}
      </button>
    );
  } else {
    action = (
      <Link to={`/lecture/${lecture.id}`} className={`${status === 'completed' ? 'btn-ghost' : 'btn-secondary'} text-sm`}>
        <PlayCircle className="w-4 h-4" />
        {status === 'completed' ? t('courseView.review') : t('courseView.continue')}
      </Link>
    );
  }

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-theme-card/60 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {indicator}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span dir="auto" className="text-base font-semibold text-theme-text">{lecture.title}</span>
            <span className={`badge !py-0.5 !text-[11px] ${STATUS_STYLE[status]}`}>{t(`courseView.status.${status}`)}</span>
            {lecture.requiresOwnCode && status === 'locked' && (
              <span className="badge !py-0.5 !text-[11px] bg-warning-500/10 text-warning-700 dark:text-warning-300">
                <KeyRound className="w-3 h-3" />
                {t('courseView.ownCodeRequired')}
              </span>
            )}
          </div>
          {lecture.description && (
            <p dir="auto" className="text-sm text-theme-muted mt-0.5 line-clamp-1">{lecture.description}</p>
          )}
          {meta.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-theme-muted">
              {meta.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {m.icon}
                  {m.text}
                </span>
              ))}
              {status === 'inProgress' && p.total > 0 && (
                <span className="text-accent-700 dark:text-accent-300 font-semibold">{t('dashboard.itemsDone', { done: p.done, total: p.total })}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 shrink-0 ps-[52px] sm:ps-0">
        {left && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              left.urgent ? 'bg-warning-500/15 text-warning-700 dark:text-warning-300' : 'bg-theme-secondary text-theme-muted'
            }`}
            title={t('time.endsIn', { time: left.label })}
          >
            <AlarmClock className="w-3.5 h-3.5" />
            {left.label}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
