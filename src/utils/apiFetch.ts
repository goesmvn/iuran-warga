import { Capacitor } from '@capacitor/core';
import {
  applyToCache, enqueue, fetchWithTimeout, flushQueue, getSyncStatus,
  isCacheable, isQueueable, isServerReachable, markReachable, probeServer, readCache, startAutoSync, writeCache,
  type QueuedRequest,
} from './offlineSync';

// Server produksi. Di web, API diakses relatif (domain yang sama); di aplikasi Android harus URL penuh.
const PRODUCTION_API_URL = 'https://kasjepun.arcomteknologi.id';
export const isNativeApp = Capacitor.isNativePlatform();
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? (isNativeApp ? PRODUCTION_API_URL : '');
export const apiUrl = (path: string) => `${API_BASE}${path}`;

const getToken = () => {
  const userStr = localStorage.getItem('iuran_auth_user');
  if (!userStr) return '';
  try {
    return JSON.parse(userStr).token || '';
  } catch (e) {
    console.error('Failed to parse auth token', e);
    return '';
  }
};

/** fetch ke server dengan header auth, tanpa logika offline. */
const authorizedFetch = (url: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(apiUrl(url), { ...options, headers }).then(
    (res) => { markReachable(true); return res; },
    (err) => { markReachable(false); throw err; },
  );
};

startAutoSync(authorizedFetch);

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const handleUnauthorized = (response: Response, url: string) => {
  if (response.status === 401 && url !== '/api/login') {
    // JWT Token expired or invalid (antrean offline tetap tersimpan dan dikirim setelah login ulang)
    localStorage.removeItem('iuran_auth_user');
    window.location.href = '/login';
  }
  return response;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const method = (options.method || 'GET').toUpperCase();

  // Baca data: server dulu, cache jika offline
  if (method === 'GET' && isCacheable(url)) {
    // Server diketahui tak terjangkau: tampilkan data di HP seketika, coba sync di latar belakang
    const cachedNow = readCache(url);
    if ((!navigator.onLine || !isServerReachable()) && cachedNow !== null) {
      probeServer();
      return jsonResponse(cachedNow);
    }
    // Kirim antrean dulu agar data dari server sudah memuat catatan offline
    await flushQueue();
    try {
      const response = await fetchWithTimeout(authorizedFetch, url, options);
      if (response.ok && getSyncStatus().pending === 0) {
        writeCache(url, await response.clone().json());
      }
      if (response.ok && getSyncStatus().pending > 0) {
        // Masih ada antrean yang belum terkirim: tampilkan cache yang sudah memuat perubahan offline
        const cached = readCache(url);
        if (cached !== null) return jsonResponse(cached);
      }
      return handleUnauthorized(response, url);
    } catch (err) {
      const cached = readCache(url);
      if (cached !== null) return jsonResponse(cached);
      throw err;
    }
  }

  // Ubah data: langsung ke server jika bisa, masuk antrean jika offline
  if (method !== 'GET' && isQueueable(url)) {
    const body = typeof options.body === 'string' ? options.body : undefined;
    const queueMethod = method as QueuedRequest['method'];

    // Server diketahui tak terjangkau: langsung antre tanpa menunggu timeout
    if (!navigator.onLine || !isServerReachable()) {
      enqueue(queueMethod, url, body);
      probeServer();
      return jsonResponse({ success: true, queued: true }, 202);
    }

    // Jaga urutan: jika masih ada antrean, coba kirim dulu; kalau tetap tersisa, ikut antre
    await flushQueue();
    if (getSyncStatus().pending > 0) {
      enqueue(queueMethod, url, body);
      return jsonResponse({ success: true, queued: true }, 202);
    }

    try {
      const response = await fetchWithTimeout(authorizedFetch, url, options);
      if (response.ok) applyToCache(method, url, body);
      return handleUnauthorized(response, url);
    } catch {
      // Gagal jaringan (sinyal buruk/timeout): simpan ke antrean. Server mengabaikan ID ganda saat retry.
      enqueue(queueMethod, url, body);
      return jsonResponse({ success: true, queued: true }, 202);
    }
  }

  const response = await authorizedFetch(url, options);
  return handleUnauthorized(response, url);
};
