export class ServiceError extends Error { code: string; status: number; statusCode: number; constructor(code: string, message: string, status?: number); }
export function reject(code: string, message: string, status?: number): never;
export function cryptoApi(): Crypto;
export function nowMilliseconds(now?: number | (() => number)): number;
export function record(value: unknown): value is Record<string, unknown>;
