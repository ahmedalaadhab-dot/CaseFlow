import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Access token lives in memory only (never localStorage) to limit XSS
// blast radius; it's re-derived from the refresh token on page load.
// Refresh token is opaque and long-lived, so it's fine in localStorage
// for this SPA — swap to an httpOnly cookie if the backend adds one.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

const REFRESH_TOKEN_KEY = "caseflow_refresh_token";
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

// Queue concurrent requests that hit a 401 while a single refresh call is
// in flight, so we don't fire the refresh endpoint once per failed request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
    const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
    setAccessToken(newAccess);
    setRefreshToken(newRefresh);
    return newAccess;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes("/auth/")) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
        return api(originalRequest);
      }

      // Refresh failed — force a clean login.
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Small helper so callers can write `const data = await unwrap(api.get(...))`
// instead of repeating `.data.data` everywhere.
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message;
  }
  return "Something went wrong";
}
