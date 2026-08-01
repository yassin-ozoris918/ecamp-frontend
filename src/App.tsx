import { lazy, Suspense, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { RouterProvider, Routes, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './lib/authContext';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/AppShell';
import { StudentDashboard } from './components/StudentDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { CourseCatalog } from './components/CourseCatalog';
import { CourseGrid } from './components/CourseGrid';
import { StudentCourseView } from './components/StudentCourseView';
import { Leaderboard } from './components/Leaderboard';
import { MyStats } from './components/MyStats';
import { ContactScreen } from './components/ContactScreen';
import { InstructorsScreen } from './components/InstructorsScreen';

const LecturePlaylist = lazy(() => import('./components/LecturePlaylist').then(m => ({ default: m.LecturePlaylist })));
const ExamScreen = lazy(() => import('./components/ExamScreen').then(m => ({ default: m.ExamScreen })));
const InstructorDashboard = lazy(() => import('./components/InstructorDashboard').then(m => ({ default: m.InstructorDashboard })));
const InstructorCourses = lazy(() => import('./components/InstructorDashboard').then(m => ({ default: m.InstructorCourses })));
const GradingQueue = lazy(() => import('./components/InstructorDashboard').then(m => ({ default: m.GradingQueue })));
const CourseBuilder = lazy(() => import('./components/CourseBuilder').then(m => ({ default: m.CourseBuilder })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminUsers })));
const AdminPendingUsers = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminPendingUsers })));
const AdminCodes = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminCodes })));
const AdminCourses = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminCourses })));
const AdminProfileRequests = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminProfileRequests })));
const AcademicRiskDashboard = lazy(() => import('./components/AcademicRiskDashboard').then(m => ({ default: m.AcademicRiskDashboard })));
const NotificationLogViewer = lazy(() => import('./components/NotificationLogViewer').then(m => ({ default: m.NotificationLogViewer })));
const Student360Workspace = lazy(() => import('./components/Student360Workspace').then(m => ({ default: m.Student360Workspace })));
const SystemAuditViewer = lazy(() => import('./components/SystemAuditViewer').then(m => ({ default: m.SystemAuditViewer })));


import { ThemeProvider } from './lib/ThemeProvider';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isArabic = i18n.language.startsWith('ar');
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
  }, [i18n.language]);

  return (
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}

function Root() {
  const { session, profile, loading } = useAuth();
  const { path, navigate } = useRouter();

  const { data: serverProfile, error: profileError, isLoading: isServerLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
    enabled: !!session,
    retry: false, // Do not waste network requests retrying if the user is deleted
  });

  useEffect(() => {
    // If the server drops an error (like the 401 UnauthorizedException we just added)
    if (profileError) {
      console.error("Critical: Session invalidated by server. Initiating forced eviction...");
      
      // Completely wipe all client storage states
      localStorage.clear();
      sessionStorage.clear();
      
      // Purge any active state managers and force-redirect out
      window.location.href = '/#/auth';
      window.location.reload(); 
    }
  }, [profileError]);

  useEffect(() => {
    if (!serverProfile) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const cachedProfile = JSON.parse(userStr);
      
      // Explicitly normalize and cross-check primitives to prevent structural mismatches
      const serverRole = String(serverProfile.role).trim().toUpperCase();
      const cachedRole = String(cachedProfile.role).trim().toUpperCase();
      
      if (serverRole !== cachedRole || serverProfile.is_active !== cachedProfile.is_active) {
        // 🔑 CRITICAL FIX: Check a short-lived session flag to ensure we NEVER loop indefinitely
        const alreadyReloaded = sessionStorage.getItem('auth_role_sync_lock');
        
        if (!alreadyReloaded) {
          // Build a perfectly aligned updated payload structure
          const updated = { 
            ...cachedProfile, 
            role: serverProfile.role, 
            is_active: serverProfile.is_active 
          };
          
          localStorage.setItem('user', JSON.stringify(updated));
          sessionStorage.setItem('auth_role_sync_lock', 'true'); // Locks the gate
          
          window.location.reload(); // Fires EXACTLY once safely
        } else {
          console.warn("Sync loop prevented: Roles mismatch detected but session reload lock is active.");
        }
      } else {
        // Clear the session lock once the database and local storage states achieve true alignment
        sessionStorage.removeItem('auth_role_sync_lock');
      }
    } catch (e) {
      console.error("Failed to safely parse user cache object:", e);
    }
  }, [serverProfile]);

  // If not authenticated, show auth screen (unless already on a path that doesn't need auth)
  if (loading || isServerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <div className="w-10 h-10 border-2 border-accent-500/20 border-t-accent-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    if (path === '/' || path === '/catalog') {
      return <CourseCatalog />;
    }
    return <AuthScreen />;
  }

  // Redirect to role-appropriate dashboard if on root
  if (path === '/' || path === '') {
    navigate(roleHome(profile.role));
    return null;
  }

  // Role guards
  const isStudentOnly = profile.role === 'STUDENT';
  const isInstructorArea = path === '/instructor' || path.startsWith('/instructor/');
  const isAdminArea = path.startsWith('/admin');
  if (isStudentOnly && (isInstructorArea || isAdminArea)) {
    navigate('/dashboard');
    return null;
  }
  const isInstructor = profile.role === 'INSTRUCTOR';
  if (isInstructor && (path.startsWith('/dashboard') || path.startsWith('/lecture') || path.startsWith('/leaderboard') || path.startsWith('/stats') || isAdminArea)) {
    navigate('/instructor');
    return null;
  }

  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-base-950"><div className="w-8 h-8 border-2 border-accent-500/20 border-t-accent-400 rounded-full animate-spin" /></div>}>
        <RoleRoutes role={profile.role} />
      </Suspense>
    </AppShell>
  );
}

function RoleRoutes({ role }: { role: string }) {
  if (role === 'STUDENT') {
    return (
      <Routes
        routes={[
          { pattern: '/dashboard', element: () => <StudentDashboard /> },
          { pattern: '/catalog', element: () => <CourseGrid /> },
          { pattern: '/course/:courseId', element: (p) => <StudentCourseView courseId={p.courseId} /> },
          { pattern: '/lecture/:lectureId', element: (p) => <LecturePlaylist lectureId={p.lectureId} /> },
          { pattern: '/exam/:examId', element: (p) => <ExamScreen examId={p.examId} /> },
          { pattern: '/leaderboard', element: () => <Leaderboard /> },
          { pattern: '/stats', element: () => <MyStats /> },
          { pattern: '/profile', element: () => <ProfileScreen /> },
          { pattern: '/contact', element: () => <ContactScreen /> },
          { pattern: '/instructors', element: () => <InstructorsScreen /> },
          { pattern: '*', element: () => <NavigateTo to="/dashboard" /> },
        ]}
      />
    );
  }
  if (role === 'INSTRUCTOR') {
    return (
      <Routes
        routes={[
          { pattern: '/instructor', element: () => <InstructorDashboard /> },
          { pattern: '/instructor/courses', element: () => <InstructorCourses /> },
          { pattern: '/instructor/grading', element: () => <GradingQueue /> },
          { pattern: '/instructor/course/:courseId', element: (p) => <CourseBuilder courseId={p.courseId} /> },
          { pattern: '/profile', element: () => <ProfileScreen /> },
          { pattern: '/contact', element: () => <ContactScreen /> },
          { pattern: '/instructors', element: () => <InstructorsScreen /> },
          { pattern: '*', element: () => <NavigateTo to="/instructor" /> },
        ]}
      />
    );
  }
  return (
    <Routes
      routes={[
        { pattern: '/admin', element: () => <AdminDashboard /> },
        { pattern: '/admin/users', element: () => <AdminUsers /> },
        { pattern: '/admin/courses', element: () => <AdminCourses /> },
        { pattern: '/admin/codes', element: () => <AdminCodes /> },
        { pattern: '/admin/risk', element: () => <AcademicRiskDashboard /> },
        { pattern: '/admin/notifications', element: () => <NotificationLogViewer /> },
        { pattern: '/admin/student-360', element: () => <Student360Workspace /> },
        { pattern: '/admin/audit-logs', element: () => <SystemAuditViewer /> },
        { pattern: '/admin/profile-requests', element: () => <AdminProfileRequests /> },
        { pattern: '/admin/pending-users', element: () => <AdminPendingUsers /> },
        { pattern: '/instructor', element: () => <InstructorDashboard /> },
        { pattern: '/instructor/courses', element: () => <InstructorCourses /> },
        { pattern: '/instructor/grading', element: () => <GradingQueue /> },
        { pattern: '/instructor/course/:courseId', element: (p) => <CourseBuilder courseId={p.courseId} /> },
        { pattern: '/profile', element: () => <ProfileScreen /> },
        { pattern: '/contact', element: () => <ContactScreen /> },
        { pattern: '/instructors', element: () => <InstructorsScreen /> },
        { pattern: '*', element: () => <NavigateTo to="/admin" /> },
      ]}
    />
  );
}

function NavigateTo({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
}

function roleHome(role: string): string {
  if (role === 'INSTRUCTOR') return '/instructor';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}
