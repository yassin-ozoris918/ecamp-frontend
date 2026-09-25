import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Clock, CheckCircle2, XCircle, ArrowRight, ArrowDownUp } from 'lucide-react';
import { QuizQuestion, PlaylistItem } from '../lib/types';
import { useTranslation } from 'react-i18next';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';
import { BiDiText } from './common';

type QuizResult = {
  score: number;
  status: 'PASSED' | 'FAILED' | 'PENDING';
  passGrade: number;
  message: string;
  studentAnswers: Record<string, any>;
  correctAnswers: Record<string, any>;
  feedback: Record<string, { points: number | null; feedback: string | null }>;
  earnedPoints?: number;
  totalPoints?: number;
};

export function InteractiveQuizClient({
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
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [isStarted, setIsStarted] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any>(null);
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();
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
          if (pastAttempt) setPastResult(pastAttempt);
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
            if (attempt.draftAnswers) setAnswers(attempt.draftAnswers);
          } else {
             if (data.timeLimit) setTimeLeft(data.timeLimit * 60);
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    if (!quiz.isLocked) loadQuizMetadata();
    else setLoading(false);
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
        setIsStarted(true);
        if (onPauseTimer) onPauseTimer();
      } else {
        setStartError(err.response?.data?.message ? t(err.response.data.message) : t('quiz.failedStart'));
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
          handleSubmit(true);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [isStarted, timeLeft, result, submitting]);

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
      if (isStartedRef.current && !resultRef.current && !submittingRef.current) {
        api.post(`/quizzes/${quiz.id}/abandon`).catch(() => {});
        if (onResumeTimer) onResumeTimer();
      }
    };
  }, [quiz.id, onResumeTimer]);

  const handleSubmit = async (_isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        ...ans,
      }));
      
      const { data } = await api.post('/quizzes/submit', {
        answers: payloadAnswers
      });
      setResult(data as QuizResult);
      if (onResumeTimer) onResumeTimer();
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
    const confirmed = await confirm(t('quiz.surrenderTitle'), t('quiz.surrenderDesc'), 'destructive');
    if (confirmed) {
      handleSubmit();
    }
  };

  const handleAcceptFailureAndEndAttempts = async () => {
    const confirmed = await confirm(
      'Are you sure?',
      'This will permanently consume your remaining attempts and lock this lecture item. This action cannot be undone.',
      'destructive'
    );
    if (confirmed) {
      setSubmitting(true);
      try {
        await api.post(`/quizzes/${quiz.id}/surrender`, { studentId: '' /* handled by backend token */ });
        onComplete();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.message || 'Error surrendering attempts');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // --- Handlers for 7 Question Types ---
  const handleSelectOption = (qId: string, idx: number) => {
    if (reviewMode) return;
    setAnswers(prev => ({ ...prev, [qId]: { selectedOptionIndex: idx } }));
  };

  const handleTextChange = (qId: string, text: string) => {
    if (reviewMode) return;
    setAnswers(prev => ({ ...prev, [qId]: { textResponse: text } }));
  };

  const handleMatchChange = (qId: string, leftItem: string, rightItem: string) => {
    if (reviewMode) return;
    setAnswers(prev => {
      const currentArr = prev[qId]?.matchAnswer || [];
      const filtered = currentArr.filter((pair: any) => pair.left !== leftItem);
      return { ...prev, [qId]: { matchAnswer: [...filtered, { left: leftItem, right: rightItem }] } };
    });
  };

  const handleOrderChange = (qId: string, idx: number, direction: 'up' | 'down') => {
    if (reviewMode) return;
    setAnswers(prev => {
      const currentOrder = prev[qId]?.orderAnswer || questions.find(q => q.id === qId)?.correctOrder || [];
      if (!currentOrder || currentOrder.length === 0) return prev;
      
      const arr = [...currentOrder];
      if (direction === 'up' && idx > 0) {
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      } else if (direction === 'down' && idx < arr.length - 1) {
        [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      }
      return { ...prev, [qId]: { orderAnswer: arr } };
    });
  };

  const isAnswered = (qId: string) => {
    return !!answers[qId];
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-neutral-900 rounded-3xl p-8 sm:p-12 text-center border border-neutral-800 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-50" />
          <div className="relative z-10">
            <h2 className="text-3xl font-display font-bold text-white mb-4">{quizDetails?.title || quiz.title}</h2>
            {quizDetails?.description && <p className="text-theme-muted mb-8">{quizDetails.description}</p>}
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              {quizDetails?.timeLimit && (
                <div className="flex items-center gap-2 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold font-mono text-white">{quizDetails.timeLimit} {t('quiz.minutes')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
                <CheckCircle2 className="w-5 h-5 text-accent-400" />
                <span className="font-bold text-white">{t('quiz.passGrade')}: {quizDetails?.passGrade || quiz.passGrade}%</span>
              </div>
              <div className="flex items-center gap-2 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
                <span className="font-bold text-theme-muted">
                  {t('quiz.attempts')}: <span className="text-white">{quiz.attemptsCount}</span> / {quiz.maxAttempts}
                </span>
              </div>
            </div>

            {startError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
                {startError}
              </div>
            )}

            {!quiz.isExhausted && !quiz.isCompleted ? (
              <button onClick={handleStartQuiz} disabled={startLoading} className="btn-primary w-full sm:w-auto px-12 py-4 text-lg group">
                {startLoading ? t('common.loading') : (
                  <>
                    {quiz.attemptsCount > 0 ? t('quiz.startRetry') : t('quiz.startAttempt')}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-theme-muted font-medium">
                  {quiz.isCompleted ? t('quiz.completedInfo') : t('quiz.exhaustedInfo')}
                </div>
                {pastResult && (
                  <button onClick={handleReviewPast} className="btn-secondary">
                    {t('quiz.reviewLastAttempt')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const isPassed = result.status === 'PASSED';
    const isPending = result.status === 'PENDING';
    const resultsHidden = (!result.correctAnswers || Object.keys(result.correctAnswers).length === 0) && 
                          (isPending || (!isPassed && !quiz.isExhausted && !(result as any).isExhausted));
    
    return (
      <div className="max-w-4xl mx-auto py-8">
        {!reviewMode && (
          <div className="mb-12 text-center bg-neutral-900 border border-neutral-800 rounded-3xl p-12 relative overflow-hidden shadow-2xl">
             <div className={`absolute inset-0 bg-gradient-to-b ${isPassed ? 'from-accent-500/10' : isPending ? 'from-amber-500/10' : 'from-rose-500/10'} to-transparent opacity-50`} />
             <div className="relative z-10">
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl ${isPassed ? 'bg-accent-500/20 text-accent-400' : isPending ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {isPassed ? <CheckCircle2 className="w-12 h-12" /> : isPending ? <Clock className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                </div>
                <h2 className="text-4xl font-display font-bold text-white mb-4">
                  {isPassed ? t('quiz.passedTitle') : isPending ? t('quiz.pendingReview') : t('quiz.failedTitle')}
                </h2>
                <div className="flex justify-center items-end gap-2 mb-4">
                  <span className={`text-6xl font-display font-black ${isPassed ? 'text-accent-400' : isPending ? 'text-amber-400' : 'text-rose-400'}`}>
                    {result.earnedPoints ?? result.score}
                  </span>
                  <span className="text-2xl text-theme-muted font-bold mb-2">/ {result.totalPoints ?? 100}</span>
                </div>
                <p className="text-theme-muted font-medium mb-8">
                  {isPending ? t('quiz.pendingReviewDesc') : t('quiz.passGradeWas', { grade: result.passGrade })}
                </p>
                
                <div className="flex gap-4 justify-center">
                  {!resultsHidden && (
                    <button onClick={() => setReviewMode(true)} className="btn-secondary px-8">
                      {t('quiz.reviewAnswers')}
                    </button>
                  )}
                  {isPassed || isPending ? (
                    <button onClick={onComplete} className="btn-primary px-8">
                      {t('common.continue', { defaultValue: 'Continue' })} <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  ) : quiz.isExhausted || (result as any).isExhausted ? (
                    <button onClick={onComplete} className="btn-primary px-8">
                      {t('common.continue', { defaultValue: 'Continue' })} <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => window.location.reload()} disabled={submitting} className="btn-primary px-8 group">
                        {t('quiz.startRetry') || 'Take Again'} <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button onClick={handleAcceptFailureAndEndAttempts} disabled={submitting} className="px-6 py-3 font-bold text-sm bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all">
                        {submitting ? '...' : 'Accept Failure & End Attempts / قبول الرسوب وإنهاء المحاولات'}
                      </button>
                    </>
                  )}
                </div>

                {(!isPassed && quiz.isExhausted) && (
                  <div className="mt-8 p-6 rounded-2xl border-2 border-rose-500 bg-rose-500/10 text-center shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                    <p className="text-xl font-bold text-rose-400 mb-2">
                      You have exhausted all attempts without achieving a passing grade; the administration will contact both you and your guardian to take the appropriate action.
                    </p>
                    <p className="text-xl font-bold text-rose-400">
                      لقد استنفدت جميع المحاولات دون الحصول على درجة النجاح؛ ستتواصل الإدارة معك ومع ولي أمرك لاتخاذ الإجراء المناسب.
                    </p>
                  </div>
                )}
             </div>
          </div>
        )}

        {(reviewMode || result.status !== 'PENDING') && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white px-2 flex justify-between items-center">
              {reviewMode && !pastResult ? t('quiz.reviewMode') : t('quiz.resultsDetails')}
              {reviewMode && <button onClick={onComplete} className="text-sm font-bold text-cyan-400 hover:text-cyan-300">{t('common.close')}</button>}
            </h3>
            
            {/* If backend hasn't provided correctAnswers, it means results are hidden for a pending retry */}
            {(!result.correctAnswers || Object.keys(result.correctAnswers).length === 0) && result.status === 'FAILED' && !quiz.isExhausted && !(result as any).isExhausted ? (
               <div className="p-8 text-center border border-neutral-800 rounded-2xl bg-neutral-900/50 flex flex-col items-center gap-3">
                 <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center mb-2">
                   <CheckCircle2 className="w-6 h-6 text-theme-muted" />
                 </div>
                 <h4 className="text-xl font-bold text-white">Results Hidden</h4>
                 <p className="text-theme-muted max-w-lg">
                   You have remaining attempts. The correct answers and detailed feedback will only be revealed if you pass the quiz, exhaust all attempts, or choose to accept this failing grade.
                 </p>
               </div>
            ) : (
            questions.map((q, idx) => {
              const stuAns = result.studentAnswers?.[q.id];
              const corAns = result.correctAnswers?.[q.id];
              
              // Objective logic
              const isCorrectMCQ = (q.type === 'MCQ' || q.type === 'TRUE_FALSE') && stuAns?.selectedOptionIndex === corAns;
              const isWrongMCQ = (q.type === 'MCQ' || q.type === 'TRUE_FALSE') && stuAns?.selectedOptionIndex !== corAns;
              
              return (
                <div key={q.id} className={`p-6 rounded-2xl border bg-neutral-900 relative overflow-hidden transition-all duration-300 ${isCorrectMCQ ? 'border-accent-500/30 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : isWrongMCQ ? 'border-rose-500/30' : 'border-neutral-800'}`}>
                  {/* ... Header logic similar to before ... */}
                  <div className="flex items-start gap-4 mb-6">
                     <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isCorrectMCQ ? 'bg-accent-500/20 text-accent-400' : isWrongMCQ ? 'bg-rose-500/20 text-rose-400' : 'bg-neutral-800 text-theme-muted'}`}>
                       {idx + 1}
                     </div>
                     <BiDiText text={q.text} as="h4" className="text-lg font-medium text-white flex-1" />
                  </div>
                  
                  {/* Type Specific Review Rendering */}
                  {['MCQ', 'TRUE_FALSE', 'MULTIPLE_CHOICE'].includes(q.type) && (
                    <div className="space-y-3 pl-12">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = stuAns?.selectedOptionIndex === optIdx;
                        const isActualCorrect = corAns === optIdx;
                        
                        let stateClass = "border-neutral-800 bg-neutral-950 text-theme-muted";
                        if (isActualCorrect && isSelected) stateClass = "border-accent-500 bg-accent-500/10 text-accent-100 font-medium";
                        else if (isActualCorrect && !isSelected) stateClass = "border-accent-500/50 bg-neutral-950 text-accent-200 border-dashed";
                        else if (!isActualCorrect && isSelected) stateClass = "border-rose-500 bg-rose-500/10 text-rose-100 font-medium";
                        
                        return (
                           <div key={optIdx} className={`p-4 rounded-xl border ${stateClass} flex items-center justify-between transition-colors`}>
                             <BiDiText text={opt} as="span" />
                             {isActualCorrect && <CheckCircle2 className="w-5 h-5 text-accent-500" />}
                             {!isActualCorrect && isSelected && <XCircle className="w-5 h-5 text-rose-500" />}
                           </div>
                        );
                      })}
                    </div>
                  )}

                   {['ESSAY', 'SHORT_ANSWER'].includes(q.type) && (
                    <div className="space-y-3 pl-12">
                       <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 text-theme-text opacity-70">
                         <strong>Your Answer:</strong><br/>
                         {stuAns?.textResponse || <span className="text-theme-muted italic">No answer provided</span>}
                       </div>
                       {result.status === 'PENDING' ? (
                         <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-200">
                           <strong>Points Awarded:</strong> <span className="italic">Pending AI Grading</span>
                         </div>
                       ) : (
                         <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-cyan-200">
                           <strong>Points Awarded:</strong> {result.feedback?.[q.id]?.points ?? 0} / {q.points}<br/>
                           {result.feedback?.[q.id]?.feedback && <p className="mt-2 text-sm italic">{result.feedback[q.id].feedback}</p>}
                         </div>
                       )}
                    </div>
                  )}

                  {q.type === 'MATCHING' && (
                    <div className="space-y-3 pl-12">
                      {(result.correctAnswers?.[q.id] || []).map((pair: any, pIdx: number) => {
                        const studentRight = stuAns?.matchAnswer?.find((m: any) => m.left === pair.left)?.right;
                        const isCorrect = studentRight === pair.right;
                        return (
                          <div key={pIdx} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 ${isCorrect ? 'border-accent-500/40 bg-accent-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
                            <BiDiText text={pair.left} as="span" className="flex-1 font-medium text-white" />
                            <span className="text-theme-muted text-sm hidden sm:block">→</span>
                            <div className="flex flex-col gap-1 flex-1">
                              {studentRight ? (
                                <span className={`text-sm font-semibold ${isCorrect ? 'text-accent-400' : 'text-rose-400'}`}>
                                  {isCorrect ? '✓' : '✗'} {studentRight}
                                </span>
                              ) : (
                                <span className="text-sm text-theme-muted italic">No answer</span>
                              )}
                              {!isCorrect && (
                                <span className="text-xs text-accent-400 border border-dashed border-accent-500/40 rounded px-2 py-0.5 w-fit">
                                  Correct: <BiDiText text={pair.right} as="span" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {result.status === 'PENDING' ? (
                        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-200 text-sm">
                          <strong>Points Awarded:</strong> <span className="italic">Pending AI Grading</span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-cyan-200 text-sm">
                          <strong>Points Awarded:</strong> {result.feedback?.[q.id]?.points ?? 0} / {q.points}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>
        )}
      </div>
    );
  }

  // Active Quiz Taking UI
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto py-6 relative">
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
      
      {/* Sticky Header */}
      <div className="sticky top-6 z-40 bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-4 rounded-2xl flex items-center justify-between mb-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
             <span className="text-xs font-bold text-theme-muted uppercase tracking-wider">{t('quiz.progress')}</span>
             <div className="flex items-center gap-2">
               <span className="text-white font-mono font-bold text-lg">{answeredCount}</span>
               <span className="text-theme-muted">/</span>
               <span className="text-theme-muted font-mono">{questions.length}</span>
             </div>
          </div>
        </div>
        
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft < 60 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse' : 'bg-neutral-950 border-neutral-800 text-white'}`}>
            <Clock className="w-5 h-5" />
            <span className="font-bold font-mono text-lg">{formatTime(timeLeft)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleSurrender} className="text-sm font-bold text-theme-muted hover:text-rose-400 transition-colors px-3 py-2 rounded-lg hover:bg-neutral-800">
            {t('quiz.surrender')}
          </button>
          <button 
            onClick={() => handleSubmit()} 
            disabled={submitting || answeredCount === 0}
            className="btn-primary"
          >
            {submitting ? '...' : t('quiz.submitFinish')}
          </button>
        </div>
      </div>

      <div className="space-y-8 pb-32">
        {questions.map((q, idx) => (
          <div key={q.id} id={`q-${q.id}`} className={`p-6 sm:p-8 rounded-3xl border bg-neutral-900 shadow-xl transition-all duration-300 ${isAnswered(q.id) ? 'border-cyan-500/30' : 'border-neutral-800'}`}>
            <div className="flex items-start gap-4 mb-8">
               <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-bold text-lg ${isAnswered(q.id) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-neutral-800 text-theme-muted'}`}>
                 {idx + 1}
               </div>
               <div>
                 <BiDiText text={q.text} as="h4" className="text-xl font-medium text-white leading-relaxed" />
                 <div className="mt-2 text-xs font-bold text-theme-muted uppercase tracking-wider">
                   {q.points} {t('quiz.points')} • {t(`quiz.questionTypes.${q.type}`)}
                 </div>
               </div>
            </div>

            {/* Answer Interactions based on Type */}
            {['MCQ', 'TRUE_FALSE', 'MULTIPLE_CHOICE'].includes(q.type) && (
              <div className="grid gap-3 pl-0 sm:pl-14">
                {q.options?.map((opt, optIdx) => {
                  const isSelected = answers[q.id]?.selectedOptionIndex === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 group hover:-translate-y-0.5 ${isSelected ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-cyan-500' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />}
                      </div>
                      <BiDiText text={opt} as="span" className={`text-base ${isSelected ? 'text-white font-medium' : 'text-theme-muted group-hover:text-theme-text'}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {['ESSAY', 'SHORT_ANSWER'].includes(q.type) && (
              <div className="pl-0 sm:pl-14">
                <textarea
                  dir="auto"
                  style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                  value={answers[q.id]?.textResponse || ''}
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-white placeholder-neutral-600 outline-none focus:border-cyan-500 transition-colors h-32 resize-none"
                  placeholder="Type your answer here..."
                />
              </div>
            )}

            {q.type === 'MATCHING' && (
              <div className="grid gap-4 pl-0 sm:pl-14">
                {(q.matchOptions || []).map((matchPair, idx) => {
                  const selectedRight = answers[q.id]?.matchAnswer?.find((m: any) => m.left === matchPair.left)?.right || '';
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                      <BiDiText text={matchPair.left} className="flex-1 w-full text-center sm:text-start font-medium text-white" />
                      <ArrowRight className="w-5 h-5 text-theme-muted hidden sm:block" />
                      <select 
                        value={selectedRight}
                        onChange={(e) => handleMatchChange(q.id, matchPair.left, e.target.value)}
                        className="flex-1 w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500"
                      >
                        <option value="">Select a match...</option>
                        {q.matchOptions?.map(mo => (
                          <option key={mo.right} value={mo.right}>{mo.right}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'ORDERING' && (
              <div className="grid gap-3 pl-0 sm:pl-14">
                {(answers[q.id]?.orderAnswer || q.correctOrder || []).map((item: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                    <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-neutral-900 text-theme-muted rounded-xl font-bold">{idx + 1}</span>
                    <BiDiText text={item} as="span" className="flex-1 text-white font-medium" />
                    <div className="flex flex-col gap-1">
                      <button disabled={idx === 0} onClick={() => handleOrderChange(q.id, idx, 'up')} className="p-1 rounded bg-neutral-900 text-theme-muted hover:text-white disabled:opacity-30"><ArrowDownUp className="w-4 h-4 rotate-180" /></button>
                      <button disabled={idx === (q.correctOrder?.length || 0) - 1} onClick={() => handleOrderChange(q.id, idx, 'down')} className="p-1 rounded bg-neutral-900 text-theme-muted hover:text-white disabled:opacity-30"><ArrowDownUp className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {q.type === 'READ_ONLY_TEXT' && (
              <div className="pl-0 sm:pl-14">
                 <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-theme-muted italic">
                   Please read the text above carefully. No answer is required.
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
