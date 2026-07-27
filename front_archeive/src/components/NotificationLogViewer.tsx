import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton, EmptyState } from './ui';

export function NotificationLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/notifications/logs?take=100');
      setLogs(data.data || data); // handle standard or paginated responses
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</Badge>;
      case 'FAILED':
        return <Badge variant="error" className="gap-1"><AlertTriangle className="w-3 h-3" /> Failed</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-secondary-400" />
            Parent Notification Ledger
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Immutable tracking of all dispatch events sent to parents regarding student academic performance.</p>
        </div>
        <div>
          <button onClick={fetchLogs} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : logs.length === 0 ? (
        <EmptyState icon={<MessageSquare className="w-8 h-8" />} title="No Logs" description="No parent notifications have been dispatched yet." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
                <th className="p-4 text-start">Timestamp</th>
                <th className="p-4 text-start">Student</th>
                <th className="p-4 text-start">Category</th>
                <th className="p-4 text-start">Channel & Target</th>
                <th className="p-4 text-start">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 text-neutral-400">
                    {new Date(log.dispatchedAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-medium text-white">
                    {log.student?.fullName || log.studentId}
                  </td>
                  <td className="p-4">
                    <Badge variant="default" className="text-[10px] tracking-wider">{log.eventCategory}</Badge>
                  </td>
                  <td className="p-4 text-neutral-300 font-mono text-xs">
                    {log.channelType} ➔ {log.parentPhoneNumber}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(log.deliveryStatus)}
                      {log.errorNote && (
                        <span className="text-[10px] text-error-400 max-w-[200px] truncate" title={log.errorNote}>
                          {log.errorNote}
                        </span>
                      )}
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
