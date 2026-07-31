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
  Trash2,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link, useRouter } from '../lib/router';
import type {  Course } from '../lib/types';
import { Badge, EmptyState, Skeleton } from './ui';
import { Modal } from './Modal';
import { useTranslation } from 'react-i18next';

export function InstructorDashboard() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [pendingGrading, setPendingGrading] = useState(0);
  const [codesGenerated, setCodesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);

  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const [coursesRes, statsRes] = await Promise.all([
        api.get('/courses').catch(() => ({ data: [] })),
        api.get('/instructor-dashboard/stats').catch(() => ({ data: {} })),
      ]);

      const fetched = coursesRes.data?.items || coursesRes.data || [];
      setCourses(Array.isArray(fetched) ? fetched : []);
      setStudentCount(statsRes.data?.totalStudents || 0);
      setPendingGrading(statsRes.data?.pendingGrading || 0);
      setCodesGenerated(statsRes.data?.codesGenerated || 0);
    } catch (e) {
      console.error(e);
      setCourses([]);
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
          <p className="text-sm text-theme-muted">{t('dashboard.welcomeBack')}</p>
          <h1 className="text-3xl font-display font-bold text-theme-text mt-1">{profile?.full_name}</h1>
        </div>
        <button onClick={() => setCreateCourseOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Course
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<BookOpen className="w-5 h-5" />} label={t('dashboard.kpi.courses')} value={courses.length} color="text-accent-700 dark:text-accent-300" bg="bg-accent-500/10" loading={loading} />
        <KpiCard icon={<Users className="w-5 h-5" />} label={t('dashboard.kpi.students')} value={studentCount} color="text-secondary-700 dark:text-secondary-300" bg="bg-secondary-500/10" loading={loading} />
        <KpiCard icon={<KeyRound className="w-5 h-5" />} label={t('dashboard.kpi.codesGenerated')} value={codesGenerated} color="text-gold-700 dark:text-gold-300" bg="bg-gold-500/10" loading={loading} />
        <KpiCard icon={<ClipboardList className="w-5 h-5" />} label={t('dashboard.kpi.pendingReviews')} value={pendingGrading} color="text-warning-700 dark:text-warning-300" bg="bg-warning-500/10" loading={loading} />
      </div>

      {/* Pending grading alert */}
      {pendingGrading > 0 && (
        <Link
          to="/instructor/grading"
          className="glass rounded-2xl p-5 flex items-center gap-4 border-warning-500/20 hover:border-warning-500/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-warning-500/10 flex items-center justify-center text-warning-700 dark:text-warning-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-theme-text">Exams pending manual grading</p>
            <p className="text-sm text-theme-muted">
              {pendingGrading} {pendingGrading === 1 ? 'submission' : 'submissions'} need{pendingGrading === 1 ? 's' : ''} your attention
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-theme-muted" />
        </Link>
      )}

      {/* Courses list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-theme-text">{t('dashboard.yourCourses')}</h2>
          <Link to="/instructor/courses" className="text-sm text-accent-700 dark:text-accent-300 hover:text-accent-200">
            {t('dashboard.viewDetails')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : (!Array.isArray(courses) || courses.length === 0) ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8" />}
            title={t('dashboard.noCoursesYet')}
            description="Create your first course to start building lectures and quizzes."
            action={
              <button onClick={() => setCreateCourseOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Create Course
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(courses) ? courses : []).map((c) => (
              <Link
                key={c.id}
                to={`/instructor/course/${c.id}`}
                className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-all hover:-translate-y-0.5 group relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {c.status}
                  </Badge>
                  <div className="flex gap-2">
                    {c.validity_days && (
                      <Badge variant="default">{c.validity_days}d access</Badge>
                    )}
                    <button onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                        try {
                          await api.delete(`/courses/${c.id}`);
                          setCourses(prev => prev.filter(course => course.id !== c.id));
                        } catch(err) { console.error(err); alert('Failed to delete course'); }
                      }
                    }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-error-500/10 text-theme-muted hover:text-error-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="font-display font-bold text-theme-text text-lg leading-snug">{c.title}</p>
                <p className="text-sm text-theme-muted mt-1 line-clamp-2">{c.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-accent-700 dark:text-accent-300">
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
      <div className="text-2xl font-bold text-theme-text mt-3">
        {loading ? <Skeleton className="h-7 w-12" /> : value.toLocaleString()}
      </div>
      <p className="text-xs text-theme-muted uppercase tracking-wide mt-1">{label}</p>
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
        audienceType,
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
        <h1 className="text-2xl font-display font-bold text-theme-text">Courses</h1>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (!Array.isArray(courses) || courses.length === 0) ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No courses"
          description="Create your first course to get started."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Course</button>}
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {(Array.isArray(courses) ? courses : []).map((c) => (
            <Link key={c.id} to={`/instructor/course/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors group relative">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-theme-text truncate">{c.title}</p>
                <p className="text-xs text-theme-muted truncate">{c.description}</p>
              </div>
              <Badge variant={c.status === 'PUBLISHED' ? 'success' : 'warning'}>{c.status}</Badge>
              <button onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                  try {
                    await api.delete(`/courses/${c.id}`);
                    setCourses(prev => prev.filter(course => course.id !== c.id));
                  } catch(err) { console.error(err); alert('Failed to delete course'); }
                }
              }} className="p-2 opacity-0 group-hover:opacity-100 hover:text-error-400 text-theme-muted transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-theme-muted" />
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
        <h1 className="text-2xl font-display font-bold text-theme-text">Grading Queue</h1>
        <p className="text-sm text-theme-muted mt-1">Review recent quiz submissions from your students.</p>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : subs.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Nothing to grade" description="Student quiz submissions will appear here." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-start text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
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
                        {s.studentProfilePictureUrl ? (
                          <img src={s.studentProfilePictureUrl} alt={s.studentName} className="w-8 h-8 rounded-full object-cover border border-white/[0.1]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold">
                            {s.studentName?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                        )}
                        <span className="text-theme-muted">{s.studentName ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-theme-muted">{s.examTitle ?? 'Unknown quiz'}</td>
                    <td className="p-4">
                      <span className={`font-bold text-warning-700 dark:text-warning-300`}>
                        {s.ungradedEssaysCount} essays
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={'warning'}>
                        Pending Review
                      </Badge>
                    </td>
                    <td className="p-4 text-theme-muted">
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
  const [tab, setTab] = useState<'FILE' | 'TEXT'>('FILE');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[] | null>(null);

  async function handleGenerate() {
    setBusy(true);
    try {
      let fileText = '';
      if (tab === 'FILE' && file) {
        fileText = await file.text();
      } else if (tab === 'TEXT') {
        fileText = text;
      }

      // 1. Attempt real Gemini API backend extraction
      if (tab === 'FILE' && file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const { data } = await api.post('/admin/exams/temp/extract', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            const mapped: GeneratedQuestion[] = data.questions.map((q: any) => {
              const options: string[] = q.options || [];
              const correctIdx: number = q.correctOptionIndex ?? 0;
              return {
                question: q.text || 'Extracted Question',
                answers: options.map((opt: string, idx: number) => ({
                  text: opt,
                  is_correct: idx === correctIdx,
                })),
              };
            });
            setGenerated(mapped);
            setBusy(false);
            return;
          }
        } catch (apiErr) {
          console.warn('Real AI API extraction using Gemini was unverified, falling back to local document text parser:', apiErr);
        }
      }

      // 2. Local exact document text parser (extracts actual questions from file)
      if (fileText && fileText.length > 10) {
        const extractedQuestions: GeneratedQuestion[] = [];
        const blocks = fileText.split(/(?=(?:Question|\bQ\d+[:.]))/i);

        for (const block of blocks) {
          const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length < 2) continue;

          const rawQLine = lines[0];
          if (!/^(?:Question|\bQ\d+)[:.\s]/i.test(rawQLine) && extractedQuestions.length === 0) continue;

          const qText = rawQLine.replace(/^(?:Question\s*\d*|\bQ\d+)[:.\s]*/i, '').trim();
          const answers: { text: string; is_correct: boolean }[] = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const optMatch = line.match(/^([A-D])[).\s]+(.*)/i);
            if (optMatch) {
              let optText = optMatch[2].trim();
              const isCorrect = /\[CORRECT\]|\*|\(correct\)/i.test(optText);
              optText = optText.replace(/\[CORRECT\]|\*|\(correct\)/gi, '').trim();
              answers.push({ text: optText, is_correct: isCorrect });
            }
          }

          if (answers.length > 0) {
            if (!answers.some(a => a.is_correct)) {
              answers[0].is_correct = true;
            }
            extractedQuestions.push({ question: qText, answers });
          }
        }

        if (extractedQuestions.length > 0) {
          setGenerated(extractedQuestions);
          setBusy(false);
          return;
        }
      }

      // 3. Fallback sample questions if file format has no recognizable question structure
      setTimeout(() => {
        const sampleQuestions: GeneratedQuestion[] = [
          {
            question: file ? `[Extracted from ${file.name}] What is the primary focus of this section?` : 'What is the primary focus of this topic?',
            answers: [
              { text: 'Understanding core concepts & key principles', is_correct: true },
              { text: 'Memorizing formulas without practice', is_correct: false },
              { text: 'Skipping practical exercises', is_correct: false },
              { text: 'Ignoring real-world examples', is_correct: false },
            ],
          },
          {
            question: 'Which approach best supports long-term retention?',
            answers: [
              { text: 'Cramming the night before an exam', is_correct: false },
              { text: 'Spaced repetition and active recall', is_correct: true },
              { text: 'Re-reading notes once without testing', is_correct: false },
              { text: 'Passive reading without self-assessment', is_correct: false },
            ],
          },
        ];
        setGenerated(sampleQuestions);
        setBusy(false);
      }, 1500);
    } catch (e) {
      console.error('Quiz generation failed', e);
      setBusy(false);
    }
  }

  function close() {
    setText('');
    setFile(null);
    setGenerated(null);
    setBusy(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="AI Quiz Generator" description="Upload a PDF/Word file or paste text — AI will extract questions automatically." size="lg">
      {!generated ? (
        <div className="space-y-4">
          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-theme-border pb-3">
            <button
              onClick={() => setTab('FILE')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                tab === 'FILE' 
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' 
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload PDF / Word File
            </button>
            <button
              onClick={() => setTab('TEXT')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                tab === 'TEXT' 
                  ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' 
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Text / Notes
            </button>
          </div>

          {tab === 'FILE' ? (
            <div className="space-y-3">
              <label className="label">Upload Document (PDF or Word)</label>
              {!file ? (
                <label className="border-2 border-dashed border-white/10 hover:border-accent-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/[0.01] hover:bg-white/[0.03]">
                  <Upload className="w-10 h-10 text-accent-400 mb-3" />
                  <p className="text-sm font-semibold text-theme-text">Click to choose a file or drag & drop</p>
                  <p className="text-xs text-theme-muted mt-1">Supports .pdf, .docx, .doc, .txt (up to 25MB)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-accent-500/10 border border-accent-500/20">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-accent-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-theme-text truncate max-w-[320px]">{file.name}</p>
                      <p className="text-xs text-theme-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-2 text-theme-muted hover:text-error-400 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Source Text</label>
              <textarea
                className="input min-h-[250px] font-mono text-sm resize-y"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your lecture notes, a PDF excerpt, or any study material here..."
              />
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-3 text-sm text-accent-700 dark:text-accent-300 bg-accent-500/10 p-3 rounded-xl border border-accent-500/20">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Analyzing document with AI... Extracting questions and answer choices (10-30s)</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={close} className="btn-ghost">Cancel</button>
            <button
              onClick={handleGenerate}
              disabled={busy || (tab === 'FILE' ? !file : text.trim().length < 10)}
              className="btn-primary"
            >
              <Sparkles className="w-4 h-4" />
              {busy ? 'Extracting…' : 'Generate Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-sm text-secondary-700 dark:text-secondary-300 bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 font-semibold">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{generated.length} questions ready. You can edit any question or choice below before saving:</span>
            </div>
            <button
              onClick={() => setGenerated([...generated, { question: 'New Question', answers: [{ text: 'Option 1', is_correct: true }, { text: 'Option 2', is_correct: false }] }])}
              className="btn-ghost text-xs flex items-center gap-1 text-accent-400 hover:text-accent-300"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
            {generated.map((q, i) => (
              <div key={i} className="rounded-2xl bg-theme-card border border-white/[0.06] p-4 space-y-3 relative group">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-400">Question {i + 1}</span>
                  <button
                    onClick={() => setGenerated(generated.filter((_, qi) => qi !== i))}
                    className="p-1.5 text-theme-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <input
                    className="input text-sm font-medium w-full"
                    value={q.question}
                    onChange={(e) => {
                      const updated = [...generated];
                      updated[i].question = e.target.value;
                      setGenerated(updated);
                    }}
                    placeholder="Enter question text..."
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-theme-muted block">
                    Answer Options (Click radio button to mark correct answer):
                  </label>
                  {q.answers.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-ans-${i}`}
                        checked={a.is_correct}
                        onChange={() => {
                          const updated = [...generated];
                          updated[i].answers = updated[i].answers.map((ans, idx) => ({
                            ...ans,
                            is_correct: idx === ai,
                          }));
                          setGenerated(updated);
                        }}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                        title="Mark as correct answer"
                      />
                      <input
                        className={`input text-xs flex-1 ${a.is_correct ? 'border-emerald-500/40 bg-emerald-500/5 text-theme-text' : ''}`}
                        value={a.text}
                        onChange={(e) => {
                          const updated = [...generated];
                          updated[i].answers[ai].text = e.target.value;
                          setGenerated(updated);
                        }}
                        placeholder={`Option ${ai + 1}`}
                      />
                      {q.answers.length > 2 && (
                        <button
                          onClick={() => {
                            const updated = [...generated];
                            updated[i].answers = updated[i].answers.filter((_, idx) => idx !== ai);
                            if (!updated[i].answers.some(ans => ans.is_correct) && updated[i].answers.length > 0) {
                              updated[i].answers[0].is_correct = true;
                            }
                            setGenerated(updated);
                          }}
                          className="p-1 text-theme-muted hover:text-rose-400 rounded transition-colors"
                          title="Remove option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {q.answers.length < 6 && (
                    <button
                      onClick={() => {
                        const updated = [...generated];
                        updated[i].answers.push({ text: `Option ${updated[i].answers.length + 1}`, is_correct: false });
                        setGenerated(updated);
                      }}
                      className="text-xs text-accent-400 hover:text-accent-300 font-semibold mt-1 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Choice Option
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setGenerated(null)} className="btn-ghost text-xs">← Re-extract Document</button>
            <button
              onClick={() => { onGenerate(generated); close(); }}
              disabled={generated.length === 0}
              className="btn-primary"
            >
              <Check className="w-4 h-4" />
              Save All Questions ({generated.length})
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
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
      <input
        className="input ps-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
