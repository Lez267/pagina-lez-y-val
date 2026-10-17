import type { MediaItem, Memory } from './types';

type RecordData = Record<string, unknown>;

const asRecord = (value: unknown): RecordData =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordData
    : {};

const text = (value: unknown): string => typeof value === 'string' ? value : '';

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string')
    .map(item => item.trim()).filter(Boolean))];
}

function calendarDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(input);
  if (!match) return '';
  if (input.length > 10 && !Number.isFinite(Date.parse(input))) return '';
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? date : '';
}

function timestampDate(value: unknown): string {
  if (typeof value === 'string') return calendarDate(value);
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? calendarDate(value.toISOString()) : '';
  }
  const record = asRecord(value);
  const seconds = record.seconds ?? record._seconds;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '';
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? calendarDate(date.toISOString()) : '';
}

function safeMediaUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) {
      return url.href;
    }
    // Object URLs created by the browser have a concrete HTTP(S) origin.
    if (url.protocol === 'blob:' && /^https?:\/\//.test(url.pathname) && url.origin !== 'null') {
      return url.href;
    }
  } catch { /* An invalid URL is not rendered, but its memory is retained. */ }
  return '';
}

function mediaType(value: unknown, url: string): MediaItem['type'] {
  if (typeof value === 'string' && value.toLowerCase().includes('video')) return 'video';
  if (/\/video\/|\.(?:mp4|mov|webm|m4v|avi)(?:[?#]|$)/i.test(url)) return 'video';
  return 'image';
}

/** Preserve metadata as plain text. Consumers must render it as text, not HTML. */
export function normalizeMemory(id: string, raw: unknown, source: Memory['source'] = 'firebase'): Memory {
  const record = asRecord(raw);
  const description = text(record.description);
  const date = calendarDate(record.photoDate) || calendarDate(record.date) || timestampDate(record.createdAt);
  const derivedTitle = description.replace(/\s+/g, ' ').trim();
  const title = text(record.title).trim() ||
    (derivedTitle ? Array.from(derivedTitle).slice(0, 64).join('') + (Array.from(derivedTitle).length > 64 ? '…' : '') : 'Recuerdo sin título');

  const candidates: unknown[] = Array.isArray(record.media) ? [...record.media] : [];
  // Some edited legacy documents have both formats. Keep every distinct file.
  if (typeof record.url === 'string') candidates.push({ url: record.url, type: record.type, storagePath: record.storagePath });
  const media: MediaItem[] = [];
  const seenUrls = new Map<string, MediaItem>();
  for (const candidate of candidates) {
    const item = typeof candidate === 'string' ? { url: candidate } : asRecord(candidate);
    const url = safeMediaUrl(item.url);
    if (!url) continue;
    const storagePath = text(item.storagePath);
    const duplicate = seenUrls.get(url);
    if (duplicate) {
      if (!duplicate.storagePath && storagePath) duplicate.storagePath = storagePath;
      if (mediaType(item.type, url) === 'video') duplicate.type = 'video';
      continue;
    }
    const normalized: MediaItem = { id: `${id}-media-${media.length + 1}`, url, type: mediaType(item.type, url), ...(storagePath ? { storagePath } : {}) };
    seenUrls.set(url, normalized);
    media.push(normalized);
  }

  return {
    id, title, description, date, location: text(record.location),
    tags: stringList(record.tags), album: text(record.album), author: text(record.author),
    media, favorites: stringList(record.favorites), source,
  };
}

/** Import is local only. Supports the existing gallery backup and named containers. */
export function normalizeImport(data: unknown): Memory[] {
  const container = asRecord(data);
  const records = Array.isArray(data) ? data :
    Array.isArray(container.memories) ? container.memories :
    Array.isArray(container.items) ? container.items :
    Array.isArray(container.records) ? container.records : null;
  if (!records) throw new Error('El archivo debe contener una lista de recuerdos o un objeto con memories.');
  const usedIds = new Set<string>();
  return records.map((raw, index) => {
    const baseId = text(asRecord(raw).id).trim() || `import-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return normalizeMemory(id, raw, 'import');
  });
}
