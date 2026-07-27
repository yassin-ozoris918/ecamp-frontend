import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-500/50 ${
        theme === 'dark' 
          ? 'bg-theme-card text-theme-muted hover:text-white hover:bg-white/10' 
          : 'bg-white shadow-sm text-slate-500 hover:text-slate-900 border border-slate-200'
      } ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
