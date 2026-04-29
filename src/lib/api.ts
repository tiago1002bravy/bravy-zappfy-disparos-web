import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL, withCredentials: false });

/**
 * Resolve URL de mídia retornada pelo backend.
 * Backend agora devolve path relativo (ex: "/media/raw/abc?exp=...&sig=...")
 * que precisa ser combinado com a baseURL da API.
 * URLs absolutas (legacy) passam direto.
 */
export function resolveMediaUrl(u: string | null | undefined): string {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${baseURL}${u.startsWith('/') ? '' : '/'}${u}`;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('zd_access_token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Fluxo de refresh: ao receber 401, tenta usar o zd_refresh_token pra obter um novo
// access token e refazer o request original. Se o refresh tambem falhar, ai sim
// joga pro /login. Refresh é serializado pra evitar disparar N chamadas se varios
// requests bateram 401 ao mesmo tempo.
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('zd_refresh_token');
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      { withCredentials: false },
    );
    localStorage.setItem('zd_access_token', data.accessToken);
    localStorage.setItem('zd_refresh_token', data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

function getOrStartRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = err.response?.status;
    if (typeof window === 'undefined' || status !== 401 || !original) {
      return Promise.reject(err);
    }
    // Evita loop em /auth/refresh ou /auth/login
    const url = original.url ?? '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
      localStorage.removeItem('zd_access_token');
      localStorage.removeItem('zd_refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
    if (original._retry) {
      // Já tentou refresh nesse request — desiste
      localStorage.removeItem('zd_access_token');
      localStorage.removeItem('zd_refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
    original._retry = true;
    const newAccessToken = await getOrStartRefresh();
    if (!newAccessToken) {
      localStorage.removeItem('zd_access_token');
      localStorage.removeItem('zd_refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
    original.headers = original.headers ?? {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
    return api.request(original);
  },
);
