import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Users,
  KeyRound,
  ClipboardList,
  Plus,
  Sparkles,
  Copy,
  Check,
  Search,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link, useRouter } from '../lib/router';
import type {  Course, QuizSubmission } from '../lib/types';
import { Badge, EmptyState, Skeleton } from './ui';
import { Modal } from './Modal';

export function InstructorDashboard() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingGrading, setPendingGrading] = useState(0);
  const [codesGenerated, setCodesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const [coursesRes, statsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/instructor-dashboard/stats'),
      ]);

      setCourses(coursesRes.data.items || coursesRes.data);
      setStudentCount(statsRes.data.totalStudents);
      setPendingGrading(statsRes.data.pendingGrading);
      setCodesGenerated(statsRes.data.codesGenerated);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">Instructor workspace</p>
          <h1 className="text-3xl font-display font-bold text-white mt-1">{profile?.full_name}</h1>
        </div>
        <button onClick={() => setCreateCourseOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Course
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<BookOpen className="w-5 h-5" />} label="Courses" value={courses.length} color="text-accent-300" bg="bg-accent-500/10" loading={loading} />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Students" value={studentCount} color="text-secondary-300" bg="bg-secondary-500/10" loading={loading} />
        <KpiCard icon={<KeyRound className="w-5 h-5" />} label="Codes Generated" value={codesGenerated} color="text-gold-300" bg="bg-gold-500/10" loading={loading} />
        <KpiCard icon={<ClipboardList className="w-5 h-5" />} label="Pending Reviews" value={pendingGrading} color="text-warning-300" bg="bg-warning-500/10" loading={loading} />
      </div>

      {/* Pending grading alert */}
      {pendingGrading > 0 && (
        <Link
          to="/instructor/grading"
          className="glass rounded-2xl p-5 flex items-center gap-4 border-warning-500/20 hover:border-warning-500/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-warning-500/10 flex items-center justify-center text-warning-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-white">Exams pending manual grading</p>
            <p className="text-sm text-neutral-400">
              {pendingGrading} {pendingGrading === 1 ? 'submission' : 'submissions'} need{pendingGrading === 1 ? 's' : ''} your attention
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        </Link>
      )}

      {/* Courses list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-white">Your Courses</h2>
          <Link to="/instructor/courses" className="text-sm text-accent-300 hover:text-accent-200">
            Manage all
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title="No courses yet"
            description="Create your first course to start building lectures and quizzes."
            action={
              <button onClick={() => setCreateCourseOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Create Course
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/instructor/course/${c.id}`}
                className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {c.status}
                  </Badge>
                  {c.validity_days && (
                    <Badge variant="default">{c.validity_days}d access</Badge>
                  )}
                </div>
                <p className="font-display font-bold text-white text-lg leading-snug">{c.title}</p>
                <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{c.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-accent-300">
                  Manage course <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateCourseModal
        open={createCourseOpen}
        onClose={() => setCreateCourseOpen(false)}
        onCreated={(id) => navigate(`/instructor/course/${id}`)}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  bg,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  loading?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mt-3">
        {loading ? <Skeleton className="h-7 w-12" /> : value.toLocaleString()}
      </div>
      <p className="text-xs text-neutral-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

export function CreateCourseModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (courseId: string) => void;
}) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState('HIGH_SCHOOL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/courses', {
        title: title.trim(),
        description: description.trim(),
      });

      setTitle('');
      setDescription('');
      setBusy(false);
      onClose();
      onCreated(data.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Course" description="Set up the basics — you can add lectures next.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Course Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[88px]" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label className="label">Target Level</label>
          <select className="input" value={audienceType} onChange={(e) => setAudienceType(e.target.value)} required>
            <option value="HIGH_SCHOOL">High School</option>
            <option value="UNIVERSITY">University</option>
          </select>
        </div>

        {error && <p className="text-sm text-error-300 bg-error-500/10 p-3 rounded-lg">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Creating…' : 'Create Course'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- Instructor Courses Manager ---
export function InstructorCourses() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const { data } = await api.get('/courses');
      setCourses(data.items || data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Courses</h1>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No courses"
          description="Create your first course to get started."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Course</button>}
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {courses.map((c) => (
            <Link key={c.id} to={`/instructor/course/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{c.title}</p>
                <p className="text-xs text-neutral-400 truncate">{c.description}</p>
              </div>
              <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'warning'}>{c.status}</Badge>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </Link>
          ))}
        </div>
      )}
      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => navigate(`/instructor/course/${id}`)} />
    </div>
  );
}

// --- Grading Queue ---
export function GradingQueue() {
  const { profile } = useAuth();
  const [subs, setSubs] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      try {
        const { data } = await api.get('/instructor-dashboard/exams/pending');
        setSubs(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Grading Queue</h1>
        <p className="text-sm text-neutral-400 mt-1">Review recent quiz submissions from your students.</p>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : subs.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Nothing to grade" description="Student quiz submissions will appear here." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-start text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                <th className="p-4 text-start">Student</th>
                <th className="p-4 text-start">Quiz</th>
                <th className="p-4 text-start">Score</th>
                <th className="p-4 text-start">Status</th>
                <th className="p-4 text-start">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {subs.map((s: any) => {
                return (
                  <tr key={s.attemptId} className="hover:bg-white/[0.02]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-base-950 text-xs font-bold">
                          {s.studentName?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="text-neutral-200">{s.studentName ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300">{s.examTitle ?? 'Unknown quiz'}</td>
                    <td className="p-4">
                      <span className={`font-bold text-warning-300`}>
                        {s.ungradedEssaysCount} essays
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={'warning'}>
                        Pending Review
                      </Badge>
                    </td>
                    <td className="p-4 text-neutral-400">
                      {new Date(s.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- AI Quiz Generation Modal (simulated) ---
export function AIQuizModal({
  open,
  onClose,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (questions: GeneratedQuestion[]) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[] | null>(null);

  function handleGenerate() {
    setBusy(true);
    // Simulated AI quiz generation (real backend would call Gemini)
    setTimeout(() => {
      const sampleQuestions: GeneratedQuestion[] = [
        {
          question: 'What is the primary focus of this topic?',
          answers: [
            { text: 'Understanding core concepts', is_correct: true },
            { text: 'Memorizing formulas', is_correct: false },
            { text: 'Skipping practice', is_correct: false },
            { text: 'Avoiding examples', is_correct: false },
          ],
        },
        {
          question: 'Which approach best supports long-term retention?',
          answers: [
            { text: 'Cramming the night before', is_correct: false },
            { text: 'Spaced repetition and active recall', is_correct: true },
            { text: 'Re-reading notes once', is_correct: false },
            { text: 'Watching without practice', is_correct: false },
          ],
        },
        {
          question: 'Why are worked examples valuable in learning?',
          answers: [
            { text: 'They model problem-solving steps', is_correct: true },
            { text: 'They replace practice entirely', is_correct: false },
            { text: 'They are only for beginners', is_correct: false },
            { text: 'They guarantee perfect scores', is_correct: false },
          ],
        },
      ];
      setGenerated(sampleQuestions);
      setBusy(false);
    }, 2500);
  }

  function close() {
    setText('');
    setGenerated(null);
    setBusy(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="AI Quiz Generator" description="Paste text or notes — AI will extract questions." size="lg">
      {!generated ? (
        <div className="space-y-4">
          <div>
            <label className="label">Source Text</label>
            <textarea
              className="input min-h-[250px] font-mono text-sm resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your lecture notes, a PDF excerpt, or any study material here..."
            />
          </div>
          {busy && (
            <div className="flex items-center gap-3 text-sm text-accent-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating questions with AI... (this may take 10-30s)
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={close} className="btn-ghost">Cancel</button>
            <button onClick={handleGenerate} disabled={busy || text.trim().length < 10} className="btn-primary">
              <Sparkles className="w-4 h-4" />
              {busy ? 'Generating…' : 'Generate Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-secondary-300 bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-3">
            <Check className="w-4 h-4" />
            {generated.length} questions generated successfully!
          </div>
          {generated.map((q, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">
                <span className="text-accent-300">Q{i + 1}.</span> {q.question}
              </p>
              <div className="mt-2 space-y-1">
                {q.answers.map((a, ai) => (
                  <div key={ai} className={`text-xs flex items-center gap-2 p-2 rounded-lg ${
                    a.is_correct ? 'bg-secondary-500/10 text-secondary-200' : 'text-neutral-400'
                  }`}>
                    {a.is_correct ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                    {a.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button onClick={() => setGenerated(null)} className="btn-ghost">Regenerate</button>
            <button
              onClick={() => { onGenerate(generated); close(); }}
              className="btn-primary"
            >
              <Check className="w-4 h-4" />
              Save Quiz
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export interface GeneratedQuestion {
  question: string;
  answers: { text: string; is_correct: boolean }[];
}

// --- Code copy button ---
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="btn-ghost text-xs"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

// --- Search box ---
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
      <input
        className="input ps-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
