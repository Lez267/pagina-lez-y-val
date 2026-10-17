import { cryptoApi, nowMilliseconds, reject } from './errors.mjs';
import { parseAllowedUids, validateUploadDeclaration, validUid } from './validators.mjs';

export const EXPECTED_CLOUD_NAME = 'dc7x4qjzu';
export const UPLOAD_NAMESPACE = 'nuestro-universo';
export const IMAGE_FORMATS = Object.freeze(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'gif']);
export const VIDEO_FORMATS = Object.freeze(['mp4', 'mov', 'webm', 'm4v']);
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

function configuration(env) {
  if (!env || env.CLOUDINARY_CLOUD_NAME !== EXPECTED_CLOUD_NAME || typeof env.CLOUDINARY_API_KEY !== 'string' || !/^\d{6,32}$/.test(env.CLOUDINARY_API_KEY) || typeof env.CLOUDINARY_API_SECRET !== 'string' || env.CLOUDINARY_API_SECRET.length < 16 || env.CLOUDINARY_API_SECRET.length > 512 || /\s/.test(env.CLOUDINARY_API_SECRET) || env.CLOUDINARY_FOLDER_MODE !== undefined && !['fixed', 'dynamic'].includes(env.CLOUDINARY_FOLDER_MODE)) reject('UPLOADS_NOT_CONFIGURED', 'Las subidas todavía no están disponibles.', 503);
  const allowed = parseAllowedUids(env.FIREBASE_ALLOWED_UIDS);
  return { cloudName: EXPECTED_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET, folderMode: env.CLOUDINARY_FOLDER_MODE, allowed };
}
export function uploadConfigurationReady(env) { try { configuration(env); return true; } catch { return false; } }
export function getUploadStatus(env) { return Object.freeze({ ready: uploadConfigurationReady(env) }); }

/** Server-only fixed options. uid must come from verifyFirebaseToken, not JSON. */
export async function buildUploadSignature({ uid, kind, bytes, env, now = Date.now, randomId } = {}) {
  const config = configuration(env);
  if (!validUid(uid) || !config.allowed.has(uid)) reject('FORBIDDEN', 'Esta cuenta no tiene acceso a las subidas.', 403);
  validateUploadDeclaration({ kind, bytes });
  const api = cryptoApi();
  const id = typeof randomId === 'function' ? randomId() : api.randomUUID();
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{20,80}$/.test(id)) reject('INVALID_SERVER_RANDOM', 'No se pudo preparar un identificador seguro.', 503);
  const uidHash = hex(await api.subtle.digest('SHA-256', encoder.encode(uid))).slice(0, 24);
  const publicId = `${UPLOAD_NAMESPACE}/${uidHash}/${id}`;
  const timestamp = String(Math.floor(nowMilliseconds(now) / 1000));
  const params = {
    allowed_formats: (kind === 'image' ? IMAGE_FORMATS : VIDEO_FORMATS).join(','),
    overwrite: 'false', public_id: publicId, timestamp,
    ...(config.folderMode === 'dynamic' ? { asset_folder: UPLOAD_NAMESPACE } : {}),
  };
  // Cloudinary authentication signatures are SHA256(sorted params + secret),
  // not HMAC. file, cloud_name, resource_type and api_key are excluded by API.
  const canonical = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const signature = hex(await api.subtle.digest('SHA-256', encoder.encode(canonical + config.apiSecret)));
  return Object.freeze({
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/${kind}/upload`,
    cloudName: config.cloudName, resourceType: kind, apiKey: config.apiKey,
    params: Object.freeze(params), signature, signatureAlgorithm: 'sha256',
    declaredBytes: bytes, byteValidation: 'declaration-only', expiresAt: Number(timestamp) + 3600,
  });
}
