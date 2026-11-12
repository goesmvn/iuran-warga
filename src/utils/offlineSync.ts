// =====================================================================
// OFFLINE SYNC
// Menyimpan salinan data (cache) dan antrean perubahan di perangkat,
// lalu mengirim antrean ke server secara berurutan saat koneksi kembali.
//
// - GET data utama: dari server jika online (lalu disimpan ke cache), dari cache jika offline.
// - POST/PUT/DELETE data utama: jika offline, masuk antrean & langsung diterapkan ke cache
//   sehingga tampilan tetap konsisten walau aplikasi ditutup/dibuka lagi.
// - ID dibuat di perangkat, dan server menganggap ID yang sudah ada sebagai sukses,
//   jadi retry tidak membuat data dobel.
// =====================================================================

const QUEUE_KEY = 'offline_queue_v1';
const FAILED_KEY = 'offline_failed_v1';
const CACHE_PREFIX = 'offline_cache_v1:';
const MAX_SERVER_ERROR_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;

// Data yang boleh dibaca dari cache saat offline
const CACHEABLE_URLS = ['/api/warga', '/api/transactions', '/api/categories', '/api/kas-locations', '/api/settings', '/api/users'];
// Perubahan yang boleh diantrekan saat offline (users/backup/restore/login sengaja tidak, wajib online)
const QUEUEABLE_PATTERN = /^\/api\/(warga|transactions|categories|kas-locations|settings)(?:\/([^/?]+))?$/;

export interface QueuedRequest {
  qid: string;
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: string;
  createdAt: number;
  attempts: number;
}

export interface FailedRequest extends QueuedRequest {
  error: string;
  failedAt: number;
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: FailedRequest[];
  authExpired: boolean;
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

let rawFetch: FetchFn | null = null;
let flushing: Promise<void> | null = null;
let authExpired = false;
// navigator.onLine hanya tahu ada/tidaknya jaringan, bukan apakah server terjangkau
// (mis. WiFi tanpa internet). Ini diperbarui dari hasil request sungguhan.
let serverReachable = true;
const listeners = new Set<(s: SyncStatus) => void>();

// ---------- storage helpers ----------
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const getQueue = () => readJSON<QueuedRequest[]>(QUEUE_KEY, []);
const setQueue = (q: QueuedRequest[]) => writeJSON(QUEUE_KEY, q);
const getFailed = () => readJSON<FailedRequest[]>(FAILED_KEY, []);
const setFailed = (f: FailedRequest[]) => writeJSON(FAILED_KEY, f);

export const isCacheable = (url: string) => CACHEABLE_URLS.includes(url);
export const isQueueable = (url: string) => QUEUEABLE_PATTERN.test(url);
export const readCache = (url: string) => readJSON<unknown>(CACHE_PREFIX + url, null);
export const writeCache = (url: string, data: unknown) => writeJSON(CACHE_PREFIX + url, data);

// ---------- status ----------
export function getSyncStatus(): SyncStatus {
  return {
    online: navigator.onLine && serverReachable,
    syncing: flushing !== null,
    pending: getQueue().length,
    failed: getFailed(),
    authExpired,
  };
}

function notify() {
  const status = getSyncStatus();
  listeners.forEach(l => l(status));
}

export const isServerReachable = () => serverReachable;

/**
 * 502/503/504 = reverse proxy (Caddy) hidup tapi aplikasi server mati/sedang restart (mis. saat deploy).
 * Diperlakukan sama dengan offline: data diantrekan, bukan dianggap gagal.
 */
export const isGatewayError = (status: number) => status === 502 || status === 503 || status === 504;

let lastProbe = 0;
/** Cek ringan apakah server bisa dihubungi lagi (maks. sekali per 10 detik), lalu kirim antrean. */
export function probeServer() {
  if (!rawFetch || !navigator.onLine || Date.now() - lastProbe < 10_000) return;
  lastProbe = Date.now();
  fetchWithTimeout(rawFetch, '/api/ping', {})
    .then((res) => { if (res.ok) flushQueue(); })
    .catch(() => { /* masih tak terjangkau; status sudah ditandai oleh rawFetch */ });
}

/** Dipanggil setelah setiap request ke server: true jika ada respons, false jika gagal jaringan. */
export function markReachable(reachable: boolean) {
  if (serverReachable === reachable) return;
  serverReachable = reachable;
  notify();
}

export function subscribeSync(listener: (s: SyncStatus) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Kirim ulang item yang gagal (mis. server error berulang) tanpa kehilangan datanya. */
export function retryFailed(qid: string) {
  const item = getFailed().find(f => f.qid === qid);
  if (!item) return;
  setFailed(getFailed().filter(f => f.qid !== qid));
  const { qid: id, method, url, body, createdAt } = item;
  setQueue([...getQueue(), { qid: id, method, url, body, createdAt, attempts: 0 }]);
  notify();
  flushQueue();
}

/** Hapus salinan data (berisi data pribadi warga) dari perangkat. Antrean yang belum terkirim TIDAK dihapus. */
export function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}

export function dismissFailed(qid: string) {
  setFailed(getFailed().filter(f => f.qid !== qid));
  notify();
}

// ---------- cache mutation (agar perubahan offline langsung terlihat) ----------
export function applyToCache(method: string, url: string, body?: string) {
  const match = url.match(QUEUEABLE_PATTERN);
  if (!match) return;
  const [, collection, id] = match;
  const cacheUrl = `/api/${collection}`;
  const payload = body ? JSON.parse(body) : {};

  if (collection === 'settings') {
    const settings = (readCache(cacheUrl) as Record<string, string>) || {};
    if (method === 'PUT' && id) writeCache(cacheUrl, { ...settings, [decodeURIComponent(id)]: payload.value });
    return;
  }

  const list = (readCache(cacheUrl) as { id: string }[]) || [];
  if (method === 'POST' && payload.id) {
    if (!list.some(item => item.id === payload.id)) writeCache(cacheUrl, [...list, payload]);
  } else if (method === 'PUT' && id) {
    writeCache(cacheUrl, list.map(item => (item.id === id ? { ...item, ...payload } : item)));
  } else if (method === 'DELETE' && id) {
    writeCache(cacheUrl, list.filter(item => item.id !== id));
  }
}

export function enqueue(method: QueuedRequest['method'], url: string, body?: string) {
  const item: QueuedRequest = {
    qid: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    method,
    url,
    body,
    createdAt: Date.now(),
    attempts: 0,
  };
  setQueue([...getQueue(), item]);
  applyToCache(method, url, body);
  notify();
}

// ---------- network ----------
export async function fetchWithTimeout(fetchFn: FetchFn, url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Kirim antrean ke server satu per satu sesuai urutan pencatatan. */
export function flushQueue(): Promise<void> {
  if (flushing) return flushing;
  if (!rawFetch || getQueue().length === 0 || !navigator.onLine) return Promise.resolve();

  const send = rawFetch;
  flushing = (async () => {
    notify();
    let queue = getQueue();
    while (queue.length > 0) {
      const item = queue[0];
      let res: Response;
      try {
        res = await fetchWithTimeout(send, item.url, { method: item.method, body: item.body });
      } catch {
        markReachable(false);
        break; // masih offline / sinyal buruk, coba lagi nanti
      }
      markReachable(true);

      if (res.ok) {
        authExpired = false;
      } else if (res.status === 401) {
        authExpired = true; // perlu login ulang; antrean tetap disimpan
        break;
      } else if (isGatewayError(res.status)) {
        markReachable(false);
        break; // server sedang tidak tersedia; data aman di antrean
      } else if (res.status === 429) {
        break; // server sedang membatasi permintaan; data aman di antrean, coba lagi nanti
      } else if (res.status >= 500 && item.attempts + 1 < MAX_SERVER_ERROR_ATTEMPTS) {
        item.attempts += 1;
        setQueue([item, ...getQueue().slice(1)]);
        break;
      } else {
        // Ditolak server (mis. pembayaran ganda): pindahkan ke daftar gagal agar terlihat oleh pengguna
        const data = await res.json().catch(() => ({}));
        setFailed([...getFailed(), { ...item, error: data.error || `Error ${res.status}`, failedAt: Date.now() }]);
      }

      queue = getQueue().slice(1);
      setQueue(queue);
      notify();
    }
  })().finally(() => {
    flushing = null;
    notify();
  });
  return flushing;
}

/** Dipanggil sekali saat aplikasi mulai. */
export function startAutoSync(fetchFn: FetchFn) {
  rawFetch = fetchFn;
  window.addEventListener('online', () => { notify(); lastProbe = 0; probeServer(); flushQueue(); });
  window.addEventListener('offline', notify);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { lastProbe = 0; probeServer(); flushQueue(); }
  });
  setInterval(() => {
    if (!serverReachable) probeServer();
    else if (getQueue().length > 0) flushQueue();
  }, 30_000);
  flushQueue();
}
