import React, { useState, useEffect } from 'react';
import { Users, User, ShieldAlert, BookOpen, Search, RefreshCw, X, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton, EmptyState } from './ui';

export function Student360Workspace() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Just basic fetching for the table list
      const { data } = await api.get('/admin/users?role=STUDENT&take=100');
      setStudents(data.items || data);
    } catch (e) {
      console.error(e);
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
        const { data } = await api.get(`/admin/students/${selectedStudentId}/360-profile`);
        setProfileData(data);
      } catch (e) {
        console.error(e);
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, [selectedStudentId]);

  const handleResetDevice = async () => {
    if (!selectedStudentId) return;
    if (!window.confirm("Confirm device lock reset?")) return;
    try {
      await api.post(`/admin/users/${selectedStudentId}/reset-device`);
      alert("Device reset successfully");
      // Refresh profile
      const { data } = await api.get(`/admin/students/${selectedStudentId}/360-profile`);
      setProfileData(data);
    } catch(e) {
      console.error(e);
      alert("Failed to reset device");
    }
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-up flex gap-6 h-[calc(100vh-140px)]">
      
      {/* Left Panel: Student Directory */}
      <div className={`flex flex-col gap-4 ${selectedStudentId ? 'w-1/3' : 'w-full'} transition-all duration-300`}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <User className="w-7 h-7 text-accent-300" />
              Student 360
            </h1>
            {!selectedStudentId && <p className="text-sm text-neutral-400 mt-1">Comprehensive student lookup and management.</p>}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:border-accent-400 text-white ${selectedStudentId ? 'w-full' : 'w-64'}`}
            />
          </div>
        </div>

        <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4"><Skeleton className="h-40" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No students found" />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/[0.04]">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-3 ${selectedStudentId === s.id ? 'bg-white/[0.04] border-l-4 border-accent-400' : 'border-l-4 border-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-base-950 font-bold">
                    {s.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{s.fullName}</p>
                    <p className="text-xs text-neutral-400 truncate">{s.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Student 360 Drawer */}
      {selectedStudentId && (
        <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden animate-fade-in relative border border-white/[0.08]">
          <button onClick={() => setSelectedStudentId(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-white z-10">
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
                 <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-base-950 font-bold text-3xl shrink-0">
                    {profileData.fullName.charAt(0).toUpperCase()}
                 </div>
                 <div className="flex-1">
                   <h2 className="text-2xl font-display font-bold text-white">{profileData.fullName}</h2>
                   <p className="text-neutral-400 text-sm mb-2">{profileData.email} • {profileData.educationLevel}</p>
                   
                   <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant={profileData.isActive ? 'success' : 'error'}>
                        {profileData.isActive ? 'Active Account' : 'Suspended'}
                      </Badge>
                      <Badge variant="gold">XP: {profileData.xp || 0}</Badge>
                      {profileData.riskProfile?.isAtRisk && (
                        <Badge variant="error" className="animate-pulse">At Risk</Badge>
                      )}
                      {profileData.deviceId ? (
                        <Badge variant="default">Device Bound</Badge>
                      ) : (
                        <Badge variant="warning">No Device</Badge>
                      )}
                   </div>
                 </div>
                 
                 <div>
                    <button 
                      disabled={!profileData.deviceId} 
                      onClick={handleResetDevice}
                      className="btn-danger text-xs py-1.5 px-3 whitespace-nowrap"
                    >
                       <Smartphone className="w-3.5 h-3.5" /> Reset Device Lock
                    </button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {/* Risk Profile */}
                 <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04]">
                    <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <ShieldAlert className="w-4 h-4 text-error-400" /> Academic Risk Status
                    </h3>
                    {profileData.riskProfile ? (
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-neutral-400">Consecutive Failures:</span>
                             <span className="font-mono text-white">{profileData.riskProfile.consecutiveFailures}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-neutral-400">Running Average:</span>
                             <span className="font-mono text-white">{profileData.riskProfile.runningAverageScore.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                             <span className="text-neutral-400">Status:</span>
                             {profileData.riskProfile.isAtRisk ? 
                               <span className="text-error-400 font-bold">Flagged</span> : 
                               <span className="text-success-400 font-bold">Clear</span>}
                          </div>
                       </div>
                    ) : (
                       <p className="text-sm text-neutral-500">No risk profile generated yet.</p>
                    )}
                 </div>

                 {/* Recent Parent Logs */}
                 <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04]">
                    <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <User className="w-4 h-4 text-secondary-400" /> Parent Notifications
                    </h3>
                    {profileData.parentLogs?.length > 0 ? (
                       <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin pr-2">
                          {profileData.parentLogs.map((log: any) => (
                             <div key={log.id} className="text-xs border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
                                <div className="flex justify-between mb-1">
                                   <span className="text-white">{log.eventCategory}</span>
                                   <span className={`font-semibold ${log.deliveryStatus === 'DELIVERED' ? 'text-success-400' : 'text-error-400'}`}>
                                     {log.deliveryStatus}
                                   </span>
                                </div>
                                <div className="text-neutral-500">{new Date(log.dispatchedAt).toLocaleString()} via {log.channelType}</div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <p className="text-sm text-neutral-500">No parent notifications sent.</p>
                    )}
                 </div>
              </div>
              
              {/* Access & History */}
              <div className="glass bg-black/20 rounded-xl p-5 border border-white/[0.04]">
                 <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent-400" /> Recent Lecture Access
                 </h3>
                 {profileData.accessedLectures?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {profileData.accessedLectures.map((acc: any) => (
                          <div key={acc.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col gap-1">
                             <p className="text-sm text-white font-medium truncate" title={acc.lecture.title}>{acc.lecture.title}</p>
                             <div className="flex justify-between items-center mt-2">
                                <Badge variant={acc.expiresAt && new Date(acc.expiresAt) < new Date() ? 'error' : 'success'} className="text-[10px]">
                                   {acc.expiresAt && new Date(acc.expiresAt) < new Date() ? 'Expired' : 'Active'}
                                </Badge>
                                {acc.expiresAt && new Date(acc.expiresAt) > new Date() && (
                                   <span className="text-xs text-neutral-500 font-mono">
                                     Ends {new Date(acc.expiresAt).toLocaleDateString()}
                                   </span>
                                )}
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <p className="text-sm text-neutral-500">No content accessed.</p>
                 )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
