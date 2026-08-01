import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Profile, UserRole } from './types';

type AuthError = { message: string };

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  educationLevel: 'HIGH_SCHOOL' | 'UNIVERSITY';
  phoneNumber: string;
  parentPhoneNumber?: string;
  profilePictureUrl?: string;
  deviceId?: string;
}

export function getInitialRole(): UserRole {
  const r = localStorage.getItem('ecamp_signup_role');
  if (r === 'STUDENT' || r === 'INSTRUCTOR' || r === 'ADMIN') return r;
  return 'STUDENT';
}

export function setSignupRolePref(role: UserRole) {
  localStorage.setItem('ecamp_signup_role', role);
}

export function useAuth() {
  const [session, setSession] = useState<{ accessToken: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        setSession({ accessToken: token });
        setProfile(JSON.parse(userStr));
        
        // Freshen profile silently
        api.get('/users/me').then(({ data }) => {
          localStorage.setItem('user', JSON.stringify(data));
          setProfile(data);
        }).catch(() => {});
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const signUp = useCallback(
    async (input: RegisterInput): Promise<{ error: AuthError | null; status?: string }> => {
      setError(null);
      try {
        const res = await api.post('/auth/register', input);
        const data = res.data;

        if (data.status === 'PENDING_APPROVAL') {
          return { error: null, status: 'PENDING_APPROVAL' };
        }

        if (data.accessToken && data.user) {
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          setSession({ accessToken: data.accessToken });
          setProfile(data.user);
        }
        return { error: null };
      } catch (err: any) {
        return { error: { message: Array.isArray(err.response?.data?.message) ? err.response.data.message.join(', ') : (err.response?.data?.message || 'Registration failed') } };
      }
    },
    [],
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      deviceId: string,
    ): Promise<{ error: AuthError | null }> => {
      setError(null);
      try {
        const { data } = await api.post('/auth/login', { email, password, deviceId });

        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);

        const userProfile: Profile = data.user as Profile;

        localStorage.setItem('user', JSON.stringify(userProfile));
        setSession({ accessToken: data.accessToken });
        setProfile(userProfile);

        return { error: null };
      } catch (err: any) {
        return { error: { message: Array.isArray(err.response?.data?.message) ? err.response.data.message.join(', ') : (err.response?.data?.message || 'Login failed') } };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
       // Ignore error on logout
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setProfile(null);
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    // Handled by axios interceptor
  }, []);

  const refetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      localStorage.setItem('user', JSON.stringify(data));
      setProfile(data);
    } catch (e) {
      // Fallback
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setProfile(JSON.parse(userStr));
      }
    }
  }, []);

  return {
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    refresh,
    refetchProfile,
    setError,
  };
}
