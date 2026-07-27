import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  
  Flame,
  Star,
  Trophy,
  CheckCircle2,
  PlayCircle,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Link } from '../lib/router';
import type { Course } from '../lib/types';
import { Badge, EmptyState, ProgressBar, Skeleton } from './ui';

import { COURSE_COVERS } from '../lib/covers';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<(Course & { progressPct: number })[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'my-courses' | 'catalog'>('my-courses');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch Dashboard Courses from backend
      const { data: dashboardData } = await api.get('/progress/dashboard');
      setCourses(dashboardData);

      // Fetch Student Catalog
      const { data: catalogData } = await api.get('/courses/student');
      setCatalogCourses(catalogData);

      // Fetch Gamification stats
      const { data: statsData } = await api.get('/gamification/my-stats');
      setStats(statsData);
    } catch (e) {
      console.error(e);
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
          <p className="text-sm text-neutral-400">Welcome back,</p>
          <h1 className="text-3xl font-display font-bold text-white mt-1">{profile?.full_name}</h1>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Star className="w-5 h-5" />}
          label="Total XP"
          value={stats?.xp ?? 0}
          color="text-gold-300"
          bg="bg-gold-500/10"
          loading={loading}
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Day Streak"
          value={stats?.streakDays ?? 0}
          color="text-orange-300"
          bg="bg-orange-500/10"
          loading={loading}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Courses"
          value={courses.length}
          color="text-accent-300"
          bg="bg-accent-500/10"
          loading={loading}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Global Rank"
          value={stats?.rank ? `#${stats.rank}` : '—'}
          color="text-secondary-300"
          bg="bg-secondary-500/10"
          loading={loading}
        />
      </div>

      {/* Active courses */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-2">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`text-lg font-display font-bold pb-2 transition-colors relative ${activeTab === 'my-courses' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Your Courses
              {activeTab === 'my-courses' && <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-accent-400 rounded-t" />}
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`text-lg font-display font-bold pb-2 transition-colors relative ${activeTab === 'catalog' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Course Catalog
              {activeTab === 'catalog' && <div className="absolute -bottom-[9px] left-0 right-0 h-[2px] bg-accent-400 rounded-t" />}
            </button>
          </div>
          {courses.length > 0 && activeTab === 'my-courses' && (
            <Link to="/leaderboard" className="text-sm text-accent-300 hover:text-accent-200">
              View leaderboard
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
          courses.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="w-8 h-8" />}
              title="No courses yet"
              description="Redeem an activation code from your instructor to unlock your first course and start learning."
              action={
                <button onClick={() => setActiveTab('catalog')} className="btn-primary">
                  <BookOpen className="w-4 h-4" />
                  Browse Catalog
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
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
                      className="h-32 relative bg-gradient-to-br"
                      style={{ background: cover.gradient }}
                    >
                      <div className="absolute inset-0 bg-base-950/20" />
                      {pct >= 100 && (
                        <div className="absolute top-2 end-3">
                          <Badge variant="success" className="bg-base-950/40 text-secondary-200 border-white/10">
                            <CheckCircle2 className="w-3 h-3" />
                            Complete
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="font-display font-bold text-white text-lg leading-snug group-hover:text-accent-200 transition-colors">
                        {course.title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{course.description}</p>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-neutral-400">Progress</span>
                          <span className="font-semibold text-neutral-200">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar value={pct} variant="accent" />
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-sm text-accent-300">
                        <PlayCircle className="w-4 h-4" />
                        <span>{pct > 0 ? 'Continue' : 'Start learning'}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          catalogCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="Catalog Empty"
              description="There are no published courses available for your academic level right now."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogCourses.map((course) => {
                const cover = COURSE_COVERS[course.id] ?? COURSE_COVERS.default;
                const isOwned = courses.some(c => c.id === course.id);
                return (
                  <a
                    key={course.id}
                    href={`#/course/${course.id}`}
                    className="group glass rounded-2xl overflow-hidden flex flex-col hover:border-white/[0.12] transition-all hover:-translate-y-0.5 cursor-pointer"
                    onClick={(e) => {
                      if (isOwned) {
                        e.preventDefault();
                        alert('You have already purchased and enrolled in this course! Check your "Your Courses" tab.');
                      }
                    }}
                  >
                    <div
                      className="h-32 relative bg-gradient-to-br"
                      style={{ background: cover.gradient }}
                    >
                      <div className="absolute inset-0 bg-base-950/20" />
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="bg-black/60 backdrop-blur-md border-white/10">
                          {course.lectures?.length || 0} Lectures
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <p className="font-display font-bold text-white text-lg leading-snug group-hover:text-accent-200 transition-colors">
                        {course.title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{course.description}</p>
                      <div className="mt-auto pt-4 flex gap-2">
                         <div className={`btn-secondary w-full justify-center text-xs py-2 pointer-events-none ${isOwned ? 'bg-accent-500/10 text-accent-300 border-accent-500/20' : ''}`}>
                           {isOwned ? 'Already Owned' : 'View Course details'}
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
      <p className="text-2xl font-bold text-white mt-3">
        {loading ? <Skeleton className="h-7 w-16" /> : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-neutral-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

