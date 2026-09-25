import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Lock,
  PlayCircle,
  FileQuestion,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Paperclip,
  Maximize,
  Minimize,
  Gauge,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { FileViewerModal } from './FileViewerModal';
import { Link, useRouter } from '../lib/router';
import type {
  Course,
  Lecture,
  LectureItem,
  PlaylistItem,
} from '../lib/types';
import { Badge, ProgressBar, Spinner } from './ui';
import { InteractiveQuizClient } from './InteractiveQuizClient';
import { useTranslation } from 'react-i18next';

// Minimal type matching official documented API methods
interface AmaanPlayerInstance {
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
}

interface AmaanPlayerStatic {
  getInstance(iframe: HTMLIFrameElement): AmaanPlayerInstance;
}

declare global {
  interface Window {
    AmaanPlayer?: AmaanPlayerStatic;
  }
}


export function LecturePlaylist({ lectureId }: { lectureId: string }) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { navigate } = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [allLectures, setAllLectures] = useState<Lecture[]>([]);
  const [items, setItems] = useState<LectureItem[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullyLocked, setIsFullyLocked] = useState(false);
  const [isStarted, setIsStarted] = useState(true);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  // Countdown timer for time-limited courses
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get(`/progress/playlist/${lectureId}`);
      
      if (!data || typeof data !== 'object' || 'statusCode' in data) {
        setError(data?.message || t('common.error'));
        setLoading(false);
        return;
      }

      setLecture(data.lecture || null);
      setCourse(data.course || null);
      setAllLectures(Array.isArray(data.allLectures) ? data.allLectures : []);
      const playlistData = Array.isArray(data.playlist) ? data.playlist : [];
      setItems(playlistData);
      setIsFullyLocked(data.isLocked ?? false);
      setIsStarted(data.isStarted ?? true);
      
      const compIds = new Set<string>();
      for (const p of playlistData) {
        if (p.isCompleted) compIds.add(p.id);
      }
      setCompletedIds(compIds);

      const firstUnlocked = playlistData.find((p: PlaylistItem) => !p.isLocked && !p.isCompleted && !p.isExhausted);
      setActiveItemId(firstUnlocked?.id ?? playlistData[0]?.id ?? null);

      const expiration = data.expiresAt || data.access_expires_at;
      if (expiration) {
        const expires = new Date(expiration).getTime();
        const remaining = expires - Date.now();
        setTimeLeftMs(remaining > 0 ? remaining : 0);
      } else {
        setTimeLeftMs(null);
      }
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message || 'Failed to load lecture playlist.');
    }

    setLoading(false);
  }, [profile, lectureId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown ticker
  useEffect(() => {
    if (timeLeftMs === null || isTimerPaused) return;
    if (timeLeftMs <= 0) {
      setError(t('playlist.expired'));
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftMs, isTimerPaused]);

  const playlist = items; // From backend
  const activeItem = useMemo(
    () => playlist.find((p: PlaylistItem) => p.id === activeItemId) ?? null,
    [playlist, activeItemId],
  );

  const { prevLecture, nextLecture } = useMemo(() => {
    const currentLecIndex = allLectures.findIndex((l) => l.id === lectureId);
    return {
      prevLecture: currentLecIndex > 0 ? allLectures[currentLecIndex - 1] : null,
      nextLecture:
        currentLecIndex >= 0 && currentLecIndex < allLectures.length - 1
          ? allLectures[currentLecIndex + 1]
          : null,
    };
  }, [allLectures, lectureId]);

  const markSessionComplete = useCallback(async (itemId: string) => {
    if (!profile) return;
    try {
      await api.post(`/progress/session/${itemId}/complete`);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [profile, loadData]);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !profile) return;
    setCodeBusy(true);
    setError(null);
    try {
      await api.post('/activation-codes/redeem', { 
        code: code.trim(), 
        targetId: lecture?.id,
        targetType: 'LECTURE'
      });
      setCode('');
      await loadData();
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || 'Invalid or expired code.');
    }
    setCodeBusy(false);
  }

  async function handleStartLecture() {
    if (!profile || !lecture) return;
    try {
      await api.post(`/lectures/${lecture.id}/start-access`);
      await loadData();
    } catch (e: unknown) {
      setError((e as any)?.response?.data?.message || 'Failed to start lecture.');
    }
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
        <p className="text-xl font-display font-bold text-theme-text">{error}</p>
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
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-theme-muted hover:text-theme-text mb-3">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-theme-muted uppercase tracking-wide">{course?.title}</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-text mt-1">{lecture?.title}</h1>
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
              <div className="w-20 h-20 mx-auto rounded-full bg-warning-500/10 flex items-center justify-center text-warning-700 dark:text-warning-300 mb-6">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-theme-text mb-2">{t('playlist.lockedTitle')}</h2>
              <p className="text-theme-muted mb-8 max-w-md mx-auto">
                {t('playlist.lockedDesc')}
              </p>
              
              <form onSubmit={handleRedeem} className="max-w-sm mx-auto">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder={t('courseView.codePlaceholder')}
                    className="input text-center text-lg tracking-wider font-mono"
                    required
                  />
                  <button type="submit" disabled={codeBusy || !code.trim()} className="btn-primary w-full justify-center">
                    {codeBusy ? t('courseView.redeeming') : t('playlist.unlockBtn')}
                  </button>
                </div>
              </form>
            </div>
          ) : !isStarted ? (
            <div className="glass rounded-2xl p-8 sm:p-12 text-center animate-scale-in border-accent-500/20">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent-500/10 flex items-center justify-center text-accent-400 mb-6">
                <PlayCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-theme-text mb-2">Lecture Ready</h2>
              <p className="text-theme-muted mb-8 max-w-md mx-auto">
                You have access to this lecture. Click the button below to start your access timer and begin watching.
              </p>
              
              <button onClick={handleStartLecture} className="btn-primary mx-auto">
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Lecture Now
              </button>
            </div>
          ) : activeItem ? (
            activeItem.type === 'SESSION' ? (
              <VideoPlayer
                key={activeItem.id}
                item={activeItem}
                onComplete={() => markSessionComplete(activeItem.id)}
                isCompleted={activeItem.isCompleted}
              />
            ) : activeItem.type === 'QUIZ' ? (
              <InteractiveQuizClient
                lectureId={lectureId}
                quiz={playlist.find(p => p.id === activeItem.id)!}
                onComplete={loadData}
                onPauseTimer={() => setIsTimerPaused(true)}
                onResumeTimer={() => setIsTimerPaused(false)}
              />
            ) : null
          ) : (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-theme-muted">No content in this lecture yet.</p>
            </div>
          )}

          {/* Always show lecture attachments below the main content area */}
          {!isFullyLocked && (
            <LectureAttachments lectureId={lectureId} />
          )}

          {/* Item description */}
          {activeItem?.description && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-theme-muted uppercase tracking-wide mb-2">{t('playlist.aboutLesson')}</h3>
              <p className="text-theme-muted leading-relaxed">{activeItem.description}</p>
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
            <div className="p-4 border-b border-theme-border">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-theme-text">{t('playlist.playlist')}</h3>
                <Badge variant="accent">
                  {completedIds.size}/{items.length}
                </Badge>
              </div>
              <ProgressBar value={completedIds.size} max={Math.max(1, items.length)} className="mt-3" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
              {playlist.map((entry: PlaylistItem, idx: number) => (
                <button
                  key={entry.id}
                  disabled={entry.isLocked}
                  onClick={() => {
                    if (entry.isLocked) return;
                    setActiveItemId(entry.id);
                  }}
                  className={`w-full text-start p-4 flex items-start gap-3 transition-colors ${
                    entry.isLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : activeItemId === entry.id
                        ? 'bg-accent-500/10'
                        : 'hover:bg-theme-card'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {entry.isLocked ? (
                      <div className="w-8 h-8 rounded-lg bg-theme-card flex items-center justify-center text-theme-muted">
                        <Lock className="w-4 h-4" />
                      </div>
                    ) : entry.isCompleted ? (
                      <div className="w-8 h-8 rounded-lg bg-secondary-500/15 flex items-center justify-center text-secondary-700 dark:text-secondary-300">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-700 dark:text-accent-300">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ItemIcon type={entry.type} className="w-3.5 h-3.5 text-theme-muted" />
                      <span className="text-[10px] uppercase tracking-wider text-theme-muted">
                        {entry.type}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mt-0.5 truncate ${
                      activeItemId === entry.id ? 'text-accent-200' : 'text-theme-muted'
                    }`}>
                      {entry.title}
                    </p>
                    {!!entry.duration && (
                      <p className="text-xs text-theme-muted mt-0.5 flex items-center gap-1">
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
  return <PlayCircle className={className} />;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CountdownPill({ ms, warningHours, warningMinutes }: { ms: number, warningHours: number, warningMinutes: number }) {
  const { t } = useTranslation();
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
          : 'bg-theme-card border-theme-border text-theme-muted'
    }`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono text-sm font-semibold">
        {expired ? t('playlist.expired') : `${days}d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
      </span>
    </div>
  );
}

function FloatingWatermark() {
  const { profile } = useAuth();
  const [pos, setPos] = useState({ top: 20, left: 20 });

  useEffect(() => {
    setPos({
      top: Math.random() * 70 + 10,
      left: Math.random() * 60 + 10,
    });
    const interval = setInterval(() => {
      setPos({
        top: Math.random() * 70 + 10,
        left: Math.random() * 60 + 10,
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!profile?.email) return null;

  return (
    <div
      className="absolute text-white/70 text-xl sm:text-2xl md:text-3xl font-extrabold pointer-events-none select-none z-[99999] whitespace-nowrap"
      style={{
        top: `${pos.top}%`,
        left: `${pos.left}%`,
        transition: 'top 4s linear, left 4s linear',
        textShadow: '2px 2px 6px rgba(0,0,0,0.95), -2px -2px 6px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9)'
      }}
    >
      {profile.email}
    </div>
  );
}

type StreamTokenResponse =
  | { provider?: undefined; playbackUrl: string }
  | { provider: 'AMAAN'; otp: string; playbackInfo: string };

// --- Video Player ---
function VideoPlayer({
  item,
  onComplete,
  isCompleted,
}: {
  item: LectureItem;
  onComplete: () => void | Promise<void>;
  isCompleted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  const completedRef = useRef(isCompleted);
  const [showComplete, setShowComplete] = useState(false);
  
  const [streamData, setStreamData] = useState<StreamTokenResponse | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [amaanError, setAmaanError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const [isCompleting, setIsCompleting] = useState(false);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const elem = containerRef.current as any;
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen().catch((err: any) => console.error(err));
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch((err: any) => console.error(err));
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!item.video_url) {
      setLoadingToken(false);
      return;
    }
    setLoadingToken(true);
    setAmaanError(null);
    setStreamData(null);
    
    api.get(`/lectures/sessions/${item.id}/stream-token`)
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        if (data.provider === 'AMAAN') {
          setStreamData({
            provider: 'AMAAN',
            otp: data.otp,
            playbackInfo: data.playbackInfo,
          });
        } else {
          let url = data.playbackUrl;
          if (url && url.startsWith('/')) {
            url = `${api.defaults.baseURL?.replace(/\/+$/, '') || 'http://localhost:3000'}${url}`;
          }
          setStreamData({ playbackUrl: url });
        }
      })
      .catch((err) => {
        if (mounted) console.error('Failed to get stream token', err);
      })
      .finally(() => {
        if (mounted) setLoadingToken(false);
      });

    return () => {
      mounted = false;
      playerInstanceRef.current = null;
    };
  }, [item.id, item.video_url]);

  useEffect(() => {
    if (streamData?.provider !== 'AMAAN' || !iframeRef.current) return;
    
    let mounted = true;
    let playerInstance: AmaanPlayerInstance | null = null;
    let handleInit: (() => void) | null = null;
    let handleError: (() => void) | null = null;
    let handleEnded: (() => void) | null = null;

    const loadAmaanPlayer = async () => {
      if (!window.AmaanPlayer) {
        // Load the script
        const scriptId = 'amaan-player-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://api.amaaan.net/static/main/js/amaan-player.min.js';
          document.head.appendChild(script);
        }

        await new Promise<void>((resolve, reject) => {
          if (window.AmaanPlayer) {
            resolve();
          } else {
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () => reject(new Error('Failed to load Amaan player')));
          }
        });
      }

      if (!mounted || !iframeRef.current) return;

      try {
        const AmaanPlayerStatic = window.AmaanPlayer!;
        playerInstance = AmaanPlayerStatic.getInstance(iframeRef.current);
        playerInstanceRef.current = playerInstance;

        handleInit = () => {
          if (!mounted) return;
          console.log('Amaan player initialized');
        };

        handleError = () => {
          if (!mounted) return;
          setAmaanError('Failed to play secure video.');
        };

        handleEnded = () => {
          if (!mounted) return;
          handleMarkComplete();
        };

        playerInstance.addEventListener('init', handleInit);
        playerInstance.addEventListener('error', handleError);
        playerInstance.addEventListener('ended', handleEnded);
      } catch (err) {
        console.error('Amaan initialization error', err);
        if (mounted) setAmaanError('Failed to initialize secure player.');
      }
    };

    loadAmaanPlayer().catch(() => {
      if (mounted) setAmaanError('Failed to load secure player.');
    });

    return () => {
      mounted = false;
      if (playerInstance) {
        if (handleInit) playerInstance.removeEventListener('init', handleInit);
        if (handleError) playerInstance.removeEventListener('error', handleError);
        if (handleEnded) playerInstance.removeEventListener('ended', handleEnded);
      }
    };
  }, [streamData]);

  async function handleMarkComplete() {
    if (completedRef.current || isCompleting) return;
    setIsCompleting(true);
    try {
      await onComplete();
      completedRef.current = true;
      setShowComplete(true);
      setTimeout(() => setShowComplete(false), 2500);
    } catch (e) {
      console.error(e);
      // Let it be retried by the user if it fails
    } finally {
      setIsCompleting(false);
    }
  }

  if (!item.video_url) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <PlayCircle className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
        <p className="text-theme-muted">Video not available yet for this session.</p>
        {!completedRef.current && (
          <button onClick={handleMarkComplete} className="btn-secondary mt-4">
            {t('playlist.markComplete')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden relative" onContextMenu={(e) => e.preventDefault()}>
      <div 
        ref={containerRef} 
        onDoubleClick={toggleFullscreen}
        className="relative bg-black aspect-video flex items-center justify-center overflow-hidden group select-none"
      >
        <FloatingWatermark />
        {loadingToken ? (
          <Spinner className="w-8 h-8 text-accent-400" />
        ) : amaanError ? (
          <div className="text-center p-4">
            <AlertCircle className="w-8 h-8 mx-auto text-error-400 mb-2" />
            <p className="text-theme-muted font-medium">{amaanError}</p>
          </div>
        ) : streamData ? (
          streamData.provider === 'AMAAN' ? (
            (() => {
              const url = new URL('https://api.amaaan.net/amaan/player/video/');
              url.searchParams.set('otp', streamData.otp);
              url.searchParams.set('playbackInfo', streamData.playbackInfo);
              return (
                <iframe
                  ref={iframeRef}
                  src={url.toString()}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  allowFullScreen={false}
                />
              );
            })()
          ) : streamData.playbackUrl.includes('/uploads/') || 
              streamData.playbackUrl.endsWith('.mp4') || 
              streamData.playbackUrl.endsWith('.webm') || 
              streamData.playbackUrl.endsWith('.mov') || 
              streamData.playbackUrl.endsWith('.mkv') || 
              streamData.playbackUrl.includes('r2.dev') || 
              streamData.playbackUrl.includes('s3') ? (
            <video
              ref={videoRef}
              src={streamData.playbackUrl}
              className="w-full h-full object-contain"
              controls
              controlsList="nofullscreen nodownload"
              onEnded={handleMarkComplete}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackSpeed;
                }
              }}
            />
          ) : (
            <iframe
              src={streamData.playbackUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
            />
          )
        ) : (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-error-400 mb-2" />
            <p className="text-theme-muted font-medium">Failed to load video</p>
          </div>
        )}

        {streamData && streamData.provider !== 'AMAAN' && (
          <div className="absolute top-4 right-4 flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-all z-[10000]">
            <button
              onClick={cycleSpeed}
              className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold"
              title="Playback Speed"
            >
              <Gauge className="w-4 h-4" />
              <span>{playbackSpeed}x</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold"
              title="Toggle Fullscreen (Watermarked)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Complete badge animation */}
      {showComplete && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-success-500/90 text-white px-4 py-2 rounded-xl shadow-2xl shadow-success-500/20 animate-scale-in">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{t('playlist.completedToast')}</span>
        </div>
      )}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlayCircle className="w-5 h-5 text-accent-400" />
          <p className="font-semibold text-theme-text">{item.title}</p>
          {isCompleted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-500/10 text-success-600 dark:text-success-400 text-sm font-semibold">
              <CheckCircle2 className="w-3 h-3" /> {t('playlist.completed')}
            </div>
          )}
        </div>
        {!isCompleted && (
          <button onClick={handleMarkComplete} className="btn-secondary text-sm py-1.5 px-3">
            {t('playlist.markComplete')}
          </button>
        )}
      </div>
    </div>
  );
}


function LectureAttachments({ lectureId }: { lectureId: string }) {
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', lectureId],
    queryFn: () => api.get(`/attachments/lecture/${lectureId}`).then(r => r.data),
    enabled: !!lectureId
  });

  const [viewingFile, setViewingFile] = useState<{ url: string, title: string } | null>(null);

  const handleOpen = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await api.get(`/attachments/${id}/view`);
      if (res.data.url) {
        let url = res.data.url;
        if (url.includes('.pdf?')) {
          url = `${url}&#toolbar=0&navpanes=0&scrollbar=0`;
        }
        setViewingFile({ url, title });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to open file.');
    }
  };

  if (attachments.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-theme-text">
      <FileViewerModal 
        open={!!viewingFile} 
        onClose={() => setViewingFile(null)} 
        title={viewingFile?.title} 
        url={viewingFile?.url} 
      />
      <h3 className="text-md font-bold flex items-center gap-2 border-b border-neutral-800 pb-2 mb-3">
        <Paperclip className="h-4 w-4 text-cyan-400" />
        <span>Lecture Attachments</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {attachments.map((file: any) => (
          <button 
            key={file.id} 
            onClick={(e) => handleOpen(file.id, file.title, e)}
            className="flex items-center justify-between rounded-xl bg-neutral-950 p-3 text-xs border border-neutral-800 hover:border-cyan-500/40 transition group w-full text-left"
          >
            <div className="flex items-center gap-2 overflow-hidden max-w-[65%]">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-800 text-cyan-400 border border-neutral-700 shrink-0">
                {file.type || 'OTHER'}
              </span>
              <span className="font-semibold text-theme-muted group-hover:text-cyan-400 transition truncate">{file.title}</span>
            </div>
            <span className="text-[10px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800 uppercase tracking-wider text-cyan-400 font-bold shrink-0 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Open
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
