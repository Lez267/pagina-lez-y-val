import type { MediaItem } from '../data/types';

const canonicalUpload = /^https:\/\/res\.cloudinary\.com\/dc7x4qjzu\/(image|video)\/upload\/v[0-9]{1,20}\/(nuestro-universo\/[0-9a-f]{24}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.[A-Za-z0-9]{1,8})?$/;

/** The canonical URL contains the media kind and Cloudinary public ID. */
export function decodePublicationMedia(value: unknown): Omit<MediaItem, 'id'> | null {
  if (typeof value !== 'string') return null;
  const match = canonicalUpload.exec(value);
  return match ? { url: value, type: match[1] as MediaItem['type'], storagePath: match[2] } : null;
}

/** Compact new records avoid repeating data already encoded by the asset URL.
 * The display adapter reconstructs the same IDs, types and public IDs on read.
 */
export function encodePublicationMedia(memoryId: string, uploaded: readonly MediaItem[], coverIndex: number) {
  const items = newPublicationMedia(memoryId, uploaded);
  if (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= items.length) throw new Error('Elige una portada válida.');
  for (const item of items) {
    const decoded = decodePublicationMedia(item.url);
    if (!decoded || decoded.type !== item.type || decoded.storagePath !== item.storagePath) throw new Error('No se pudo comprobar el archivo que se va a publicar.');
  }
  const urls = items.map(item => item.url);
  if (new Set(urls).size !== urls.length) throw new Error('El mismo archivo aparece más de una vez en esta publicación.');
  return { schemaVersion: 2 as const, media: urls, coverMediaId: items[coverIndex].id };
}

/** Construct unique media IDs within a new post without touching asset URLs.
 * Existing publications never pass through this builder.
 */
export function newPublicationMedia(memoryId: string, uploaded: readonly MediaItem[]): MediaItem[] {
  if (!/^[A-Za-z0-9]{20}$/.test(memoryId) || uploaded.length < 1 || uploaded.length > 20) throw new Error('La nueva publicación no tiene un identificador o un número de archivos válido.');
  return uploaded.map((item, index) => ({
    id: `${memoryId}-media-${index + 1}`, url: item.url, type: item.type,
    ...(item.storagePath !== undefined ? { storagePath: item.storagePath } : {}),
  }));
}

/** Compare a retry against a saved publication, independent of map key order.
 * Arrays retain their order: a different media sequence is different content.
 */
export function samePublicationValue(saved: unknown, expected: unknown): boolean {
  if (saved === expected) return true;
  if (saved === null || expected === null || typeof saved !== 'object' || typeof expected !== 'object') return false;
  if (Array.isArray(saved) || Array.isArray(expected)) {
    return Array.isArray(saved) && Array.isArray(expected) && saved.length === expected.length
      && saved.every((value, index) => samePublicationValue(value, expected[index]));
  }
  const left = saved as Record<string, unknown>, right = expected as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length
    && Object.entries(right).every(([key, value]) => Object.hasOwn(left, key) && samePublicationValue(left[key], value));
}
