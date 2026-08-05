import toast from 'react-hot-toast';
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Database,
  User,
  ShieldAlert,
  MessageSquare,
  KeyRound,
  RotateCcw,
  Shield,
  BookOpen,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Search,
  Key,
  Plus,
  Download,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Profile, UserListItem, ActivationCode, Course, CourseInstructor } from '../lib/types';
import { Badge, EmptyState, Skeleton, Spinner } from './ui';
import { Modal } from './Modal';
import { SearchBox, CreateCourseModal } from './InstructorDashboard';
import { useAuth } from '../lib/authContext';
import { Link, useRouter } from '../lib/router';
import { useTranslation } from 'react-i18next';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';

// --- Shared CSV Utility ---
const CSV_BOM = '\uFEFF'; // UTF-8 BOM so Excel reads Arabic correctly

function csvEscapeValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the string looks like a phone number (digits only, 8+ chars), wrap as ="..." to prevent scientific notation
  if (/^\d{8,}$/.test(str)) return `="${str}"`;
  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatEducationLevel(level: string): string {
  const map: Record<string, string> = {
    HIGH_SCHOOL: 'High School',
    UNIVERSITY: 'University',
  };
  return map[level] || level || '';
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    STUDENT: 'Student',
    INSTRUCTOR: 'Instructor',
    ADMIN: 'Admin',
  };
  return map[role] || role || '';
}

function formatCodeStatus(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'Available',
    REDEEMED: 'Redeemed',
    REVOKED: 'Revoked',
  };
  return map[status] || status || '';
}

function downloadCsv(headers: string[], rows: any[][], filename: string) {
  const headerLine = headers.map(h => csvEscapeValue(h)).join(',');
  const dataLines = rows.map(row => row.map(v => csvEscapeValue(v)).join(','));
  const csvContent = CSV_BOM + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function AdminDashboard() {
  const [stats, setStats] = useState<{ students: number; instructors: number; courses: number; codesRedeemed: number; codesGenerated: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/stats');
        setStats({
          students: data.totalStudents,
          instructors: data.totalInstructors,
          courses: data.totalCourses,
          codesGenerated: data.totalCodesGenerated,
          codesRedeemed: data.totalCodesRedeemed,
        });
      } catch(e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="text-sm text-theme-muted">Admin</p>
        <h1 className="text-3xl font-display font-bold text-theme-text mt-1 flex items-center gap-2">
          <Shield className="w-7 h-7 text-gold-700 dark:text-gold-300" />
          Platform Overview
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi icon={<Users className="w-5 h-5" />} label={t('dashboard.kpi.students')} value={stats?.students ?? 0} color="text-accent-700 dark:text-accent-300" bg="bg-accent-500/10" loading={loading} />
        <AdminKpi icon={<GraduationCap className="w-5 h-5" />} label={t('nav.instructors')} value={stats?.instructors ?? 0} color="text-secondary-700 dark:text-secondary-300" bg="bg-secondary-500/10" loading={loading} />
        <AdminKpi icon={<BookOpen className="w-5 h-5" />} label={t('dashboard.kpi.courses')} value={stats?.courses ?? 0} color="text-gold-700 dark:text-gold-300" bg="bg-gold-500/10" loading={loading} />
        <AdminKpi icon={<KeyRound className="w-5 h-5" />} label="Codes Redeemed" value={stats ? `${stats.codesRedeemed}/${stats.codesGenerated}` : '0/0'} color="text-warning-700 dark:text-warning-300" bg="bg-warning-500/10" loading={loading} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickActionCard
          icon={<Users className="w-5 h-5" />}
          title="Manage Users"
          description="Search, reset devices, and override progress for any student."
          to="#/admin/users"
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />
        <QuickActionCard
          icon={<KeyRound className="w-5 h-5" />}
          title="Activation Codes"
          description="View all generated codes and their redemption status across the platform."
          to="#/admin/codes"
          color="text-gold-700 dark:text-gold-300"
          bg="bg-gold-500/10"
        />

        <QuickActionCard
          icon={<ShieldAlert className="w-5 h-5" />}
          title="Academic Risk Engine"
          description="Monitor struggling students and view risk matrix."
          to="#/admin/risk"
          color="text-error-300"
          bg="bg-error-500/10"
        />
        <QuickActionCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Notification Logs"
          description="View ledger of all dispatched parent communications."
          to="#/admin/notifications"
          color="text-secondary-700 dark:text-secondary-300"
          bg="bg-secondary-500/10"
        />
        <QuickActionCard
          icon={<User className="w-5 h-5" />}
          title="Pending Registrations"
          description="Review and approve new student registrations."
          to="#/admin/pending-users"
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />

        <QuickActionCard
          icon={<User className="w-5 h-5" />}
          title="Profile Change Requests"
          description="Review and approve student requests to change their name or phone number."
          to="#/admin/profile-requests"
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />

        <QuickActionCard
          icon={<User className="w-5 h-5" />}
          title="Student 360 Workspace"
          description="Deep-dive into comprehensive individual student dossiers."
          to="#/admin/student-360"
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />
        <QuickActionCard
          icon={<Database className="w-5 h-5" />}
          title="System Audit & Analytics"
          description="View immutable operation logs and export wide-scale CSV metrics."
          to="#/admin/audit-logs"
          color="text-gold-700 dark:text-gold-300"
          bg="bg-gold-500/10"
        />
      </div>
    </div>
  );
}

function AdminKpi({
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

function QuickActionCard({
  icon,
  title,
  description,
  to,
  color,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  color: string;
  bg: string;
}) {
  return (
    <a href={to} className="glass rounded-2xl p-5 flex items-start gap-4 hover:border-white/[0.12] transition-all hover:-translate-y-0.5">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="font-display font-bold text-theme-text">{title}</p>
        <p className="text-sm text-theme-muted mt-0.5">{description}</p>
      </div>
    </a>
  );
}

// --- Admin Users Page ---
export function AdminUsers() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [resetUser, setResetUser] = useState<any>(null);
  const [overrideUser, setOverrideUser] = useState<any>(null);
  const [grantAccessUser, setGrantAccessUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter, statusFilter],
    queryFn: async () => {
      let query = `/admin/users?`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (roleFilter !== 'All') query += `role=${roleFilter}&`;
      if (statusFilter !== 'All') query += `isActive=${statusFilter === 'Active' ? 'true' : 'false'}&`;
      const { data } = await api.get(query);
      const usersList = data?.items || data || [];
      return (Array.isArray(usersList) ? usersList : []).map((u: UserListItem) => ({
        ...u,
        full_name: u.fullName || 'Unknown',
        device_id: u.deviceId ?? null,
        is_active: u.isActive === undefined ? true : u.isActive,
        created_at: u.createdAt,
        profilePictureUrl: u.profilePictureUrl ?? null,
      } as UserListItem & { full_name: string; device_id: string | null; is_active: boolean; created_at: string; profilePictureUrl: string | null }));
    }
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (user: UserListItem & { full_name: string; is_active: boolean }) => {
      return api.put(`/admin/users/${user.id}`, { isActive: !user.is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const toggleInstructorMutation = useMutation({
    mutationFn: async (user: UserListItem & { full_name: string; role: string }) => {
      const newRole = user.role === 'INSTRUCTOR' ? 'STUDENT' : 'INSTRUCTOR';
      return api.put(`/admin/users/${user.id}`, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  async function handleToggleSuspend(user: UserListItem & { full_name: string; is_active: boolean }) {
    toggleSuspendMutation.mutate(user);
  }

  async function handleToggleInstructor(user: UserListItem & { full_name: string; role: string }) {
    toggleInstructorMutation.mutate(user);
  }

  type UserWithRemap = UserListItem & { full_name: string; device_id: string | null; is_active: boolean; created_at: string };
  const filtered = users; // Filtering is now handled securely by the backend

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-theme-text">User Management</h1>
          <p className="text-sm text-theme-muted mt-1">Search users, reset devices, and override progress.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <select 
            className="input w-full sm:w-auto"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select 
            className="input w-full sm:w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
          <div className="w-full sm:w-64">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name or email…" />
          </div>
          <button 
            onClick={() => {
              const headers = ['User ID', 'Name', 'Email', 'Role', 'Education Level', 'Active', 'Device Bound', 'XP', 'Date Joined'];
              const rows = filtered.map((u: UserWithRemap) => [
                u.id,
                u.full_name || '',
                u.email || '',
                formatRole(u.role),
                formatEducationLevel(u.educationLevel),
                u.isActive ? 'Yes' : 'No',
                u.deviceId ? 'Yes' : 'No',
                u.xp,
                new Date(u.created_at).toLocaleDateString()
              ]);
              downloadCsv(headers, rows, 'platform_users.csv');
            }} 
            className="btn-secondary whitespace-nowrap"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No users found" />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4 text-start">Name</th>
                <th className="p-4 text-start">Role</th>
                <th className="p-4 text-start">Device</th>
                <th className="p-4 text-start">XP</th>
                <th className="p-4 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((u: UserWithRemap) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.profilePictureUrl ? (
                        <img 
                          src={u.profilePictureUrl} 
                          alt={u.full_name} 
                          loading="lazy"
                          className="w-9 h-9 rounded-full object-cover border border-white/[0.1]" 
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-theme-text">{u.full_name}</p>
                        <p className="text-xs text-theme-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={u.role === 'ADMIN' ? 'gold' : u.role === 'INSTRUCTOR' ? 'accent' : 'success'}>
                        {u.role}
                      </Badge>
                      {u.role === 'STUDENT' && u.educationLevel && (
                        <Badge variant="default">
                          {u.educationLevel === 'HIGH_SCHOOL' ? 'High School' : 'University'}
                        </Badge>
                      )}
                      {!u.is_active && <Badge variant="error">Suspended</Badge>}
                    </div>
                  </td>
                  <td className="p-4">
                    {u.deviceId ? (
                      <span className="text-xs text-theme-muted flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-secondary-400" />
                        Bound
                      </span>
                    ) : (
                      <span className="text-xs text-theme-muted">Not bound</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-gold-700 dark:text-gold-300">{(u.xp || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {u.role === 'STUDENT' && (
                        <>
                          <button
                            onClick={() => setResetUser(u)}
                            disabled={!u.deviceId}
                            className="btn-ghost text-xs"
                            title="Reset device"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Device
                          </button>
                          <button
                            onClick={() => setGrantAccessUser(u)}
                            className="btn-ghost text-xs"
                            title="Direct grant access"
                          >
                            <Key className="w-3.5 h-3.5 text-primary-400" /> Grant
                          </button>
                          <button
                            onClick={() => setOverrideUser(u)}
                            className="btn-ghost text-xs"
                            title="Force-unlock progress"
                          >
                            <TrendingUp className="w-3.5 h-3.5" /> Unlock
                          </button>
                        </>
                      )}
                      {u.id !== profile?.id && (
                        <>
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className="btn-ghost text-xs"
                            title={u.is_active ? "Suspend User" : "Activate User"}
                          >
                            <AlertCircle className={`w-3.5 h-3.5 ${u.is_active ? 'text-warning-400' : 'text-success-400'}`} /> 
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleToggleInstructor(u)}
                            className="btn-ghost text-xs text-accent-700 dark:text-accent-300"
                            title={u.role === 'INSTRUCTOR' ? 'Demote to Student' : 'Promote to Instructor'}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {u.role === 'INSTRUCTOR' ? 'Demote' : 'Make Instructor'}
                          </button>
                          <button
                            onClick={() => setDeleteUser(u)}
                            className="btn-ghost text-xs text-error-400 hover:text-error-300 hover:bg-error-500/10"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResetDeviceModal
        user={resetUser}
        onClose={() => setResetUser(null)}
        onReset={async () => {
          if (!resetUser) return;
          try {
            await api.post(`/admin/users/${resetUser.id}/reset-device`);
            setResetUser(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
          } catch(e) { console.error(e); }
        }}
      />

      <OverrideModal
        user={overrideUser}
        onClose={() => setOverrideUser(null)}
      />

      <GrantAccessModal
        user={grantAccessUser}
        onClose={() => setGrantAccessUser(null)}
      />

      <DeleteUserModal
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDelete={async () => {
          if (!deleteUser) return;
          deleteMutation.mutate(deleteUser.id);
          setDeleteUser(null);
        }}
      />
    </div>
  );
}

function ResetDeviceModal({
  user,
  onClose,
  onReset,
}: {
  user: Profile | null;
  onClose: () => void;
  onReset: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={!!user} onClose={onClose} title="Reset Device Binding" description={user ? `${user.full_name} will be able to log in from a new device.` : ''}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-warning-500/10 border border-warning-500/20 p-3">
          <AlertCircle className="w-4 h-4 text-warning-700 dark:text-warning-300 mt-0.5 shrink-0" />
          <p className="text-sm text-warning-200">
            This will clear the device fingerprint bound to this account. The student will be prompted
            to bind a new device on their next login.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={async () => { setBusy(true); await onReset(); setBusy(false); }}
            disabled={busy}
            className="btn-danger"
          >
            <RotateCcw className="w-4 h-4" />
            {busy ? 'Resetting…' : 'Reset Device'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function OverrideModal({
  user,
  onClose,
}: {
  user: Profile | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchItems = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api.get(`/admin/users/${user.id}/unlockable-items`)
       .then(res => setItems(res.data))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleOverride = async (itemType: string, itemId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await api.post('/admin/progress/override', {
        studentId: user.id,
        itemType,
        itemId
      });
      fetchItems(); // Refresh the list without closing
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.parentCourseTitle]) acc[item.parentCourseTitle] = { courseId: item.parentCourseId, items: [] };
    acc[item.parentCourseTitle].items.push(item);
    return acc;
  }, {} as Record<string, { courseId: string, items: any[] }>);

  return (
    <Modal open={!!user} onClose={onClose} title="Force-Unlock Progress" description={user ? `Bypass drip progression for ${user.full_name}.` : ''} size="lg">
      <div className="space-y-6">
        {loading ? (
          <Skeleton className="h-40" />
        ) : items.length === 0 ? (
          <p className="text-sm text-theme-muted text-center py-6">No lockable items found.</p>
        ) : (
          <div className="max-h-[32rem] overflow-y-auto scrollbar-thin space-y-6 pr-2">
            {Object.entries(grouped).map(([courseTitle, group]: [string, any]) => (
              <div key={courseTitle} className="glass rounded-xl overflow-hidden border border-white/[0.05]">
                <div className="bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05]">
                  <h3 className="font-semibold text-theme-text text-lg">{courseTitle}</h3>
                  <button 
                    onClick={() => handleOverride('COURSE', group.courseId)}
                    disabled={busy}
                    className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                  >
                    Mark Entire Course Completed
                  </button>
                </div>
                <div className="divide-y divide-white/[0.02]">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="p-3 sm:px-4 flex items-center justify-between hover:bg-white/[0.01]">
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded uppercase shrink-0 ${
                          item.type === 'EXAM' ? 'text-error-400 bg-error-500/10' :
                          item.type === 'QUIZ' ? 'text-primary-400 bg-primary-500/10' :
                          'text-accent-400 bg-accent-500/10'
                        }`}>
                          {item.type}
                        </span>
                        <p className="text-sm text-theme-text truncate" title={item.title}>{item.title}</p>
                      </div>
                      <div className="shrink-0">
                        {item.isCompleted ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success-500/10 text-success-400 text-xs font-medium border border-success-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOverride(item.type, item.id)}
                            disabled={busy}
                            className="btn-ghost text-xs py-1 px-3 text-theme-muted hover:text-theme-text"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function GrantAccessModal({
  user,
  onClose,
}: {
  user: Profile | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ courses: any[], lectures: any[] }>({ courses: [], lectures: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validityDays, setValidityDays] = useState<string>('');

  useEffect(() => {
    if (!search || search.length < 2) {
      setResults({ courses: [], lectures: [] });
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/admin/catalog/search?q=${search}`)
         .then(res => setResults(res.data))
         .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleGrant = async (type: string, id: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const days = validityDays ? parseInt(validityDays, 10) : undefined;
      if (type === 'COURSE') {
        await api.post(`/admin/users/${user.id}/grant-course`, { courseId: id, validityDays: days });
      } else {
        await api.post(`/admin/users/${user.id}/grant-lecture`, { lectureId: id, validityDays: days });
      }
      onClose();
    } catch(e) { console.error(e); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} title="Direct Grant Access" description={user ? `Grant a course or lecture to ${user.full_name}.` : ''} size="lg">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchBox value={search} onChange={setSearch} placeholder="Search courses and lectures..." />
          </div>
          <div className="w-full sm:w-40 shrink-0">
            <input type="number" placeholder="Days (Opt)" value={validityDays} onChange={e => setValidityDays(e.target.value)} className="w-full bg-transparent border border-white/[0.08] text-theme-text rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-500" title="Leave blank for lifetime access" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-40" />
        ) : (results.courses.length === 0 && results.lectures.length === 0) ? (
          <p className="text-sm text-theme-muted text-center py-6">No results found.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04] glass rounded-xl border border-white/[0.05]">
            {results.courses.map((c) => (
              <div key={c.id} className="p-3 sm:px-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                   <span className="shrink-0 text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-1 rounded">COURSE</span>
                   <p className="text-sm text-theme-text truncate">{c.title}</p>
                </div>
                <button onClick={() => handleGrant('COURSE', c.id)} disabled={busy} className="shrink-0 btn-secondary text-xs px-3">Grant Access</button>
              </div>
            ))}
            {results.lectures.map((l) => (
              <div key={l.id} className="p-3 sm:px-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col gap-1 min-w-0 pr-4">
                   <div className="flex items-center gap-3">
                     <span className="shrink-0 text-[10px] font-bold text-accent-400 bg-accent-500/10 px-2 py-1 rounded">LECTURE</span>
                     <p className="text-sm text-theme-text truncate" title={l.title}>{l.title}</p>
                   </div>
                   <p className="text-xs text-theme-muted sm:pl-[4.5rem] truncate" title={l.courseTitle}>in {l.courseTitle}</p>
                </div>
                <button onClick={() => handleGrant('LECTURE', l.id)} disabled={busy} className="shrink-0 btn-secondary text-xs px-3">Grant Access</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteUserModal({
  user,
  onClose,
  onDelete,
}: {
  user: Profile | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={!!user} onClose={onClose} title="Delete User" description={user ? `Are you sure you want to permanently delete ${user.full_name}?` : ''}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-error-500/10 border border-error-500/20 p-3">
          <AlertCircle className="w-4 h-4 text-error-300 mt-0.5 shrink-0" />
          <p className="text-sm text-error-200">
            This action cannot be undone. All of this user's progress, records, and history will be permanently erased from the platform.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={async () => { setBusy(true); await onDelete(); setBusy(false); }}
            disabled={busy}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            {busy ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Admin Codes Page ---
export function AdminCodes() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [audienceFilter, setAudienceFilter] = useState('All');

  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  const loadCodes = useCallback(async () => {
    try {
      let query = `/activation-codes?`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'All') query += `status=${statusFilter}&`;
      if (typeFilter !== 'All') query += `targetType=${typeFilter}&`;
      if (audienceFilter !== 'All') query += `educationLevel=${audienceFilter}&`;

      const { data } = await api.get(query);
      setCodes(data.items || data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, statusFilter, typeFilter, audienceFilter]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const handleDeactivate = async (id: string) => {
    const ok = await confirm('Deactivate Code', 'Are you sure you want to instantly deactivate this code?');
    if (!ok) return;
    try {
      await api.post(`/activation-codes/${id}/deactivate`);
      toast.success('Code deactivated successfully.');
      loadCodes();
    } catch (e) {
      console.error(e);
      toast.error('Failed to deactivate code.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Delete Code', 'Are you sure you want to permanently delete this code? This action cannot be undone.');
    if (!ok) return;
    try {
      await api.delete(`/activation-codes/${id}`);
      toast.success('Code deleted successfully.');
      loadCodes();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete code.');
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm('Clear All Codes', 'Are you absolutely sure you want to delete ALL activation codes in the platform? This is irreversible!');
    if (!ok) return;
    try {
      await api.delete(`/activation-codes/all`);
      toast.success('All codes cleared successfully.');
      loadCodes();
    } catch (e) {
      console.error(e);
      toast.error('Failed to clear codes.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-theme-text">All Activation Codes</h1>
          <p className="text-sm text-theme-muted mt-1">Platform-wide code generation and redemption tracking.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full flex-wrap">
          <select 
            className="input w-full sm:w-auto text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <select 
            className="input w-full sm:w-auto text-sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="LECTURE">Lecture</option>
            <option value="COURSE">Full Course</option>
          </select>
          <select 
            className="input w-full sm:w-auto text-sm"
            value={audienceFilter}
            onChange={e => setAudienceFilter(e.target.value)}
          >
            <option value="All">All Audiences</option>
            <option value="HIGH_SCHOOL">High School</option>
            <option value="UNIVERSITY">University</option>
          </select>
          <div className="flex-1 w-full sm:w-auto min-w-[200px] relative">
            <input
              type="text"
              className="input w-full pl-10"
              placeholder="Search code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button 
            onClick={() => {
              const headers = ['Code', 'Type', 'Education Level', 'Status', 'Redeemed Course', 'Redeemed Lecture', 'Redeemed By', 'Created At'];
              const rows = codes.map(c => [
                c.code || '',
                c.targetType || '',
                formatEducationLevel(c.educationLevel),
                formatCodeStatus(c.status),
                c.courseTitle || '',
                c.lectureTitle || '',
                c.redeemerName || '',
                new Date(c.createdAt).toLocaleDateString()
              ]);
              downloadCsv(headers, rows, 'activation_codes.csv');
            }} 
            className="btn-secondary"
          >
            Export CSV
          </button>
          <button onClick={handleClearAll} className="btn-secondary text-error-400 hover:text-error-300 border-error-500/20 hover:bg-error-500/10">
            <Trash2 className="w-4 h-4 mr-2" /> Clear All
          </button>
          <button onClick={() => setGenModalOpen(true)} className="btn-primary">
            <KeyRound className="w-4 h-4 mr-2" /> Generate Codes
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : codes.length === 0 ? (
        <EmptyState icon={<KeyRound className="w-8 h-8" />} title="No codes yet" description="Generate codes here to distribute to your students." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4 text-start">Code</th>
                <th className="p-4 text-start">Type</th>
                <th className="p-4 text-start">Audience</th>
                <th className="p-4 text-start">Status</th>
                <th className="p-4 text-start">Redeemed For</th>
                <th className="p-4 text-start">Redeemed By</th>
                <th className="p-4 text-start">Created</th>
                <th className="p-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-accent-200 font-bold tracking-wider">{c.code}</code>
                      <CopyButton text={c.code} />
                    </div>
                  </td>
                  <td className="p-4 text-theme-muted">{c.targetType}</td>
                  <td className="p-4 text-theme-muted">{c.educationLevel === 'HIGH_SCHOOL' ? 'High School' : 'University'}</td>
                  <td className="p-4">
                    {c.status === 'REDEEMED' ? (
                      <Badge variant="success">Redeemed</Badge>
                    ) : (
                      <Badge variant="warning">Available</Badge>
                    )}
                  </td>
                  <td className="p-4 text-theme-muted">
                    {c.status === 'REDEEMED' 
                      ? (c.targetType === 'COURSE' ? c.courseTitle : c.lectureTitle) 
                      : '—'}
                  </td>
                  <td className="p-4 text-theme-muted">{c.redeemerName ?? '—'}</td>
                  <td className="p-4 text-theme-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === 'UNUSED' && (
                        <button onClick={() => handleDeactivate(c.id)} className="btn-secondary text-warning-400 hover:text-warning-300 py-1 px-3 text-xs">
                          Deactivate
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="btn-secondary text-error-400 hover:text-error-300 py-1 px-2 text-xs" title="Delete Code">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminGenerateCodesModal
        open={genModalOpen}
        onClose={() => setGenModalOpen(false)}
        onGenerated={() => {
          setGenModalOpen(false);
          loadCodes();
        }}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
      }}
      className="p-1 rounded text-theme-muted hover:text-accent-700 dark:text-accent-300 transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-secondary-700 dark:text-secondary-300" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function AdminGenerateCodesModal({
  open,
  onClose,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [targetType, setTargetType] = useState<'LECTURE' | 'COURSE'>('LECTURE');
  const [educationLevel, setEducationLevel] = useState<'HIGH_SCHOOL' | 'UNIVERSITY'>('UNIVERSITY');
  const [count, setCount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    try {
      const { data } = await api.post('/activation-codes/generate', {
        targetType,
        educationLevel,
        count,
      });
      setGeneratedCodes(data.codes);
    } catch(e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setGeneratedCodes([]);
    setCount(1);
    onClose();
    onGenerated();
  }

  return (
    <Modal open={open} onClose={close} title="Generate Activation Codes">
      {generatedCodes.length > 0 ? (
        <div className="text-center py-4">
          <KeyRound className="w-10 h-10 mx-auto text-gold-700 dark:text-gold-300 mb-3" />
          <p className="text-sm text-theme-muted mb-4">Successfully generated {generatedCodes.length} code(s):</p>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-6 glass rounded-xl p-2 border border-white/[0.04]">
            {generatedCodes.map((c) => (
              <div key={c} className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/50">
                <code className="font-mono text-lg font-bold text-gold-200 tracking-wider">{c}</code>
                <CopyButton text={c} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(generatedCodes.join('\n'));
                  setCopiedAll(true);
                  setTimeout(() => setCopiedAll(false), 1500);
                } catch { /* ignore */ }
              }} 
              className="btn-secondary w-full justify-center"
            >
              {copiedAll ? <Check className="w-4 h-4 text-secondary-700 dark:text-secondary-300" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'Copied All!' : 'Copy All Codes'}
            </button>
            <button onClick={close} className="btn-primary w-full justify-center">Done</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Code Type</label>
            <select
              className="input bg-neutral-900"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'LECTURE' | 'COURSE')}
            >
              <option value="LECTURE">Lecture</option>
              <option value="COURSE">Full Course</option>
            </select>
            <p className="text-xs text-theme-muted mt-1">What does this code unlock?</p>
          </div>
          
          <div>
            <label className="label">Target Audience</label>
            <select
              className="input bg-neutral-900"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value as 'HIGH_SCHOOL' | 'UNIVERSITY')}
            >
              <option value="HIGH_SCHOOL">High School Student</option>
              <option value="UNIVERSITY">University Student</option>
            </select>
            <p className="text-xs text-theme-muted mt-1">Only students of this type can redeem these codes.</p>
          </div>

          <div>
            <label className="label">Number of Codes to Generate</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input bg-neutral-900"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={close} className="btn-ghost">Cancel</button>
            <button onClick={handleGenerate} disabled={busy || count < 1} className="btn-primary">
              <Sparkles className="w-4 h-4" /> {busy ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// --- Admin Courses Page ---
export function AdminCourses() {
  const { navigate } = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();

  const loadCourses = useCallback(async () => {
    try {
      let query = `/courses?`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (statusFilter !== 'All') query += `isPublished=${statusFilter === 'PUBLISHED' ? 'true' : 'false'}&`;
      
      const { data } = await api.get(query).catch(() => ({ data: [] }));
      const fetched = data?.items || data || [];
      setCourses(Array.isArray(fetched) ? fetched : []);
    } catch(e) {
      console.error(e);
      setCourses([]);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filtered = Array.isArray(courses) ? courses : []; // Filtering is now handled securely by the backend

  async function handleDelete(courseId: string) {
    const ok = await confirm('Delete Course', 'Are you absolutely sure you want to permanently delete this course and all of its content? This cannot be undone.');
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete(`/courses/${courseId}`);
      await loadCourses();
    } catch(e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-theme-text">Course Management</h1>
          <p className="text-sm text-theme-muted mt-1">Manage all platform courses.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-wrap">
          <select 
            className="input w-full sm:w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Visibility</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
          <div className="w-full sm:w-64">
            <SearchBox value={search} onChange={setSearch} placeholder="Search courses..." />
          </div>
          <button
            onClick={() => setCreateCourseOpen(true)}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Create Course
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No courses found" description="There are no courses on the platform yet." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4 text-start">Course Title</th>
                <th className="p-4 text-start">Instructors</th>
                <th className="p-4 text-start">Created</th>
                <th className="p-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-theme-muted" />
                        </div>
                      )}
                      <div>
                        <Link 
                          to={`/instructor/course/${c.id}`}
                          className="font-bold text-theme-text hover:text-cyan-400 hover:underline transition cursor-pointer"
                        >
                          {c.title}
                        </Link>
                        <div className="text-xs text-theme-muted truncate max-w-[250px]">{c.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-theme-muted">
                    {c.instructors?.map((i: CourseInstructor) => i.instructor?.fullName).join(', ') || 'None'}
                  </td>
                  <td className="p-4 text-theme-muted">{new Date(c.createdAt ?? '').toLocaleDateString()}</td>
                  <td className="p-4 text-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      disabled={busy}
                      className="p-2 rounded-lg text-theme-muted hover:bg-error-500/10 hover:text-error-300 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCourseModal
        open={createCourseOpen}
        onClose={() => setCreateCourseOpen(false)}
        onCreated={(newCourseId) => {
          setCreateCourseOpen(false);
          navigate(`/instructor/course/${newCourseId}`);
        }}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

// --- Admin Profile Requests Page ---
export function AdminProfileRequests() {
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['adminProfileRequests'],
    queryFn: async () => {
      const { data } = await api.get('/profile-update-requests');
      return data;
    }
  });

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/profile-update-requests/${id}/approve`);
      toast.success('Profile update approved');
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Optional rejection reason:');
    if (reason === null) return; // Cancelled
    try {
      await api.post(`/profile-update-requests/${id}/reject`, { reason });
      toast.success('Profile update rejected');
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleExportCsv = () => {
    if (!requests || requests.length === 0) {
      toast.error('No requests to export');
      return;
    }
    const headers = ['Student Name', 'Email', 'Current Phone', 'Current Parent Phone', 'Requested Name', 'Requested Phone', 'Requested Parent Phone', 'Status', 'Date'];
    const rows = requests.map((r: any) => [
      r.student?.fullName || '',
      r.student?.email || '',
      r.student?.phoneNumber || '',
      r.student?.parentPhoneNumber || '',
      r.requestedFullName || '',
      r.requestedPhoneNumber || '',
      r.requestedParentPhone || '',
      r.status || '',
      new Date(r.createdAt).toLocaleDateString()
    ]);
    downloadCsv(headers, rows, 'profile_requests.csv');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link to="#/admin" className="inline-flex items-center text-sm text-theme-muted hover:text-theme-text mb-4 transition-colors">
            <RotateCcw className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold text-theme-text">Profile Requests</h1>
          <p className="text-theme-muted mt-1">Review student requests to update restricted profile fields.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="btn-secondary whitespace-nowrap">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4">Student</th>
                <th className="p-4">Current Info</th>
                <th className="p-4">Requested Updates</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center"><Spinner className="w-6 h-6 mx-auto text-theme-muted" /></td>
                </tr>
              ) : !requests || requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-theme-muted">No profile update requests found.</td>
                </tr>
              ) : (
                requests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-theme-text">{r.student?.fullName}<br/><span className="text-xs text-theme-muted">{r.student?.email}</span></td>
                    <td className="p-4 text-theme-muted text-xs">
                      {r.student?.phoneNumber && <div>Phone: {r.student?.phoneNumber}</div>}
                      {r.student?.parentPhoneNumber && <div>Parent: {r.student?.parentPhoneNumber}</div>}
                    </td>
                    <td className="p-4">
                      {r.requestedFullName && <div className="text-accent-400 text-xs">Name ➔ {r.requestedFullName}</div>}
                      {r.requestedPhoneNumber && <div className="text-accent-400 text-xs">Phone ➔ {r.requestedPhoneNumber}</div>}
                      {r.requestedParentPhone && <div className="text-accent-400 text-xs">Parent ➔ {r.requestedParentPhone}</div>}
                    </td>
                    <td className="p-4">
                      <Badge variant={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'error'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-theme-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-end">
                      {r.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApprove(r.id)} className="btn-primary py-1 px-3 text-xs">Approve</button>
                          <button onClick={() => handleReject(r.id)} className="btn-secondary text-error-400 hover:text-error-300 py-1 px-3 text-xs">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Admin Pending Registrations Page ---
export function AdminPendingUsers() {
  const { data: pendingUsers, isLoading, refetch } = useQuery({
    queryKey: ['adminPendingUsers'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users?isActive=false');
      return data.items || [];
    }
  });

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/admin/users/${id}`, { isActive: true });
      toast.success('User approved and activated successfully');
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to completely delete this pending registration?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Pending registration deleted');
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete registration');
    }
  };

  const handleExportCsv = () => {
    if (!pendingUsers || pendingUsers.length === 0) {
      toast.error('No pending registrations to export');
      return;
    }
    const headers = ['Full Name', 'Email', 'Role', 'Education Level', 'Phone Number', 'Parent Phone Number', 'Date Joined'];
    const rows = pendingUsers.map((u: any) => [
      u.fullName || '',
      u.email || '',
      formatRole(u.role),
      formatEducationLevel(u.educationLevel),
      u.phoneNumber || '',
      u.parentPhoneNumber || '',
      new Date(u.createdAt).toLocaleDateString()
    ]);
    downloadCsv(headers, rows, 'pending_registrations.csv');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link to="#/admin" className="inline-flex items-center text-sm text-theme-muted hover:text-theme-text mb-4 transition-colors">
            <RotateCcw className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold text-theme-text">Pending Registrations</h1>
          <p className="text-theme-muted mt-1">Review, approve, or reject new student registrations.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="btn-secondary whitespace-nowrap">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-theme-border/50 bg-theme-secondary/30">
                <th className="px-6 py-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Education</th>
                <th className="px-6 py-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-theme-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  </td>
                </tr>
              ) : pendingUsers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState 
                      icon={<User className="w-8 h-8" />} 
                      title="No pending registrations" 
                      description="All registrations have been reviewed." 
                    />
                  </td>
                </tr>
              ) : (
                pendingUsers?.map((user: any) => (
                  <tr key={user.id} className="hover:bg-theme-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.profilePictureUrl ? (
                          <img src={user.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-theme-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-theme-secondary flex items-center justify-center text-theme-muted">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-theme-text text-sm">{user.fullName}</div>
                          <div className="text-xs text-theme-muted mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral" size="sm">
                        {user.educationLevel === 'HIGH_SCHOOL' ? 'High School' : 'University'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-theme-text">Phone: <span className="font-mono text-theme-muted">{user.phoneNumber || 'N/A'}</span></div>
                      <div className="text-xs text-theme-text mt-1">Parent: <span className="font-mono text-theme-muted">{user.parentPhoneNumber || 'N/A'}</span></div>
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-muted whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
