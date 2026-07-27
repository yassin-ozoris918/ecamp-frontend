import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { RouterProvider, Routes, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './lib/authContext';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/AppShell';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturePlaylist } from './components/LecturePlaylist';
import { ExamScreen } from './components/ExamScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { CourseCatalog } from './components/CourseCatalog';
import { CourseGrid } from './components/CourseGrid';
import { StudentCourseView } from './components/StudentCourseView';
import { Leaderboard } from './components/Leaderboard';
import { MyStats } from './components/MyStats';
import {
  InstructorDashboard,
  InstructorCourses,
  GradingQueue,
} from './components/InstructorDashboard';
import { CourseBuilder } from './components/CourseBuilder';
import {
  AdminDashboard,
  AdminUsers,
  AdminCodes,
  AdminCourses,
} from './components/AdminDashboard';


export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </RouterProvider>
  );
}

function Root() {
  const { session, profile, loading, refetchProfile } = useAuth();
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
  const isInstructorArea = path.startsWith('/instructor');
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
      <RoleRoutes role={profile.role} />
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
        { pattern: '/instructor', element: () => <InstructorDashboard /> },
        { pattern: '/instructor/courses', element: () => <InstructorCourses /> },
        { pattern: '/instructor/grading', element: () => <GradingQueue /> },
        { pattern: '/instructor/course/:courseId', element: (p) => <CourseBuilder courseId={p.courseId} /> },
        { pattern: '/profile', element: () => <ProfileScreen /> },
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
