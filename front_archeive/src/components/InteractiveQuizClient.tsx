import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { QuizQuestion, PlaylistEntry } from '../lib/types';
import { Modal } from './Modal';

export function InteractiveQuizClient({
  lectureId,
  quiz,
  onComplete,
}: {
  lectureId: string;
  quiz: PlaylistEntry;
  onComplete: () => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Result State
  const [result, setResult] = useState<{ score: number; status: 'PASSED' | 'FAILED' | 'PENDING'; passGrade: number; message: string } | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const { data } = await api.get(`/quizzes/${quiz.item.id}`);
        setQuestions(data.questions);
        if (data.timeLimit) {
          setTimeLeft(data.timeLimit * 60);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    // Only load if not completed or locked
    if (!quiz.isCompleted && !quiz.isLocked) {
        // We start the quiz immediately to log Attempt
        api.post(`/quizzes/${quiz.item.id}/start`).then(() => {
           loadQuiz();
        }).catch((err: any) => {
            if (err.response?.status === 400) {
               // Already started, just load
               loadQuiz();
            }
        });
    } else {
        setLoading(false);
    }
  }, [quiz.item.id, quiz.isCompleted, quiz.isLocked]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result || submitting) return;

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
  }, [timeLeft, result, submitting]);

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
      setResult(data);
      if (data.status === 'PASSED') {
         onComplete();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (quiz.isLocked) {
    return (
      <div className="p-8 text-center glass rounded-2xl">
        <p className="text-neutral-400">This quiz is locked. Complete previous items first.</p>
      </div>
    );
  }

  if (quiz.isCompleted) {
    return (
      <div className="p-8 text-center glass rounded-2xl bg-success-500/10 border-success-500/20">
        <CheckCircle2 className="w-12 h-12 text-success-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-success-200">Quiz Completed</h3>
        <p className="text-success-200/80 mt-2">You have already passed this quiz.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-neutral-400">Loading quiz...</div>;
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-white/[0.05]">
        <div>
           <h2 className="text-xl font-bold text-white">{quiz.item.title}</h2>
           {quiz.item.passGrade ? <p className="text-sm text-neutral-400 mt-1">Passing Grade: {quiz.item.passGrade}%</p> : null}
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-500/10 text-accent-300 rounded-xl font-mono font-bold">
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="glass p-6 rounded-2xl border-white/[0.05]">
            <p className="text-lg font-medium text-white mb-4">
              <span className="text-accent-400 mr-2">{idx + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-2">
              {q.options?.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  disabled={submitting || result !== null}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    answers[q.id] === oIdx
                      ? 'bg-accent-500/20 border-accent-500/50 text-white'
                      : 'bg-white/[0.02] border-white/[0.05] text-neutral-300 hover:bg-white/[0.04]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSubmit()}
          disabled={submitting || result !== null}
          className="btn-primary py-3 px-8 text-lg shadow-lg shadow-accent-500/20"
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>

      {/* Summary Modal */}
      <Modal open={result !== null} onClose={() => {}} title="Quiz Results">
        {result && (
          <div className="text-center py-6">
            {result.status === 'PASSED' ? (
              <CheckCircle2 className="w-16 h-16 text-success-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
            )}
            <h2 className="text-3xl font-black text-white mb-2">{result.score}%</h2>
            <p className="text-lg text-neutral-300 mb-6">{result.message}</p>
            
            <div className="flex gap-4 justify-center">
              {result.status === 'PASSED' ? (
                <button onClick={() => window.location.reload()} className="btn-primary">
                  Continue Course
                </button>
              ) : (
                <button onClick={() => window.location.reload()} className="btn-ghost bg-white/5">
                  Retry Quiz
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
