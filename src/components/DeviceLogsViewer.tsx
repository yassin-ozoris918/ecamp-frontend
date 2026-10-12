import { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronDown,
  FileSpreadsheet,
  FileJson,
  Eye,
  Copy,
  Check,
  Loader2,
  KeyRound,
  Globe,
  User,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { Badge, EmptyState, Skeleton, SectionHeader, Button } from './ui';
import { Modal } from './Modal';

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
  rawHeaderDeviceId?: string | null;
  rawDtoDeviceId?: string | null;
  action: string;
  isMatch: boolean;
  ipAddress: string | null;
  browser: string | null;
}

interface DeviceLogStats {
  totalEvents: number;
  matchedLogins: number;
  mismatchLogins: number;
  dbHistoryEvents: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; variant: 'accent' | 'error' | 'warning' | 'secondary' }> = {
  LOGIN_OK:       { label: 'Login OK',          variant: 'accent' },
  LOGIN_MISMATCH: { label: 'Device Mismatch',   variant: 'error' },
  REGISTERED:     { label: 'Device Registered', variant: 'secondary' },
  RESET:          { label: 'Device Reset',       variant: 'warning' },
  REMOVED:        { label: 'Device Removed',     variant: 'warning' },
  REPLACED:       { label: 'Device Replaced',    variant: 'warning' },
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
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ─── Main Component ────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function DeviceLogsViewer() {
  const [items, setItems] = useState<DeviceLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DeviceLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Export State
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Inspector Modal State
  const [selectedEntry, setSelectedEntry] = useState<DeviceLogEntry | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      if (data.stats) {
        setStats(data.stats);
      }
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

  // ── Copy helper
  function copyToClipboard(val: string, fieldName: string) {
    navigator.clipboard.writeText(val);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ── Enhanced Export
  async function handleExport(
    format: 'csv' | 'json',
    scope: 'all' | 'filtered' | 'mismatch' | 'page' = 'all'
  ) {
    setShowExportMenu(false);
    setExportLoading(true);

    try {
      let exportItems: DeviceLogEntry[] = [];

      if (scope === 'page') {
        exportItems = items;
      } else {
        setExportStatus('Fetching all device records…');
        const params = new URLSearchParams({ all: 'true' });
        if (scope === 'mismatch' || (scope === 'filtered' && mismatchOnly)) {
          params.set('mismatchOnly', 'true');
        }
        if (scope === 'filtered' && search) {
          params.set('search', search);
        }

        const { data } = await api.get(`/admin/device-logs?${params.toString()}`);
        exportItems = data.items ?? [];
      }

      setExportStatus(`Preparing ${exportItems.length.toLocaleString()} records…`);

      const dateStr = new Date().toISOString().slice(0, 10);
      const filenameSuffix =
        scope === 'all'
          ? 'all-events'
          : scope === 'mismatch'
          ? 'mismatches-only'
          : scope === 'filtered'
          ? 'filtered-results'
          : `page-${page + 1}`;

      if (format === 'json') {
        // Complete un-adulterated raw JSON export
        const jsonStr = JSON.stringify(exportItems, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device-logs-${filenameSuffix}-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Complete CSV with all extracted fields
        const headers = [
          'Timestamp (UTC)',
          'Timestamp (Local)',
          'Source',
          'Action',
          'Match Status',
          'Student Name',
          'Student Email',
          'Student ID',
          'Received Device ID / Fingerprint',
          'Expected Device ID',
          'Header Device ID (x-device-id)',
          'DTO Body Device ID',
          'IP Address',
          'Browser / User Agent',
          'Log Entry ID',
        ];

        const rows = exportItems.map((e) => [
          e.timestamp,
          new Date(e.timestamp).toLocaleString(),
          e.source,
          e.action,
          e.isMatch ? 'MATCH' : 'MISMATCH',
          e.studentName ?? '',
          e.studentEmail ?? '',
          e.studentId ?? '',
          e.deviceFingerprint ?? '',
          e.expectedDevice ?? '',
          e.rawHeaderDeviceId ?? '',
          e.rawDtoDeviceId ?? '',
          e.ipAddress ?? '',
          e.browser ?? '',
          e.id,
        ]);

        // UTF-8 BOM (\uFEFF) ensures Arabic text and special symbols open correctly in Excel
        const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `device-logs-${filenameSuffix}-${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export device logs', err);
      alert('Failed to export device logs. Please try again.');
    } finally {
      setExportLoading(false);
      setExportStatus(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const mismatchCount = stats?.mismatchLogins ?? items.filter((e) => !e.isMatch).length;

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
          <div className="flex items-center gap-2">
            {/* Export Menu Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="secondary"
                size="sm"
                icon={
                  exportLoading ? (
                    <Loader2 className="w-4 h-4 text-gold-700 dark:text-gold-300 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-gold-700 dark:text-gold-300" />
                  )
                }
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={exportLoading}
              >
                {exportLoading ? (exportStatus ?? 'Exporting…') : 'Export Logs'}
                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
              </Button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl p-2 glass-strong shadow-2xl border border-white/10 z-50 animate-scale-in">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-theme-muted border-b border-theme-border/50">
                    Export Complete Dataset
                  </div>

                  {/* Export All CSV */}
                  <button
                    onClick={() => handleExport('csv', 'all')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] text-start transition-colors group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-theme-text group-hover:text-accent-400 transition-colors">
                        Export All Events (CSV)
                      </p>
                      <p className="text-[11px] text-theme-muted">
                        All {stats?.totalEvents ?? total} entries with all columns (UTF-8 Excel ready)
                      </p>
                    </div>
                  </button>

                  {/* Export All JSON */}
                  <button
                    onClick={() => handleExport('json', 'all')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] text-start transition-colors group"
                  >
                    <FileJson className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-theme-text group-hover:text-gold-400 transition-colors">
                        Export All Events (JSON)
                      </p>
                      <p className="text-[11px] text-theme-muted">
                        Raw payload data including un-truncated IDs and headers
                      </p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-theme-border/50" />

                  {/* Export Filtered CSV */}
                  {(search || mismatchOnly) && (
                    <button
                      onClick={() => handleExport('csv', 'filtered')}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] text-start transition-colors group"
                    >
                      <Filter className="w-4 h-4 text-secondary-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-theme-text group-hover:text-secondary-400 transition-colors">
                          Export Filtered View (CSV)
                        </p>
                        <p className="text-[11px] text-theme-muted">
                          Matches current search or filter criteria ({total} rows)
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Export Mismatches Only */}
                  <button
                    onClick={() => handleExport('csv', 'mismatch')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] text-start transition-colors group"
                  >
                    <ShieldAlert className="w-4 h-4 text-error-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-theme-text group-hover:text-error-400 transition-colors">
                        Export Mismatches Only (CSV)
                      </p>
                      <p className="text-[11px] text-theme-muted">
                        All {mismatchCount} failed student login attempts
                      </p>
                    </div>
                  </button>

                  {/* Export Current Page */}
                  <button
                    onClick={() => handleExport('csv', 'page')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] text-start transition-colors group"
                  >
                    <Download className="w-4 h-4 text-theme-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-theme-text transition-colors">
                        Export Current Page ({items.length} rows)
                      </p>
                      <p className="text-[11px] text-theme-muted">
                        Quick CSV of only the records on page {page + 1}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => fetchLogs()}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Database className="w-5 h-5" />}
          label="Total Events"
          value={stats?.totalEvents ?? total}
          color="text-accent-700 dark:text-accent-300"
          bg="bg-accent-500/10"
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Matched Logins"
          value={stats?.matchedLogins ?? items.filter((e) => e.isMatch && e.source === 'LOGIN_ATTEMPT').length}
          color="text-secondary-700 dark:text-secondary-300"
          bg="bg-secondary-500/10"
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5" />}
          label={stats ? "Total Mismatches" : "Mismatches (this page)"}
          value={mismatchCount}
          color="text-error-700 dark:text-error-300"
          bg="bg-error-500/10"
        />
        <SummaryCard
          icon={<Monitor className="w-5 h-5" />}
          label="DB History Events"
          value={stats?.dbHistoryEvents ?? items.filter((e) => e.source === 'DEVICE_HISTORY').length}
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
            placeholder="Search by email, name, IP, or device ID…"
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
                  <th className="p-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`transition-colors hover:bg-white/[0.03] cursor-pointer ${
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
                          <span className="text-[10px] text-error-400 flex items-center gap-1 font-mono">
                            <AlertCircle className="w-3 h-3 shrink-0" />
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

                    {/* Inspect button */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-theme-muted hover:text-accent-400 transition-colors"
                        title="Inspect Complete Data"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* ─── RECORD INSPECTION MODAL ─── */}
      <Modal
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title="Complete Device Log Inspection"
        description="Full diagnostic parameters and device fingerprint calculation breakdown."
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-5 text-sm">
            {/* Top Status Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                !selectedEntry.isMatch
                  ? 'bg-error-500/10 border-error-500/30'
                  : 'bg-accent-500/10 border-accent-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {!selectedEntry.isMatch ? (
                  <div className="w-10 h-10 rounded-xl bg-error-500/20 text-error-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-accent-500/20 text-accent-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-theme-text">
                      {selectedEntry.isMatch ? 'Login Device Verified' : 'Device Mismatch Detected'}
                    </span>
                    <ActionBadge action={selectedEntry.action} />
                  </div>
                  <p className="text-xs text-theme-muted mt-0.5">
                    Source:{' '}
                    <span className="font-semibold text-theme-text">
                      {selectedEntry.source === 'LOGIN_ATTEMPT' ? 'device-issues.log' : 'Database (DeviceHistory)'}
                    </span>{' '}
                    • {new Date(selectedEntry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-xs text-theme-muted font-mono">
                UTC: {selectedEntry.timestamp}
              </div>
            </div>

            {/* Student Card */}
            <div className="glass p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-muted">
                <User className="w-4 h-4 text-accent-400" />
                Student Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-theme-muted">Full Name</p>
                  <p className="font-semibold text-theme-text text-base mt-0.5">
                    {selectedEntry.studentName || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-theme-muted">Email</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono text-xs text-theme-text truncate">
                      {selectedEntry.studentEmail || '—'}
                    </p>
                    {selectedEntry.studentEmail && (
                      <button
                        onClick={() => copyToClipboard(selectedEntry.studentEmail!, 'email')}
                        className="text-theme-muted hover:text-theme-text"
                        title="Copy Email"
                      >
                        {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-secondary-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-theme-muted">Student User ID</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono text-xs text-theme-muted truncate">
                      {selectedEntry.studentId || '—'}
                    </p>
                    {selectedEntry.studentId && (
                      <button
                        onClick={() => copyToClipboard(selectedEntry.studentId!, 'studentId')}
                        className="text-theme-muted hover:text-theme-text"
                        title="Copy Student ID"
                      >
                        {copiedField === 'studentId' ? <Check className="w-3.5 h-3.5 text-secondary-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Device ID Comparison & Calculation Breakdown */}
            <div className="glass p-4 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-muted">
                  <KeyRound className="w-4 h-4 text-gold-400" />
                  Device Identity Breakdown
                </div>
                <span className="text-[11px] font-mono text-theme-muted">
                  Calculation: Persistent UUID in localStorage
                </span>
              </div>

              <div className="space-y-3">
                {/* Received Device ID */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                      Received Device ID (Fingerprint from Client)
                      {selectedEntry.isMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-secondary-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-error-400" />
                      )}
                    </span>
                    {selectedEntry.deviceFingerprint && (
                      <button
                        onClick={() => copyToClipboard(selectedEntry.deviceFingerprint!, 'received')}
                        className="flex items-center gap-1 text-[11px] text-accent-400 hover:underline font-mono"
                      >
                        {copiedField === 'received' ? <Check className="w-3 h-3 text-secondary-400" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'received' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <code className="block p-2 rounded-lg bg-black/40 text-accent-300 font-mono text-xs break-all select-all">
                    {selectedEntry.deviceFingerprint || '—'}
                  </code>
                </div>

                {/* Expected Device ID */}
                {selectedEntry.expectedDevice && (
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedEntry.isMatch
                        ? 'bg-white/[0.02] border-white/5'
                        : 'bg-error-500/5 border-error-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                        Expected Device ID (Bound in Database)
                        {!selectedEntry.isMatch && (
                          <span className="text-[10px] text-error-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-error-500/10">
                            Mismatch
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedEntry.expectedDevice!, 'expected')}
                        className="flex items-center gap-1 text-[11px] text-gold-400 hover:underline font-mono"
                      >
                        {copiedField === 'expected' ? <Check className="w-3 h-3 text-secondary-400" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'expected' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code
                      className={`block p-2 rounded-lg font-mono text-xs break-all select-all ${
                        selectedEntry.isMatch
                          ? 'bg-black/40 text-theme-muted'
                          : 'bg-black/40 text-error-300 border border-error-500/20'
                      }`}
                    >
                      {selectedEntry.expectedDevice}
                    </code>
                  </div>
                )}

                {/* Transport Headers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[11px] text-theme-muted block mb-0.5">
                      HTTP Header: <code className="text-theme-text">x-device-id</code>
                    </span>
                    <span className="font-mono text-theme-text break-all text-[11px]">
                      {selectedEntry.rawHeaderDeviceId || selectedEntry.deviceFingerprint || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[11px] text-theme-muted block mb-0.5">
                      Request Body: <code className="text-theme-text">dto.deviceId</code>
                    </span>
                    <span className="font-mono text-theme-text break-all text-[11px]">
                      {selectedEntry.rawDtoDeviceId || '—'}
                    </span>
                  </div>
                </div>

                {/* Why did this happen explanation */}
                {!selectedEntry.isMatch && (
                  <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 text-xs text-warning-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-warning-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-warning-300">Why did this mismatch occur?</p>
                      <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">
                        The device ID is generated client-side via <code className="font-mono text-warning-100">crypto.randomUUID()</code> and stored permanently in browser <code className="font-mono text-warning-100">localStorage</code>. When a student logs in from a different browser, uses Private/Incognito mode, opens the link inside an In-App browser (Instagram, Facebook, Telegram), or clears website data, a new UUID is generated which triggers a device mismatch.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Network & Browser Client Metadata */}
            <div className="glass p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-muted">
                <Globe className="w-4 h-4 text-secondary-400" />
                Network & Browser Client
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-theme-muted">IP Address:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-theme-text">{selectedEntry.ipAddress || '—'}</span>
                    {selectedEntry.ipAddress && (
                      <button
                        onClick={() => copyToClipboard(selectedEntry.ipAddress!, 'ip')}
                        className="text-theme-muted hover:text-theme-text"
                        title="Copy IP"
                      >
                        {copiedField === 'ip' ? <Check className="w-3.5 h-3.5 text-secondary-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-theme-muted block mb-1">Full Browser User Agent:</span>
                  <div className="p-2.5 rounded-xl bg-black/40 font-mono text-[11px] text-theme-muted break-all leading-relaxed select-all">
                    {selectedEntry.browser || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Raw JSON Block */}
            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border/50">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(JSON.stringify(selectedEntry, null, 2), 'rawJson');
                }}
                className="btn btn-secondary text-xs flex items-center gap-2"
              >
                {copiedField === 'rawJson' ? <Check className="w-3.5 h-3.5 text-secondary-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === 'rawJson' ? 'JSON Copied' : 'Copy Raw Event JSON'}
              </button>
            </div>
          </div>
        )}
      </Modal>
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
        <p className="text-2xl font-display font-bold text-theme-text">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-theme-muted">{label}</p>
      </div>
    </div>
  );
}
