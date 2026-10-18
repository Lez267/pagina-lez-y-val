import type { MediaItem, Memory } from '../data/types';
import { KNOWN_ALE_UIDS, KNOWN_VALERIA_UIDS } from './game-progression';

/** Publication time is separate from the day the photo was taken. */
export type GalleryTimestamp = string | number | Date | { seconds: number; nanoseconds?: number } | { _seconds: number };
export type GalleryReminder = { enabled: boolean; date: string; label: string; repeat: 'once' | 'yearly' };
export type GalleryMemory = Omit<Memory, 'createdAt' | 'coverMediaId' | 'reminder'> & { createdAt?: GalleryTimestamp; coverMediaId?: string; reminder?: GalleryReminder };
export type GalleryMetadata = Pick<Memory, 'title' | 'description' | 'date' | 'location' | 'tags' | 'album' | 'author'> & { reminder?: GalleryReminder };
/** Existing files are reordered, never removed or modified by the editor. */
export type GalleryEdit = GalleryMetadata & { coverMediaId?: string; media: MediaItem[] };
/** Browser files are passed only to the injected service, never uploaded here. */
export type GalleryPublication = GalleryMetadata & { files: File[]; coverIndex: number };
export type GalleryCallbacks = {
  onEdit?: (id: string, changes: GalleryEdit) => Promise<void> | void;
  onPublish?: (publication: GalleryPublication) => Promise<void> | void;
};
export type GalleryAlbum = { name: string; memories: GalleryMemory[]; cover?: MediaItem; fileCount: number };
export type GalleryUpcomingReminder = { memory: GalleryMemory; reminder: GalleryReminder; nextDate: string; daysAway: number };
export const GALLERY_TIME_ZONE = 'America/Mexico_City';
export const GALLERY_MAX_FILES = 20;
export const GALLERY_MAX_TOTAL_BYTES = 250 * 1024 * 1024;

/** Only render media URLs; this does not assert that a remote asset is private. */
export function safeGalleryMediaUrl(value: string): string | undefined {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
    if (url.protocol === 'blob:' && /^https?:\/\//.test(url.pathname) && url.origin !== 'null') return url.href;
  } catch { /* Invalid values produce a placeholder, never an active link. */ }
  return undefined;
}

export function validGalleryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function galleryToday(now = new Date(), timeZone = GALLERY_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value ?? '').join('-');
}
export function galleryDateLabel(date: string): string {
  return validGalleryDate(date) ? new Date(`${date}T12:00:00.000Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha';
}
export function publicationMillis(value?: GalleryTimestamp): number | null {
  if (value === undefined || value === null) return null;
  let result: number;
  if (value instanceof Date) result = value.getTime();
  else if (typeof value === 'number') result = value;
  else if (typeof value === 'string') result = Date.parse(value);
  else if ('seconds' in value) result = value.seconds * 1000;
  else result = value._seconds * 1000;
  return Number.isFinite(result) ? result : null;
}
export function recentGalleryStories(memories: GalleryMemory[], now = new Date(), days = 7): GalleryMemory[] {
  const current = now.getTime();
  return memories.filter(memory => {
    const published = publicationMillis(memory.createdAt);
    return published !== null && published <= current && current - published < days * 86400000;
  }).sort((a, b) => publicationMillis(b.createdAt)! - publicationMillis(a.createdAt)!);
}
export function galleryStoryAge(memory: GalleryMemory, now = new Date()): string {
  const published = publicationMillis(memory.createdAt);
  if (published === null) return 'Sin fecha de publicación';
  const hours = Math.floor(Math.max(0, now.getTime() - published) / 3600000);
  return hours < 1 ? 'Hace un momento' : hours < 24 ? `Hace ${hours} h` : `Hace ${Math.floor(hours / 24)} ${Math.floor(hours / 24) === 1 ? 'día' : 'días'}`;
}
export function galleryOnThisDay(memories: GalleryMemory[], today = galleryToday()): GalleryMemory[] {
  if (!validGalleryDate(today)) return [];
  return memories.filter(memory => validGalleryDate(memory.date) && memory.date.slice(5) === today.slice(5) && memory.date.slice(0, 4) < today.slice(0, 4)).sort((a, b) => b.date.localeCompare(a.date));
}
export function galleryCover(memory?: GalleryMemory): MediaItem | undefined {
  if (!memory || !Array.isArray(memory.media)) return undefined;
  return memory.media.find(media => media.id === memory.coverMediaId) ?? memory.media[0];
}
export function galleryWithCoverFirst(media: MediaItem[], coverId?: string): MediaItem[] {
  const index = media.findIndex(item => item.id === coverId);
  if (index <= 0) return [...media];
  return [media[index], ...media.filter((_, itemIndex) => itemIndex !== index)];
}
export function galleryAlbums(memories: GalleryMemory[]): GalleryAlbum[] {
  const groups = new Map<string, GalleryMemory[]>();
  for (const memory of memories) {
    const name = memory.album.trim();
    if (name) groups.set(name, [...(groups.get(name) ?? []), memory]);
  }
  return Array.from(groups, ([name, items]) => {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    return { name, memories: sorted, cover: galleryCover(sorted.find(item => item.media.length > 0) ?? sorted[0]), fileCount: items.reduce((count, item) => count + item.media.length, 0) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function isAleFavoriteMemory(memory: { favorites?: string[] }, aleUid?: string): boolean {
  if (!memory.favorites || !Array.isArray(memory.favorites)) return false;
  return memory.favorites.some(fav => {
    if (typeof fav !== 'string') return false;
    const lower = fav.trim().toLowerCase();
    if (lower === 'ale' || lower === 'alejandro' || lower === 'lezz') return true;
    if (fav === '798325c978231df073b118795facaa91392bba25f9d3e4a86b77666977495a2e') return true;
    if (KNOWN_ALE_UIDS.includes(fav)) return true;
    if (aleUid && fav === aleUid) return true;
    return false;
  });
}

export function isValFavoriteMemory(memory: { favorites?: string[] }, valUid?: string): boolean {
  if (!memory.favorites || !Array.isArray(memory.favorites)) return false;
  return memory.favorites.some(fav => {
    if (typeof fav !== 'string') return false;
    const lower = fav.trim().toLowerCase();
    if (lower === 'val' || lower === 'valeria' || lower === 'vale') return true;
    if (fav === '57c7f9e9a1bbf5f4aa8758a639193393cdeafed5b84bc5ce2246a1f525835f1b' || fav === '51a62b09d3405f16d9b2ef14bb63e5b84b01e9f93497c1416f538e1d5ca61165') return true;
    if (KNOWN_VALERIA_UIDS.includes(fav)) return true;
    if (valUid && fav === valUid) return true;
    return false;
  });
}

export function nextGalleryReminder(reminder: GalleryReminder, today = galleryToday()): string | null {
  if (!reminder.enabled || !validGalleryDate(reminder.date) || !validGalleryDate(today)) return null;
  if (reminder.repeat === 'once') return reminder.date >= today ? reminder.date : null;
  const firstYear = Math.max(Number(today.slice(0, 4)), Number(reminder.date.slice(0, 4)));
  for (let year = firstYear; year <= firstYear + 8; year++) {
    const candidate = `${year}-${reminder.date.slice(5)}`;
    if (validGalleryDate(candidate) && candidate >= today) return candidate;
  }
  return null;
}
export function upcomingGalleryReminders(memories: GalleryMemory[], today = galleryToday(), withinDays = 30): GalleryUpcomingReminder[] {
  if (!validGalleryDate(today)) return [];
  return memories.flatMap(memory => {
    if (!memory.reminder) return [];
    const nextDate = nextGalleryReminder(memory.reminder, today);
    if (!nextDate) return [];
    const daysAway = Math.round((Date.parse(`${nextDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
    return daysAway <= withinDays ? [{ memory, reminder: memory.reminder, nextDate, daysAway }] : [];
  }).sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}
export function validateGalleryMetadata(input: GalleryMetadata): string[] {
  const errors: string[] = [];
  if (!input.title.trim() || input.title.length > 160) errors.push('Escribe un título de hasta 160 caracteres.');
  if (input.description.length > 12000) errors.push('La descripción puede tener hasta 12 000 caracteres.');
  if (input.date && !validGalleryDate(input.date)) errors.push('Elige una fecha válida para el recuerdo.');
  if (input.location.length > 200 || input.album.length > 100 || input.author.length > 100) errors.push('Revisa la longitud del lugar, álbum o autor.');
  if (input.tags.length > 12 || input.tags.some(tag => tag.length > 40)) errors.push('Usa como máximo 12 etiquetas de hasta 40 caracteres.');
  if (input.reminder?.enabled && (!validGalleryDate(input.reminder.date) || !input.reminder.label.trim() || input.reminder.label.length > 120)) errors.push('El recordatorio necesita una fecha válida y un nombre de hasta 120 caracteres.');
  return errors;
}
export function validateGalleryFiles(files: Pick<File, 'name' | 'type' | 'size'>[]): string[] {
  if (!files.length) return ['Elige al menos una foto o un video.'];
  if (files.length > GALLERY_MAX_FILES) return [`Puedes preparar hasta ${GALLERY_MAX_FILES} archivos por recuerdo.`];
  if (files.reduce((sum, file) => sum + file.size, 0) > GALLERY_MAX_TOTAL_BYTES) return ['El conjunto de archivos supera los 250 MB.'];
  const errors: string[] = [];
  for (const file of files) {
    const image = /^image\/(jpeg|png|webp|avif|gif)$/.test(file.type);
    const video = /^video\/(mp4|webm|quicktime)$/.test(file.type);
    if (!image && !video) errors.push(`«${file.name}»: usa JPG, PNG, WebP, AVIF, GIF, MP4, WebM o MOV.`);
    else if (file.size <= 0 || file.size > (video ? 100 : 20) * 1024 * 1024) errors.push(`«${file.name}»: el límite es ${video ? 100 : 20} MB y el archivo no puede estar vacío.`);
  }
  return errors;
}
