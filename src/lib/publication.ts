import type { MediaItem } from '../data/types';

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
