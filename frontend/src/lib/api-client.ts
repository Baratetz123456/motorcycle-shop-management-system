import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { tokenStore } from './auth-token';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  withCredentials: true, // Enables browser to send and receive HttpOnly session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Inject ephemeral access token and Idempotency-Key
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    // 1. Primary: Read from in-memory token store
    let token = tokenStore.getToken();

    // 2. Transitional fallback for ongoing migration: if in-memory token is empty,
    // check if a legacy localStorage token is available
    if (!token) {
      const legacyToken = localStorage.getItem('auth_token');
      if (legacyToken) {
        token = legacyToken;
      }
    }

    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Idempotency key for mutation requests
  if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = uuidv4();
    }
  }

  return config;
});

// Response Interceptor: Catch 401 Unauthorized and execute silent token refresh with mutex
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    // Never attempt refresh loop on auth endpoints
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout') ||
      requestUrl.includes('/auth/upgrade-session')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Enqueue concurrent requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt standard silent refresh using HttpOnly session cookie
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.access_token;
        tokenStore.setToken(newToken);

        if (data.role) {
          localStorage.setItem('user_role', data.role);
        }
        if (data.user_id) {
          localStorage.setItem('user_id', data.user_id);
        }

        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // If cookie refresh failed, check if user has a legacy localStorage token to upgrade
        if (typeof window !== 'undefined') {
          const legacyToken = localStorage.getItem('auth_token');
          if (legacyToken) {
            try {
              const upgradeRes = await apiClient.post(
                '/auth/upgrade-session',
                {},
                { headers: { Authorization: `Bearer ${legacyToken}` } }
              );
              const upgradedToken = upgradeRes.data.access_token;
              tokenStore.setToken(upgradedToken);
              localStorage.removeItem('auth_token'); // Migration complete for this user!

              processQueue(null, upgradedToken);
              originalRequest.headers['Authorization'] = `Bearer ${upgradedToken}`;
              return apiClient(originalRequest);
            } catch (upgradeErr) {
              localStorage.removeItem('auth_token');
            }
          }
        }

        processQueue(refreshErr, null);
        tokenStore.clearToken();

        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_name');

          // Only redirect if not already on the login page
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expired=1';
          }
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
