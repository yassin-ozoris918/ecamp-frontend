import { Wrench, Phone, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MaintenanceNoticeProps {
  onCheckStatus?: () => void;
}

export function MaintenanceNotice({ onCheckStatus }: MaintenanceNoticeProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-up">
      <div className="w-24 h-24 bg-accent-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(var(--color-accent-500),0.2)]">
        <Wrench className="w-12 h-12 text-accent-500 animate-pulse" />
      </div>
      
      <h2 className="text-3xl font-display font-bold text-theme-text mb-4">
        {t('maintenance.title')}
      </h2>
      
      <p className="text-theme-muted text-lg mb-8 max-w-md leading-relaxed">
        {t('maintenance.message')}
      </p>

      <div className="bg-theme-secondary border border-theme-border rounded-xl p-5 w-full max-w-sm mb-6 flex items-start gap-4 text-left">
        <Phone className="w-6 h-6 text-theme-muted shrink-0 mt-1" />
        <p className="text-sm text-theme-muted leading-relaxed">
          {t('maintenance.support')}
        </p>
      </div>

      {onCheckStatus && (
        <button
          onClick={onCheckStatus}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-theme-secondary hover:bg-theme-border text-theme-text rounded-xl font-semibold transition-all border border-theme-border shadow-sm w-full max-w-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          {t('maintenance.checkStatus')}
        </button>
      )}
    </div>
  );
}
