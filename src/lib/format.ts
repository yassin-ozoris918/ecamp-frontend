import type { TFunction } from 'i18next';

/** "41 min" / "1 h 05 min" for a total length in seconds. */
export function formatLength(seconds: number, t: TFunction): string {
  const totalMin = Math.max(1, Math.round((seconds || 0) / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? t('time.durHourMin', { h, m: String(m).padStart(2, '0') }) : t('time.durMin', { m: totalMin });
}

export interface TimeLeft {
  ms: number;
  label: string;
  /** < 24 h left */
  urgent: boolean;
  ended: boolean;
}

/** Compact "time left" until a date: "3d 4h", "5h 20m", "12m". */
export function timeLeft(until: string | Date | null | undefined, t: TFunction, now = Date.now()): TimeLeft | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return { ms, label: t('time.ended'), urgent: true, ended: true };
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.max(1, Math.floor((ms % 3_600_000) / 60_000));
  const label = d > 0 ? t('time.dh', { d, h }) : h > 0 ? t('time.hm', { h, m }) : t('time.m', { m });
  return { ms, label, urgent: ms < 86_400_000, ended: false };
}

/** "5 Mar 2027" in the current UI language. */
export function formatDate(value: string | Date | null | undefined, lang: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(lang?.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function percent(done: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}
