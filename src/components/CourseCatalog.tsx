import { useEffect } from 'react';
import { BookOpen, Search, LogIn, Sparkles } from 'lucide-react';
import { Link } from '../lib/router';
import type { Course, CourseInstructor } from '../lib/types';
import { Spinner, Badge, ErrorMessage, EmptyState } from './ui';
import { useApi } from '../hooks/useApi';
import { useTranslation } from 'react-i18next';

export function CourseCatalog() {
  const { data, loading, error, execute } = useApi<Course[]>(true);
  const courses = Array.isArray(data) ? data : [];
  const { t } = useTranslation();

  useEffect(() => {
    execute('get', '/public/courses');
  }, [execute]);

  return (
    <div className="min-h-screen bg-theme-bg font-sans selection:bg-accent-500/30 selection:text-accent-200 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-theme-bg backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-500),0.3)]">
              <BookOpen className="w-6 h-6 text-theme-text" />
            </div>
            <span className="text-xl font-display font-bold text-theme-text tracking-tight">E.Camp</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/auth" className="btn-ghost hidden sm:inline-flex">{t('auth.signIn')}</Link>
            <Link to="/auth" className="btn-primary">
              <LogIn className="w-4 h-4 mr-2" />
              {t('catalog.joinAcademy')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <div className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40 border-b border-white/[0.04]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center animate-fade-up">
            <Badge variant="accent" className="mb-6 mx-auto">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> {t('catalog.premiumEducation')}
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-theme-text tracking-tight mb-6 leading-tight">
              {t('catalog.masterSkills')} <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 to-secondary-300">
                {t('catalog.expertInstructors')}
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-theme-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('catalog.heroDesc')}
            </p>
            
            <div className="max-w-md mx-auto relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-theme-muted group-focus-within:text-accent-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                className="w-full bg-theme-card border border-white/[0.1] rounded-2xl py-4 pl-12 pr-4 text-theme-text placeholder-neutral-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/50 transition-all shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Catalog */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-display font-bold text-theme-text">{t('dashboard.featuredCourses')}</h2>
            {courses.length > 0 && (
              <span className="text-theme-muted text-sm">{courses.length} {t('dashboard.available')}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner className="w-8 h-8 text-accent-400" />
            </div>
          ) : error ? (
            <ErrorMessage message={error?.message || 'Failed to load course catalog'} />
          ) : courses.length === 0 ? (
            <EmptyState icon={<BookOpen className="w-12 h-12" />} title={t('catalog.noCourses')} description={t('catalog.checkBackSoon')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, idx) => (
                <div 
                  key={course.id} 
                  className="group glass rounded-3xl overflow-hidden hover:border-white/[0.12] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent-500/10 animate-fade-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="aspect-video bg-theme-secondary relative overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.05] to-transparent">
                        <BookOpen className="w-10 h-10 text-neutral-600" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant="default" className="bg-black/60 backdrop-blur-md border-theme-border">
                        {course.lectures?.length || 0} {t('dashboard.lectures')}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-theme-text mb-2 line-clamp-1 group-hover:text-accent-700 dark:text-accent-300 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-theme-muted line-clamp-2 mb-6 min-h-[40px]">
                      {course.description || t('catalog.noDescription')}
                    </p>
                    
                    <div className="pt-5 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex -space-x-2">
                        {course.instructors?.map((inst: CourseInstructor) => (
                          <div key={inst.instructor.id} className="w-8 h-8 rounded-full border-2 border-base-900 bg-neutral-800 flex items-center justify-center text-xs font-bold text-theme-text shadow-sm relative z-[1]">
                            {inst.instructor?.fullName?.charAt(0) || '?'}
                          </div>
                        ))}
                      </div>
                      <Link to="/auth" className="btn-secondary py-2 px-4 text-sm whitespace-nowrap w-full sm:w-auto justify-center">
                        {t('dashboard.enrollNow')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/[0.04] py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-theme-muted">
          <p>© {new Date().getFullYear()} {t('common.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
