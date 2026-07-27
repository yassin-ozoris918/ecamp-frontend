import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('ar') ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`p-2 flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-500/50 
      bg-theme-card text-theme-muted hover:text-theme-text hover:bg-theme-secondary border border-theme-border
      ${className}`}
      aria-label="Toggle language"
      title={i18n.language.startsWith('ar') ? 'Switch to English' : 'التبديل للعربية'}
    >
      <Globe className="w-5 h-5" />
      <span className="sr-only">Toggle Language</span>
    </button>
  );
}
