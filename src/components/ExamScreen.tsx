import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, FileText, CheckCircle2, Trophy, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import type { CourseExamItem, ExamQuestion } from '../lib/types';
import { Spinner, Badge, Modal } from './ui';
import { useTranslation } from 'react-i18next';

type ExamResult = {
  message: string;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  isGraded?: boolean;
  score?: number;
  correctAnswers?: Record<string, number>;
  studentAnswers?: Record<string, { selectedOptionIndex?: number, textResponse?: string }>;
};

export function ExamScreen({ examId }: { examId: string }) {
  const { t } = useTranslation();
  const [exam, setExam] = useState<CourseExamItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  // Exam state
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIndex?: number, textResponse?: string }>>({});
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  const loadExam = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/exams/${examId}`);
      setExam(data);
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || t('common.error'));
    }
    setLoading(false);
  }, [examId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  // Timer
  useEffect(() => {
    if (timeLeftMs === null || !examStarted || result || submitting) return;
    if (timeLeftMs <= 0) {
      handleSubmit(); // Auto-submit when time's up
      return;
    }
    const t = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeftMs, examStarted, result, submitting]);

  async function handleStart() {
    try {
      setLoading(true);
      await api.post(`/exams/${examId}/start`);
      setExamStarted(true);
      if (exam?.timeLimit) {
        setTimeLeftMs(exam.timeLimit * 60 * 1000);
      }
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || t('exam.failedStart'));
    }
    setLoading(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const responses = Object.entries(answers).map(([questionId, ans]) => ({
        questionId,
        selectedOptionIndex: ans.selectedOptionIndex,
        textResponse: ans.textResponse,
      }));

      const { data } = await api.post(`/exams/submit`, {
        examId,
        responses,
      });
      
      await new Promise(r => setTimeout(r, 1500));
      setResult(data);
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || t('exam.failedSubmit'));
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
        <h2 className="text-3xl font-bold text-theme-text font-display text-center">{t('exam.submitting')}</h2>
        <p className="text-theme-muted text-lg text-center max-w-md">
          {t('exam.aiReviewing')}
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
        <p className="text-xl font-display font-bold text-theme-text mb-2">{error}</p>
        <button onClick={() => window.history.back()} className="btn-secondary mt-6">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
        </button>
      </div>
    );
  }

  if (!exam) return null;

  if (!examStarted) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-fade-up">
        <button onClick={() => window.history.back()} className="btn-ghost mb-6 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t('common.back')}
        </button>
        <div className="glass rounded-3xl p-8 sm:p-12">
          <Badge variant="accent" className="mb-4">{t('exam.title')}</Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-theme-text mb-4">{exam.title}</h1>
          <p className="text-theme-muted text-lg mb-8 leading-relaxed">
            {exam.description || t('exam.noDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="rounded-2xl bg-theme-card border border-theme-border p-5 text-center">
              <FileText className="w-6 h-6 mx-auto text-accent-700 dark:text-accent-300 mb-2" />
              <p className="text-sm text-theme-muted">{t('quiz.questions')}</p>
              <p className="text-xl font-bold text-theme-text">{exam.questions?.length || 0}</p>
            </div>
            <div className="rounded-2xl bg-theme-card border border-theme-border p-5 text-center">
              <Clock className="w-6 h-6 mx-auto text-secondary-700 dark:text-secondary-300 mb-2" />
              <p className="text-sm text-theme-muted">{t('quiz.timeLimit')}</p>
              <p className="text-xl font-bold text-theme-text">{exam.timeLimit ? `${exam.timeLimit} mins` : 'None'}</p>
            </div>
            <div className="rounded-2xl bg-theme-card border border-theme-border p-5 text-center">
              <Trophy className="w-6 h-6 mx-auto text-gold-700 dark:text-gold-300 mb-2" />
              <p className="text-sm text-theme-muted">{t('quiz.passGrade')}</p>
              <p className="text-xl font-bold text-theme-text">{exam.passingScore}%</p>
            </div>
          </div>

          <div className="bg-warning-500/10 border border-warning-500/20 rounded-2xl p-5 mb-8 text-warning-200 text-sm">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" /> {t('exam.importantRules')}
            </h4>
            <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
              <li>{t('exam.rule1')}</li>
              <li>{t('exam.rule2')}</li>
              <li>{t('exam.rule3')}</li>
            </ul>
          </div>

          <button onClick={handleStart} className="btn-primary w-full py-4 text-lg">
            {t('exam.startExamNow')}
          </button>
        </div>
      </div>
    );
  }

  // --- Exam Taking UI ---
  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  const answeredCount = Object.keys(answers).filter(k => 
    answers[k].selectedOptionIndex !== undefined || (answers[k].textResponse && answers[k].textResponse.trim().length > 0)
  ).length;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 animate-fade-up">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-theme-bg backdrop-blur-xl border-b border-theme-border pt-4 pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between mx-auto">
          <div>
            <h2 className="font-display font-bold text-theme-text truncate max-w-[200px] sm:max-w-md">
              {exam.title}
            </h2>
            <p className="text-sm text-theme-muted mt-0.5">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          {timeLeftMs !== null && !reviewMode && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${
              timeLeftMs < 60000 
                ? 'bg-error-500/20 text-error-300 border border-error-500/30 animate-pulse'
                : 'bg-theme-card text-theme-muted border border-theme-border'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeftMs)}
            </div>
          )}
          {reviewMode && result && (
             <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold shrink-0 ${result.status === 'PASSED' ? 'bg-success-500/10 text-success-300' : result.status === 'FAILED' ? 'bg-error-500/10 text-error-300' : 'bg-warning-500/10 text-warning-700 dark:text-warning-300'}`}>
              {result.status === 'PENDING' ? t('exam.pending') : `${t('exam.score')}: ${result.score}%`}
             </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        {/* Sidebar for Navigation */}
        <div className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 flex flex-col gap-4">
          <div className="glass p-4 rounded-2xl border-white/[0.05]">
            <h3 className="font-bold text-theme-text mb-3">{t('exam.questions')}</h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.selectedOptionIndex !== undefined || (answers[q.id]?.textResponse && answers[q.id]?.textResponse?.trim() !== '');
                let btnClass = 'bg-white/[0.02] border-white/[0.05] text-theme-muted hover:bg-theme-card';
                
                if (reviewMode && result) {
                  // Review Mode styling
                  if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
                    const isCorrect = result.correctAnswers?.[q.id] === result.studentAnswers?.[q.id]?.selectedOptionIndex;
                    if (isCorrect) {
                      btnClass = 'bg-success-500/20 border-success-500/50 text-success-300';
                    } else if (isAnswered) {
                      btnClass = 'bg-error-500/20 border-error-500/50 text-error-300';
                    }
                  } else {
                    // Manual graded items
                    btnClass = 'bg-warning-500/20 border-warning-500/50 text-warning-700 dark:text-warning-300';
                  }
                } else if (isAnswered) {
                  btnClass = 'bg-accent-500/20 border-accent-500/50 text-theme-text';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      const el = document.getElementById(`q-${q.id}`);
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }}
                    className={`w-full aspect-square rounded-lg border flex items-center justify-center font-mono font-bold transition-all text-sm ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-col gap-2 text-xs text-theme-muted">
              {reviewMode ? (
                <>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-success-500/50" /> {t('quiz.correct')}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-error-500/50" /> {t('quiz.incorrect')}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-warning-500/50" /> {t('exam.pendingReview')}</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent-500/50" /> {t('quiz.answered')}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-theme-card" /> {t('quiz.unanswered')}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full space-y-8">
          {questions.map((q: ExamQuestion, index: number) => {
            const type = q.type; // MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY
            const currentAnswer = answers[q.id] || {};

            return (
              <div id={`q-${q.id}`} key={q.id} className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent-500/50" />
                
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg sm:text-xl font-medium text-theme-text pr-4 leading-relaxed whitespace-pre-wrap">
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
                    {t('exam.readOnly')}
                  </div>
                )}

                {/* Multiple Choice / True-False */}
                {(type === 'MCQ' || type === 'TRUE_FALSE') && (
                  <div className="space-y-3">
                    {q.options?.map((opt: string, oIdx: number) => {
                      let optClass = 'bg-white/[0.02] border-white/[0.05] text-theme-muted hover:bg-theme-card';
                      let isSelected = currentAnswer.selectedOptionIndex === oIdx;

                      if (reviewMode && result) {
                        const isCorrectOption = result.correctAnswers?.[q.id] === oIdx;
                        const isStudentChoice = result.studentAnswers?.[q.id]?.selectedOptionIndex === oIdx;
                        
                        if (isCorrectOption) {
                          optClass = 'bg-success-500/20 border-success-500/50 text-success-100 font-medium relative overflow-hidden';
                        } else if (isStudentChoice && !isCorrectOption) {
                          optClass = 'bg-error-500/20 border-error-500/50 text-error-100 opacity-80 relative overflow-hidden';
                        } else {
                          optClass = 'bg-white/[0.02] border-white/[0.02] text-theme-muted opacity-50 relative';
                        }
                      } else if (isSelected) {
                        optClass = 'bg-accent-500/20 border-accent-500/50 text-theme-text shadow-[0_0_15px_rgba(var(--accent-500),0.1)]';
                      }

                      return (
                        <label
                          key={`${q.id}-${oIdx}`}
                          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${optClass} ${reviewMode ? 'pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center h-6">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={oIdx}
                              checked={isSelected}
                              disabled={reviewMode || submitting || result !== null}
                              onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { selectedOptionIndex: oIdx } }))}
                              className="w-4 h-4 text-accent-500 bg-transparent border-neutral-500 focus:ring-accent-500/50"
                            />
                          </div>
                          <span className="text-base pt-0.5 relative z-10">{opt}</span>
                          {reviewMode && result && result.correctAnswers?.[q.id] === oIdx && (
                            <CheckCircle2 className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-success-400" />
                          )}
                          {reviewMode && result && result.studentAnswers?.[q.id]?.selectedOptionIndex === oIdx && result.correctAnswers?.[q.id] !== oIdx && (
                            <XCircle className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-error-400" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {type === 'SHORT_ANSWER' && (
                  <div>
                    <input
                      type="text"
                      placeholder={t('exam.typeAnswer')}
                      className={`input w-full text-lg p-4 ${reviewMode ? 'opacity-70 pointer-events-none' : ''}`}
                      value={currentAnswer.textResponse || ''}
                      disabled={reviewMode || submitting || result !== null}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], textResponse: e.target.value } }))}
                    />
                    {reviewMode && <p className="text-warning-400 text-sm mt-2 flex items-center gap-1"><Clock className="w-4 h-4"/> {t('exam.pendingReview')}</p>}
                  </div>
                )}

                {/* Essay */}
                {type === 'ESSAY' && (
                  <div>
                    <textarea
                      placeholder={t('exam.writeEssay')}
                      className={`input w-full min-h-[200px] resize-y p-4 text-base ${reviewMode ? 'opacity-70 pointer-events-none' : ''}`}
                      value={currentAnswer.textResponse || ''}
                      disabled={reviewMode || submitting || result !== null}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], textResponse: e.target.value } }))}
                    />
                    {reviewMode && <p className="text-warning-400 text-sm mt-2 flex items-center gap-1"><Clock className="w-4 h-4"/> {t('exam.pendingReview')}</p>}
                  </div>
                )}
              </div>
            );
          })}

          {!reviewMode && (
            <div className="mt-12 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting || result !== null}
                className="btn-primary py-4 px-10 text-lg shadow-[0_0_30px_rgba(var(--accent-500),0.3)] hover:shadow-[0_0_40px_rgba(var(--accent-500),0.4)]"
              >
                {submitting ? t('exam.submitting') : t('exam.submitExam')}
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={result !== null && !reviewMode} onClose={() => {}} title={t('exam.resultsTitle')}>
        {result && (
          <div className="text-center py-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-secondary-500/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-secondary-700 dark:text-secondary-300" />
            </div>
            <h1 className="text-3xl font-display font-bold text-theme-text mb-3">
              {result.message}
            </h1>
            {result.status !== 'PENDING' ? (
              <>
                <p className="text-lg text-theme-muted">
                  {t('exam.autoGradedScore', { score: result.score })}
                </p>
                <p className="text-xl font-medium text-accent-700 dark:text-accent-300 mb-2 mt-2 flex items-center justify-center gap-1.5">
                  <span>{t('quiz.correct')}</span>
                  <span dir="ltr" className="font-mono font-bold">
                    {Object.keys(result.correctAnswers || {}).filter(qId => result.correctAnswers?.[qId] === result.studentAnswers?.[qId]?.selectedOptionIndex).length} / {questions.filter(q => q.type === 'MULTIPLE_CHOICE').length}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-lg text-theme-muted">
                {t('exam.pendingDesc')}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button onClick={() => setReviewMode(true)} className="btn-secondary">
                {t('quiz.reviewPast')}
              </button>
              <Link to="/dashboard" className="btn-primary">
                {t('exam.returnDashboard')} <ArrowRight className="w-4 h-4 ml-2 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
