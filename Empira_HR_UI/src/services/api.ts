import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getRefreshToken, setSession } from './storage';

type RefreshResponse = { access: string };

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000/';

function withTrailingSlash(url: string) {
  return url.endsWith('/') ? url : `${url}/`;
}

export const api: AxiosInstance = axios.create({
  baseURL: withTrailingSlash(API_BASE_URL),
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = getAccessToken();
  if (access) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('Missing refresh token');

  refreshPromise = axios
    .post<RefreshResponse>(`${withTrailingSlash(API_BASE_URL)}auth/refresh/`, { refresh })
    .then((r) => r.data.access)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error?.response?.status;

    if (!original || status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const access = await refreshAccessToken();
      // preserve refresh/user already stored; just update access token
      const refresh = getRefreshToken();
      if (refresh) setSession({ access, refresh });

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${access}`;
      return api.request(original);
    } catch (e) {
      clearSession();
      return Promise.reject(e);
    }
  }
);

