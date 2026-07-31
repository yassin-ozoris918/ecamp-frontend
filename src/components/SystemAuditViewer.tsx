import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Download, Database } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton, EmptyState, Button, SectionHeader } from './ui';

export function SystemAuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/audit-logs?take=100');
      setLogs(data.items || data.data || data); 
    } catch (e) {
      console.error('Failed to fetch audit logs', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportCSV = async () => {
    try {
      // FIX: Use the real POST /admin/export endpoint instead of non-existent GET /admin/analytics/export
      const response = await api.post(
        '/admin/export',
        { entity: 'audit-logs', format: 'csv' },
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed', e);
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <SectionHeader
        title={
          <span className="flex items-center gap-2"><Database className="w-7 h-7 text-accent-400" /> System Audit & Analytics</span>
        }
        subtitle="Immutable global operation ledger and platform data exports."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4 text-gold-700 dark:text-gold-300" />} onClick={handleExportCSV}>
              Export Analytics CSV
            </Button>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchLogs}>
              Refresh
            </Button>
          </>
        }
      />

      {loading ? (
        <Skeleton className="h-96" />
      ) : logs.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} title="No Logs" description="No system audit logs found." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                <th className="p-4 text-start">Timestamp</th>
                <th className="p-4 text-start">Actor</th>
                <th className="p-4 text-start">Action</th>
                <th className="p-4 text-start">IP Address</th>
                <th className="p-4 text-start">Payload (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-theme-muted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-theme-text">{log.actor?.fullName || log.actorId || log.user?.fullName || log.userId || '—'}</span>
                      <span className="text-[10px] text-theme-muted uppercase tracking-wider">{log.actor?.email || log.user?.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={(log.action || log.actionType || '').includes('FAILED') ? 'error' : 'accent'} className="text-[10px] tracking-wider whitespace-nowrap">
                      {log.action || log.actionType || '—'}
                    </Badge>
                  </td>
                  <td className="p-4 text-theme-muted font-mono text-xs">
                    {log.entity || '—'}
                  </td>
                  <td className="p-4">
                    <div className="max-w-xs max-h-20 overflow-y-auto scrollbar-thin text-xs text-theme-muted font-mono bg-black/30 p-2 rounded border border-white/[0.04]">
                      {log.details || log.payload || '—'}
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
