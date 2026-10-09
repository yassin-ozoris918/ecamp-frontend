import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Users, PlayCircle, BarChart2, Layout, User } from 'lucide-react';
import { Badge, Skeleton, EmptyState } from './ui';

export function InstructorCourseDetails({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [tab, setTab] = useState<'OVERVIEW' | 'STUDENTS' | 'LECTURES'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [courseRes, statsRes, studentsRes, lecturesRes] = await Promise.all([
          api.get(`/instructor/courses/${courseId}`),
          api.get(`/instructor/courses/${courseId}/analytics`),
          api.get(`/instructor/courses/${courseId}/students`),
          api.get(`/instructor/courses/${courseId}/lectures`)
        ]);
        setCourse(courseRes.data);
        setAnalytics(statsRes.data);
        setStudents(studentsRes.data.data);
        setLectures(lecturesRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [courseId]);

  if (loading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!course) {
    return <div className="p-8 text-center text-error-400">Course not found or access denied.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05]">
        {course.thumbnailUrl && <img src={course.thumbnailUrl} alt={course.title} className="w-32 h-32 rounded-xl object-cover" />}
        <div className="flex-1">
          <Badge className="mb-2" variant={course.status === 'PUBLISHED' ? 'success' : 'warning'}>{course.status}</Badge>
          <h1 className="text-3xl font-bold font-display">{course.title}</h1>
          <p className="text-theme-muted mt-2">{course.description}</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/[0.05] pb-2">
        <button onClick={() => setTab('OVERVIEW')} className={`px-4 py-2 rounded-t-lg font-bold ${tab === 'OVERVIEW' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted'}`}>Overview & Analytics</button>
        <button onClick={() => setTab('STUDENTS')} className={`px-4 py-2 rounded-t-lg font-bold ${tab === 'STUDENTS' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted'}`}>Students List</button>
        <button onClick={() => setTab('LECTURES')} className={`px-4 py-2 rounded-t-lg font-bold ${tab === 'LECTURES' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted'}`}>Lectures & Watchers</button>
      </div>

      {tab === 'OVERVIEW' && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-xl text-center flex flex-col justify-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-secondary-400" />
            <p className="text-3xl font-bold">{analytics.enrolledStudents}</p>
            <p className="text-sm text-theme-muted font-bold mb-2">Total Enrolled</p>
            <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/5">
              <div>
                <p className="text-xs text-theme-muted">Full Course</p>
                <p className="text-sm font-semibold">{analytics.fullCourseEnrolled}</p>
              </div>
              <div>
                <p className="text-xs text-theme-muted">Lectures Only</p>
                <p className="text-sm font-semibold">{analytics.lectureOnlyEnrolled}</p>
              </div>
            </div>
          </div>
          <div className="glass p-5 rounded-xl text-center">
            <PlayCircle className="w-6 h-6 mx-auto mb-2 text-accent-400" />
            <p className="text-3xl font-bold">{analytics.studentsStarted}</p>
            <p className="text-sm text-theme-muted">Started Course</p>
          </div>
          <div className="glass p-5 rounded-xl text-center">
            <Layout className="w-6 h-6 mx-auto mb-2 text-gold-400" />
            <p className="text-3xl font-bold">{analytics.totalLectures}</p>
            <p className="text-sm text-theme-muted">Total Lectures</p>
          </div>
          <div className="glass p-5 rounded-xl text-center">
            <BarChart2 className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
            <p className="text-3xl font-bold">{analytics.courseCompletionEstimate.toFixed(1)}%</p>
            <p className="text-sm text-theme-muted">Engagement Rate</p>
          </div>
        </div>
      )}

      {tab === 'STUDENTS' && (
        <div className="glass rounded-xl overflow-hidden">
          {students.length === 0 ? <EmptyState icon={<User className="w-8 h-8" />} title="No students" description="No students have been assigned to this course yet." /> : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-left text-theme-muted">
                  <th className="p-4">Student</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Enrollment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {students.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 flex items-center gap-3">
                      {s.profilePictureUrl ? <img src={s.profilePictureUrl} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400">{s.fullName[0]}</div>}
                      {s.fullName}
                    </td>
                    <td className="p-4">{s.email}</td>
                    <td className="p-4">{new Date(s.enrollmentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'LECTURES' && (
        <div className="space-y-4">
          {lectures.length === 0 ? <EmptyState icon={<PlayCircle className="w-8 h-8" />} title="No lectures" description="This course has no lectures yet." /> : 
            lectures.map((l: any) => (
              <div key={l.id} className="glass p-4 rounded-xl flex items-center justify-between hover:border-accent-500/30 transition-all group">
                <div className="flex-1">
                  <Badge variant="default" className="mb-1">{l.chapter?.title || 'Uncategorized'}</Badge>
                  <h3 className="font-bold text-lg">{l.title}</h3>
                  <p className="text-sm text-theme-muted">{(l.durationHours * 60) + l.durationMinutes} min • {l._count?.sessions || 0} videos</p>
                </div>
                <div className="flex items-center gap-4">
                  <Link to={`/instructor/courses/${courseId}/lectures/${l.id}`} className="btn-primary">View Analytics & Watch</Link>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
