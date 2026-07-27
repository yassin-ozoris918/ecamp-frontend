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
import { Badge, Spinner } from './ui';
import { Modal } from './Modal';

export function StudentCourseView({ courseId }: { courseId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redeem state
  const [redeemModal, setRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) {
      // If they are not logged in, they shouldn't be here (App.tsx protects it, but just in case)
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/progress/course/${courseId}/syllabus`);
      setCourse(data.course);
      setLectures(data.lectures);
      setExams(data.exams || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load course syllabus.');
    } finally {
      setLoading(false);
    }
  }, [profile, courseId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setRedeemBusy(true);
    setRedeemError(null);
    setRedeemSuccess(false);
    try {
      const code = redeemCode.trim().toUpperCase();
      await api.post('/activation-codes/redeem', { code });

      setRedeemSuccess(true);
      setRedeemCode('');
      // Reload the syllabus to unlock the lecture!
      await loadData();
    } catch (err: any) {
      setRedeemError(err.response?.data?.message || 'Failed to redeem code.');
    } finally {
      setRedeemBusy(false);
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
          <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-base-900 shrink-0">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-white/[0.05]">
                <BookOpen className="w-12 h-12 text-neutral-700" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <Badge variant="accent" className="mb-4">Course Syllabus</Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight mb-3">
              {course.title}
            </h1>
            <p className="text-neutral-400 text-lg leading-relaxed max-w-3xl mb-6">
              {course.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lectures List */}
      <div>
        <h2 className="text-2xl font-display font-bold text-white mb-6">Course Content</h2>
        
        {lectures.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-neutral-500">No lectures have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lectures.map((lecture, idx) => (
              <div key={lecture.id} className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:bg-white/[0.02]">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-base-900 border border-white/[0.05] flex items-center justify-center font-display font-bold text-lg text-neutral-500">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white truncate">{lecture.title}</h3>
                    {lecture.isUnlocked && !lecture.isExpired && (
                      <Badge variant="success">Unlocked</Badge>
                    )}
                    {lecture.isExpired && (
                      <Badge variant="error">Expired</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 truncate">
                    {lecture.description || 'No description.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {lecture.isUnlocked && !lecture.isExpired ? (
                    <Link to={`/lecture/${lecture.id}`} className="btn-secondary">
                      <PlayCircle className="w-4 h-4" />
                      Play Lecture
                    </Link>
                  ) : (
                    <button onClick={() => setRedeemModal(true)} className="btn-ghost text-neutral-400 hover:text-white hover:bg-white/5">
                      <Lock className="w-4 h-4" />
                      {lecture.isExpired ? 'Renew Access' : 'Locked'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Exams Section */}
        {exams && exams.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-display font-bold text-white mb-6">Final Exams</h2>
            <div className="space-y-4">
              {exams.map((exam) => (
                <div key={exam.id} className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-300 shrink-0">
                         <Sparkles className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white text-lg">{exam.title}</h3>
                         <p className="text-sm text-neutral-400 mt-1">{exam.description || 'Comprehensive assessment.'}</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-2">
                       {exam.isPassed ? (
                         <Badge variant="success">Passed</Badge>
                       ) : exam.attemptsCount >= exam.maxAttempts ? (
                         <Badge variant="error">Attempts Exhausted</Badge>
                       ) : (
                         <Badge variant="default">Attempts: {exam.attemptsCount} / {exam.maxAttempts}</Badge>
                       )}
                       
                       {(!exam.isPassed && exam.attemptsCount < exam.maxAttempts) && (
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
                  <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-neutral-300 border-t border-white/[0.04] pt-4">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-neutral-500"/> Passing Score: {exam.passingScore}%</div>
                    {exam.timeLimit && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-neutral-500"/> Time Limit: {exam.timeLimit} mins</div>}
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-neutral-500"/> {exam._count?.questions || 0} Questions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      <Modal open={redeemModal} onClose={() => { setRedeemModal(false); setRedeemSuccess(false); setRedeemError(null); }} title="Redeem Activation Code">
        {redeemSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-success-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-success-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Code Redeemed!</h3>
            <p className="text-neutral-400 mb-6 max-w-sm">
              Your code has been successfully verified. The lecture is now unlocked and ready to watch.
            </p>
            <button onClick={() => { setRedeemModal(false); setRedeemSuccess(false); }} className="btn-primary w-full justify-center">
              Start Learning
            </button>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="label">Activation Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
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
              <p className="text-xs text-neutral-500 mt-2">
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
              <button type="button" onClick={() => setRedeemModal(false)} className="btn-ghost" disabled={redeemBusy}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={redeemBusy || !redeemCode.trim()}>
                {redeemBusy ? 'Verifying...' : 'Redeem Code'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
