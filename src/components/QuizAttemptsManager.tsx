/**
 * QuizAttemptsManager
 *
 * Shared attempts list / review workspace for both INSTRUCTOR and ADMIN.
 * Entry points:
 *   - Instructor Dashboard → /instructor/quiz-review
 *   - Admin Dashboard → /admin/quiz-review
 *
 * The backend enforces authorization:
 *   - ADMIN can view all quiz attempts.
 *   - INSTRUCTOR can only view quizzes belonging to their own courses.
 */
import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Filter,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import type { QuizAttemptListItem, QuizAttemptListResponse } from '../lib/types';
import { Badge, EmptyState, Skeleton } from './ui';
import { QuizAttemptReviewModal } from './QuizAttemptReviewModal';
import { useDebounce } from '../hooks/useDebounce';

interface Quiz {
  id: string;
  title: string;
  lectureTitle?: string;
  courseTitle?: string;
}

// ─── Quiz selector ─────────────────────────────────────────────────────────────

function QuizSelector({
  selected,
  onSelect,
}: {
  selected: Quiz | null;
  onSelect: (q: Quiz | null) => void;
}) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Load all courses the instructor can access, then collect their quizzes
    api
      .get('/courses')
      .then(async (r: any) => {
        const courses: any[] = r.data?.items ?? r.data ?? [];
        const allQuizzes: Quiz[] = [];

        await Promise.allSettled(
          courses.map(async (course: any) => {
            try {
              const res: any = await api.get(`/courses/${course.id}/builder`);
              const chapters: any[] = res.data?.chapters ?? [];
              const unassigned: any[] = res.data?.unassignedLectures ?? [];
              const allLectures = [
                ...unassigned,
                ...chapters.flatMap((c: any) => c.lectures ?? []),
              ];
              for (const lec of allLectures) {
                for (const item of lec.items ?? []) {
                  if (item.type === 'QUIZ') {
                    allQuizzes.push({
                      id: item.id,
                      title: item.title,
                      lectureTitle: lec.title,
                      courseTitle: course.title,
                    });
                  }
                }
              }
            } catch {
              // skip courses that fail silently
            }
          }),
        );

        setQuizzes(allQuizzes);
      })
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-10 w-full rounded-xl" />;

  return (
    <div className="glass rounded-2xl p-5 border border-white/[0.06] space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-accent-400" />
        <h3 className="text-sm font-bold text-theme-text">Select Quiz</h3>
      </div>
      {quizzes.length === 0 ? (
        <p className="text-xs text-theme-muted">No quizzes found. You may not be assigned to any courses.</p>
      ) : (
        <select
          value={selected?.id ?? ''}
          onChange={(e) => {
            const q = quizzes.find((q) => q.id === e.target.value) ?? null;
            onSelect(q);
          }}
          className="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2.5 text-sm text-theme-text focus:outline-none focus:border-accent-400"
        >
          <option value="">— Select a Quiz —</option>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.courseTitle} › {q.lectureTitle} › {q.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'PASSED') return <Badge variant="success">PASSED</Badge>;
  if (status === 'FAILED') return <Badge variant="error">FAILED</Badge>;
  return <Badge variant="warning">PENDING</Badge>;
}

// ─── Attempts table ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function AttemptsTable({
  quizId,
}: {
  quizId: string;
}) {
  const [data, setData] = useState<QuizAttemptListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const debouncedSearch = useDebounce(search, 350);

  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      skip: String(page * PAGE_SIZE),
      take: String(PAGE_SIZE),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });
    api
      .get(`/admin/quizzes/${quizId}/attempts?${params}`)
      .then((r: any) => setData(r.data))
      .catch((e: any) => setError(e?.response?.data?.message || 'Failed to load attempts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(0);
  }, [quizId, debouncedSearch, statusFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, page, debouncedSearch, statusFilter]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-theme-border bg-theme-card text-sm text-theme-text focus:outline-none focus:border-accent-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-theme-muted" />
          {(['ALL', 'PASSED', 'FAILED', 'PENDING'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-accent-500 text-white'
                  : 'bg-theme-card border border-theme-border text-theme-muted hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8" />}
          title="No submitted attempts"
          description="No students have submitted this quiz yet, or no results match your filters."
        />
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-theme-muted border-b border-white/[0.06] bg-white/[0.01]">
              <div className="col-span-4">Student</div>
              <div className="col-span-1">Attempt</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {data.items.map((attempt: QuizAttemptListItem) => (
                <div
                  key={attempt.attemptId}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                >
                  {/* Student */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    {attempt.studentProfilePicture ? (
                      <img
                        src={attempt.studentProfilePicture}
                        alt={attempt.studentName}
                        className="w-8 h-8 rounded-full object-cover border border-white/[0.1] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {attempt.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-theme-text truncate">{attempt.studentName}</p>
                      <p className="text-xs text-theme-muted truncate">{attempt.studentEmail}</p>
                    </div>
                  </div>
                  {/* Attempt number */}
                  <div className="col-span-1">
                    <span className="text-xs font-bold text-theme-muted">#{attempt.attemptNumber}</span>
                  </div>
                  {/* Score */}
                  <div className="col-span-2">
                    <span className="text-sm font-bold text-theme-text">
                      {attempt.earnedPoints} / {attempt.totalPoints}
                    </span>
                    <p className="text-[10px] text-theme-muted">{attempt.score}%</p>
                  </div>
                  {/* Status */}
                  <div className="col-span-2">
                    <StatusBadge status={attempt.status} />
                  </div>
                  {/* Submitted */}
                  <div className="col-span-2">
                    <p className="text-xs text-theme-muted">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString()
                        : '—'}
                    </p>
                    <p className="text-[10px] text-theme-muted">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>
                  {/* Action */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => setReviewAttemptId(attempt.attemptId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 text-xs font-semibold transition-colors border border-accent-500/20"
                      title="Review attempt"
                    >
                      <Eye className="w-3 h-3" />
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-theme-muted">
              <span>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Modal */}
      {reviewAttemptId && (
        <QuizAttemptReviewModal
          attemptId={reviewAttemptId}
          onClose={() => setReviewAttemptId(null)}
        />
      )}
    </div>
  );
}

// ─── Main exported component ───────────────────────────────────────────────────

export function QuizAttemptsManager() {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-theme-text">Quiz Answer Review</h1>
          <p className="text-sm text-theme-muted">
            Review student submissions, check answers, and override subjective grades.
          </p>
        </div>
      </div>

      {/* Quiz selector */}
      <QuizSelector selected={selectedQuiz} onSelect={setSelectedQuiz} />

      {/* Attempts table */}
      {selectedQuiz ? (
        <AttemptsTable quizId={selectedQuiz.id} quizTitle={selectedQuiz.title} />
      ) : (
        <div className="glass rounded-2xl p-12 text-center border border-white/[0.06]">
          <Users className="w-10 h-10 text-theme-muted mx-auto mb-3" />
          <p className="text-theme-muted text-sm">Select a quiz above to see student attempts.</p>
        </div>
      )}
    </div>
  );
}
