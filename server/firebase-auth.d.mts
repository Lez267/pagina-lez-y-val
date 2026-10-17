export const FIREBASE_PROJECT_ID: 'lezz-val-universo';
export const FIREBASE_ISSUER: string;
export const GOOGLE_JWKS_URL: string;
export type JwksResult = { keys: JsonWebKey[]; maxAgeSeconds?: number };
export type JwksFetcher = (url: string, options?: { signal?: AbortSignal }) => Promise<JwksResult>;
export type FirebasePrincipal = Readonly<{ uid: string; provider: 'google.com'; authTime: number; issuedAt: number; expiresAt: number }>;
export function verifyFirebaseToken(token: string, options: { allowedUids: unknown; fetchJwks: JwksFetcher; now?: number | (() => number) }): Promise<FirebasePrincipal>;
