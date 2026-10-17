import { ServiceError, parseAllowedUids, verifyFirebaseToken } from './upload-security';

export type UploadEnvironment = Record<string, unknown> & {
  FIREBASE_ALLOWED_UIDS?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
};
const noStore = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export function jsonResponse(value: unknown, status = 200) { return Response.json(value, { status, headers: noStore }); }
export function requestError(error: unknown) {
  return error instanceof ServiceError
    ? jsonResponse({ error: error.message, code: error.code }, error.status)
    : jsonResponse({ error: 'No se pudo completar la operación. Inténtalo de nuevo.', code: 'SERVICE_UNAVAILABLE' }, 503);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new ServiceError('ORIGIN_REJECTED', 'La solicitud no pertenece a este sitio.', 403);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new ServiceError('ORIGIN_REJECTED', 'La solicitud no pertenece a este sitio.', 403);
}

export async function readSmallBody(request: Request, limit = 500): Promise<Uint8Array> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new ServiceError('JSON_REQUIRED', 'La solicitud debe contener JSON.', 415);
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new ServiceError('REQUEST_TOO_LARGE', 'La solicitud es demasiado grande.', 413);
  if (!request.body) throw new ServiceError('JSON_REQUIRED', 'La solicitud no contiene datos.', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > limit) { await reader.cancel(); throw new ServiceError('REQUEST_TOO_LARGE', 'La solicitud es demasiado grande.', 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function fetchGoogleJwks(url: string, options?: { signal?: AbortSignal }) {
  const response = await fetch(url, { signal: options?.signal, redirect: 'error' });
  if (!response.ok) throw new ServiceError('AUTH_UNAVAILABLE', 'No se pudo comprobar la sesión de Google.', 503);
  const text = await response.text();
  if (text.length > 65536) throw new ServiceError('AUTH_UNAVAILABLE', 'No se pudo comprobar la sesión de Google.', 503);
  const value = JSON.parse(text) as { keys: JsonWebKey[] };
  const maxAgeSeconds = Math.min(3600, Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') ?? '')?.[1] ?? 300));
  return { keys: value.keys, maxAgeSeconds };
}
export async function authorizeUploadRequest(request: Request, env: UploadEnvironment) {
  sameOrigin(request);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 16384) throw new ServiceError('SIGN_IN_REQUIRED', 'Abre tu galería con Google para guardar un recuerdo.', 401);
  return verifyFirebaseToken(authorization.slice(7), { allowedUids: parseAllowedUids(env.FIREBASE_ALLOWED_UIDS), fetchJwks: fetchGoogleJwks });
}
