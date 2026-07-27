import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Download, Database } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton, EmptyState } from './ui';

export function SystemAuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/audit-logs?take=100');
      setLogs(data.data || data); 
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
      const response = await api.get('/admin/analytics/export', { responseType: 'blob' });
      // The backend returns a text/csv stream
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'analytics_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Database className="w-7 h-7 text-accent-400" />
            System Audit & Analytics
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Immutable global operation ledger and platform data exports.</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleExportCSV} className="btn-secondary">
             <Download className="w-4 h-4 text-gold-300" /> Export Analytics CSV
          </button>
          <button onClick={fetchLogs} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : logs.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} title="No Logs" description="No system audit logs found." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-neutral-500 border-b border-white/[0.06]">
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
                  <td className="p-4 text-neutral-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{log.actor?.fullName || log.actorId}</span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{log.actor?.role}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={log.actionType.includes('FAILED') ? 'error' : 'accent'} className="text-[10px] tracking-wider whitespace-nowrap">
                      {log.actionType}
                    </Badge>
                  </td>
                  <td className="p-4 text-neutral-400 font-mono text-xs">
                    {log.ipAddress || '—'}
                  </td>
                  <td className="p-4">
                    <div className="max-w-xs max-h-20 overflow-y-auto scrollbar-thin text-xs text-neutral-300 font-mono bg-black/30 p-2 rounded border border-white/[0.04]">
                      {log.payload}
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
