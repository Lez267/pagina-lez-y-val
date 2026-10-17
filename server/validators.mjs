import { record, reject } from './errors.mjs';

export const MAX_REQUEST_BYTES = 500;
export const IMAGE_BYTE_LIMIT = 20 * 1024 * 1024;
export const VIDEO_BYTE_LIMIT = 100 * 1024 * 1024;
export const BATCH_BYTE_LIMIT = 250 * 1024 * 1024;
const encoder = new TextEncoder();

export function validUid(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value); }

/** Server configuration only. Never accept an allowlist supplied by a browser. */
export function parseAllowedUids(value) {
  let list;
  try {
    if (value instanceof Set) list = [...value];
    else if (Array.isArray(value)) list = [...value];
    else if (typeof value === 'string' && encoder.encode(value).byteLength <= 4096) list = value.trim().startsWith('[') ? JSON.parse(value) : value.split(',').map(item => item.trim()).filter(Boolean);
  } catch { /* Fail closed without exposing configuration. */ }
  if (!Array.isArray(list) || list.length === 0 || list.length > 16 || list.some(uid => !validUid(uid))) reject('AUTH_NOT_CONFIGURED', 'El acceso privado todavía no está configurado.', 503);
  return new Set(list);
}

export function validateUploadDeclaration(value) {
  if (!record(value) || Object.keys(value).length !== 2 || !Object.hasOwn(value, 'kind') || !Object.hasOwn(value, 'bytes') || !['image', 'video'].includes(value.kind)) reject('INVALID_UPLOAD_REQUEST', 'Indica el tipo de archivo y su tamaño declarado.', 400);
  const limit = value.kind === 'image' ? IMAGE_BYTE_LIMIT : VIDEO_BYTE_LIMIT;
  if (!Number.isSafeInteger(value.bytes) || value.bytes <= 0 || value.bytes > limit) reject('DECLARED_SIZE_REJECTED', 'El tamaño declarado supera el límite permitido para este tipo de archivo.', 400);
  return Object.freeze({ kind: value.kind, bytes: value.bytes });
}

/** The HTTP adapter must also stop reading the request stream after 500 bytes. */
export function parseUploadRequest(raw) {
  let text;
  if (typeof raw === 'string') {
    if (encoder.encode(raw).byteLength > MAX_REQUEST_BYTES) reject('REQUEST_TOO_LARGE', 'La solicitud es demasiado grande.', 413);
    text = raw;
  } else if (raw instanceof Uint8Array) {
    if (raw.byteLength > MAX_REQUEST_BYTES) reject('REQUEST_TOO_LARGE', 'La solicitud es demasiado grande.', 413);
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(raw); }
    catch { reject('INVALID_UPLOAD_REQUEST', 'La solicitud debe contener JSON UTF-8 válido.', 400); }
  } else reject('INVALID_UPLOAD_REQUEST', 'La solicitud debe contener JSON.', 400);
  let parsed;
  try { parsed = JSON.parse(text); } catch { reject('INVALID_UPLOAD_REQUEST', 'La solicitud debe contener JSON válido.', 400); }
  return validateUploadDeclaration(parsed);
}
