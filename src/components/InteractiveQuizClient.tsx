import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { QuizQuestion, PlaylistItem } from '../lib/types';
import { Modal } from './Modal';
import { useTranslation } from 'react-i18next';

type QuizResult = {
  score: number;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  passGrade: number;
  message: string;
  isExhausted: boolean;
  maxAttempts: number;
  correctAnswers: Record<string, number>;
  studentAnswers: Record<string, number>;
};

export function InteractiveQuizClient({
  lectureId,
  quiz,
  onComplete,
  onPauseTimer,
  onResumeTimer,
}: {
  lectureId: string;
  quiz: PlaylistItem;
  onComplete: () => void;
  onPauseTimer?: () => void;
  onResumeTimer?: () => void;
}) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Intro Screen State
  const [isStarted, setIsStarted] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Result & Review State
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [pastResult, setPastResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadQuizMetadata() {
      try {
        setLoading(true);
        const { data } = await api.get(`/quizzes/${quiz.id}`);
        if (!isMounted) return;
        setQuestions(data.questions);
        setQuizDetails(data);
        
        if (quiz.isCompleted || quiz.isExhausted) {
          const { data: pastAttempt } = await api.get(`/quizzes/${quiz.id}/attempts/last-submitted`);
          if (!isMounted) return;
          if (pastAttempt) {
            setPastResult(pastAttempt);
          }
        } else {
          const { data: attempt } = await api.get(`/quizzes/${quiz.id}/attempts/current`);
          if (!isMounted) return;
          
          if (attempt) {
            setIsStarted(true);
            if (onPauseTimer) onPauseTimer();
            if (data.timeLimit) {
              const startedAt = new Date(attempt.startedAt).getTime();
              const now = new Date().getTime();
              const elapsedSeconds = Math.floor((now - startedAt) / 1000);
              const remaining = Math.max(0, (data.timeLimit * 60) - elapsedSeconds);
              setTimeLeft(remaining);
            }
            if (attempt.draftAnswers) {
              setAnswers(attempt.draftAnswers);
            }
          } else {
             if (data.timeLimit) {
                setTimeLeft(data.timeLimit * 60);
             }
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    if (!quiz.isLocked) {
        loadQuizMetadata();
    } else {
        setLoading(false);
    }
    return () => { isMounted = false; };
  }, [quiz.id, quiz.isCompleted, quiz.isLocked, quiz.isExhausted]);

  const handleStartQuiz = async () => {
    setStartLoading(true);
    setStartError(null);
    try {
      await api.post(`/quizzes/${quiz.id}/start`);
      setIsStarted(true);
      if (onPauseTimer) onPauseTimer();
    } catch (err: any) {
      if (err.response?.status === 400) {
        // Already started
        setIsStarted(true);
        if (onPauseTimer) onPauseTimer();
      } else {
        setStartError(err.response?.data?.message || 'Failed to start quiz.');
      }
    } finally {
      setStartLoading(false);
    }
  };

  useEffect(() => {
    if (!isStarted || timeLeft === null || timeLeft <= 0 || result || submitting) return;

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerId);
          handleSubmit(true); // Auto-submit when time is up
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isStarted, timeLeft, result, submitting]);

  // Handle abandoning quiz on unmount (e.g. clicking another lecture item)
  const isStartedRef = React.useRef(isStarted);
  const resultRef = React.useRef(result);
  const submittingRef = React.useRef(submitting);

  useEffect(() => {
    isStartedRef.current = isStarted;
    resultRef.current = result;
    submittingRef.current = submitting;
  }, [isStarted, result, submitting]);

  useEffect(() => {
    return () => {
      // If we are unmounting, and the quiz was started but not submitted/surrendered, abandon it
      if (isStartedRef.current && !resultRef.current && !submittingRef.current) {
        api.post(`/quizzes/${quiz.id}/abandon`).catch(() => {});
        if (onResumeTimer) onResumeTimer();
      }
    };
  }, [quiz.id, onResumeTimer]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, oIdx]) => ({
        questionId: qId,
        selectedOptionIndex: oIdx,
      }));
      
      const { data } = await api.post('/quizzes/submit', {
        answers: payloadAnswers
      });
      setResult(data as QuizResult);
      if (onResumeTimer) onResumeTimer();
      // Remove onComplete() call here so the user can review their results first
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewPast = () => {
    if (pastResult) {
      setResult(pastResult);
      setReviewMode(true);
      setIsStarted(true);
    }
  };

  const handleSurrender = async () => {
    const confirmed = window.confirm(
      "This action will record the final score without any possibility of modification; afterwards, you can click 'Review Answers' to view the answers. Are you sure?"
    );
    if (!confirmed) return;
    
    try {
      setSubmitting(true);
      await api.post(`/quizzes/${quiz.id}/surrender`);
      setResult(prev => prev ? { ...prev, isExhausted: true, message: 'Quiz surrendered.' } : null);
      setReviewMode(true);
      if (onResumeTimer) onResumeTimer();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to surrender quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (quiz.isLocked) {
    return (
      <div className="p-8 text-center glass rounded-2xl">
        <p className="text-theme-muted">This quiz is locked. Complete previous items first.</p>
      </div>
    );
  }

  if (quiz.isCompleted && !reviewMode && !result) {
    return (
      <div className="p-8 text-center glass rounded-2xl bg-secondary-500/10 border-secondary-500/20 animate-scale-in">
        <CheckCircle2 className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-secondary-200">Quiz Completed</h3>
        <p className="text-secondary-200/80 mt-2 mb-6">You have already passed this quiz.</p>
        
        {pastResult && (
          <button 
            onClick={handleReviewPast} 
            className="btn-secondary py-2 px-6 shadow-lg shadow-black/20"
          >
            Review Past Answers
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-theme-muted">Loading quiz...</div>;
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!isStarted && quizDetails && !result) {
    return (
      <div className="glass p-8 rounded-3xl text-center max-w-2xl mx-auto border-white/[0.05] animate-scale-in">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-theme-text mb-6">{quiz.title}</h2>
        
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          <div className="text-center">
            <p className="text-xs text-theme-muted uppercase tracking-wider mb-1">{t('quiz.questions')}</p>
            <p className="text-xl font-bold text-theme-text">{questions.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-theme-muted uppercase tracking-wider mb-1">{t('quiz.timeLimit')}</p>
            <p className="text-xl font-bold text-theme-text">{quizDetails.timeLimit ? `${quizDetails.timeLimit} mins` : 'None'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-theme-muted uppercase tracking-wider mb-1">{t('quiz.passGrade')}</p>
            <p className="text-xl font-bold text-theme-text">{quizDetails.passGrade}%</p>
          </div>
        </div>

        {quiz.isExhausted ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm max-w-sm w-full">
              <XCircle className="w-5 h-5 mx-auto mb-2 opacity-80" />
              You have exhausted all attempts for this quiz.
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {pastResult && (
                <button 
                  onClick={handleReviewPast} 
                  className="btn-secondary py-3 px-8 text-lg w-full sm:w-auto"
                >
                  Review Past Answers
                </button>
              )}
              <button 
                onClick={onComplete} 
                className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20 w-full sm:w-auto"
              >
                Continue to Next Item
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            {startError && (
              <div className="mb-2 p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300 text-sm max-w-sm w-full">
                <XCircle className="w-5 h-5 mx-auto mb-2 opacity-80" />
                {startError}
              </div>
            )}
            
            {startError && startError.toLowerCase().includes('maximum number of attempts') ? (
              <button 
                onClick={onComplete} 
                className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20 w-full sm:w-auto"
              >
                Continue to Next Item
              </button>
            ) : (
              <button 
                onClick={handleStartQuiz} 
                disabled={startLoading}
                className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20 w-full sm:w-auto"
              >
                {startLoading ? 'Preparing Quiz...' : (startError ? 'Try Again' : 'Start Quiz')}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const correctCount = result ? questions.filter(q => result.studentAnswers[q.id] !== undefined && result.studentAnswers[q.id] === result.correctAnswers[q.id]).length : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start relative">
      {/* Sidebar for Navigation */}
      <div className="w-full lg:w-64 shrink-0 lg:sticky lg:top-6 flex flex-col gap-4">
        <div className="glass p-4 rounded-2xl border-white/[0.05]">
          <h3 className="font-bold text-theme-text mb-3">Questions</h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              let btnClass = 'bg-white/[0.02] border-white/[0.05] text-theme-muted hover:bg-theme-card';
              
              if (reviewMode && result) {
                const isCorrect = result.correctAnswers[q.id] === result.studentAnswers[q.id];
                if (isCorrect) {
                  btnClass = 'bg-secondary-500/20 border-secondary-500/50 text-secondary-700 dark:text-secondary-300';
                } else {
                  btnClass = 'bg-error-500/20 border-error-500/50 text-error-300';
                }
              } else if (isAnswered) {
                btnClass = 'bg-accent-500/20 border-accent-500/50 text-theme-text';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
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
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary-500/50" /> Correct</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-error-500/50" /> Incorrect</div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-accent-500/50" /> Answered</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-theme-card" /> Unanswered</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between glass p-4 rounded-2xl border-white/[0.05] gap-4">
          <div>
            <h2 className="text-xl font-bold text-theme-text">{quiz.title}</h2>
            {quiz.passGrade ? <p className="text-sm text-theme-muted mt-1">Passing Grade: {quiz.passGrade}%</p> : null}
          </div>
          {timeLeft !== null && !reviewMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 text-accent-700 dark:text-accent-300 rounded-xl font-mono font-bold shrink-0">
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
          )}
          {reviewMode && result && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold shrink-0 ${result.status === 'PASSED' ? 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-300' : 'bg-error-500/10 text-error-300'}`}>
              Score: {correctCount}/{questions.length}
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div id={`q-${q.id}`} key={q.id} className="glass p-6 rounded-2xl border-white/[0.05] scroll-mt-24">
              <p className="text-lg font-medium text-theme-text mb-4">
                <span className="text-accent-400 mr-2">{idx + 1}.</span>
                {q.text}
              </p>
              <div className="space-y-2">
                {q.options?.map((opt, oIdx) => {
                  let optClass = 'bg-white/[0.02] border-white/[0.05] text-theme-muted hover:bg-theme-card';
                  let isSelected = answers[q.id] === oIdx;

                  if (reviewMode && result) {
                    const isCorrectOption = result.correctAnswers[q.id] === oIdx;
                    const isStudentChoice = result.studentAnswers[q.id] === oIdx;
                    
                    if (isCorrectOption) {
                      optClass = 'bg-secondary-500/20 border-secondary-500/50 text-secondary-100 font-medium relative overflow-hidden';
                    } else if (isStudentChoice && !isCorrectOption) {
                      optClass = 'bg-error-500/20 border-error-500/50 text-error-100 opacity-80 relative overflow-hidden';
                    } else {
                      optClass = 'bg-white/[0.02] border-white/[0.02] text-theme-muted opacity-50 relative';
                    }
                  } else if (isSelected) {
                    optClass = 'bg-accent-500/20 border-accent-500/50 text-theme-text';
                  }

                  return (
                    <button
                      key={`${q.id}-${oIdx}`}
                      disabled={submitting || result !== null || reviewMode}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${optClass}`}
                    >
                      {opt}
                      {reviewMode && result && result.correctAnswers[q.id] === oIdx && (
                        <CheckCircle2 className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                      )}
                      {reviewMode && result && result.studentAnswers[q.id] === oIdx && result.correctAnswers[q.id] !== oIdx && (
                        <XCircle className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-error-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!reviewMode ? (
          <div className="flex justify-end pt-4">
            <button
              onClick={() => handleSubmit()}
              disabled={submitting || result !== null}
              className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20 w-full sm:w-auto"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-4 mt-8 border-t border-white/[0.05]">
            <button
              onClick={() => onComplete()}
              className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20 w-full sm:w-auto"
            >
              Continue to Next Item
            </button>
          </div>
        )}

        {/* Summary Modal */}
        <Modal open={result !== null && !reviewMode} onClose={() => {}} title={t('quiz.resultsTitle')}>
          {result && (
            <div className="text-center py-6">
              {result.status === 'PASSED' ? (
                <CheckCircle2 className="w-16 h-16 text-secondary-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              )}
              <p className="text-xl font-medium text-accent-700 dark:text-accent-300 mb-2 flex items-center justify-center gap-1.5">
                <span>{t('quiz.correctText')}</span>
                <span dir="ltr" className="font-mono font-bold">
                  {Object.keys(result.correctAnswers || {}).filter(qId => result.correctAnswers[qId] === result.studentAnswers[qId]).length} / {questions.length}
                </span>
              </p>
              <p className="text-lg text-theme-muted mb-6">
                {result.status === 'PASSED' ? t('quiz.passed') : t('quiz.failed')}
              </p>
              
              {result.passGrade === 0 && (
                <p className="text-sm text-theme-muted mb-4">{t('quiz.informational')}</p>
              )}
              {result.isExhausted && (
                <p className="text-sm text-warning-400 mb-4">{t('quiz.exhausted')}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                {(result.status === 'PASSED' || result.passGrade === 0 || result.isExhausted) ? (
                  <>
                    <button onClick={() => setReviewMode(true)} className="btn-secondary">
                      {t('quiz.reviewPast')}
                    </button>
                    <button onClick={() => onComplete()} className="btn-primary">
                      {t('quiz.continueNext')} <ArrowRight className="w-4 h-4 ml-2 rtl:rotate-180" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => window.location.reload()} className="btn-primary">
                      {t('quiz.retry')}
                    </button>
                    <button 
                      onClick={handleSurrender} 
                      disabled={submitting}
                      className="btn-danger bg-error-500 hover:bg-error-400 text-theme-text border-none shadow-error-500/20"
                    >
                      {submitting ? t('quiz.surrendering') : t('quiz.surrender')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
