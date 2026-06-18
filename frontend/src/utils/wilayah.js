// ════════════════════════════════════════════════════════════════════
// Wilayah Indonesia helper
// Sumber data: emsifa/api-wilayah-indonesia (data resmi Kemendagri RI)
// https://emsifa.github.io/api-wilayah-indonesia/api/
//
// Cache per level di localStorage dengan TTL 30 hari.
// Provinsi jarang berubah, jadi aman untuk dicache lama.
// ════════════════════════════════════════════════════════════════════

const BASE = 'https://emsifa.github.io/api-wilayah-indonesia/api';
const TTL  = 1000 * 60 * 60 * 24 * 30; // 30 hari
const PREFIX = 'wilayah:';

// ── Cache helpers ─────────────────────────────────────────────
const getCache = (key) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return data;
  } catch { return null; }
};

const setCache = (key, data) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage penuh? Clear other wilayah cache as fallback
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  }
};

// ── Generic fetcher with cache + timeout ──────────────────────
const fetchWithCache = async (key, url) => {
  const cached = getCache(key);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setCache(key, data);
    return data;
  } catch (err) {
    clearTimeout(timeout);
    console.warn('[wilayah] fetch failed:', url, err.message);
    throw err;
  }
};

// ── Public API ────────────────────────────────────────────────
export const getProvinces = () =>
  fetchWithCache('provinces', `${BASE}/provinces.json`);

export const getRegencies = (provinceId) =>
  fetchWithCache(`reg:${provinceId}`, `${BASE}/regencies/${provinceId}.json`);

export const getDistricts = (regencyId) =>
  fetchWithCache(`dist:${regencyId}`, `${BASE}/districts/${regencyId}.json`);

export const getVillages = (districtId) =>
  fetchWithCache(`vil:${districtId}`, `${BASE}/villages/${districtId}.json`);

// ── Clear cache (untuk debug / settings) ──────────────────────
export const clearWilayahCache = () => {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
    return true;
  } catch { return false; }
};

// ── Title case formatter (data dari emsifa sebagian UPPERCASE) ─
export const toTitleCase = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .split(' ')
    .map(w => w.length <= 2 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/Dki/g, 'DKI')
    .replace(/Diy/g, 'DIY');
};
