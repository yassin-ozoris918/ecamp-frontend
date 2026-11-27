import axios, { type AxiosRequestConfig } from 'axios';
import { buildDevicePayload, generateDeviceFingerprint } from './device';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 0, // Set to 0 (no timeout) to allow large file uploads like videos
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (config.headers) {
      config.headers['x-device-id'] = generateDeviceFingerprint();
      if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingForMaintenance = false;

/** One renewal at a time: parallel 401s wait for the same refresh instead of racing (which logged students out). */
let refreshing: Promise<string> | null = null;

function renewLogin(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token available');
      // The renewal is signed by this browser's device key (students), so a copied token can't be renewed elsewhere.
      const device = await buildDevicePayload('refresh').catch(() => undefined);
      const res = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { device },
        { headers: { Authorization: `Bearer ${refreshToken}`, 'x-device-id': generateDeviceFingerprint() } },
      );
      localStorage.setItem('access_token', res.data.accessToken);
      localStorage.setItem('refresh_token', res.data.refreshToken);
      if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.accessToken as string;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. Maintenance Mode Interceptor
    if (error.response?.data?.code === 'MAINTENANCE_MODE') {
      if (!isRedirectingForMaintenance) {
        isRedirectingForMaintenance = true;
        
        // SAFELY clear authentication data only (preserving device ID)
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        sessionStorage.setItem('maintenance_interruption', 'true');
        
        // Redirect to auth/login screen where the maintenance notice will be shown
        window.location.href = '/';
      }
      return Promise.reject(error);
    }

    // 2. Token Refresh Interceptor
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const accessToken = await renewLogin();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return instance(originalRequest);
      } catch (err: any) {
        // Tell the sign-in screen why (device removed or changed by an admin).
        const code = err?.response?.data?.code;
        if (code === 'DEVICE_REVOKED' || code === 'UNRECOGNIZED_DEVICE' || code === 'DEVICE_PROOF_FAILED') {
          sessionStorage.setItem('device_signout', code);
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: Record<string, string[]>,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const axiosErr = err as {
    response?: { data?: { message?: string | string[]; errors?: Record<string, string[]>; code?: string }; status?: number };
    message?: string;
  };
  const message = Array.isArray(axiosErr.response?.data?.message)
    ? axiosErr.response!.data!.message.join(', ')
    : axiosErr.response?.data?.message || axiosErr.message || 'Unknown error';
  return new ApiError(message, axiosErr.response?.status, axiosErr.response?.data?.errors, axiosErr.response?.data?.code);
}

export const client = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.get<T>(url, config).then(r => r.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    instance.post<T>(url, data, config).then(r => r.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    instance.put<T>(url, data, config).then(r => r.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    instance.patch<T>(url, data, config).then(r => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete<T>(url, config).then(r => r.data),
};

export const api = instance;
