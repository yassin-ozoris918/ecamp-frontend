import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  LayoutGrid,
  LayoutDashboard,
  Trophy,
  BarChart3,
  Users,
  KeyRound,
  Shield,
  BookOpen,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Flame,
  Star,
  ChevronRight,
  MessageCircle,
  Compass,
  UserCircle2,
  Search,
  UserPlus,
  UserCog,
  Contact,
  HelpCircle,
  Eye,
  ShieldAlert,
  Smartphone,
  Database,
  FileCheck2,
  Bot,
} from 'lucide-react';
import { SupportChat } from './support/SupportChat';
import { useAdminAttention, type AdminAttention } from '../lib/adminAttention';
import { CommandPalette, type PaletteEntry } from './admin/CommandPalette';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/authContext';
import type { UserRole } from '../lib/types';
import { ThemeToggle } from './common/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from './common/LanguageToggle';
import { AboutPlatformModal } from './AboutPlatformModal';
import { NotificationBell } from './NotificationBell';
import { EcampLogo } from './common/EcampLogo';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Admin: show a counter from /admin/attention next to the item. */
  badge?: keyof AdminAttention;
}

interface NavGroup {
  /** i18n key; omitted for the top group. */
  label?: string;
  items: NavItem[];
}

/**
 * Admin navigation: every admin page one click away, grouped by job. (Previously most pages were
 * only reachable through cards on the dashboard.)
 */
const ADMIN_GROUPS: NavGroup[] = [
  { items: [{ to: '/admin', label: 'nav.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }] },
  {
    label: 'adminNav.people',
    items: [
      { to: '/admin/users', label: 'adminNav.users', icon: <Users className="w-4 h-4" /> },
      { to: '/admin/pending-users', label: 'adminNav.pending', icon: <UserPlus className="w-4 h-4" />, badge: 'pendingRegistrations' },
      { to: '/admin/profile-requests', label: 'adminNav.profileRequests', icon: <UserCog className="w-4 h-4" />, badge: 'profileRequests' },
      { to: '/admin/student-360', label: 'adminNav.student360', icon: <Contact className="w-4 h-4" /> },
    ],
  },
  {
    label: 'adminNav.content',
    items: [
      { to: '/admin/courses', label: 'adminNav.courses', icon: <BookOpen className="w-4 h-4" /> },
      { to: '/admin/codes', label: 'adminNav.codes', icon: <KeyRound className="w-4 h-4" /> },
      { to: '/admin/help-center', label: 'adminNav.helpCenter', icon: <HelpCircle className="w-4 h-4" /> },
      { to: '/admin/support-bot', label: 'adminNav.supportBot', icon: <Bot className="w-4 h-4" /> },
    ],
  },
  {
    label: 'adminNav.learning',
    items: [
      { to: '/admin/quiz-review', label: 'adminNav.quizReview', icon: <FileCheck2 className="w-4 h-4" />, badge: 'quizAnswersToReview' },
      { to: '/instructor/grading', label: 'adminNav.grading', icon: <ClipboardList className="w-4 h-4" />, badge: 'examsToGrade' },
      { to: '/admin/lecture-viewers', label: 'adminNav.lectureViewers', icon: <Eye className="w-4 h-4" /> },
      { to: '/admin/risk', label: 'adminNav.risk', icon: <ShieldAlert className="w-4 h-4" /> },
    ],
  },
  {
    label: 'adminNav.system',
    items: [
      { to: '/admin/device-logs', label: 'adminNav.deviceLogs', icon: <Smartphone className="w-4 h-4" /> },
      { to: '/admin/audit-logs', label: 'adminNav.audit', icon: <Database className="w-4 h-4" /> },
      { to: '/contact', label: 'nav.contact', icon: <MessageCircle className="w-4 h-4" /> },
    ],
  },
];

const NAV: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { to: '/dashboard', label: 'nav.dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { to: '/catalog', label: 'nav.catalog', icon: <Compass className="w-4 h-4" /> },
    { to: '/files', label: 'nav.files', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/leaderboard', label: 'nav.leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { to: '/stats', label: 'nav.stats', icon: <BarChart3 className="w-4 h-4" /> },
    { to: '/contact', label: 'nav.contact', icon: <MessageCircle className="w-4 h-4" /> },
  ],
  INSTRUCTOR: [
    { to: '/instructor', label: 'nav.dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { to: '/instructor/courses', label: 'nav.courses', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/instructor/grading', label: 'nav.gradingQueue', icon: <ClipboardList className="w-4 h-4" /> },
    { to: '/instructor/quiz-review', label: 'Quiz Review', icon: <Shield className="w-4 h-4" /> },
    // { to: '/instructors', label: 'nav.instructors', icon: <GraduationCap className="w-4 h-4" /> }, // Temporarily disabled (re-import GraduationCap when enabling)
    { to: '/contact', label: 'nav.contact', icon: <MessageCircle className="w-4 h-4" /> },
  ],
  ADMIN: [
    { to: '/admin', label: 'nav.dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/admin/users', label: 'nav.users', icon: <Users className="w-4 h-4" /> },
    { to: '/admin/courses', label: 'nav.courses', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/admin/codes', label: 'nav.activationCodes', icon: <KeyRound className="w-4 h-4" /> },
    { to: '/admin/quiz-review', label: 'Quiz Review', icon: <Shield className="w-4 h-4" /> },
    // { to: '/instructors', label: 'nav.instructors', icon: <GraduationCap className="w-4 h-4" /> }, // Temporarily disabled (re-import GraduationCap when enabling)
    { to: '/contact', label: 'nav.contact', icon: <MessageCircle className="w-4 h-4" /> },
  ],
};

// Home routes only match exactly — otherwise "Dashboard" (/instructor, /admin) would also light up
// on every nested page such as /instructor/courses.
const HOME_ROUTES = new Set(['/dashboard', '/instructor', '/admin']);
function isNavActive(itemTo: string, path: string) {
  if (HOME_ROUTES.has(itemTo)) return path === itemTo;
  return path === itemTo || path.startsWith(itemTo + '/');
}

// Phone bottom bar for students (the most used destinations, one tap away).
const STUDENT_TABS: NavItem[] = [
  { to: '/dashboard', label: 'nav.home', icon: <LayoutGrid className="w-5 h-5" /> },
  { to: '/catalog', label: 'nav.coursesShort', icon: <Compass className="w-5 h-5" /> },
  { to: '/files', label: 'nav.files', icon: <BookOpen className="w-5 h-5" /> },
  { to: '/stats', label: 'nav.stats', icon: <BarChart3 className="w-5 h-5" /> },
  { to: '/profile', label: 'nav.account', icon: <UserCircle2 className="w-5 h-5" /> },
];

const ROLE_BADGE: Record<UserRole, string> = {
  STUDENT: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-300 border border-secondary-500/20',
  INSTRUCTOR: 'bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-500/20',
  ADMIN: 'bg-gold-500/10 text-gold-700 dark:text-gold-300 border border-gold-500/20',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { path } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { t } = useTranslation();

  const role = profile?.role ?? 'STUDENT';
  const nav = NAV[role];
  // In-app content notifications are for students only.
  const showNotifications = profile?.role === 'STUDENT';
  const isAdmin = role === 'ADMIN';
  const groups: NavGroup[] = isAdmin ? ADMIN_GROUPS : [{ items: nav }];
  const { data: attention } = useAdminAttention(isAdmin);

  // Quick search (Ctrl/⌘ + K) for admins.
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    // Any screen can open the search with: window.dispatchEvent(new Event('ecamp:open-search'))
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('ecamp:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ecamp:open-search', onOpen);
    };
  }, [isAdmin]);
  const paletteEntries: PaletteEntry[] = useMemo(
    () =>
      ADMIN_GROUPS.flatMap((g) =>
        g.items.map((item) => ({
          to: item.to,
          label: t(item.label),
          icon: item.icon,
          group: g.label ? t(g.label) : t('palette.pages'),
          keywords: item.to.replace(/[/-]/g, ' '),
        })),
      ),
    [t],
  );
  const openPalette = isAdmin ? () => setPaletteOpen(true) : undefined;

  return (
    <div className="min-h-screen lg:flex">
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1a1a1a' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1a1a1a' },
          },
        }}
      />
      <AboutPlatformModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-e border-theme-border bg-theme-bg backdrop-blur-xl">
        <SidebarContent
          groups={groups}
          badges={attention}
          onOpenSearch={openPalette}
          currentPath={path}
          roleLabel={t(`roles.${role}`)}
          roleBadgeClass={ROLE_BADGE[role]}
          fullName={profile?.full_name ?? ''}
          email={profile?.email ?? ''}
          profilePictureUrl={profile?.profilePictureUrl ?? null}
          xp={profile?.xp ?? 0}
          streak={profile?.streak_days ?? 0}
          onSignOut={signOut}
          onOpenAbout={() => setAboutOpen(true)}
          showGamification={role === 'STUDENT'}
          t={t}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-bg backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2">
          <EcampLogo size="sm" />
          <span className="font-display font-bold text-theme-text">E.Camp</span>
        </Link>
        <div className="flex items-center gap-1">
          {showNotifications && <NotificationBell />}
          {openPalette && (
            <button type="button" onClick={openPalette} className="p-2 rounded-lg text-theme-muted hover:bg-theme-card" aria-label={t('palette.title')}>
              <Search className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-theme-muted hover:bg-theme-card"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 bg-theme-secondary border-e border-theme-border flex flex-col">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-theme-muted hover:bg-theme-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                groups={groups}
                badges={attention}
                onOpenSearch={openPalette ? () => { setMobileOpen(false); setPaletteOpen(true); } : undefined}
                currentPath={path}
                roleLabel={t(`roles.${role}`)}
                roleBadgeClass={ROLE_BADGE[role]}
                fullName={profile?.full_name ?? ''}
                email={profile?.email ?? ''}
                profilePictureUrl={profile?.profilePictureUrl ?? null}
                xp={profile?.xp ?? 0}
                streak={profile?.streak_days ?? 0}
                onSignOut={signOut}
                onNavigate={() => setMobileOpen(false)}
                onOpenAbout={() => setAboutOpen(true)}
                showGamification={role === 'STUDENT'}
                t={t}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ms-64 flex-1 min-w-0">
        {showNotifications && (
          <div className="hidden lg:flex sticky top-0 z-30 justify-end items-center h-14 px-8 border-b border-theme-border bg-theme-bg/80 backdrop-blur-xl">
            <NotificationBell />
          </div>
        )}
        <div className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto ${showNotifications ? 'pb-24 lg:pb-8' : ''}`}>{children}</div>
      </main>

      {isAdmin && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />}

      {/* Support assistant (students) */}
      {role === 'STUDENT' && <SupportChat raised />}

      {/* Phone bottom navigation (students) */}
      {showNotifications && (
        <nav
          aria-label={t('nav.more')}
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-theme-border bg-theme-bg/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-5">
            {STUDENT_TABS.map((item) => {
              const active = isNavActive(item.to, path);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                      active ? 'text-accent-600 dark:text-accent-300' : 'text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate max-w-full px-1">{t(item.label)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function SidebarContent({
  groups,
  badges,
  onOpenSearch,
  currentPath,
  roleLabel,
  roleBadgeClass,
  fullName,
  email,
  profilePictureUrl,
  xp,
  streak,
  onSignOut,
  onNavigate,
  onOpenAbout,
  showGamification = true,
  t,
}: {
  groups: NavGroup[];
  badges?: AdminAttention;
  onOpenSearch?: () => void;
  currentPath: string;
  roleLabel: string;
  roleBadgeClass: string;
  fullName: string;
  email: string;
  profilePictureUrl: string | null;
  xp: number;
  streak: number;
  onSignOut: () => void;
  onNavigate?: () => void;
  onOpenAbout?: () => void;
  showGamification?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EcampLogo size="md" />
          <div>
            <p className="font-display font-extrabold text-theme-text leading-none">E.Camp</p>
            <p className="text-[10px] uppercase tracking-widest text-theme-muted mt-1">Learning OS</p>
          </div>
        </div>
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            className="p-1.5 rounded-lg text-theme-muted hover:text-accent-400 hover:bg-theme-card transition-colors"
            title="About Platform & System Architecture"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick search (admins) */}
      {onOpenSearch && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onOpenSearch();
            }}
            className="w-full flex items-center gap-2 rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-muted hover:text-theme-text hover:border-accent-500/40 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-start">{t('palette.button')}</span>
            <kbd className="hidden lg:inline text-[10px] font-semibold rounded border border-theme-border px-1.5 py-0.5" dir="ltr">Ctrl K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="px-3 flex-1 overflow-y-auto scrollbar-thin pb-2">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-theme-muted/80">{t(group.label)}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(item.to, currentPath);
                const count = item.badge && badges ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 ${groups.length > 1 ? 'py-2' : 'py-2.5'} rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-accent-500/10 text-accent-700 dark:text-accent-200 shadow-sm'
                        : 'text-theme-muted hover:text-theme-text hover:bg-theme-card'
                    }`}
                  >
                    <span className={active ? 'text-accent-600 dark:text-accent-300' : 'text-theme-muted'}>{item.icon}</span>
                    <span className="flex-1 truncate">{t(item.label)}</span>
                    {count > 0 ? (
                      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold leading-5 text-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : (
                      active && <ChevronRight className="w-3 h-3 rtl:rotate-180 transition-transform" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* XP / streak card (students only — gamification means nothing to staff) */}
      {showGamification && (
      <div className="p-3">
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`badge ${roleBadgeClass}`}>
              <Shield className="w-3 h-3" />
              {roleLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-theme-card p-2.5 shadow-sm border border-theme-border">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-700 dark:text-amber-300">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] uppercase tracking-wide">{t('nav.xp')}</span>
              </div>
              <p className="text-lg font-bold text-theme-text mt-0.5">{xp.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-theme-card p-2.5 shadow-sm border border-theme-border">
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-700 dark:text-orange-300">
                <Flame className="w-3 h-3 fill-current" />
                <span className="text-[10px] uppercase tracking-wide">{t('nav.streak')}</span>
              </div>
              <p className="text-lg font-bold text-theme-text mt-0.5">{streak}<span className="text-xs text-theme-muted"> {t('nav.daysShort')}</span></p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-theme-border space-y-2">
        <div className="px-2 py-1 group">
          <Link to="/profile" onClick={onNavigate} className="min-w-0 flex items-center gap-3 rounded-xl p-1 -m-1 hover:bg-theme-card transition-colors">
            {profilePictureUrl ? (
              <img 
                src={profilePictureUrl} 
                alt={fullName} 
                loading="lazy"
                className="w-9 h-9 shrink-0 object-cover rounded-full border border-white/[0.1]" 
              />
            ) : (
              <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-sm font-bold text-white">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-theme-text truncate group-hover:text-accent-300 transition-colors">{fullName}</p>
              <p className="text-xs text-theme-muted truncate">{email}</p>
            </div>
          </Link>
          <div className="mt-2 flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={onSignOut}
              className="ms-auto inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-theme-muted hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
              aria-label={t('nav.signOut')}
              title={t('nav.signOut')}
            >
              <LogOut className="w-4 h-4 rtl:rotate-180" />
              <span>{t('nav.signOut')}</span>
            </button>
          </div>
        </div>

        {/* Developer Credit Button */}
        <div className="pt-1.5 border-t border-theme-border/40 text-center">
          <button 
            type="button"
            onClick={onOpenAbout}
            className="text-[10px] font-semibold text-accent-700 dark:text-accent-300 hover:text-accent-400 tracking-wider transition-colors inline-flex items-center gap-1 group"
          >
            <span>⚡ {t('common.developedBy')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
