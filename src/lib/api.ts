import axios, { type AxiosRequestConfig } from 'axios';
import { generateDeviceFingerprint } from './device';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
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

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) throw new Error('No refresh token available');
        
        const res = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`
            }
          }
        );

        localStorage.setItem('access_token', res.data.accessToken);
        localStorage.setItem('refresh_token', res.data.refreshToken);
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }

        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return instance(originalRequest);
      } catch (err) {
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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const axiosErr = err as {
    response?: { data?: { message?: string | string[]; errors?: Record<string, string[]> }; status?: number };
    message?: string;
  };
  const message = Array.isArray(axiosErr.response?.data?.message)
    ? axiosErr.response!.data!.message.join(', ')
    : axiosErr.response?.data?.message || axiosErr.message || 'Unknown error';
  return new ApiError(message, axiosErr.response?.status, axiosErr.response?.data?.errors);
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
