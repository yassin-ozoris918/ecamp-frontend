import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Profile, UserRole } from './types';
import i18n from './i18n';
import { buildDevicePayload } from './device';

export interface DeviceInfo {
  deviceType?: string;
  nameAr?: string;
  nameEn?: string;
  os?: string;
  browser?: string;
  category?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  model?: string;
  date?: string;
}

/** The device a blocked student should use instead (from the server). */
export interface RegisteredDevice {
  label?: string | null;
  kind?: string;
  since?: string | null;
}

export type AuthError = {
  message: string;
  code?: string;
  registeredDevice?: DeviceInfo & RegisteredDevice;
  currentDevice?: DeviceInfo;
  /** Blocked by the trusted-device check: "other_device" or "needs_approval". */
  deviceReason?: string;
  /** Short-lived token to request a device change from the blocked screen. */
  changeToken?: string;
  pendingRequest?: boolean;
};

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  educationLevel: 'HIGH_SCHOOL' | 'UNIVERSITY';
  phoneNumber: string;
  parentPhoneNumber?: string;
  profilePictureUrl?: string;
  deviceId?: string;
  highSchoolSystem?: string;
  studyMode?: string;
  studyLanguage?: string;
  highSchoolGrade?: string;
  traditionalBranch?: string;
  baccalaureatePath?: string;
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
  programId?: string;
  otherUniversityName?: string;
  otherFacultyName?: string;
  otherDepartmentName?: string;
  otherProgramName?: string;
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
        const device = await buildDevicePayload('register').catch(() => undefined);
        const res = await api.post('/auth/register', { ...input, device });
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
        const errorData = err.response?.data;
        const msgs = Array.isArray(errorData?.message) ? errorData.message : [errorData?.message || 'auth.errors.default'];
        const translatedMsg = msgs.map((m: string) => i18n.t(m)).join(' - ');
        return {
          error: {
            message: translatedMsg,
            code: errorData?.code,
            registeredDevice: errorData?.registeredDevice,
            currentDevice: errorData?.currentDevice,
          },
        };
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
        const device = await buildDevicePayload('login').catch(() => undefined);
        const { data } = await api.post('/auth/login', { email, password, deviceId, device });

        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);

        const userProfile: Profile = data.user as Profile;

        localStorage.setItem('user', JSON.stringify(userProfile));
        setSession({ accessToken: data.accessToken });
        setProfile(userProfile);

        return { error: null };
      } catch (err: any) {
        const errorData = err.response?.data;
        const rawMessage = Array.isArray(errorData?.message) ? errorData.message[0] : errorData?.message;
        const msgs = Array.isArray(errorData?.message) ? errorData.message : [errorData?.message || 'auth.errors.default'];
        const translatedMsg = msgs.map((m: string) => i18n.t(m)).join(' - ');
        const code = errorData?.code || (rawMessage === 'auth.errors.unrecognizedDevice' ? 'UNRECOGNIZED_DEVICE' : undefined);
        return {
          error: {
            message: translatedMsg,
            code,
            registeredDevice: errorData?.registeredDevice,
            currentDevice: errorData?.currentDevice,
            deviceReason: errorData?.reason,
            changeToken: errorData?.changeToken,
            pendingRequest: errorData?.pendingRequest,
          },
        };
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

  const updateProfile = useCallback(async (data: Partial<RegisterInput>) => {
    try {
      const res = await api.patch('/users/profile', data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setProfile(res.data);
      return { error: null };
    } catch (err: any) {
      const errorData = err.response?.data;
      const msgs = Array.isArray(errorData?.message) ? errorData.message : [errorData?.message || 'auth.errors.default'];
      const translatedMsg = msgs.map((m: string) => i18n.t(m)).join(' - ');
      return { error: { message: translatedMsg, code: errorData?.code } };
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
    updateProfile,
    setError,
  };
}
