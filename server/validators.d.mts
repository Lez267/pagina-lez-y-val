export const MAX_REQUEST_BYTES: 500;
export const IMAGE_BYTE_LIMIT: number;
export const VIDEO_BYTE_LIMIT: number;
export const BATCH_BYTE_LIMIT: number;
export type UploadDeclaration = Readonly<{ kind: 'image' | 'video'; bytes: number }>;
export function validUid(value: unknown): value is string;
export function parseAllowedUids(value: unknown): Set<string>;
export function validateUploadDeclaration(value: unknown): UploadDeclaration;
export function parseUploadRequest(raw: string | Uint8Array): UploadDeclaration;
