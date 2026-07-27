import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, FileText, CheckCircle2, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Spinner, Badge } from './ui';

export function ExamScreen({ examId }: { examId: string }) {
  // const { navigate } = useRouter();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Exam state
  const [answers, setAnswers] = useState<Record<string, { selectedAnswerId?: string, textResponse?: string }>>({});
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  const loadExam = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/exams/${examId}`);
      setExam(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load exam.');
    }
    setLoading(false);
  }, [examId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  // Timer
  useEffect(() => {
    if (timeLeftMs === null || !examStarted) return;
    if (timeLeftMs <= 0) {
      handleSubmit(); // Auto-submit when time's up
      return;
    }
    const t = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeftMs, examStarted]);

  async function handleStart() {
    try {
      setLoading(true);
      await api.post(`/exams/${examId}/start`);
      setExamStarted(true);
      if (exam.timeLimit) {
        setTimeLeftMs(exam.timeLimit * 60 * 1000);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to start exam.');
    }
    setLoading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const responses = Object.entries(answers).map(([questionId, ans]) => ({
        questionId,
        selectedAnswerId: ans.selectedAnswerId,
        textResponse: ans.textResponse,
      }));

      const { data } = await api.post(`/exams/submit`, {
        examId,
        responses,
      });
      
      // If the backend has an endpoint for students to trigger AI evaluation, we'd call it here.
      // For now, the user flow simply requires the animated spinner to lock the UI during submission.
      // We will simulate a slight delay to allow the AI text to be read by the user if it's very fast.
      await new Promise(r => setTimeout(r, 1500));
      
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to submit exam.');
    }
    setSubmitting(false);
  }

  if (submitting && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-up">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400 relative z-10" />
        </div>
        <h2 className="text-3xl font-bold text-white font-display text-center">Submitting Exam...</h2>
        <p className="text-neutral-400 text-lg text-center max-w-md">
          AI is reviewing your submission, parsing linguistic properties...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="w-8 h-8 text-accent-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center animate-fade-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-error-500/15 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error-300" />
        </div>
        <p className="text-xl font-display font-bold text-white mb-2">{error}</p>
        <button onClick={() => window.history.back()} className="btn-secondary mt-6">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  if (!exam) return null;

  if (result) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-fade-up">
        <div className="glass rounded-2xl p-10 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-secondary-500/15 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-secondary-300" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            {result.message}
          </h1>
          {result.isGraded ? (
            <p className="text-lg text-neutral-300">
              Your exam has been automatically graded. Check your stats to see the final score!
            </p>
          ) : (
            <p className="text-lg text-neutral-300">
              Your essay questions are currently being graded by our AI assistant or your instructor. You will be notified when your final score is ready.
            </p>
          )}
          <div className="mt-8">
            <Link to="/dashboard" className="btn-primary">
              Return to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-fade-up">
        <button onClick={() => window.history.back()} className="btn-ghost mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <div className="glass rounded-3xl p-8 sm:p-12">
          <Badge variant="accent" className="mb-4">Official Exam</Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">{exam.title}</h1>
          <p className="text-neutral-300 text-lg mb-8 leading-relaxed">
            {exam.description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
              <FileText className="w-6 h-6 mx-auto text-accent-300 mb-2" />
              <p className="text-sm text-neutral-400">Questions</p>
              <p className="text-xl font-bold text-white">{exam.questions?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
              <Clock className="w-6 h-6 mx-auto text-secondary-300 mb-2" />
              <p className="text-sm text-neutral-400">Time Limit</p>
              <p className="text-xl font-bold text-white">{exam.timeLimit ? `${exam.timeLimit} mins` : 'None'}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 text-center">
              <Trophy className="w-6 h-6 mx-auto text-gold-300 mb-2" />
              <p className="text-sm text-neutral-400">Passing Score</p>
              <p className="text-xl font-bold text-white">{exam.passingScore}%</p>
            </div>
          </div>

          <div className="bg-warning-500/10 border border-warning-500/20 rounded-2xl p-5 mb-8 text-warning-200 text-sm">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" /> Important Rules
            </h4>
            <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
              <li>Once you start, the timer cannot be paused.</li>
              <li>You must submit before the time runs out.</li>
              <li>Do not refresh the page during the exam.</li>
            </ul>
          </div>

          <button onClick={handleStart} className="btn-primary w-full py-4 text-lg">
            Start Exam Now
          </button>
        </div>
      </div>
    );
  }

  // --- Exam Taking UI ---
  const questions = exam.questions || [];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-fade-up">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-base-950/80 backdrop-blur-xl border-b border-white/[0.06] pt-4 pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h2 className="font-display font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {exam.title}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          {timeLeftMs !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${
              timeLeftMs < 60000 
                ? 'bg-error-500/20 text-error-300 border border-error-500/30 animate-pulse'
                : 'bg-white/[0.04] text-neutral-200 border border-white/[0.08]'
            }`}>
              <Clock className="w-4 h-4" />
              {Math.floor(timeLeftMs / 60000)}:{String(Math.floor((timeLeftMs % 60000) / 1000)).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q: any, index: number) => {
          const type = q.type; // MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY
          const currentAnswer = answers[q.id] || {};

          return (
            <div key={q.id} className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500/50" />
              
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg sm:text-xl font-medium text-white pr-4 leading-relaxed whitespace-pre-wrap">
                  <span className="text-accent-400 font-bold mr-2">{index + 1}.</span>
                  {q.text}
                </h3>
                {type !== 'READ_ONLY_TEXT' && (
                  <Badge variant="default" className="shrink-0">{q.points} pts</Badge>
                )}
              </div>
              
              {/* Read-Only Text Block */}
              {type === 'READ_ONLY_TEXT' && (
                <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 p-4 rounded-xl text-sm italic mb-2">
                  Please read the passage above. No response is required for this block.
                </div>
              )}

              {/* Multiple Choice / True-False */}
              {(type === 'MCQ' || type === 'TRUE_FALSE') && (
                <div className="space-y-3">
                  {q.answers?.map((a: any) => (
                    <label
                      key={a.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        currentAnswer.selectedAnswerId === a.id
                          ? 'border-accent-500/50 bg-accent-500/10 text-accent-100 shadow-[0_0_15px_rgba(var(--accent-500),0.1)]'
                          : 'border-white/[0.06] bg-white/[0.02] text-neutral-300 hover:bg-white/[0.04] hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="flex items-center h-6">
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={a.id}
                          checked={currentAnswer.selectedAnswerId === a.id}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { selectedAnswerId: a.id } }))}
                          className="w-4 h-4 text-accent-500 bg-transparent border-neutral-500 focus:ring-accent-500/50"
                        />
                      </div>
                      <span className="text-base pt-0.5">{a.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {type === 'SHORT_ANSWER' && (
                <div>
                  <input
                    type="text"
                    placeholder="Type your answer here..."
                    className="input w-full text-lg p-4"
                    value={currentAnswer.textResponse || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { textResponse: e.target.value } }))}
                  />
                </div>
              )}

              {/* Essay */}
              {type === 'ESSAY' && (
                <div>
                  <textarea
                    placeholder="Write your essay here..."
                    className="input w-full min-h-[200px] resize-y p-4 text-base"
                    value={currentAnswer.textResponse || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { textResponse: e.target.value } }))}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary py-4 px-10 text-lg shadow-[0_0_30px_rgba(var(--accent-500),0.3)] hover:shadow-[0_0_40px_rgba(var(--accent-500),0.4)]"
        >
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  );
}
