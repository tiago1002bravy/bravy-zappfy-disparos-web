import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL, withCredentials: false });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('zd_access_token');
    if (token) {
      config.headers = config.headers ?? {};
      if (token.startsWith('zd_')) {
        config.headers['X-Api-Key'] = token;
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (typeof window !== 'undefined' && err?.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== '/login') {
        localStorage.removeItem('zd_access_token');
        localStorage.removeItem('zd_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
