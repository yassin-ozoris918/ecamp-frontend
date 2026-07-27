import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Lock,
  PlayCircle,
  FileQuestion,
  BookText,
  CheckCircle2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trophy,
  Sparkles,
  AlertCircle,
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Download,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link, useRouter } from '../lib/router';
import type {
  Course,
  Lecture,
  LectureItem,
  QuizQuestion,
} from '../lib/types';
import { Badge, ProgressBar, Spinner } from './ui';
import { InteractiveQuizClient } from './InteractiveQuizClient';
import { LectureFilesSection } from './LectureFilesSection';


export function LecturePlaylist({ lectureId }: { lectureId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [allLectures, setAllLectures] = useState<Lecture[]>([]);
  const [items, setItems] = useState<LectureItem[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizModalItem, setQuizModalItem] = useState<LectureItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullyLocked, setIsFullyLocked] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  // Countdown timer for time-limited courses
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get(`/progress/playlist/${lectureId}`);
      
      setLecture(data.lecture);
      setCourse(data.course);
      setAllLectures(data.allLectures);
      setItems(data.playlist.map((p: any) => p)); // Just use the whole playlist array as the source
      setIsFullyLocked(data.isFullyLocked);
      
      const compIds = new Set<string>();
      data.playlist.forEach((p: any) => {
        if (p.isCompleted) compIds.add(p.id);
      });
      setCompletedIds(compIds);

      const firstUnlocked = data.playlist.find((p: any) => !p.isLocked && !p.isCompleted);
      setActiveItemId(firstUnlocked?.id ?? data.playlist[0]?.id ?? null);

      if (data.expiresAt) {
        const expires = new Date(data.expiresAt).getTime();
        const remaining = expires - Date.now();
        setTimeLeftMs(remaining > 0 ? remaining : 0);
      } else {
        setTimeLeftMs(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load lecture playlist.');
    }

    setLoading(false);
  }, [profile, lectureId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown ticker
  useEffect(() => {
    if (timeLeftMs === null) return;
    if (timeLeftMs <= 0) {
      setError('This lecture has expired. Please contact your instructor.');
      return;
    }
    const t = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeftMs]);

  const playlist = items; // From backend
  const activeItem = playlist.find((p: any) => p.id === activeItemId) ?? null;

  // Prev / next lecture
  const currentLecIndex = allLectures.findIndex((l) => l.id === lectureId);
  const prevLecture = currentLecIndex > 0 ? allLectures[currentLecIndex - 1] : null;
  const nextLecture =
    currentLecIndex >= 0 && currentLecIndex < allLectures.length - 1
      ? allLectures[currentLecIndex + 1]
      : null;

  async function markSessionComplete(itemId: string) {
    if (!profile) return;
    try {
      await api.post(`/progress/session/${itemId}/complete`);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      // The backend handles incrementing XP
    } catch (e) {
      console.error(e);
    }
  }

  async function onQuizPassed(itemId: string, score: number, passed: boolean) {
    if (!profile) return;
    try {
      await api.post(`/quizzes/attempt`, { quizId: itemId, score, passed });
      if (passed) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !profile) return;
    setCodeBusy(true);
    setError(null);
    try {
      await api.post('/lectures/redeem', { code: code.trim() });
      setCode('');
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid or expired code.');
    }
    setCodeBusy(false);
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
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-error-500/15 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error-300" />
        </div>
        <p className="text-xl font-display font-bold text-white">{error}</p>
        <Link to="/dashboard" className="btn-secondary mt-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 mb-3">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">{course?.title}</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">{lecture?.title}</h1>
          </div>
          {timeLeftMs !== null && (
            <CountdownPill 
              ms={timeLeftMs} 
              warningHours={lecture?.warningHours ?? 0} 
              warningMinutes={lecture?.warningMinutes ?? 0} 
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main player area */}
        <div className="lg:col-span-2 space-y-6">
          {isFullyLocked ? (
            <div className="glass rounded-2xl p-8 sm:p-12 text-center animate-scale-in border-warning-500/20">
              <div className="w-20 h-20 mx-auto rounded-full bg-warning-500/10 flex items-center justify-center text-warning-300 mb-6">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Lecture Locked</h2>
              <p className="text-neutral-400 mb-8 max-w-md mx-auto">
                You don't have access to this lecture yet. Enter an activation code to unlock the content.
              </p>
              
              <form onSubmit={handleRedeem} className="max-w-sm mx-auto">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Enter Activation Code"
                    className="input text-center text-lg tracking-wider"
                    required
                  />
                  <button type="submit" disabled={codeBusy || !code.trim()} className="btn-primary w-full">
                    {codeBusy ? 'Verifying...' : 'Unlock Lecture'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeItem ? (
            activeItem.type === 'SESSION' ? (
              <VideoPlayer
                key={activeItem.id}
                item={activeItem}
                onComplete={() => markSessionComplete(activeItem.id)}
                isCompleted={(activeItem as any).isCompleted}
              />
            ) : activeItem.type === 'QUIZ' ? (
              <InteractiveQuizClient
                lectureId={lectureId}
                quiz={playlist.find(p => p.id === activeItem.id) as any}
                onComplete={loadData}
              />
            ) : (
              <LectureFilesSection item={activeItem as any} />
            )
          ) : (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-neutral-400">No content in this lecture yet.</p>
            </div>
          )}

          {/* Item description */}
          {activeItem?.description && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide mb-2">About this lesson</h3>
              <p className="text-neutral-300 leading-relaxed">{activeItem.description}</p>
            </div>
          )}

          {/* Lecture navigation */}
          <div className="flex items-center justify-between gap-3">
            {prevLecture ? (
              <button
                onClick={() => navigate(`/lecture/${prevLecture.id}`)}
                className="btn-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="truncate max-w-[8rem]">{prevLecture.title}</span>
              </button>
            ) : <div />}
            {nextLecture ? (
              <button
                onClick={() => navigate(`/lecture/${nextLecture.id}`)}
                className="btn-primary"
              >
                <span className="truncate max-w-[8rem]">{nextLecture.title}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Playlist sidebar */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl overflow-hidden lg:sticky lg:top-6">
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-white">Playlist</h3>
                <Badge variant="accent">
                  {completedIds.size}/{items.length}
                </Badge>
              </div>
              <ProgressBar value={completedIds.size} max={Math.max(1, items.length)} className="mt-3" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
              {playlist.map((entry: any, idx: number) => (
                <button
                  key={entry.id}
                  disabled={entry.isLocked}
                  onClick={() => {
                    if (entry.isLocked) return;
                    if (entry.type === 'QUIZ' && !entry.isCompleted) {
                      setQuizModalItem(entry);
                    } else {
                      setActiveItemId(entry.id);
                    }
                  }}
                  className={`w-full text-start p-4 flex items-start gap-3 transition-colors ${
                    entry.isLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : activeItemId === entry.id
                        ? 'bg-accent-500/10'
                        : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {entry.isLocked ? (
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-neutral-500">
                        <Lock className="w-4 h-4" />
                      </div>
                    ) : entry.isCompleted ? (
                      <div className="w-8 h-8 rounded-lg bg-secondary-500/15 flex items-center justify-center text-secondary-300">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-300">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ItemIcon type={entry.type} className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                        {entry.type}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mt-0.5 truncate ${
                      activeItemId === entry.id ? 'text-accent-200' : 'text-neutral-200'
                    }`}>
                      {entry.title}
                    </p>
                    {entry.duration && (
                      <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.duration)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


function ItemIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'QUIZ') return <FileQuestion className={className} />;
  if (type === 'HOMEWORK') return <BookText className={className} />;
  return <PlayCircle className={className} />;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CountdownPill({ ms, warningHours, warningMinutes }: { ms: number, warningHours: number, warningMinutes: number }) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const expired = ms <= 0;
  const warningMs = (warningHours * 3600000) + (warningMinutes * 60000);
  const isCritical = ms <= warningMs;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${
      expired
        ? 'bg-error-500/10 border-error-500/30 text-error-200'
        : isCritical
          ? 'bg-warning-500/10 border-warning-500/30 text-warning-200'
          : 'bg-white/[0.04] border-white/[0.08] text-neutral-200'
    }`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono text-sm font-semibold">
        {expired ? 'Expired' : `${days}d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
      </span>
    </div>
  );
}

// --- Video Player ---
function VideoPlayer({
  item,
  onComplete,
  isCompleted,
}: {
  item: LectureItem;
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const completedRef = useRef(isCompleted);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (!item.video_url) {
      setLoadingToken(false);
      return;
    }
    setLoadingToken(true);
    api.get(`/lectures/sessions/${item.id}/stream-token`)
      .then((res) => {
        setStreamUrl(res.data.playbackUrl);
      })
      .catch((err) => {
        console.error('Failed to get stream token', err);
      })
      .finally(() => {
        setLoadingToken(false);
      });
  }, [item.id, item.video_url]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'timeupdate') {
          const currentTime = data.currentTime || 0;
          const duration = data.duration || 1;
          if (currentTime / duration >= 0.95 && !completedRef.current) {
            completedRef.current = true;
            onComplete();
            setShowComplete(true);
            setTimeout(() => setShowComplete(false), 2500);
          }
        }
      } catch (err) {}
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  if (!item.video_url) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <PlayCircle className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
        <p className="text-neutral-400">Video not available yet for this session.</p>
        {!completedRef.current && (
          <button
            onClick={() => {
              onComplete();
              completedRef.current = true;
              setShowComplete(true);
              setTimeout(() => setShowComplete(false), 2000);
            }}
            className="btn-secondary mt-4"
          >
            Mark as complete
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden relative" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {loadingToken ? (
          <Spinner className="w-8 h-8 text-accent-400" />
        ) : streamUrl ? (
          <iframe
            src={streamUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-error-400 mb-2" />
            <p className="text-error-300">Failed to load secure video playback.</p>
          </div>
        )}

        {/* Complete badge animation */}
        {showComplete && (
          <div className="absolute top-4 end-4 animate-checkmark">
            <div className="bg-secondary-500/90 backdrop-blur-md text-white px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Completed! +15 XP</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex items-center gap-3">
        <PlayCircle className="w-5 h-5 text-accent-400" />
        <p className="font-semibold text-white">{item.title}</p>
        {isCompleted && (
          <Badge variant="success" className="ms-auto">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        )}
      </div>
    </div>
  );
}

// --- Quiz intro card ---
function QuizIntroCard({
  item,
  onBegin,
  isCompleted,
}: {
  item: LectureItem;
  onBegin: () => void;
  isCompleted: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-300">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <Badge variant="accent" className="mb-2">Quiz</Badge>
          <h2 className="text-xl font-display font-bold text-white">{item.title}</h2>
          {item.description && <p className="text-sm text-neutral-400 mt-1">{item.description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <Trophy className="w-4 h-4 mx-auto text-gold-300" />
          <p className="text-xs text-neutral-400 mt-1">Pass mark</p>
          <p className="text-sm font-bold text-white">{item.passing_score ?? 70}%</p>
        </div>
        {item.time_limit_minutes && (
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <Clock className="w-4 h-4 mx-auto text-accent-300" />
            <p className="text-xs text-neutral-400 mt-1">Time limit</p>
            <p className="text-sm font-bold text-white">{item.time_limit_minutes} min</p>
          </div>
        )}
        <div className="rounded-xl bg-white/[0.03] p-3 text-center">
          <Sparkles className="w-4 h-4 mx-auto text-secondary-300" />
          <p className="text-xs text-neutral-400 mt-1">XP reward</p>
          <p className="text-sm font-bold text-white">+25</p>
        </div>
      </div>
      {isCompleted ? (
        <div className="mt-6 flex items-center gap-2 text-secondary-300 bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">You've already passed this quiz.</span>
          <button onClick={onBegin} className="btn-ghost ms-auto">Retake</button>
        </div>
      ) : (
        <button onClick={onBegin} className="btn-primary w-full mt-6">
          <FileQuestion className="w-4 h-4" />
          Begin Quiz
        </button>
      )}
    </div>
  );
}

function HomeworkCard({ item, onSubmitted }: { item: any; onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/progress/homework/${item.id}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSubmitted();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to upload homework');
    }
    setUploading(false);
  }

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-300 shrink-0">
          <BookText className="w-6 h-6" />
        </div>
        <div>
          <Badge variant="gold" className="mb-2">Homework</Badge>
          <h2 className="text-xl font-display font-bold text-white">{item.title}</h2>
          {item.description && <p className="text-sm text-neutral-400 mt-1">{item.description}</p>}
          {item.fileUrl && (
            <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 text-sm text-accent-300 hover:text-accent-200 hover:underline">
              <Download className="w-4 h-4" /> Download Assignment
            </a>
          )}
        </div>
      </div>
      
      <div className="mt-8 border-t border-white/[0.06] pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Submission</h3>
        {item.submissionUrl ? (
          <div className="rounded-xl bg-secondary-500/10 border border-secondary-500/20 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-secondary-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Homework submitted successfully</span>
            </div>
            <a href={item.submissionUrl} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
              View Submission
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/[0.05] file:text-white hover:file:bg-white/[0.08] transition-colors cursor-pointer"
            />
            {error && <p className="text-sm text-error-400">{error}</p>}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Quiz Taker Modal ---
function QuizTakerModal({
  item,
  onClose,
  onSubmit,
}: {
  item: LectureItem;
  onClose: () => void;
  onSubmit: (score: number, passed: boolean) => Promise<void>;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<Record<string, string[]>>({}); // questionId -> answerIds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/quizzes/${item.id}`);
        if (cancelled) return;
        setQuestions(data.questions || []);
        
        const map: Record<string, any[]> = {};
        data.questions?.forEach((q: any) => {
          map[q.id] = q.answers || [];
        });
        setAnswersByQuestion(map);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const selectedIds = Object.values(selected).flat();
      const { data } = await api.post('/quizzes/submit', {
        quizId: item.id,
        selectedAnswerIds: selectedIds,
      });
      setResult({ score: data.score, passed: data.isPassed });
      await onSubmit(data.score, data.isPassed);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  }

  const allAnswered = questions.length > 0 && questions.every((q) => (selected[q.id]?.length ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-base-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin glass-strong rounded-t-3xl sm:rounded-2xl p-6 animate-scale-in">
        {result ? (
          <div className="text-center py-8">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
              result.passed ? 'bg-secondary-500/15' : 'bg-error-500/15'
            }`}>
              {result.passed ? (
                <Trophy className="w-10 h-10 text-gold-300" />
              ) : (
                <AlertCircle className="w-10 h-10 text-error-300" />
              )}
            </div>
            <p className="text-2xl font-display font-bold text-white">
              {result.passed ? 'Quiz Passed!' : 'Keep practicing'}
            </p>
            <p className="text-lg text-neutral-400 mt-1">You scored {result.score}%</p>
            <p className="text-xs text-neutral-500 mt-1">
              Passing score: {item.passing_score ?? 70}%
            </p>
            {result.passed && (
              <p className="text-sm text-secondary-300 mt-3 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                +25 XP earned!
              </p>
            )}
            <button onClick={onClose} className="btn-primary mt-6">Continue</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <Badge variant="accent" className="mb-2">Quiz</Badge>
                <h2 className="text-xl font-display font-bold text-white">{item.title}</h2>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-2">
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6 text-accent-400" />
              </div>
            ) : questions.length === 0 ? (
              <p className="text-neutral-400 text-center py-8">No questions in this quiz yet.</p>
            ) : (
              <div className="space-y-6">
                {questions.map((q, i) => {
                  const answers = answersByQuestion[q.id] ?? [];
                  const chosen = selected[q.id] ?? [];
                  return (
                    <div key={q.id} className="rounded-xl bg-white/[0.03] p-4">
                      <p className="font-medium text-white mb-3">
                        <span className="text-accent-300 font-bold">{i + 1}.</span> {q.text}
                      </p>
                      <div className="space-y-2">
                        {answers.map((a) => {
                          const isSelected = chosen.includes(a.id);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setSelected((prev) => ({
                                  ...prev,
                                  [q.id]: isSelected
                                    ? chosen.filter((x) => x !== a.id)
                                    : [...chosen, a.id],
                                }));
                              }}
                              className={`w-full text-start p-3 min-h-[44px] rounded-xl border transition-all flex items-center gap-3 ${
                                isSelected
                                  ? 'border-accent-500/40 bg-accent-500/10 text-accent-100'
                                  : 'border-white/[0.06] bg-white/[0.02] text-neutral-200 hover:border-white/[0.12]'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-accent-400' : 'border-neutral-600'
                              }`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-accent-400" />}
                              </div>
                              <span className="text-sm">{a.answer_text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-neutral-500">
                    {Object.keys(selected).length} / {questions.length} answered
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="btn-primary"
                  >
                    {submitting ? 'Submitting…' : 'Submit Quiz'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LectureAttachments({ lectureId }: { lectureId: string }) {
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', lectureId],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:3000/attachments/lecture/${lectureId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.data;
    },
    enabled: !!lectureId
  });

  if (attachments.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-white">
      <h3 className="text-md font-bold flex items-center gap-2 border-b border-neutral-800 pb-2 mb-3">
        <Paperclip className="h-4 w-4 text-cyan-400" />
        <span>Downloadable Course Files & Homework Assets</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {attachments.map((file: any) => (
          <a 
            key={file.id} 
            href={file.fileUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center justify-between rounded-xl bg-neutral-950 p-3 text-xs border border-neutral-800 hover:border-cyan-500/40 transition group"
          >
            <span className="font-semibold text-neutral-300 group-hover:text-cyan-400 transition truncate max-w-[200px]">{file.title}</span>
            <span className="text-[10px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800 uppercase tracking-wider text-cyan-400 font-bold">Download</span>
          </a>
        ))}
      </div>
    </div>
  );
}
