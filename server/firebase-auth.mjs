import { cryptoApi, nowMilliseconds, record, reject } from './errors.mjs';
import { parseAllowedUids, validUid } from './validators.mjs';

export const FIREBASE_PROJECT_ID = 'lezz-val-universo';
export const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_KEYS = 8;
const MAX_TOKEN_CHARS = 16384;
const encoder = new TextEncoder();
const caches = new WeakMap();

function base64url(value, maxBytes) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  let binary;
  try { binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)); }
  catch { reject('INVALID_TOKEN', 'La sesión no es válida.', 401); }
  if (binary.length > maxBytes) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  const canonical = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (canonical !== value) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function jsonPart(value, limit) {
  let parsed;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64url(value, limit))); }
  catch { reject('INVALID_TOKEN', 'La sesión no es válida.', 401); }
  if (!record(parsed)) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  return parsed;
}
function validKid(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value); }

async function loadKeys(fetchJwks, entry, now) {
  if (entry.pending) return entry.pending;
  entry.pending = (async () => {
    const controller = new AbortController();
    let timer;
    try {
      const result = await Promise.race([
        fetchJwks(GOOGLE_JWKS_URL, { signal: controller.signal }),
        new Promise((_, rejectTimeout) => { timer = setTimeout(() => { controller.abort(); rejectTimeout(new Error('timeout')); }, 5000); }),
      ]);
      if (!record(result) || !Array.isArray(result.keys) || result.keys.length === 0 || result.keys.length > MAX_KEYS || encoder.encode(JSON.stringify(result.keys)).byteLength > 32768) throw new Error('keys');
      const keys = new Map();
      for (const jwk of result.keys) {
        if (!record(jwk) || !validKid(jwk.kid) || keys.has(jwk.kid) || jwk.kty !== 'RSA' || jwk.alg !== undefined && jwk.alg !== 'RS256' || jwk.use !== undefined && jwk.use !== 'sig' || ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'].some(key => key in jwk) || jwk.key_ops !== undefined && (!Array.isArray(jwk.key_ops) || !jwk.key_ops.includes('verify') || jwk.key_ops.some(op => op !== 'verify'))) throw new Error('key');
        const modulus = base64url(jwk.n, 512);
        const exponent = base64url(jwk.e, 8);
        if (modulus.length < 256 || modulus[0] < 128 || exponent.length < 3 || exponent.at(-1) % 2 !== 1) throw new Error('key size');
        const key = await cryptoApi().subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true, key_ops: ['verify'] }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
        keys.set(jwk.kid, key);
      }
      const ttl = result.maxAgeSeconds === undefined ? 300 : result.maxAgeSeconds;
      if (typeof ttl !== 'number' || !Number.isFinite(ttl) || ttl < 0) throw new Error('cache');
      entry.keys = keys; entry.fetchedAt = now; entry.expiresAt = now + Math.min(ttl, 3600) * 1000;
    } catch { reject('KEYS_UNAVAILABLE', 'No se pudo comprobar la sesión de forma segura. Inténtalo más tarde.', 503); }
    finally { clearTimeout(timer); }
  })().finally(() => { entry.pending = undefined; });
  return entry.pending;
}
async function keyFor(kid, fetchJwks, now) {
  if (typeof fetchJwks !== 'function') reject('AUTH_NOT_CONFIGURED', 'La verificación privada todavía no está configurada.', 503);
  let entry = caches.get(fetchJwks);
  if (!entry) { entry = { keys: new Map(), fetchedAt: -Infinity, expiresAt: -Infinity }; caches.set(fetchJwks, entry); }
  const fresh = now >= entry.fetchedAt && now < entry.expiresAt;
  // One refresh can discover a rotated kid; random kids cannot force a fetch
  // more often than once every 30 seconds while the existing cache is fresh.
  if (!fresh || !entry.keys.has(kid) && now - entry.fetchedAt >= 30000) await loadKeys(fetchJwks, entry, now);
  const key = entry.keys.get(kid);
  if (!key) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  return key;
}

/** Verifies the RS256 signature; a decoded token alone is never authorization. */
export async function verifyFirebaseToken(token, { allowedUids, fetchJwks, now = Date.now } = {}) {
  const allowed = parseAllowedUids(allowedUids);
  const currentMilliseconds = nowMilliseconds(now); const current = Math.floor(currentMilliseconds / 1000);
  if (typeof token !== 'string' || token.length > MAX_TOKEN_CHARS) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  const parts = token.split('.');
  if (parts.length !== 3) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  const header = jsonPart(parts[0], 500); const claims = jsonPart(parts[1], 8192);
  if (header.alg !== 'RS256' || !validKid(header.kid) || header.typ !== undefined && header.typ !== 'JWT' || Object.keys(header).some(key => !['alg', 'kid', 'typ'].includes(key))) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  if (claims.iss !== FIREBASE_ISSUER || claims.aud !== FIREBASE_PROJECT_ID || !validUid(claims.sub) || claims.user_id !== undefined && claims.user_id !== claims.sub || claims.uid !== undefined && claims.uid !== claims.sub) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  if (![claims.exp, claims.iat, claims.auth_time].every(value => Number.isSafeInteger(value) && value > 0) || claims.exp <= current || claims.iat > current || claims.auth_time > current || claims.auth_time > claims.iat || claims.exp <= claims.iat || claims.exp - claims.iat > 3600) reject('INVALID_TOKEN', 'La sesión expiró o no tiene una fecha válida.', 401);
  if (claims.email_verified !== true || typeof claims.email !== 'string' || !claims.email || !record(claims.firebase) || claims.firebase.sign_in_provider !== 'google.com') reject('INVALID_TOKEN', 'Accede con una cuenta de Google verificada.', 401);
  const key = await keyFor(header.kid, fetchJwks, currentMilliseconds);
  let valid = false;
  try { valid = await cryptoApi().subtle.verify('RSASSA-PKCS1-v1_5', key, base64url(parts[2], 512), encoder.encode(`${parts[0]}.${parts[1]}`)); }
  catch { /* All signature failures have the same public error. */ }
  if (!valid) reject('INVALID_TOKEN', 'La sesión no es válida.', 401);
  if (!allowed.has(claims.sub)) reject('FORBIDDEN', 'Esta cuenta no tiene acceso a este espacio.', 403);
  return Object.freeze({ uid: claims.sub, provider: 'google.com', authTime: claims.auth_time, issuedAt: claims.iat, expiresAt: claims.exp });
}
