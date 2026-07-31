import toast from 'react-hot-toast';
import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  KeyRound,
  PlayCircle,
  Lock,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link, useRouter } from '../lib/router';
import type { Course, Chapter, Lecture, CourseExamItem } from '../lib/types';
import { Badge, Spinner } from './ui';
import { Modal } from './Modal';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';

export function StudentCourseView({ courseId }: { courseId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<(Chapter & { lectures: Lecture[] })[]>([]);
  const [standaloneLectures, setStandaloneLectures] = useState<Lecture[]>([]);
  const [exams, setExams] = useState<(CourseExamItem & { isPassed?: boolean; attemptsCount?: number; passGrade?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  // Redeem state
  const [redeemModal, setRedeemModal] = useState<{ type: 'LECTURE' | 'COURSE', targetId: string } | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/progress/course/${courseId}/syllabus`);
      setCourse(data?.course || null);
      setChapters(Array.isArray(data?.chapters) ? data.chapters : []);
      setStandaloneLectures(Array.isArray(data?.standaloneLectures) ? data.standaloneLectures : []);
      setExams(Array.isArray(data?.exams) ? data.exams : []);
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || 'Failed to load course syllabus.');
    } finally {
      setLoading(false);
    }
  }, [profile, courseId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !redeemModal) return;
    setRedeemBusy(true);
    setRedeemError(null);
    setRedeemSuccess(false);
    try {
      const code = redeemCode.trim().toUpperCase();
      const payload = { 
        code, 
        targetType: redeemModal.type, 
        targetId: redeemModal.targetId 
      };

      await api.post('/activation-codes/redeem', payload);

      setRedeemSuccess(true);
      setRedeemCode('');
      // Reload the syllabus to unlock the content!
      await loadData();
    } catch (err: unknown) {
      setRedeemError((err as any)?.response?.data?.message || 'Failed to redeem code.');
    } finally {
      setRedeemBusy(false);
    }
  }

  async function startLecture(lecture: Lecture) {
    if (!profile) return;
    const durationStr = [
      lecture.durationDays ? `${lecture.durationDays}d` : '',
      lecture.durationHours ? `${lecture.durationHours}h` : '',
      lecture.durationMinutes ? `${lecture.durationMinutes}m` : ''
    ].filter(Boolean).join(' ') || 'Lifetime';
    
    const ok = await confirm(
      'Start Lecture',
      `Starting this lecture will begin your ${durationStr} access timer. Are you sure you want to start now?`
    );
    if (ok) {
      try {
        await api.post(`/lectures/${lecture.id}/start-access`);
        navigate(`/lecture/${lecture.id}`);
      } catch (err: unknown) {
        toast.error((err as any)?.response?.data?.message || 'Failed to start lecture.');
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-8 h-8 text-accent-400" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-error-400 mb-4">{error || 'Course not found'}</p>
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Course Hero */}
      <div className="glass rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-theme-secondary shrink-0">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-white/[0.05]">
                <BookOpen className="w-12 h-12 text-neutral-700" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <Badge variant="accent" className="mb-4">Course Syllabus</Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-theme-text tracking-tight mb-3">
              {course.title}
            </h1>
            <p className="text-theme-muted text-lg leading-relaxed max-w-3xl mb-6">
              {course.description || 'No description provided.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button 
                onClick={() => setRedeemModal({ type: 'COURSE', targetId: courseId })} 
                className="btn-primary w-full sm:w-auto"
              >
                <KeyRound className="w-4 h-4" />
                Unlock Full Course
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div>
        <h2 className="text-2xl font-display font-bold text-theme-text mb-6">Course Content</h2>
        
        {(chapters.length === 0 && standaloneLectures.length === 0) ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-theme-muted">No lectures have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chapters with lectures */}
            {chapters.map((chapter) => (
              <div key={chapter.id} className="glass rounded-2xl overflow-hidden">
                <div className="p-4 bg-white/[0.02] border-b border-theme-border">
                  <h3 className="text-lg font-display font-bold text-theme-text">{chapter.title}</h3>
                  {chapter.description && (
                    <p className="text-sm text-theme-muted mt-1">{chapter.description}</p>
                  )}
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {chapter.lectures.map((lecture: Lecture, idx: number) => (
                    <div key={lecture.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-theme-secondary border border-white/[0.05] flex items-center justify-center font-display font-bold text-sm text-theme-muted">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-base font-bold text-theme-text truncate">{lecture.title}</span>
                          {lecture.isUnlocked && !lecture.isExpired && (
                            <Badge variant="success">Active</Badge>
                          )}
                          {lecture.isExpired && (
                            <Badge variant="error">Expired</Badge>
                          )}
                          {!lecture.isUnlocked && !lecture.isExpired && (
                            <Badge variant="default">Unowned</Badge>
                          )}
                        </div>
                        {lecture.description && (
                          <p className="text-sm text-theme-muted truncate">{lecture.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {lecture.isUnlocked && !lecture.isExpired ? (
                          lecture.isStarted ? (
                            <Link to={`/lecture/${lecture.id}`} className="btn-secondary text-sm">
                              <PlayCircle className="w-4 h-4" />
                              Open Lecture
                            </Link>
                          ) : (
                            <button onClick={() => startLecture(lecture)} className="btn-primary text-sm">
                              <PlayCircle className="w-4 h-4" />
                              Start Lecture
                            </button>
                          )
                        ) : (
                          <button onClick={() => setRedeemModal({ type: 'LECTURE', targetId: lecture.id })} className="btn-ghost text-theme-muted hover:text-white hover:bg-white/5 text-sm">
                            <Lock className="w-4 h-4" />
                            {lecture.isExpired ? 'Renew Access' : 'Unlock Lecture'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Standalone lectures (not in a chapter) */}
            {standaloneLectures.length > 0 && (
              <div className="divide-y divide-white/[0.04] glass rounded-2xl">
                {standaloneLectures.map((lecture: Lecture, idx: number) => (
                  <div key={lecture.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-theme-secondary border border-white/[0.05] flex items-center justify-center font-display font-bold text-sm text-theme-muted">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-base font-bold text-theme-text truncate">{lecture.title}</span>
                        {lecture.isUnlocked && !lecture.isExpired && (
                          <Badge variant="success">Active</Badge>
                        )}
                        {lecture.isExpired && (
                          <Badge variant="error">Expired</Badge>
                        )}
                        {!lecture.isUnlocked && !lecture.isExpired && (
                          <Badge variant="default">Unowned</Badge>
                        )}
                      </div>
                      {lecture.description && (
                        <p className="text-sm text-theme-muted truncate">{lecture.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {lecture.isUnlocked && !lecture.isExpired ? (
                        <Link to={`/lecture/${lecture.id}`} className="btn-secondary text-sm">
                          <PlayCircle className="w-4 h-4" />
                          Open Lecture
                        </Link>
                      ) : (
                        <button onClick={() => setRedeemModal({ type: 'LECTURE', targetId: lecture.id })} className="btn-ghost text-theme-muted hover:text-white hover:bg-white/5 text-sm">
                          <Lock className="w-4 h-4" />
                          {lecture.isExpired ? 'Renew Access' : 'Unlock Lecture'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exams Section */}
        {exams && exams.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-display font-bold text-theme-text mb-6">Final Exams</h2>
            <div className="space-y-4">
              {exams.map((exam: CourseExamItem & { isPassed?: boolean; attemptsCount?: number; passGrade?: number }) => (
                <div key={exam.id} className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-700 dark:text-accent-300 shrink-0">
                         <Sparkles className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-theme-text text-lg">{exam.title}</h3>
                         <p className="text-sm text-theme-muted mt-1">{exam.description || 'Comprehensive assessment.'}</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-2">
                    {exam.isPassed ? (
                          <Badge variant="success">Passed</Badge>
                       ) : (exam.attemptsCount ?? 0) >= exam.maxAttempts ? (
                          <Badge variant="error">Attempts Exhausted</Badge>
                       ) : (
                          <Badge variant="default">Attempts: {exam.attemptsCount ?? 0} / {exam.maxAttempts}</Badge>
                       )}
                       
                       {(!exam.isPassed && (exam.attemptsCount ?? 0) < exam.maxAttempts) && (
                          <Link to={`/exam/${exam.id}`} className="btn-primary mt-2">
                             Start Exam
                          </Link>
                       )}
                       {exam.isPassed && (
                          <Link to={`/exam/${exam.id}`} className="btn-secondary mt-2">
                             View Results
                          </Link>
                       )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-theme-muted border-t border-white/[0.04] pt-4">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-theme-muted"/> Passing Score: {exam.passGrade}%</div>
                    {exam.timeLimit && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-theme-muted"/> Time Limit: {exam.timeLimit} mins</div>}
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-theme-muted"/> {exam.questions?.length || 0} Questions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      <Modal open={!!redeemModal} onClose={() => { setRedeemModal(null); setRedeemSuccess(false); setRedeemError(null); }} title="Redeem Activation Code">
        {redeemSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-success-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-success-400" />
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-2">Code Redeemed!</h3>
            <p className="text-theme-muted mb-6 max-w-sm">
              Your code has been successfully verified. The {redeemModal?.type === 'COURSE' ? 'course' : 'lecture'} is now unlocked and ready to watch.
            </p>
            <button onClick={() => { setRedeemModal(null); setRedeemSuccess(false); }} className="btn-primary w-full justify-center">
              Start Learning
            </button>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="label">Activation Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                <input
                  type="text"
                  required
                  className="input pl-10 font-mono tracking-wider uppercase text-lg"
                  placeholder="XXXX-XXXX-XXXX"
                  value={redeemCode}
                  onChange={e => setRedeemCode(e.target.value)}
                  disabled={redeemBusy}
                />
              </div>
              <p className="text-xs text-theme-muted mt-2">
                Paste the 12-character activation code provided by your instructor.
              </p>
            </div>

            {redeemError && (
              <div className="p-3 rounded-lg bg-error-500/10 text-error-400 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                {redeemError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setRedeemModal(null)} className="btn-ghost" disabled={redeemBusy}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={redeemBusy || !redeemCode.trim()}>
                {redeemBusy ? 'Verifying...' : 'Redeem Code'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
