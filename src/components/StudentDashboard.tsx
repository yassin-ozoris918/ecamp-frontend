import toast from 'react-hot-toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  
  Flame,
  Star,
  Trophy,
  CheckCircle2,
  PlayCircle,
  BookOpen,
} from 'lucide-react';
import { client } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link } from '../lib/router';
import type { Course, CourseProgressItem } from '../lib/types';
import { Badge, EmptyState, ProgressBar, Skeleton } from './ui';
import { useTranslation } from 'react-i18next';

import { COURSE_COVERS } from '../lib/covers';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<CourseProgressItem[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'my-courses' | 'catalog'>('my-courses');
  const [stats, setStats] = useState<{ xp: number; streakDays: number; rank: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const ownedCourseIds = useMemo(() => new Set((Array.isArray(courses) ? courses : []).map(c => c.id)), [courses]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [dashboardData, catalogData, statsData] = await Promise.all([
        client.get<CourseProgressItem[]>('/progress/dashboard').catch(() => []),
        client.get<Course[]>('/courses/student').catch(() => []),
        client.get<{ xp: number; streakDays: number; rank: number | null }>('/gamification/my-stats').catch(() => null),
      ]);
      setCourses(Array.isArray(dashboardData) ? dashboardData : []);
      setCatalogCourses(Array.isArray(catalogData) ? catalogData : []);
      setStats(statsData);
    } catch (e) {
      console.error(e);
      setCourses([]);
      setCatalogCourses([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-theme-muted">{t('dashboard.welcomeBack')}</p>
          <h1 className="text-3xl font-display font-bold text-theme-text mt-1">{profile?.full_name}</h1>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label={t('dashboard.totalXp')}
          value={stats?.xp ?? 0}
          color="text-gold-700 dark:text-gold-300"
          bg="bg-gold-500/10"
          loading={loading}
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label={t('dashboard.dayStreak')}
          value={stats?.streakDays ?? 0}
          color="text-orange-700 dark:text-orange-300"
          bg="bg-orange-500/10"
          loading={loading}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label={t('dashboard.courses')}
          value={courses.length}
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
          loading={loading}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label={t('dashboard.globalRank')}
          value={stats?.rank ? `#${stats.rank}` : '—'}
          color="text-secondary-700 dark:text-secondary-300"
          bg="bg-secondary-500/10"
          loading={loading}
        />
      </div>

      {/* Active courses */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-theme-border pb-2">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`text-lg font-display font-bold pb-2 transition-colors relative ${activeTab === 'my-courses' ? 'text-theme-text' : 'text-theme-muted hover:text-theme-muted'}`}
            >
              {t('dashboard.yourCourses')}
              {activeTab === 'my-courses' && <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-accent-400 rounded-t" />}
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`text-lg font-display font-bold pb-2 transition-colors relative ${activeTab === 'catalog' ? 'text-theme-text' : 'text-theme-muted hover:text-theme-muted'}`}
            >
              {t('dashboard.courseCatalog')}
              {activeTab === 'catalog' && <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-accent-400 rounded-t" />}
            </button>
          </div>
          {courses.length > 0 && activeTab === 'my-courses' && (
            <Link to="/leaderboard" className="text-sm text-accent-700 dark:text-accent-300 hover:text-accent-200">
              {t('dashboard.viewLeaderboard')}
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : activeTab === 'my-courses' ? (
          (!Array.isArray(courses) || courses.length === 0) ? (
            <EmptyState
              icon={<KeyRound className="w-8 h-8" />}
              title={t('dashboard.noCoursesYet')}
              description={t('dashboard.noCoursesDesc')}
              action={
                <button onClick={() => setActiveTab('catalog')} className="btn-primary">
                  <BookOpen className="w-4 h-4" />
                  {t('dashboard.browseCatalog')}
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(courses) ? courses : []).map((course) => {
                const pct = course.progressPct ?? 0;
                const cover = COURSE_COVERS[course.id] ?? COURSE_COVERS.default;
                return (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    className="group glass rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all hover:-translate-y-0.5"
                  >
                    {/* Cover */}
                    <div
                      className="h-32 relative bg-gradient-to-br bg-theme-secondary"
                      style={{ background: course.thumbnailUrl ? 'none' : cover.gradient }}
                    >
                      {course.thumbnailUrl && (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover absolute inset-0" />
                      )}
                      <div className="absolute inset-0 bg-theme-bg/20" />
                      {pct >= 100 && (
                        <div className="absolute top-2 end-3">
                          <Badge variant="success" className="bg-theme-bg/40 text-secondary-200 border-theme-border">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('dashboard.complete')}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="font-display font-bold text-theme-text text-lg leading-snug group-hover:text-accent-200 transition-colors">
                        {course.title}
                      </p>
                      <p className="text-xs text-theme-muted mt-1">
                        {course.instructorName ? t('dashboard.byInstructor', { name: course.instructorName }) : ''}
                      </p>
                      <p className="text-xs text-theme-muted mt-1 line-clamp-2">{course.description}</p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-theme-muted">{t('dashboard.progress')}</span>
                          <span className="font-semibold text-theme-muted">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar value={pct} variant="accent" />
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-sm text-accent-700 dark:text-accent-300">
                        <PlayCircle className="w-4 h-4" />
                        <span>{pct > 0 ? t('dashboard.continue') : t('dashboard.startLearning')}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          (!Array.isArray(catalogCourses) || catalogCourses.length === 0) ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title={t('dashboard.catalogEmpty')}
              description={t('dashboard.catalogEmptyDesc')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(catalogCourses) ? catalogCourses : []).map((course) => {
                const cover = COURSE_COVERS[course.id] ?? COURSE_COVERS.default;
                const isOwned = ownedCourseIds.has(course.id);
                return (
                  <a
                    key={course.id}
                    href={`#/course/${course.id}`}
                    className="group glass rounded-2xl overflow-hidden flex flex-col hover:border-white/[0.12] transition-all hover:-translate-y-0.5 cursor-pointer"
                    onClick={(e) => {
                      if (isOwned) {
                        e.preventDefault();
                        toast.error(t('dashboard.alreadyEnrolledError'));
                      }
                    }}
                  >
                    <div
                      className="h-32 relative bg-gradient-to-br bg-theme-secondary"
                      style={{ background: course.thumbnailUrl ? 'none' : cover.gradient }}
                    >
                      {course.thumbnailUrl && (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover absolute inset-0" />
                      )}
                      <div className="absolute inset-0 bg-theme-bg/20" />
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="bg-black/60 backdrop-blur-md border-theme-border">
                          {course.lectures?.length || 0} {t('dashboard.lectures')}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <p className="font-display font-bold text-theme-text text-lg leading-snug group-hover:text-accent-200 transition-colors">
                        {course.title}
                      </p>
                      <div className="mt-1 flex -space-x-2">
                        {course.instructors?.map((inst: any) => (
                          <div key={inst.instructor.id} className="w-6 h-6 rounded-full border-2 border-base-900 bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-theme-text shadow-sm relative z-[1]" title={inst.instructor.fullName}>
                            {inst.instructor?.profilePictureUrl ? (
                              <img src={inst.instructor.profilePictureUrl} alt={inst.instructor.fullName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              inst.instructor?.fullName?.charAt(0) || '?'
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-theme-muted mt-2 line-clamp-2">{course.description}</p>
                      <div className="mt-auto pt-4 flex gap-2">
                         <div className={`btn-secondary w-full justify-center text-xs py-2 pointer-events-none ${isOwned ? 'bg-accent-500/10 text-accent-700 dark:text-accent-300 border-accent-500/20' : ''}`}>
                           {isOwned ? t('dashboard.alreadyOwned') : t('dashboard.viewDetails')}
                         </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  loading?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-theme-text mt-3">
        {loading ? <Skeleton className="h-7 w-16" /> : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-theme-muted uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

