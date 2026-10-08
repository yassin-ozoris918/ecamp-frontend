import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PlayCircle, Eye, Users, Search, User } from 'lucide-react';
import { Badge, Skeleton, EmptyState } from './ui';

export function InstructorLectureDetails({ courseId, lectureId }: { courseId: string; lectureId: string }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [unwatched, setUnwatched] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tab, setTab] = useState<'WATCHERS' | 'UNWATCHED'>('WATCHERS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [statsRes, watchersRes, unwatchedRes, sessionsRes] = await Promise.all([
          api.get(`/instructor/courses/${courseId}/lectures/${lectureId}/analytics`),
          api.get(`/instructor/courses/${courseId}/lectures/${lectureId}/students`),
          api.get(`/instructor/courses/${courseId}/lectures/${lectureId}/unwatched-students`),
          api.get(`/sessions/lecture/${lectureId}`) // Instructor needs to view sessions
        ]);
        setAnalytics(statsRes.data);
        setWatchers(watchersRes.data.data);
        setUnwatched(unwatchedRes.data.data);
        setSessions(sessionsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [courseId, lectureId]);

  if (loading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!analytics) {
    return <div className="p-8 text-center text-error-400">Lecture not found or access denied.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05]">
        <div>
          <h1 className="text-3xl font-bold font-display">Lecture Analytics</h1>
          <p className="text-theme-muted mt-2">See who watched this lecture.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-xl text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-secondary-400" />
          <p className="text-3xl font-bold">{analytics.enrolledStudents}</p>
          <p className="text-sm text-theme-muted">Enrolled Students</p>
        </div>
        <div className="glass p-5 rounded-xl text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-accent-400" />
          <p className="text-3xl font-bold">{analytics.watchedStudents}</p>
          <p className="text-sm text-theme-muted">Watched</p>
        </div>
        <div className="glass p-5 rounded-xl text-center">
          <Eye className="w-6 h-6 mx-auto mb-2 text-error-400 opacity-50" />
          <p className="text-3xl font-bold">{analytics.unwatchedStudents}</p>
          <p className="text-sm text-theme-muted">Not Watched</p>
        </div>
        <div className="glass p-5 rounded-xl text-center">
          <PlayCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
          <p className="text-3xl font-bold">{analytics.watchRate.toFixed(1)}%</p>
          <p className="text-sm text-theme-muted">Watch Rate</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Watch Videos</h2>
        <div className="space-y-4">
          {sessions.map(s => (
            <div key={s.id} className="glass p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{s.title}</h3>
              </div>
              <button onClick={async () => {
                 try {
                   await api.post(`/lectures/${lectureId}/start-access`);
                   const token = await api.get(`/lectures/sessions/${s.id}/stream-token`);
                   if(token.data.playbackUrl) {
                     window.open(token.data.playbackUrl.startsWith('http') ? token.data.playbackUrl : `https://${token.data.playbackUrl}`, '_blank');
                   }
                 } catch(e) { console.error(e); }
              }} className="btn-primary">
                <PlayCircle className="w-4 h-4" /> Watch as Instructor
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/[0.05] pb-2 mt-8">
        <button onClick={() => setTab('WATCHERS')} className={`px-4 py-2 rounded-t-lg font-bold ${tab === 'WATCHERS' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted'}`}>Watched ({watchers.length})</button>
        <button onClick={() => setTab('UNWATCHED')} className={`px-4 py-2 rounded-t-lg font-bold ${tab === 'UNWATCHED' ? 'bg-white/[0.05] text-accent-400' : 'text-theme-muted'}`}>Not Watched ({unwatched.length})</button>
      </div>

      {tab === 'WATCHERS' && (
        <div className="glass rounded-xl overflow-hidden">
          {watchers.length === 0 ? <EmptyState icon={<User className="w-8 h-8" />} title="No watchers" description="No one has watched this lecture yet." /> : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-left text-theme-muted">
                  <th className="p-4">Student</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">First Watched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {watchers.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 flex items-center gap-3">
                      {s.profilePictureUrl ? <img src={s.profilePictureUrl} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400">{s.fullName[0]}</div>}
                      {s.fullName}
                    </td>
                    <td className="p-4">{s.email}</td>
                    <td className="p-4">{new Date(s.firstWatched).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'UNWATCHED' && (
        <div className="glass rounded-xl overflow-hidden">
          {unwatched.length === 0 ? <EmptyState icon={<User className="w-8 h-8" />} title="Everyone watched" description="All enrolled students have watched this lecture." /> : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-left text-theme-muted">
                  <th className="p-4">Student</th>
                  <th className="p-4">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {unwatched.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 flex items-center gap-3">
                      {s.profilePictureUrl ? <img src={s.profilePictureUrl} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400">{s.fullName[0]}</div>}
                      {s.fullName}
                    </td>
                    <td className="p-4">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
