import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  BookOpen,
  User,
  Award,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  Eye,
  Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import type { QuizAttemptReview, QuizReviewQuestion } from '../lib/types';
import { Badge } from './common';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'PASSED')
    return <Badge variant="success">PASSED</Badge>;
  if (status === 'FAILED')
    return <Badge variant="error">FAILED</Badge>;
  return <Badge variant="warning">PENDING</Badge>;
}

function CorrectnessBadge({ status }: { status: string }) {
  switch (status) {
    case 'CORRECT':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Correct
        </span>
      );
    case 'INCORRECT':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" /> Incorrect
        </span>
      );
    case 'PARTIAL':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" /> Partially Correct
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Pending Review
        </span>
      );
    case 'READ_ONLY':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 bg-neutral-500/10 border border-neutral-500/20 px-2 py-0.5 rounded-full">
          <Eye className="w-3 h-3" /> Read Only
        </span>
      );
    default:
      return null;
  }
}

// ─── Per-question renderers ────────────────────────────────────────────────────

function McqTrueFalseReview({ q }: { q: QuizReviewQuestion }) {
  const { studentAnswer, correctAnswer } = q;
  const options = correctAnswer.options ?? [];
  const studentIdx = studentAnswer.selectedOptionIndex;
  const correctIdx = correctAnswer.correctOptionIndex;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">Student's Answer</p>
          {studentIdx !== null && studentIdx !== undefined && options[studentIdx] !== undefined ? (
            <p className={`text-sm font-semibold ${studentIdx === correctIdx ? 'text-emerald-400' : 'text-rose-400'}`}>
              {options[studentIdx]}
            </p>
          ) : (
            <p className="text-sm text-theme-muted italic">No answer given</p>
          )}
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Correct Answer</p>
          <p className="text-sm font-semibold text-emerald-400">
            {options[correctIdx] ?? `Option ${correctIdx}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchingReview({ q }: { q: QuizReviewQuestion }) {
  const { studentAnswer, correctAnswer } = q;
  const studentMappings: { left: string; right: string }[] = (studentAnswer.matchAnswer as any) ?? [];
  const canonicalMappings: { left: string; right: string }[] = (correctAnswer.matchOptions as any) ?? [];

  const isCorrectPair = (left: string, right: string) =>
    canonicalMappings.some((m) => m.left === left && m.right === right);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">Student's Mappings</p>
          {studentMappings.length > 0 ? (
            <div className="space-y-1">
              {studentMappings.map((m, i) => {
                const correct = isCorrectPair(m.left, m.right);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {correct
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      : <XCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                    <span className="text-theme-text font-medium">{m.left}</span>
                    <span className="text-theme-muted">→</span>
                    <span className={correct ? 'text-emerald-400' : 'text-rose-400'}>{m.right}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-theme-muted italic">No answer given</p>
          )}
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Correct Mappings</p>
          <div className="space-y-1">
            {canonicalMappings.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-theme-text font-medium">{m.left}</span>
                <span className="text-theme-muted">→</span>
                <span className="text-emerald-400">{m.right}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderingReview({ q }: { q: QuizReviewQuestion }) {
  const { studentAnswer, correctAnswer } = q;
  const studentOrder: string[] = studentAnswer.orderAnswer ?? [];
  const correctOrder: string[] = correctAnswer.correctOrder ?? [];

  const correctPositions = studentOrder.filter((item, i) => item === correctOrder[i]).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">Student's Order</p>
          {studentOrder.length > 0 ? (
            <ol className="space-y-1">
              {studentOrder.map((item, i) => {
                const correct = item === correctOrder[i];
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center text-[10px] font-bold text-theme-muted">{i + 1}</span>
                    {correct
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      : <XCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                    <span className={correct ? 'text-emerald-400' : 'text-rose-400 line-through'}>{item}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-xs text-theme-muted italic">No answer given</p>
          )}
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Correct Order</p>
          <ol className="space-y-1">
            {correctOrder.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">{i + 1}</span>
                <span className="text-emerald-300">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-xs text-theme-muted">
        Correct positions: <span className="font-bold text-theme-text">{correctPositions} / {correctOrder.length}</span>
      </p>
    </div>
  );
}

function SubjectiveReview({
  q,
  onOverrideSaved,
}: {
  q: QuizReviewQuestion;
  onOverrideSaved: (responseId: string, newPoints: number, newOverride: number) => void;
}) {
  const [override, setOverride] = useState<string>(
    q.instructorOverrideScore !== null ? String(q.instructorOverrideScore) : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(override);
    if (isNaN(val) || val < 0 || val > q.maxPoints) {
      toast.error(`Score must be between 0 and ${q.maxPoints}`);
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/admin/quizzes/responses/${q.responseId}/override`, { points: val });
      onOverrideSaved(q.responseId, val, val);
      toast.success('Grade saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  const finalScore = q.instructorOverrideScore !== null
    ? q.instructorOverrideScore
    : (q.aiScoreGuess ?? q.earnedPoints);

  return (
    <div className="space-y-4">
      {/* Student Answer */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">Student's Answer</p>
        {q.studentAnswer.textResponse ? (
          <p className="text-sm text-theme-text leading-relaxed whitespace-pre-wrap">{q.studentAnswer.textResponse}</p>
        ) : (
          <p className="text-sm text-theme-muted italic">No answer given</p>
        )}
      </div>

      {/* Reference Answer */}
      {q.correctAnswer.referenceAnswer && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Reference Answer</p>
          <p className="text-sm text-emerald-300 leading-relaxed whitespace-pre-wrap">{q.correctAnswer.referenceAnswer}</p>
        </div>
      )}

      {/* AI Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">AI Score</p>
          {q.aiScoreGuess !== null ? (
            <>
              <p className="text-lg font-bold text-cyan-400">{q.aiScoreGuess} / {q.maxPoints}</p>
              {q.aiConfidenceScore !== null && (
                <p className="text-[10px] text-theme-muted mt-1">Confidence: {Math.round((q.aiConfidenceScore ?? 0) * 100)}%</p>
              )}
              {q.evaluationNote && (
                <p className="text-xs text-theme-muted mt-2 leading-relaxed">{q.evaluationNote}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-theme-muted italic">Not available</p>
          )}
        </div>

        {/* Instructor Override */}
        <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Instructor Override</p>
          {q.instructorOverrideScore !== null && (
            <p className="text-xs text-theme-muted mb-2">
              Current: <span className="font-bold text-purple-400">{q.instructorOverrideScore} / {q.maxPoints}</span>
            </p>
          )}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              max={q.maxPoints}
              step={0.5}
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              placeholder={`0 – ${q.maxPoints}`}
              className="flex-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleSave}
              disabled={saving || override === ''}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 text-xs font-bold transition disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Final Score */}
      <div className="flex items-center gap-2 text-sm">
        <Award className="w-4 h-4 text-gold-400" />
        <span className="text-theme-muted">Final Grade:</span>
        <span className="font-bold text-theme-text">
          {finalScore !== null ? `${finalScore} / ${q.maxPoints}` : 'Pending'}
        </span>
        {q.instructorOverrideScore !== null && q.aiScoreGuess !== null && (
          <span className="text-[10px] text-theme-muted">(overridden from AI: {q.aiScoreGuess})</span>
        )}
      </div>
    </div>
  );
}

// ─── Single question card ─────────────────────────────────────────────────────

function QuestionCard({
  q,
  expanded,
  onToggle,
  onOverrideSaved,
}: {
  q: QuizReviewQuestion;
  expanded: boolean;
  onToggle: () => void;
  onOverrideSaved: (responseId: string, newPoints: number, newOverride: number) => void;
}) {
  const isReadOnly = q.questionType === 'READ_ONLY_TEXT';
  const isSubjective = q.questionType === 'ESSAY' || q.questionType === 'SHORT_ANSWER';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${
      q.correctnessStatus === 'CORRECT' ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
      : q.correctnessStatus === 'INCORRECT' ? 'border-rose-500/20 bg-rose-500/[0.02]'
      : q.correctnessStatus === 'PARTIAL' ? 'border-amber-500/20 bg-amber-500/[0.02]'
      : q.correctnessStatus === 'PENDING' ? 'border-cyan-500/20 bg-cyan-500/[0.02]'
      : 'border-white/[0.06] bg-white/[0.01]'
    }`}>
      {/* Question header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-theme-muted shrink-0" />
          : <ChevronRight className="w-4 h-4 text-theme-muted shrink-0" />}
        <span className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-bold text-theme-muted shrink-0">
          {q.questionNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-theme-text truncate">{q.questionText}</p>
          <p className="text-[10px] text-theme-muted uppercase tracking-wider mt-0.5">{q.questionType.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <CorrectnessBadge status={q.correctnessStatus} />
          {!isReadOnly && (
            <span className="text-xs font-bold text-theme-text">
              {q.earnedPoints !== null ? q.earnedPoints : '?'} / {q.maxPoints} pts
            </span>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4">
          {/* Question text (full) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-1">Question</p>
            <p className="text-sm text-theme-text leading-relaxed">{q.questionText}</p>
          </div>

          {isReadOnly && (
            <div className="rounded-xl bg-neutral-500/10 border border-neutral-500/20 p-3 text-sm text-theme-muted italic">
              This is an informational / read-only block. It does not carry any points.
            </div>
          )}

          {(q.questionType === 'MCQ' || q.questionType === 'TRUE_FALSE') && (
            <McqTrueFalseReview q={q} />
          )}
          {q.questionType === 'MATCHING' && <MatchingReview q={q} />}
          {q.questionType === 'ORDERING' && <OrderingReview q={q} />}
          {isSubjective && (
            <SubjectiveReview q={q} onOverrideSaved={onOverrideSaved} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface QuizAttemptReviewModalProps {
  attemptId: string;
  onClose: () => void;
}

export function QuizAttemptReviewModal({ attemptId, onClose }: QuizAttemptReviewModalProps) {
  const [review, setReview] = useState<QuizAttemptReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/admin/quizzes/attempts/${attemptId}/review`)
      .then((r: any) => setReview(r.data))
      .catch((e: any) => {
        setError(e?.response?.data?.message || 'Failed to load review');
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  const toggleQuestion = (qId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const expandAll = () => {
    if (review) setExpanded(new Set(review.questions.map((q) => q.questionId)));
  };

  const collapseAll = () => setExpanded(new Set());

  const handleOverrideSaved = (responseId: string, newPoints: number, newOverride: number) => {
    if (!review) return;
    setReview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => {
          if (q.responseId !== responseId) return q;
          return {
            ...q,
            earnedPoints: newPoints,
            instructorOverrideScore: newOverride,
            correctnessStatus:
              newPoints === 0 ? 'INCORRECT'
              : newPoints >= q.maxPoints ? 'CORRECT'
              : 'PARTIAL',
          };
        }),
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
      <div className="relative w-full max-w-4xl my-8 rounded-3xl border border-white/[0.08] bg-neutral-950 shadow-2xl flex flex-col animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-theme-text">Quiz Attempt Review</h2>
              <p className="text-xs text-theme-muted">Instructor / Admin View</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/[0.05] text-theme-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <XCircle className="w-10 h-10 text-rose-400" />
              <p className="text-sm text-theme-muted">{error}</p>
              <button onClick={onClose} className="btn-ghost text-xs px-4 py-2">Close</button>
            </div>
          ) : review && (
            <div className="space-y-6">
              {/* Attempt metadata */}
              <div className="glass rounded-2xl p-5 border border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Student
                  </p>
                  <p className="text-sm font-semibold text-theme-text">{review.student.fullName}</p>
                  <p className="text-xs text-theme-muted truncate">{review.student.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Quiz
                  </p>
                  <p className="text-sm font-semibold text-theme-text">{review.quizTitle}</p>
                  <p className="text-xs text-theme-muted">Attempt #{review.attemptNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Score
                  </p>
                  <p className="text-lg font-bold text-theme-text">
                    {review.earnedPoints} / {review.totalPoints}
                  </p>
                  <p className="text-xs text-theme-muted">{review.percentage}% (Pass: {review.passGrade}%)</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Submitted
                  </p>
                  <StatusBadge status={review.status} />
                  <p className="text-xs text-theme-muted mt-1">
                    {review.submittedAt
                      ? new Date(review.submittedAt).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
              </div>

              {/* Expand/collapse controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-theme-text">
                  {review.questions.length} Question{review.questions.length !== 1 ? 's' : ''}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={expandAll} className="text-xs text-accent-400 hover:underline">Expand All</button>
                  <span className="text-theme-muted text-xs">·</span>
                  <button onClick={collapseAll} className="text-xs text-theme-muted hover:underline">Collapse All</button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {review.questions.map((q) => (
                  <QuestionCard
                    key={q.questionId}
                    q={q}
                    expanded={expanded.has(q.questionId)}
                    onToggle={() => toggleQuestion(q.questionId)}
                    onOverrideSaved={handleOverrideSaved}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
