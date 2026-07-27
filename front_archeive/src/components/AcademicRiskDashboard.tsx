import React, { useState, useEffect } from 'react';
import { ShieldAlert, Phone, Activity, Search, RefreshCw, Smartphone } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton, EmptyState } from './ui';

export function AcademicRiskDashboard() {
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/analytics/at-risk');
      setAtRiskStudents(data.items || data);
    } catch (e) {
      console.error('Failed to fetch at risk students', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const handleResetDevice = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to reset this student's device binding?")) return;
    try {
      await api.put(`/admin/users/${studentId}`, { deviceId: null });
      alert("Device lock reset successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to reset device lock.");
    }
  };

  const filtered = atRiskStudents.filter((s) => {
    if (!search) return true;
    return s.student.fullName.toLowerCase().includes(search.toLowerCase()) || 
           s.student.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-error-400" />
            Academic Risk Engine
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Real-time matrix of students flagged for multiple consecutive failures or low running averages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRiskData} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search at-risk students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:border-accent-400 text-white w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="w-8 h-8 text-success-400" />} title="All Clear" description="No students currently meet the risk thresholds." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
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
                      <span className="font-bold text-white">{profile.student.fullName}</span>
                      <span className="text-xs text-neutral-400">{profile.student.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-300 font-mono text-sm">{profile.student.parentPhoneNumber || 'Not Provided'}</span>
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
                      <button
                        onClick={() => handleResetDevice(profile.studentId)}
                        className="btn-ghost text-xs hover:text-accent-300 hover:bg-accent-500/10"
                        title="Reset Device Binding"
                      >
                        <Smartphone className="w-3.5 h-3.5" /> Reset Device
                      </button>
                      <button
                        className="btn-ghost text-xs hover:text-secondary-300 hover:bg-secondary-500/10"
                      >
                        <Activity className="w-3.5 h-3.5" /> Deep Dive Profile
                      </button>
                    </div>
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
