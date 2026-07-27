import { useState, type ReactNode } from 'react';
import {
  GraduationCap,
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
} from 'lucide-react';
import { Link, useRouter } from '../lib/router';
import { useAuth } from '../lib/authContext';
import type { UserRole } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV: Record<UserRole, NavItem[]> = {
  STUDENT: [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { to: '/stats', label: 'My Stats', icon: <BarChart3 className="w-4 h-4" /> },
  ],
  INSTRUCTOR: [
    { to: '/instructor', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { to: '/instructor/courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/instructor/grading', label: 'Grading Queue', icon: <ClipboardList className="w-4 h-4" /> },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { to: '/admin/courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/admin/codes', label: 'Activation Codes', icon: <KeyRound className="w-4 h-4" /> },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
};

const ROLE_BADGE: Record<UserRole, string> = {
  STUDENT: 'bg-secondary-500/10 text-secondary-300 border border-secondary-500/20',
  INSTRUCTOR: 'bg-accent-500/10 text-accent-300 border border-accent-500/20',
  ADMIN: 'bg-gold-500/10 text-gold-300 border border-gold-500/20',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { path } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = profile?.role ?? 'STUDENT';
  const nav = NAV[role];

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-e border-white/[0.06] bg-base-950/60 backdrop-blur-xl">
        <SidebarContent
          nav={nav}
          currentPath={path}
          roleLabel={ROLE_LABEL[role]}
          roleBadgeClass={ROLE_BADGE[role]}
          fullName={profile?.full_name ?? ''}
          email={profile?.email ?? ''}
          xp={profile?.xp ?? 0}
          streak={profile?.streak_days ?? 0}
          onSignOut={signOut}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-base-950/80 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-base-950" />
          </div>
          <span className="font-display font-bold text-white">E.Camp</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-neutral-300 hover:bg-white/[0.06]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-base-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 bg-base-900 border-e border-white/[0.06] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="font-display font-bold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              nav={nav}
              currentPath={path}
              roleLabel={ROLE_LABEL[role]}
              roleBadgeClass={ROLE_BADGE[role]}
              fullName={profile?.full_name ?? ''}
              email={profile?.email ?? ''}
              xp={profile?.xp ?? 0}
              streak={profile?.streak_days ?? 0}
              onSignOut={signOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ms-64 flex-1 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({
  nav,
  currentPath,
  roleLabel,
  roleBadgeClass,
  fullName,
  email,
  xp,
  streak,
  onSignOut,
  onNavigate,
}: {
  nav: NavItem[];
  currentPath: string;
  roleLabel: string;
  roleBadgeClass: string;
  fullName: string;
  email: string;
  xp: number;
  streak: number;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
          <GraduationCap className="w-5 h-5 text-base-950" />
        </div>
        <div>
          <p className="font-display font-extrabold text-white leading-none">E.Camp</p>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Learning OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-1">
        {nav.map((item) => {
          const active = currentPath === item.to || currentPath.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-accent-500/10 text-accent-200 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.04]'
              }`}
            >
              <span className={active ? 'text-accent-300' : 'text-neutral-500'}>{item.icon}</span>
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ms-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* XP / streak card */}
      <div className="p-3">
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`badge ${roleBadgeClass}`}>
              <Shield className="w-3 h-3" />
              {roleLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.03] p-2.5">
              <div className="flex items-center gap-1 text-amber-300">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[10px] uppercase tracking-wide">XP</span>
              </div>
              <p className="text-lg font-bold text-white mt-0.5">{xp.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2.5">
              <div className="flex items-center gap-1 text-orange-300">
                <Flame className="w-3 h-3 fill-current" />
                <span className="text-[10px] uppercase tracking-wide">Streak</span>
              </div>
              <p className="text-lg font-bold text-white mt-0.5">{streak}<span className="text-xs text-neutral-500"> d</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2 py-2 group">
          <Link to="/profile" onClick={onNavigate} className="flex-1 min-w-0 flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-sm font-bold text-base-950">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-100 truncate group-hover:text-accent-300 transition-colors">{fullName}</p>
              <p className="text-xs text-neutral-500 truncate">{email}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="p-2 rounded-lg text-neutral-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
