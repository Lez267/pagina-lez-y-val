export class ServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message); this.name = 'ServiceError'; this.code = code; this.status = status; this.statusCode = status;
  }
}
export function reject(code, message, status) { throw new ServiceError(code, message, status); }
export function cryptoApi() {
  if (!globalThis.crypto?.subtle) reject('CRYPTO_UNAVAILABLE', 'El servicio seguro no está disponible.', 503);
  return globalThis.crypto;
}
export function nowMilliseconds(now = Date.now) {
  const value = typeof now === 'function' ? now() : now;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1_000_000_000_000 || value > 8_640_000_000_000_000) reject('INVALID_SERVER_CLOCK', 'No se pudo validar la hora del servidor.', 503);
  return value;
}
export function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
