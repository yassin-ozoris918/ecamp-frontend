import { Cpu, ShieldCheck, Code, Sparkles, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AboutPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutPlatformModal({ isOpen, onClose }: AboutPlatformModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-theme-border bg-theme-bg shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-accent-500/10 via-theme-card to-secondary-500/10 border-b border-theme-border flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 flex items-center justify-center text-white shadow-glow">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge bg-accent-500/20 text-accent-700 dark:text-accent-300 border border-accent-500/30 text-[10px] font-mono">
                  v2.5.0 Enterprise Build
                </span>
                <span className="badge bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 me-1" />
                  {t('about.status')}
                </span>
              </div>
              <h2 className="text-2xl font-display font-extrabold text-theme-text mt-1">
                {t('about.title')}
              </h2>
              <p className="text-xs text-theme-muted mt-0.5">
                {t('about.subtitle')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* Lead Engineer Card */}
          <div className="relative overflow-hidden rounded-2xl border border-accent-500/30 bg-gradient-to-r from-accent-500/10 via-theme-card to-accent-600/5 p-6 shadow-sm space-y-4">
            <div className="absolute -end-10 -bottom-10 w-40 h-40 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent-500 to-secondary-500 p-0.5 shadow-lg shrink-0">
                <div className="w-full h-full rounded-full bg-theme-bg flex items-center justify-center text-accent-700 dark:text-accent-300 font-bold font-display text-xl">
                  YO
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest text-accent-700 dark:text-accent-300 font-semibold mb-0.5">
                  {t('about.leadEngineer')}
                </p>
                <h3 className="text-2xl font-display font-bold text-theme-text truncate">
                  {t('about.engineerName')}
                </h3>
                <p className="text-sm text-theme-muted mt-0.5">
                  {t('about.engineerTitle')}
                </p>
              </div>
            </div>

            {/* Contact & Social Action Buttons */}
            <div className="pt-3 border-t border-theme-border/40 flex flex-wrap gap-2.5 relative z-10">
              <a
                href="https://wa.me/201221822703"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                <span>💬 WhatsApp: 01221822703</span>
              </a>
              <a
                href="https://www.linkedin.com/in/yassin-ozoris-4a24b729a/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600/10 text-sky-600 dark:text-sky-300 border border-sky-600/20 hover:bg-sky-600/20 transition-colors"
              >
                <span>💼 LinkedIn Profile</span>
              </a>
              <a
                href="mailto:yassinozoris918@gmail.com"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-500/20 hover:bg-accent-500/20 transition-colors"
              >
                <span>✉️ yassinozoris918@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Tech Stack & Architecture Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Core Tech Stack */}
            <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-accent-700 dark:text-accent-300 font-bold text-sm">
                <Code className="w-4 h-4" />
                <span>{t('about.techStack')}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['React 18', 'TypeScript', 'NestJS', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Cloudflare R2'].map((tech) => (
                  <span key={tech} className="px-2.5 py-1 rounded-lg bg-theme-secondary text-theme-text font-mono text-[11px] border border-theme-border">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Security & AI */}
            <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-gold-700 dark:text-gold-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>{t('about.security')}</span>
              </div>
              <p className="text-xs text-theme-muted leading-relaxed">
                {t('about.securityDesc')}
              </p>
            </div>

          </div>

          {/* Platform Vision Note */}
          <div className="rounded-2xl border border-theme-border/60 bg-theme-secondary/40 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent-700 dark:text-accent-300 shrink-0" />
            <p className="text-xs text-theme-muted leading-relaxed">
              {t('about.visionNote')}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:px-8 border-t border-theme-border bg-theme-card flex items-center justify-between">
          <p className="text-xs text-theme-muted font-mono">
            {t('about.rights')}
          </p>
          <button onClick={onClose} className="btn-primary py-2 px-6 text-xs">
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
