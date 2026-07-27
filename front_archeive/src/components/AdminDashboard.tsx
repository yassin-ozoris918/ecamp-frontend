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
} from 'lucide-react';
import { api } from '../lib/api';
import type { Profile } from '../lib/types';
import { Badge, EmptyState, Skeleton } from './ui';
import { Modal } from './Modal';
import { SearchBox } from './InstructorDashboard';
import { useAuth } from '../lib/authContext';
import { Link } from '../lib/router';

export function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, instructors: 0, courses: 0, codesRedeemed: 0, codesGenerated: 0 });
  const [loading, setLoading] = useState(true);

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
        <p className="text-sm text-neutral-400">Admin</p>
        <h1 className="text-3xl font-display font-bold text-white mt-1 flex items-center gap-2">
          <Shield className="w-7 h-7 text-gold-300" />
          Platform Overview
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi icon={<Users className="w-5 h-5" />} label="Students" value={stats.students} color="text-accent-300" bg="bg-accent-500/10" loading={loading} />
        <AdminKpi icon={<GraduationCap className="w-5 h-5" />} label="Instructors" value={stats.instructors} color="text-secondary-300" bg="bg-secondary-500/10" loading={loading} />
        <AdminKpi icon={<BookOpen className="w-5 h-5" />} label="Courses" value={stats.courses} color="text-gold-300" bg="bg-gold-500/10" loading={loading} />
        <AdminKpi icon={<KeyRound className="w-5 h-5" />} label="Codes Redeemed" value={`${stats.codesRedeemed}/${stats.codesGenerated}`} color="text-warning-300" bg="bg-warning-500/10" loading={loading} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickActionCard
          icon={<Users className="w-5 h-5" />}
          title="Manage Users"
          description="Search, reset devices, and override progress for any student."
          to="#/admin/users"
          color="text-accent-300"
          bg="bg-accent-500/10"
        />
        <QuickActionCard
          icon={<KeyRound className="w-5 h-5" />}
          title="Activation Codes"
          description="View all generated codes and their redemption status across the platform."
          to="#/admin/codes"
          color="text-gold-300"
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
          color="text-secondary-300"
          bg="bg-secondary-500/10"
        />

        <QuickActionCard
          icon={<User className="w-5 h-5" />}
          title="Student 360 Workspace"
          description="Deep-dive into comprehensive individual student dossiers."
          to="#/admin/student-360"
          color="text-accent-300"
          bg="bg-accent-500/10"
        />
        <QuickActionCard
          icon={<Database className="w-5 h-5" />}
          title="System Audit & Analytics"
          description="View immutable operation logs and export wide-scale CSV metrics."
          to="#/admin/audit-logs"
          color="text-gold-300"
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
      <p className="text-2xl font-bold text-white mt-3">
        {loading ? <Skeleton className="h-7 w-16" /> : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-neutral-400 uppercase tracking-wide mt-1">{label}</p>
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
        <p className="font-display font-bold text-white">{title}</p>
        <p className="text-sm text-neutral-400 mt-0.5">{description}</p>
      </div>
    </a>
  );
}

// --- Admin Users Page ---
export function AdminUsers() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [resetUser, setResetUser] = useState<Profile | null>(null);
  const [overrideUser, setOverrideUser] = useState<Profile | null>(null);
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users');
      const usersList = data.items || data;
      return usersList.map((u: any) => ({
        ...u,
        full_name: u.fullName || u.full_name || 'Unknown',
        device_id: u.deviceId || u.device_id,
        is_active: u.isActive !== undefined ? u.isActive : true,
        educationLevel: u.educationLevel,
        created_at: u.createdAt || u.created_at,
      }));
    }
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (user: any) => {
      return api.put(`/admin/users/${user.id}`, { isActive: !user.is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const toggleInstructorMutation = useMutation({
    mutationFn: async (user: any) => {
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

  async function handleToggleSuspend(user: any) {
    toggleSuspendMutation.mutate(user);
  }

  async function handleToggleInstructor(user: any) {
    toggleInstructorMutation.mutate(user);
  }

  const filtered = users.filter((u: any) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
          <p className="text-sm text-neutral-400 mt-1">Search users, reset devices, and override progress.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => {
              const rows = [
                ["User ID", "Name", "Email", "Role", "Active", "Device Bound", "XP", "Joined"],
                ...filtered.map((u: any) => [
                  u.id, 
                  `"${u.full_name}"`, 
                  u.email, 
                  u.role, 
                  u.is_active ? 'Yes' : 'No', 
                  u.device_id ? 'Yes' : 'No', 
                  u.xp, 
                  new Date(u.created_at).toLocaleDateString()
                ])
              ];
              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", "platform_users.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} 
            className="btn-secondary whitespace-nowrap"
          >
            Export CSV
          </button>
          <div className="w-full sm:w-64">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name or email…" />
          </div>
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
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                <th className="p-4 text-start">Name</th>
                <th className="p-4 text-start">Role</th>
                <th className="p-4 text-start">Device</th>
                <th className="p-4 text-start">XP</th>
                <th className="p-4 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-base-950 font-bold text-sm">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.full_name}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
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
                    {u.device_id ? (
                      <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-secondary-400" />
                        Bound
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">Not bound</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-gold-300">{(u.xp || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {u.role === 'STUDENT' && (
                        <>
                          <button
                            onClick={() => setResetUser(u)}
                            disabled={!u.device_id}
                            className="btn-ghost text-xs"
                            title="Reset device"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Device
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
                            className="btn-ghost text-xs text-accent-300"
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
            await api.put(`/admin/users/${resetUser.id}`, { deviceId: null });
            setResetUser(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
          } catch(e) { console.error(e); }
        }}
      />

      <OverrideModal
        user={overrideUser}
        onClose={() => setOverrideUser(null)}
        onOverride={async (itemId) => {
          if (!overrideUser) return;
          // In a real app we need to know item type (SESSION or QUIZ). For now default to SESSION
          // We can fetch itemType in the OverrideModal UI if needed
          try {
            await api.post('/admin/progress/override', {
              studentId: overrideUser.id,
              itemType: 'SESSION', 
              itemId
            });
          } catch(e) { console.error(e); }
          setOverrideUser(null);
        }}
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
          <AlertCircle className="w-4 h-4 text-warning-300 mt-0.5 shrink-0" />
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
  onOverride,
}: {
  user: Profile | null;
  onClose: () => void;
  onOverride: (itemId: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<{ id: string; title: string; lectureTitle: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    (async () => {
      // For now, this is a placeholder. Admin override needs more complex UI or backend help.
      // Since we updated progress mechanics, this will require a proper endpoint fetching student items
      setItems([]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return i.title.toLowerCase().includes(q) || i.lectureTitle.toLowerCase().includes(q);
  });

  return (
    <Modal open={!!user} onClose={onClose} title="Force-Unlock Progress" description={user ? `Manually mark items complete for ${user.full_name}.` : ''} size="lg">
      <div className="space-y-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search items…" />
        {loading ? (
          <Skeleton className="h-40" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">No items available.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04] glass rounded-xl">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={async () => { setBusy(true); await onOverride(item.id); setBusy(false); }}
                disabled={busy}
                className="w-full p-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-start"
              >
                <CheckCircle2 className="w-4 h-4 text-secondary-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title}</p>
                  <p className="text-xs text-neutral-500">{item.lectureTitle}</p>
                </div>
                {busy ? <span className="text-xs text-neutral-400">Unlocking…</span> : null}
              </button>
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
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genModalOpen, setGenModalOpen] = useState(false);

  const loadCodes = useCallback(async () => {
    try {
      const { data } = await api.get('/activation-codes');
      setCodes(data.items || data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">All Activation Codes</h1>
          <p className="text-sm text-neutral-400 mt-1">Platform-wide code generation and redemption tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const rows = [
                ["Code", "Course", "Lecture", "Status", "Redeemed By", "Created At"],
                ...codes.map(c => [
                  c.code,
                  `"${c.courseTitle}"`,
                  `"${c.lectureTitle}"`,
                  c.isRedeemed ? "Redeemed" : "Available",
                  `"${c.redeemerName || ''}"`,
                  new Date(c.createdAt).toLocaleDateString()
                ])
              ];
              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", "activation_codes.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} 
            className="btn-secondary"
          >
            Export CSV
          </button>
          <button onClick={() => setGenModalOpen(true)} className="btn-primary">
            <KeyRound className="w-4 h-4" /> Generate Codes
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
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                <th className="p-4 text-start">Code</th>
                <th className="p-4 text-start">Course</th>
                <th className="p-4 text-start">Status</th>
                <th className="p-4 text-start">Redeemed By</th>
                <th className="p-4 text-start">Created</th>
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
                  <td className="p-4 text-neutral-300">{c.courseTitle} - {c.lectureTitle}</td>
                  <td className="p-4">
                    {c.isRedeemed ? (
                      <Badge variant="success">Redeemed</Badge>
                    ) : (
                      <Badge variant="warning">Available</Badge>
                    )}
                  </td>
                  <td className="p-4 text-neutral-300">{c.redeemerName ?? '—'}</td>
                  <td className="p-4 text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</td>
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
      className="p-1 rounded text-neutral-500 hover:text-accent-300 transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-secondary-300" /> : <Copy className="w-3.5 h-3.5" />}
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
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [count, setCount] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/courses').then(({ data }) => {
        const list = data.items || data;
        setCourses(list);
        if (list.length > 0) setSelectedCourseId(list[0].id);
      }).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (selectedCourseId) {
      api.get(`/courses/${selectedCourseId}/builder`).then(({ data }) => {
        setLectures(data.lectures);
        if (data.lectures.length > 0) setSelectedLectureId(data.lectures[0].id);
        else setSelectedLectureId('');
      }).catch(console.error);
    }
  }, [selectedCourseId]);

  async function handleGenerate() {
    if (!selectedLectureId) return;
    setBusy(true);
    try {
      const { data } = await api.post('/activation-codes/generate', {
        lectureId: selectedLectureId,
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
          <KeyRound className="w-10 h-10 mx-auto text-gold-300 mb-3" />
          <p className="text-sm text-neutral-400 mb-4">Successfully generated {generatedCodes.length} code(s):</p>
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
              {copiedAll ? <Check className="w-4 h-4 text-secondary-300" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? 'Copied All!' : 'Copy All Codes'}
            </button>
            <button onClick={close} className="btn-primary w-full justify-center">Done</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Select Course</label>
            <select
              className="input bg-neutral-900"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label">Select Lecture</label>
            <select
              className="input bg-neutral-900"
              value={selectedLectureId}
              onChange={(e) => setSelectedLectureId(e.target.value)}
              disabled={lectures.length === 0}
            >
              {lectures.map(l => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            {lectures.length === 0 && <p className="text-xs text-error-400 mt-1">This course has no lectures.</p>}
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
            <button onClick={handleGenerate} disabled={busy || !selectedLectureId || count < 1} className="btn-primary">
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
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const loadCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data.items || data);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  async function handleDelete(courseId: string) {
    if (!confirm('Are you absolutely sure you want to permanently delete this course and all of its content? This cannot be undone.')) return;
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
          <h1 className="text-2xl font-display font-bold text-white">Course Management</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage all platform courses.</p>
        </div>
        <div className="w-full sm:w-64">
          <SearchBox value={search} onChange={setSearch} placeholder="Search courses..." />
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
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
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
                        <img src={c.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-neutral-500" />
                        </div>
                      )}
                      <div>
                        <Link 
                          to={`/instructor/course/${c.id}`}
                          className="font-bold text-white hover:text-cyan-400 hover:underline transition cursor-pointer"
                        >
                          {c.title}
                        </Link>
                        <div className="text-xs text-neutral-500 truncate max-w-[250px]">{c.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-neutral-300">
                    {c.instructors?.map((i: any) => i.user?.fullName).join(', ') || 'None'}
                  </td>
                  <td className="p-4 text-neutral-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      disabled={busy}
                      className="p-2 rounded-lg text-neutral-400 hover:bg-error-500/10 hover:text-error-300 transition-colors"
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
    </div>
  );
}
