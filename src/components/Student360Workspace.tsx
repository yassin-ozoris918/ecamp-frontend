import toast from 'react-hot-toast';
import { useState, useEffect, useMemo } from 'react';
import { Users, User, ShieldAlert, BookOpen, Search, X, Smartphone, Eye } from 'lucide-react';
import { client } from '../lib/api';
import { Badge, Skeleton, EmptyState, Button, SectionHeader } from './ui';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';
import { QuizAttemptReviewModal } from './QuizAttemptReviewModal';

export function Student360Workspace() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const result = await client.get<{ items: any[] }>('/admin/users?role=STUDENT&take=100');
      const items = (result as any)?.items || result;
      setStudents(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error(e);
      setStudents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setProfileData(null);
      return;
    }
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        // FIX: Use the real backend endpoints instead of the non-existent /admin/students/:id/360-profile
        const [userDetail, progressData] = await Promise.all([
          client.get<any>(`/admin/users/${selectedStudentId}`),
          client.get<any>(`/admin/users/${selectedStudentId}/progress`),
        ]);
        // Merge into a combined 360 profile object
        setProfileData({ ...userDetail, ...progressData });
      } catch (e) {
        console.error(e);
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [selectedStudentId]);

  const handleResetDevice = async () => {
    if (!selectedStudentId) return;
    const ok = await confirm('Reset Device Lock', 'Confirm device lock reset?');
    if (!ok) return;
    try {
      await client.post(`/admin/users/${selectedStudentId}/reset-device`);
      toast.success('Device reset successfully');
      // Refresh profile data
      const [userDetail, progressData] = await Promise.all([
        client.get<any>(`/admin/users/${selectedStudentId}`),
        client.get<any>(`/admin/users/${selectedStudentId}/progress`),
      ]);
      setProfileData({ ...userDetail, ...progressData });
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset device');
    }
  };

  const filtered = useMemo(() => {
    if (!debouncedSearch) return students;
    const q = debouncedSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, debouncedSearch]);

  return (
    <div className="space-y-6 animate-fade-up flex gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel: Student Directory */}
      <div
        className={`flex flex-col gap-4 ${selectedStudentId ? 'w-1/3' : 'w-full'} transition-all duration-300`}
      >
        <SectionHeader
          title={
            <span className="flex items-center gap-2">
              <User className="w-7 h-7 text-accent-700 dark:text-accent-300" /> Student 360
            </span>
          }
          subtitle={!selectedStudentId ? 'Comprehensive student lookup and management.' : undefined}
          actions={
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                type="text"
                placeholder="Search directory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-2 bg-theme-card border border-theme-border rounded-xl text-sm focus:outline-none focus:border-accent-400 text-theme-text ${selectedStudentId ? 'w-full' : 'w-64'}`}
              />
            </div>
          }
        />

        <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4">
              <Skeleton className="h-40" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No students found" />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-3 ${selectedStudentId === s.id ? 'bg-theme-card border-l-4 border-accent-400' : 'border-l-4 border-transparent'}`}
                >
                  {s.profilePictureUrl ? (
                    <img src={s.profilePictureUrl} alt={s.fullName} className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-theme-text truncate">{s.fullName}</p>
                    <p className="text-xs text-theme-muted truncate">{s.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Student 360 Drawer */}
      {selectedStudentId && (
        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden animate-fade-in relative border border-theme-border">
          <button
            onClick={() => setSelectedStudentId(null)}
            className="absolute top-4 right-4 text-theme-muted hover:text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {profileLoading || !profileData ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {/* Header Info */}
              <div className="flex items-start gap-4">
                {profileData.profilePictureUrl ? (
                  <img src={profileData.profilePictureUrl} alt={profileData.fullName} className="w-20 h-20 rounded-full object-cover border-4 border-theme-bg shadow-lg shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl shrink-0">
                    {(profileData.fullName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-display font-bold text-theme-text">{profileData.fullName}</h2>
                  <p className="text-theme-muted text-sm mb-2">
                    {profileData.email} • {profileData.educationLevel}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant={profileData.isActive ? 'success' : 'error'}>
                      {profileData.isActive ? 'Active Account' : 'Suspended'}
                    </Badge>
                    <Badge variant="gold">XP: {profileData.xp || 0}</Badge>
                    {profileData.deviceId ? (
                      <Badge variant="default">Device Bound</Badge>
                    ) : (
                      <Badge variant="warning">No Device</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!profileData.deviceId}
                    onClick={handleResetDevice}
                    icon={<Smartphone className="w-3.5 h-3.5" />}
                  >
                    Reset Device Lock
                  </Button>
                </div>
              </div>

              {/* Lecture Access */}
              <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04]">
                <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent-400" /> Lecture Access
                </h3>
                {profileData.lectures?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profileData.lectures.map((acc: any) => (
                      <div
                        key={acc.lectureId}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col gap-1"
                      >
                        <p className="text-sm text-theme-text font-medium truncate">{acc.lectureTitle}</p>
                        <p className="text-xs text-theme-muted">{acc.courseTitle}</p>
                        <Badge
                          variant={
                            acc.expiresAt && new Date(acc.expiresAt) < new Date()
                              ? 'error'
                              : 'success'
                          }
                          className="text-[10px] self-start mt-1"
                        >
                          {acc.expiresAt && new Date(acc.expiresAt) < new Date()
                            ? 'Expired'
                            : 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-theme-muted">No lectures accessed yet.</p>
                )}
              </div>

              {/* Quiz Attempts */}
              <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04]">
                <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-secondary-400" /> Recent Quiz Attempts
                </h3>
                {profileData.quizAttempts?.length > 0 ? (
                  <div className="space-y-2">
                    {profileData.quizAttempts.slice(0, 10).map((attempt: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <span className="text-theme-text truncate flex-1">{attempt.quizTitle || 'Quiz'}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={attempt.status === 'PASSED' ? 'success' : attempt.status === 'FAILED' ? 'error' : 'default'}>
                            {attempt.earnedPoints != null && attempt.totalPoints != null && attempt.totalPoints > 0
                              ? `${attempt.earnedPoints}/${attempt.totalPoints}`
                              : `${attempt.score}%`} • {attempt.status}
                          </Badge>
                          {attempt.attemptId && (
                            <button
                              onClick={() => setReviewAttemptId(attempt.attemptId)}
                              className="p-1 rounded hover:bg-accent-500/10 text-theme-muted hover:text-accent-400 transition-colors"
                              title="Review attempt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-theme-muted">No quiz attempts yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {reviewAttemptId && (
        <QuizAttemptReviewModal
          attemptId={reviewAttemptId}
          onClose={() => setReviewAttemptId(null)}
        />
      )}
    </div>
  );
}
