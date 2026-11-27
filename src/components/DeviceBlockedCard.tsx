import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Laptop, MessageSquare, Smartphone, Tablet } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthError } from '../lib/auth';

const SUPPORT_WHATSAPP = '201221822703';

/** Plain device name for the student: "your Windows computer (Intel Iris Xe Graphics)", "your iPhone". */
export function useDeviceName() {
  const { t } = useTranslation();
  return (kind?: string, label?: string | null) => {
    if (!label && (!kind || kind === 'unknown')) return t('deviceBlock.kind.registered');
    const base = t(`deviceBlock.kind.${kind || 'unknown'}`, { defaultValue: label || t('deviceBlock.kind.registered') });
    const detail = label?.includes('·') ? label.split('·').slice(1).join('·').trim() : '';
    return detail ? `${base} (${detail})` : base;
  };
}

function DeviceIcon({ kind, className = 'w-5 h-5' }: { kind?: string; className?: string }) {
  if (kind === 'iphone' || kind === 'android_phone') return <Smartphone className={className} />;
  if (kind === 'ipad' || kind === 'android_tablet') return <Tablet className={className} />;
  return <Laptop className={className} />;
}

/**
 * Shown when a student signs in from a device that isn't the one linked to their account.
 * One clear sentence, which device to use instead, and a one-tap request to switch devices.
 */
export function DeviceBlockedCard({ error, email }: { error: AuthError; email?: string }) {
  const { t, i18n } = useTranslation();
  const deviceName = useDeviceName();
  const reg = error.registeredDevice;
  const [pending, setPending] = useState(Boolean(error.pendingRequest));
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const name = deviceName(reg?.kind, reg?.label);
  const since = reg?.since ? new Date(reg.since).toLocaleDateString(i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const needsApproval = error.deviceReason === 'needs_approval';

  const send = async () => {
    if (!error.changeToken) return;
    setBusy(true);
    setFailed(null);
    try {
      await api.post('/devices/change-request', { changeToken: error.changeToken, note: note.trim() || undefined });
      setPending(true);
      setOpen(false);
    } catch (e: any) {
      setFailed(e?.response?.status === 403 ? t('deviceBlock.expired') : t('deviceBlock.sendFailed'));
    }
    setBusy(false);
  };

  const wa = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(t('deviceBlock.whatsappText', { email: email || '-', device: name }))}`;

  return (
    <div className="mb-5 rounded-2xl border border-warning-500/30 bg-warning-500/5 p-4 sm:p-5 space-y-4 text-theme-text">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-warning-500/15 text-warning-700 dark:text-warning-300 flex items-center justify-center shrink-0">
          <DeviceIcon kind={reg?.kind} />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="font-semibold leading-snug">{t('deviceBlock.title')}</p>
          <p className="text-sm text-theme-muted leading-relaxed">
            {needsApproval ? t('deviceBlock.tooManyBrowsers') : t('deviceBlock.useDevice', { device: name })}
            {since && !needsApproval && <span className="block text-xs mt-1">{t('deviceBlock.linkedOn', { date: since })}</span>}
          </p>
        </div>
      </div>

      {pending ? (
        <div className="flex items-start gap-2 rounded-xl bg-accent-500/10 p-3 text-sm text-accent-700 dark:text-accent-200">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('deviceBlock.pending')}</span>
        </div>
      ) : open ? (
        <div className="space-y-2">
          <textarea
            dir="auto"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('deviceBlock.notePlaceholder')}
            className="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm focus:outline-none focus:border-accent-400"
          />
          {failed && <p className="text-xs text-error-500">{failed}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={send} disabled={busy} className="btn-primary flex-1 justify-center !py-2.5">
              {busy ? t('deviceBlock.sending') : t('deviceBlock.send')}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-2.5">
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          {error.changeToken && (
            <button type="button" onClick={() => setOpen(true)} className="btn-primary flex-1 justify-center !py-2.5">
              {t('deviceBlock.request')}
            </button>
          )}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 justify-center !py-2.5">
            <MessageSquare className="w-4 h-4" />
            {t('deviceBlock.whatsapp')}
          </a>
        </div>
      )}

      {pending && (
        <p className="flex items-center gap-1.5 text-xs text-theme-muted">
          <CheckCircle2 className="w-3.5 h-3.5 text-secondary-600" />
          {t('deviceBlock.pendingHint')}
        </p>
      )}
    </div>
  );
}
