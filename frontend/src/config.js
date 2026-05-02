// Centralized configuration for the frontend
// Set EXPO_PUBLIC_API_PORT=5001 (or EXPO_PUBLIC_API_URL=...) in frontend/.env if your backend uses a non-default port.

const PROD_API = 'https://farmers-market-hub-api.onrender.com/api';

function devApiPort() {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_PORT;
  const trimmed = fromEnv != null ? String(fromEnv).trim() : '';
  return trimmed || '5000';
}

function defaultDevApi() {
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

export default getEnvVars;
