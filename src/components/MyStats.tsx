import { useEffect, useState } from 'react';
import { Star, Flame, Trophy, BookOpen, CheckCircle2, TrendingUp, Award } from 'lucide-react';
import { client } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { CertificateItem } from '../lib/types';
import { Skeleton } from './ui';

interface Stats {
  totalXP: number;
  streak: number;
  rank: number | null;
  courses: number;
  completed: number;
}

interface GamificationStats {
  xp: number;
  streakDays: number;
  rank: number | null;
  courseCount: number;
  completedCount: number;
  badges?: { name: string }[];
}

interface BadgeInfo {
  key: string;
  label: string;
  description: string;
 earned: boolean;
}

const BADGES: Omit<BadgeInfo, 'key' | 'awarded_at'>[] = [
  { label: 'First Steps', description: 'Complete your first session', earned: false },
  { label: 'Week Warrior', description: '7-day login streak', earned: false },
  { label: 'Scholar', description: 'Complete 10 sessions', earned: false },
  { label: 'Quiz Master', description: 'Pass 5 quizzes', earned: false },
  { label: 'XP Hunter', description: 'Reach 500 XP', earned: false },
];

export function MyStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [awardedBadges, setAwardedBadges] = useState<Set<string>>(new Set());
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      try {
        const [statsData, certsData] = await Promise.all([
          client.get<GamificationStats>('/gamification/my-stats').catch(() => null),
          client.get<CertificateItem[]>('/certificates/my').catch(() => []),
        ]);
        if (statsData && typeof statsData === 'object' && !('statusCode' in (statsData as any))) {
          setStats({
            totalXP: statsData.xp ?? 0,
            streak: statsData.streakDays ?? 0,
            rank: statsData.rank ?? null,
            courses: statsData.courseCount ?? 0,
            completed: statsData.completedCount ?? 0,
          });
          const awarded = new Set((Array.isArray(statsData.badges) ? statsData.badges : []).map((b) => b.name));
          setAwardedBadges(awarded);
        }
        setCertificates(Array.isArray(certsData) ? certsData : []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [profile]);

  // Derived badge states
  const earned: BadgeInfo[] = BADGES.map((b, i) => {
    let isEarned = false;
    switch (i) {
      case 0: isEarned = (stats?.completed ?? 0) >= 1; break;
      case 1: isEarned = (stats?.streak ?? 0) >= 7; break;
      case 2: isEarned = (stats?.completed ?? 0) >= 10; break;
      case 3: isEarned = awardedBadges.has('Perfect Quizzer'); break;
      case 4: isEarned = (stats?.totalXP ?? 0) >= 500; break;
    }
    return { ...b, key: `badge${i}`, earned: isEarned };
  });

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl font-display font-bold text-theme-text">My Stats</h1>
        <p className="text-sm text-theme-muted mt-1">Your learning journey at a glance.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock icon={<Star className="w-5 h-5" />} label="Total XP" value={stats.totalXP.toLocaleString()} color="text-gold-700 dark:text-gold-300" bg="bg-gold-500/10" />
        <StatBlock icon={<Flame className="w-5 h-5" />} label="Day Streak" value={`${stats.streak} days`} color="text-orange-700 dark:text-orange-300" bg="bg-orange-500/10" />
        <StatBlock icon={<BookOpen className="w-5 h-5" />} label="Courses" value={String(stats.courses)} color="text-accent-700 dark:text-accent-300" bg="bg-accent-500/10" />
        <StatBlock icon={<Trophy className="w-5 h-5" />} label="Rank" value={stats.rank ? `#${stats.rank}` : '—'} color="text-secondary-700 dark:text-secondary-300" bg="bg-secondary-500/10" />
      </div>

      {/* Completed sessions */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center text-secondary-700 dark:text-secondary-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-theme-text">Sessions Completed</p>
            <p className="text-xs text-theme-muted">Total lessons you've finished across all courses</p>
          </div>
          <p className="text-3xl font-display font-bold text-theme-text ms-auto">{stats.completed}</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-gold-700 dark:text-gold-300" />
          <h2 className="text-xl font-display font-bold text-theme-text">Badges</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {earned.map((b) => (
            <div
              key={b.key}
              className={`glass rounded-2xl p-5 flex items-center gap-4 ${
                b.earned ? 'border-gold-500/20' : 'opacity-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                b.earned ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-white' : 'bg-theme-card text-theme-muted'
              }`}>
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-theme-text">{b.label}</p>
                <p className="text-xs text-theme-muted">{b.description}</p>
              </div>
              {b.earned && <CheckCircle2 className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <Trophy className="w-5 h-5 text-accent-700 dark:text-accent-300" />
            <h2 className="text-xl font-display font-bold text-theme-text">My Certificates</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="glass rounded-2xl p-5 border-accent-500/20 hover:border-accent-500/40 transition-colors">
                <h3 className="font-bold text-theme-text text-lg">{cert.course?.title || 'Course Certificate'}</h3>
                <p className="text-sm text-theme-muted mt-1">Issued: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                <div className="mt-4">
                  <a href={cert.pdfUrl || undefined} target="_blank" rel="noreferrer" className="btn-secondary w-full text-center">
                    View & Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend / motivation */}
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-700 dark:text-accent-300">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="font-display font-bold text-theme-text">Keep your streak alive!</p>
          <p className="text-sm text-theme-muted mt-0.5">
            Log in every day to grow your streak and earn bonus XP.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-theme-text mt-3">{value}</p>
      <p className="text-xs text-theme-muted uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}
