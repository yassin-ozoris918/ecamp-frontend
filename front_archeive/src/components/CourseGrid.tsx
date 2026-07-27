import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BookOpen, Search, LogIn, Sparkles } from 'lucide-react';
import { Link } from '../lib/router';
import { useAuth } from '../lib/authContext';
import { Spinner, Badge, EmptyState } from './ui';

export function CourseGrid() {
  const { profile } = useAuth();
  const isHighSchool = profile?.education_level === 'HIGH_SCHOOL';

  const { data: courses = [], isLoading, error } = useQuery({
    queryKey: ['student_courses'],
    queryFn: async () => {
      const res = await api.get('/courses/student');
      return res.data;
    },
    enabled: !!profile,
  });

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-neutral-400">Please log in to view the catalog.</p>
        <Link to="/auth" className="btn-primary mt-4">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up pb-20">
      <div className="glass rounded-3xl p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <Badge variant={isHighSchool ? 'warning' : 'default'} className="mb-4">
            {isHighSchool ? 'High School Academy' : 'University Program'}
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mb-4">
            Your Premium Course Catalog
          </h1>
          <p className="text-neutral-400 text-lg">
            Discover the best {isHighSchool ? 'High School' : 'University'} courses designed to help you excel in your studies.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-accent-400" />
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-6 text-center text-error-400">
          Failed to load courses.
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10" />}
          title={isHighSchool ? "No High School Courses Yet" : "No University Courses Yet"}
          description={`We are currently preparing amazing ${isHighSchool ? 'High School' : 'University'} content for you. Check back soon!`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any, idx: number) => (
            <div 
              key={course.id} 
              className="group glass rounded-3xl overflow-hidden hover:border-white/[0.12] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent-500/10 animate-fade-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="aspect-video bg-base-900 relative overflow-hidden">
                {course.thumbnailUrl ? (
                  <img 
                    src={course.thumbnailUrl} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.05] to-transparent">
                    <BookOpen className="w-10 h-10 text-neutral-600" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className="bg-black/60 backdrop-blur-md border-white/10">
                    {course.lectures?.length || 0} Lectures
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-accent-300 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-neutral-400 line-clamp-2 mb-6 min-h-[40px]">
                  {course.description || 'No description provided.'}
                </p>
                
                <div className="pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex -space-x-2">
                    {course.instructors?.map((inst: any, i: number) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-base-900 bg-neutral-800 flex items-center justify-center text-xs font-bold text-white shadow-sm relative z-[1]">
                        {inst.user.fullName?.charAt(0) || '?'}
                      </div>
                    ))}
                  </div>
                  <Link to={`/course/${course.id}`} className="btn-secondary py-2 px-4 text-sm whitespace-nowrap w-full sm:w-auto justify-center">
                    View Course
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
