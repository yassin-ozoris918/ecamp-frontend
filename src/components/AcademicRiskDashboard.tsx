import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Phone, Activity, Search, RefreshCw, Smartphone } from 'lucide-react';
import { client } from '../lib/api';
import { Badge, Skeleton, EmptyState, Button, SectionHeader } from './ui';
import { useConfirm, ConfirmDialog } from '../hooks/useConfirm';
import { useDebounce } from '../hooks/useDebounce';

export function AcademicRiskDashboard() {
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { confirm, state: confirmState, handleConfirm, handleCancel } = useConfirm();
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const result = await client.get<{ items: any[] }>('/admin/analytics/at-risk');
      setAtRiskStudents(result.items || result);
    } catch (e) {
      console.error('Failed to fetch at risk students', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleResetDevice = async (studentId: string) => {
    const ok = await confirm(
      "Reset Device Binding",
      "Are you sure you want to reset this student's device binding?"
    );
    if (!ok) return;
    setPendingStudentId(studentId);
    try {
      await client.put(`/admin/users/${studentId}`, { deviceId: null });
      toast.success("Device lock reset successfully.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reset device lock.");
    }
    setPendingStudentId(null);
  };

  const filtered = useMemo(() => {
    if (!debouncedSearch) return atRiskStudents;
    const q = debouncedSearch.toLowerCase();
    return atRiskStudents.filter((s) =>
      s.student.fullName.toLowerCase().includes(q) ||
      s.student.email.toLowerCase().includes(q)
    );
  }, [atRiskStudents, debouncedSearch]);

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader
        title={<span className="flex items-center gap-2"><ShieldAlert className="w-7 h-7 text-error-400" /> Academic Risk Engine</span>}
        subtitle="Real-time matrix of students flagged for multiple consecutive failures or low running averages."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchRiskData}>
              Refresh
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
              <input
                type="text"
                placeholder="Search at-risk students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-theme-card border border-theme-border rounded-xl text-sm focus:outline-none focus:border-accent-400 text-theme-text w-64"
              />
            </div>
          </>
        }
      />

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="w-8 h-8 text-success-400" />} title="All Clear" description="No students currently meet the risk thresholds." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4 text-start">Student</th>
                <th className="p-4 text-start">Parent Contact</th>
                <th className="p-4 text-start">Risk Metrics</th>
                <th className="p-4 text-start">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((profile) => (
                <tr key={profile.id} className="hover:bg-error-500/5 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-theme-text">{profile.student.fullName}</span>
                      <span className="text-xs text-theme-muted">{profile.student.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-theme-muted" />
                      <span className="text-theme-muted font-mono text-sm">{profile.student.parentPhoneNumber || 'Not Provided'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-start">
                      {profile.consecutiveFailures >= 2 && (
                        <Badge variant="error" className="animate-pulse">
                          {profile.consecutiveFailures} Consecutive Failures
                        </Badge>
                      )}
                      {profile.runningAverageScore < 50 && (
                        <Badge variant="warning">
                          {profile.runningAverageScore.toFixed(1)}% Running Avg
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost" size="sm"
                        icon={<Smartphone className="w-3.5 h-3.5" />}
                        onClick={() => handleResetDevice(profile.studentId)}
                        title="Reset Device Binding"
                      >
                        Reset Device
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        icon={<Activity className="w-3.5 h-3.5" />}
                      >
                        Deep Dive Profile
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
