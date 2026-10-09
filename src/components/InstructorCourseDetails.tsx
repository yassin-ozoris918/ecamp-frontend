import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { Users, PlayCircle, BarChart2, Layout, User, Settings, GraduationCap, Clock, MessageSquare, TrendingUp, Trophy, File, Download, Folder } from 'lucide-react';
import { Badge, Skeleton, EmptyState } from './ui';

export function InstructorCourseDetails({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [tab, setTab] = useState<'OVERVIEW' | 'STUDENTS' | 'LECTURES' | 'FILES'>('OVERVIEW');
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

      <div className="flex gap-4 border-b border-white/[0.05] pb-2 overflow-x-auto">
        <button onClick={() => setTab('OVERVIEW')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${tab === 'OVERVIEW' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted hover:text-white'}`}>Overview & Analytics</button>
        <button onClick={() => setTab('STUDENTS')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${tab === 'STUDENTS' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted hover:text-white'}`}>Students List</button>
        <button onClick={() => setTab('LECTURES')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${tab === 'LECTURES' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted hover:text-white'}`}>Lectures & Watchers</button>
        <button onClick={() => setTab('FILES')} className={`whitespace-nowrap px-4 py-2 rounded-t-lg font-bold transition-colors ${tab === 'FILES' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted hover:text-white'}`}>Course Files</button>
      </div>

      {tab === 'OVERVIEW' && analytics && (
        <>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-accent-400" /> Progress Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Completed (100%)', count: analytics.progressDistribution?.['100'] || 0, color: 'bg-emerald-400' },
                    { label: 'Almost There (51-99%)', count: analytics.progressDistribution?.['51-99'] || 0, color: 'bg-accent-400' },
                    { label: 'Learning (1-50%)', count: analytics.progressDistribution?.['1-50'] || 0, color: 'bg-secondary-400' },
                    { label: '0% Completed', count: analytics.progressDistribution?.['0'] || 0, color: 'bg-white/20' }
                  ].map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-theme-muted">{p.label}</span>
                        <span className="font-bold">{p.count} students</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${p.color}`} style={{ width: `${analytics.enrolledStudents > 0 ? (p.count / analytics.enrolledStudents) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass p-6 rounded-xl flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Enrollments (7 Days)</h3>
                <div className="flex-1 flex items-end gap-2 justify-between mt-4">
                  {analytics.enrollmentsTimeline?.map((t: any, i: number) => {
                    const maxCount = Math.max(...analytics.enrollmentsTimeline.map((x: any) => x.count), 1);
                    const height = `${(t.count / maxCount) * 100}%`;
                    const dateObj = new Date(t.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="relative w-full h-32 bg-white/5 rounded-t-sm overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-accent-500/80 group-hover:bg-accent-400 transition-all rounded-t-sm" style={{ height }} />
                        </div>
                        <span className="text-xs text-theme-muted">{dayName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5 text-secondary-400" /> Most Popular Lectures</h3>
              <div className="space-y-3">
                {analytics.topLectures?.length === 0 ? <p className="text-theme-muted text-sm">No lecture data yet.</p> : 
                  analytics.topLectures?.map((l: any, i: number) => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <p className="font-semibold">{l.title}</p>
                      </div>
                      <Badge variant="default" className="text-xs">{l.watches} views</Badge>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link to={`/instructor/course/${courseId}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 text-accent-400 flex items-center justify-center group-hover:bg-accent-500 group-hover:text-white transition-colors"><Settings className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-bold text-sm">Course Builder</p><p className="text-xs text-theme-muted">Edit content & settings</p></div>
                </Link>
                <button onClick={() => setTab('STUDENTS')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group w-full text-left">
                  <div className="w-10 h-10 rounded-lg bg-secondary-500/20 text-secondary-400 flex items-center justify-center group-hover:bg-secondary-500 group-hover:text-white transition-colors"><Users className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-bold text-sm">Manage Students</p><p className="text-xs text-theme-muted">View student list</p></div>
                </button>
                <Link to={`/instructor/grading`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors"><GraduationCap className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-bold text-sm">Grading Queue</p><p className="text-xs text-theme-muted">Review assignments</p></div>
                </Link>
              </div>
            </div>

            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-theme-muted" /> Live Feed</h3>
              <div className="space-y-4">
                {analytics.recentActivity?.length === 0 ? <p className="text-theme-muted text-sm">No recent activity.</p> :
                  analytics.recentActivity?.map((act: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={`mt-1 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] ${act.type === 'ENROLLMENT' ? 'bg-secondary-400' : 'bg-accent-400'}`} />
                      <div>
                        <p className="text-sm">
                          <span className="font-bold">{act.studentName}</span> {act.type === 'ENROLLMENT' ? 'enrolled in the course' : `started watching "${act.lectureTitle}"`}
                        </p>
                        <p className="text-xs text-theme-muted mt-0.5">{new Date(act.date).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
        </>
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
      {tab === 'FILES' && (
        <div className="space-y-8">
          {course.attachments?.length > 0 && (
            <div className="glass p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-accent-400"><Folder className="w-5 h-5" /> General Course Files</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {course.attachments.map((file: any) => (
                  <div key={file.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 flex items-start gap-4 hover:border-white/20 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-accent-500/20 text-accent-400 flex items-center justify-center shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{file.title}</p>
                      <Badge variant="default" className="text-[10px] mt-1">{file.type}</Badge>
                    </div>
                    <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-theme-muted hover:text-white p-2 bg-white/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lectures.filter(l => l.attachments?.length > 0).length === 0 && (!course.attachments || course.attachments.length === 0) ? (
             <EmptyState icon={<File className="w-8 h-8" />} title="No files found" description="There are no files attached to this course or its lectures." />
          ) : (
            <div className="space-y-6">
              {lectures.filter(l => l.attachments?.length > 0).map((l: any) => (
                <div key={l.id} className="glass p-6 rounded-xl">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PlayCircle className="w-5 h-5 text-secondary-400" /> {l.title} <span className="text-theme-muted text-sm font-normal ml-2">({l.attachments.length} files)</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {l.attachments.map((file: any) => (
                      <div key={file.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4 flex items-start gap-4 hover:border-secondary-400/30 transition-all group">
                        <div className="w-10 h-10 rounded-lg bg-secondary-500/20 text-secondary-400 flex items-center justify-center shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{file.title}</p>
                          <Badge variant="default" className="text-[10px] mt-1">{file.type}</Badge>
                        </div>
                        <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-theme-muted hover:text-white p-2 bg-white/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
