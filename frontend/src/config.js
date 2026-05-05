// Centralized configuration for the frontend
// Set EXPO_PUBLIC_API_PORT=... (or EXPO_PUBLIC_API_URL=...) in frontend/.env if your backend uses a different port.

const PROD_API = 'https://farmers-market-hub-api.onrender.com/api';

function nativePlatform() {
  try {
    // Lazy require keeps this config usable in web/node contexts.
    return require('react-native').Platform?.OS;
  } catch {
    return null;
  }
}

function devApiPort() {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_PORT;
  const trimmed = fromEnv != null ? String(fromEnv).trim() : '';
  return trimmed || '5002';
}

function defaultDevApi() {
  const platform = nativePlatform();
  if (platform === 'android') {
    return `http://10.0.2.2:${devApiPort()}/api`;
  }
  return `http://localhost:${devApiPort()}/api`;
}

function trimSlash(url) {
  return url.replace(/\/+$/, '');
}

function isLocalOrLanHostname(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** On web, point at the same host as the page so LAN / 127.0.0.1 / localhost all match the API. */
function apiUrlFromBrowser() {
  if (typeof window === 'undefined' || !window.location?.hostname) return null;
  const host = window.location.hostname;
  if (!isLocalOrLanHostname(host)) return null;
  return `http://${host}:${devApiPort()}/api`;
}

const getEnvVars = () => {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return { apiUrl: trimSlash(fromEnv) };
  }

  const fromBrowser = apiUrlFromBrowser();
  if (fromBrowser) {
    return { apiUrl: fromBrowser };
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return { apiUrl: defaultDevApi() };
  }

  return { apiUrl: PROD_API };
};

/** Origin for uploads and other static paths from the API (same base as axios, minus `/api`). */
export function assetOriginFromEnv() {
  const { apiUrl } = getEnvVars();
  return trimSlash(apiUrl).replace(/\/api$/i, '');
}

/** Turns `/uploads/...` into a loadable absolute URL matching the configured API host. */
export function resolveUploadUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return null;
  let raw = String(pathOrUrl).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  raw = raw.replace(/\\/g, '/');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const origin = assetOriginFromEnv();
  return `${origin}${path}`;
}

/** First non-empty image field from stock/product records (handles legacy Mongoose naming). */
export function pickStockMediaPath(record) {
  if (!record || typeof record !== 'object') return null;
  const candidates = [
    record.imageUrl,
    record.image,
    record.photo,
    record.photoUrl,
    record.thumbnail,
    record.thumbnailUrl,
    record.vegetableImage,
    record.coverImage
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return c;
  }
  return null;
}

export function resolveStockImageUrl(record) {
  return resolveUploadUrl(pickStockMediaPath(record));
}

export default getEnvVars;
