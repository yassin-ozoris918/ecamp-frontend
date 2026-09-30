import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Monitor,
  AlertCircle,
  Database,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge, EmptyState, Skeleton, SectionHeader, Button } from './ui';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DeviceLogEntry {
  id: string;
  source: 'LOGIN_ATTEMPT' | 'DEVICE_HISTORY';
  timestamp: string;
  studentId: string | null;
  studentEmail: string | null;
  studentName: string | null;
  deviceFingerprint: string | null;
  expectedDevice: string | null;
  action: string;
  isMatch: boolean;
  ipAddress: string | null;
  browser: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; variant: 'accent' | 'error' | 'warning' | 'secondary' }> = {
  LOGIN_OK:       { label: 'Login OK',         variant: 'accent' },
  LOGIN_MISMATCH: { label: 'Device Mismatch',  variant: 'error' },
  REGISTERED:     { label: 'Device Registered', variant: 'secondary' },
  RESET:          { label: 'Device Reset',      variant: 'warning' },
  REMOVED:        { label: 'Device Removed',    variant: 'warning' },
  REPLACED:       { label: 'Device Replaced',   variant: 'warning' },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, variant: 'accent' as const };
  return <Badge variant={cfg.variant} className="text-[10px] tracking-wider whitespace-nowrap">{cfg.label}</Badge>;
}

function truncate(str: string | null | undefined, len = 20): string {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function csvEscape(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ─── Main Component ────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function DeviceLogsViewer() {
  const [items, setItems] = useState<DeviceLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async (opts?: { searchVal?: string; mismatch?: boolean; pageNum?: number }) => {
    setLoading(true);
    try {
      const s = opts?.searchVal ?? search;
      const m = opts?.mismatch ?? mismatchOnly;
      const p = opts?.pageNum ?? page;
      const params = new URLSearchParams({
        search: s,
        mismatchOnly: String(m),
        skip: String(p * PAGE_SIZE),
        take: String(PAGE_SIZE),
      });
      const { data } = await api.get(`/admin/device-logs?${params.toString()}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch device logs', e);
    }
    setLoading(false);
  }, [search, mismatchOnly, page]);

  useEffect(() => { fetchLogs(); }, []);

  // ── filter handlers
  function handleSearch(val: string) {
    setSearch(val);
    setPage(0);
    fetchLogs({ searchVal: val, pageNum: 0 });
  }

  function handleMismatchToggle() {
    const next = !mismatchOnly;
    setMismatchOnly(next);
    setPage(0);
    fetchLogs({ mismatch: next, pageNum: 0 });
  }

  function handlePage(delta: number) {
    const next = page + delta;
    setPage(next);
    fetchLogs({ pageNum: next });
  }

  // ── CSV export
  function handleExport() {
    const headers = ['Timestamp', 'Source', 'Action', 'Student Name', 'Student Email', 'Student ID', 'Device Fingerprint', 'Expected Device', 'IP Address', 'Browser'];
    const rows = items.map(e => [
      e.timestamp,
      e.source,
      e.action,
      e.studentName,
      e.studentEmail,
      e.studentId,
      e.deviceFingerprint,
      e.expectedDevice,
      e.ipAddress,
      e.browser,
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const mismatchCount = items.filter(e => !e.isMatch).length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <SectionHeader
        title={
          <span className="flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-accent-400" />
            Device Login Logs
          </span>
        }
        subtitle="Merged view of all student login attempts from device-issues.log and the DeviceHistory database."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4 text-gold-700 dark:text-gold-300" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => fetchLogs()}
            >
              Refresh
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Database className="w-5 h-5" />}
          label="Total Events"
          value={total}
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Matched Logins"
          value={items.filter(e => e.isMatch && e.source === 'LOGIN_ATTEMPT').length}
          color="text-secondary-700 dark:text-secondary-300"
          bg="bg-secondary-500/10"
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5" />}
          label="Mismatches (this page)"
          value={mismatchCount}
          color="text-error-700 dark:text-error-300"
          bg="bg-error-500/10"
        />
        <SummaryCard
          icon={<Monitor className="w-5 h-5" />}
          label="DB History Events"
          value={items.filter(e => e.source === 'DEVICE_HISTORY').length}
          color="text-gold-700 dark:text-gold-300"
          bg="bg-gold-500/10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted pointer-events-none" />
          <input
            className="input pl-9 w-full text-sm"
            placeholder="Search by email, name, or device ID…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <button
          onClick={handleMismatchToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            mismatchOnly
              ? 'bg-error-500/15 border-error-500/40 text-error-400'
              : 'bg-theme-card border-theme-border text-theme-muted hover:border-error-500/40'
          }`}
        >
          <Filter className="w-4 h-4" />
          Mismatches only
          {mismatchOnly && <XCircle className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8" />}
          title="No Device Logs"
          description="No entries match the current filters."
        />
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-theme-muted border-b border-theme-border">
                  <th className="p-4 text-start">Timestamp</th>
                  <th className="p-4 text-start">Source</th>
                  <th className="p-4 text-start">Action</th>
                  <th className="p-4 text-start">Student</th>
                  <th className="p-4 text-start">Device ID</th>
                  <th className="p-4 text-start">IP Address</th>
                  <th className="p-4 text-start">Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      !entry.isMatch ? 'bg-error-500/5' : ''
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="p-4 text-theme-muted whitespace-nowrap text-xs font-mono">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>

                    {/* Source badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        entry.source === 'LOGIN_ATTEMPT'
                          ? 'border-accent-500/30 text-accent-400 bg-accent-500/10'
                          : 'border-gold-500/30 text-gold-400 bg-gold-500/10'
                      }`}>
                        {entry.source === 'LOGIN_ATTEMPT' ? <Smartphone className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                        {entry.source === 'LOGIN_ATTEMPT' ? 'Log File' : 'Database'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4">
                      <ActionBadge action={entry.action} />
                    </td>

                    {/* Student */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-theme-text text-sm">
                          {entry.studentName || '—'}
                        </span>
                        <span className="text-[11px] text-theme-muted font-mono">
                          {entry.studentEmail || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Device fingerprint */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          title={entry.deviceFingerprint ?? ''}
                          className="text-xs font-mono text-theme-muted"
                        >
                          {truncate(entry.deviceFingerprint, 24)}
                        </span>
                        {entry.expectedDevice && entry.expectedDevice !== entry.deviceFingerprint && (
                          <span className="text-[10px] text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Expected: {truncate(entry.expectedDevice, 20)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* IP */}
                    <td className="p-4 text-theme-muted text-xs font-mono whitespace-nowrap">
                      {entry.ipAddress || '—'}
                    </td>

                    {/* Browser */}
                    <td className="p-4 text-theme-muted text-xs max-w-[180px] truncate" title={entry.browser ?? ''}>
                      {entry.browser || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-theme-muted">
              <span>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} events
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePage(-1)}
                  disabled={page === 0}
                  className="p-2 rounded-lg hover:bg-theme-card disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => handlePage(1)}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg hover:bg-theme-card disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-theme-text">{value}</p>
        <p className="text-xs text-theme-muted">{label}</p>
      </div>
    </div>
  );
}
