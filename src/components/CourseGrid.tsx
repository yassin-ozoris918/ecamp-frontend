import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, ChevronRight, Gift, PlayCircle, Search } from 'lucide-react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { useAuth } from '../lib/authContext';
import type { Course, CourseInstructor, CourseProgressItem } from '../lib/types';
import { COURSE_COVERS } from '../lib/covers';
import { Spinner, EmptyState, ErrorMessage, Button, ProgressBar } from './ui';

/** Student course catalog: every course they can see, with the ones they already have marked. */
export function CourseGrid() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const isHighSchool = profile?.education_level === 'HIGH_SCHOOL';
  const [query, setQuery] = useState('');

  const { data: rawCourses, isLoading, error } = useQuery({
    queryKey: ['student_courses'],
    queryFn: async () => {
      const res = await api.get('/courses/student');
      return Array.isArray(res.data) ? (res.data as Course[]) : [];
    },
    enabled: !!profile,
  });
  // Courses the student already has, with progress (same source as the dashboard).
  const { data: mine } = useQuery({
    queryKey: ['progress', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/progress/dashboard');
      return Array.isArray(res.data) ? (res.data as CourseProgressItem[]) : [];
    },
    enabled: !!profile,
  });
  const owned = useMemo(() => new Map((mine ?? []).map((c) => [c.id, c])), [mine]);

  const courses = useMemo(() => {
    const list = Array.isArray(rawCourses) ? rawCourses : [];
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((c) => `${c.title} ${c.description ?? ''}`.toLowerCase().includes(q)) : list;
    // Courses you already have first.
    return [...filtered].sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)));
  }, [rawCourses, query, owned]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-theme-muted">{t('catalog.loginRequired')}</p>
        <Link to="/auth"><Button variant="primary" className="mt-4">{t('auth.signIn')}</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-theme-muted">{isHighSchool ? t('catalog.highSchool') : t('catalog.university')}</p>
          <h1 className="text-3xl font-display font-bold text-theme-text mt-1">{t('catalog.title')}</h1>
          <p className="text-sm text-theme-muted mt-1">{t('catalog.subtitle')}</p>
        </div>
        <label className="relative w-full sm:w-80">
          <span className="sr-only">{t('catalog.search')}</span>
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
          <input
            dir="auto"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalog.search')}
            className="input ps-10 py-2.5"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-accent-400" />
        </div>
      ) : error ? (
        <ErrorMessage message={t('catalog.loadError')} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title={query ? t('catalog.noMatch') : t('dashboard.catalogEmpty')}
          description={query ? t('catalog.noMatchDesc') : t('dashboard.catalogEmptyDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const mineCourse = owned.get(course.id);
            const pct = Math.round(mineCourse?.progressPct ?? 0);
            const cover = COURSE_COVERS[course.id] ?? COURSE_COVERS.default;
            const lectureCount = course.lectures?.length ?? 0;
            return (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className={`group glass rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent-500/10 animate-fade-up ${
                  mineCourse ? 'border-accent-500/30' : ''
                }`}
              >
                <div className="aspect-[16/8] relative overflow-hidden" style={{ background: course.thumbnailUrl ? undefined : cover.gradient }}>
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <BookOpen className="absolute bottom-3 end-4 w-12 h-12 text-white/25" aria-hidden="true" />
                  )}
                  <div className="absolute top-3 start-3 end-3 flex justify-between gap-2">
                    {mineCourse ? (
                      <span className="badge bg-accent-500 text-white shadow-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('catalog.enrolled')}
                      </span>
                    ) : <span />}
                    <div className="flex gap-2">
                      {course.isFree && (
                        <span className="badge bg-emerald-500 text-white shadow-lg">
                          <Gift className="w-3.5 h-3.5" />
                          {t('courseView.freeCourse')}
                        </span>
                      )}
                      <span className="badge bg-black/55 text-white backdrop-blur-md">
                        {t('courseView.meta.lectures', { count: lectureCount })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 dir="auto" className="text-lg font-display font-bold text-theme-text line-clamp-1 group-hover:text-accent-600 dark:group-hover:text-accent-300 transition-colors">
                    {course.title}
                  </h3>
                  <p dir="auto" className="text-sm text-theme-muted line-clamp-2 mt-1 min-h-[40px]">
                    {course.description || t('courseView.noDesc')}
                  </p>

                  {mineCourse && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-theme-muted">{t('dashboard.progress')}</span>
                        <span className="font-semibold text-theme-text">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} variant="accent" />
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {course.instructors?.map((inst: CourseInstructor) => (
                        <div
                          key={inst.instructor.id}
                          className="w-7 h-7 rounded-full border-2 border-theme-bg bg-theme-secondary flex items-center justify-center text-[11px] font-bold text-theme-text"
                          title={inst.instructor.fullName}
                        >
                          {inst.instructor?.profilePictureUrl ? (
                            <img src={inst.instructor.profilePictureUrl} alt={inst.instructor.fullName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            inst.instructor?.fullName?.charAt(0) || '?'
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-700 dark:text-accent-300">
                      {mineCourse ? (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          {pct > 0 ? t('dashboard.continue') : t('dashboard.startLearning')}
                        </>
                      ) : (
                        <>
                          {t('catalog.viewCourse')}
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
