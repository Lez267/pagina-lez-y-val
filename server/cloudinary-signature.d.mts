export const EXPECTED_CLOUD_NAME: 'dc7x4qjzu';
export const UPLOAD_NAMESPACE: 'nuestro-universo';
export const IMAGE_FORMATS: readonly string[];
export const VIDEO_FORMATS: readonly string[];
export type UploadEnvironment = { CLOUDINARY_CLOUD_NAME?: string; CLOUDINARY_API_KEY?: string; CLOUDINARY_API_SECRET?: string; CLOUDINARY_FOLDER_MODE?: string; FIREBASE_ALLOWED_UIDS?: string; [key: string]: unknown };
export type UploadSignature = Readonly<{ uploadUrl: string; cloudName: string; resourceType: 'image' | 'video'; apiKey: string; params: Readonly<Record<string, string>>; signature: string; signatureAlgorithm: 'sha256'; declaredBytes: number; byteValidation: 'declaration-only'; expiresAt: number }>;
export function uploadConfigurationReady(env: UploadEnvironment | undefined): boolean;
export function getUploadStatus(env: UploadEnvironment | undefined): Readonly<{ ready: boolean }>;
export function buildUploadSignature(options: { uid: string; kind: 'image' | 'video'; bytes: number; env: UploadEnvironment; now?: number | (() => number); randomId?: () => string }): Promise<UploadSignature>;
