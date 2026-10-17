import { collection, doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { requireConnectedGallery } from './firebase';

export type StudioAuthor = 'Ale' | 'Val';
export type StudioLetter = { id: string; title: string; body: string; author: StudioAuthor; tag: 'Para hoy' | 'Abre cuando'; occasion: string; createdAt: string };
export type StudioSong = { id: string; title: string; artist: string; note: string; author: StudioAuthor; url: string; kind: 'track' | 'playlist' | 'album'; createdAt: string };
export const planCategories = ['Una cita', 'Una aventura', 'En casita', 'Por descubrir'] as const;
export type StudioPlan = { id: string; title: string; note: string; category: typeof planCategories[number]; date: string; done: boolean; createdAt: string; author?: StudioAuthor };
export type StudioRecords = { letters: StudioLetter; songs: StudioSong; plans: StudioPlan };
export type StudioCollection = keyof StudioRecords;
export type SharedStudio<T> = T & { createdBy: string; schemaVersion: 1; savedAt: Timestamp; updatedAt?: Timestamp };
export type StudioRow<T> = { item: T; scope: 'local' | 'shared'; hasLocalCopy: boolean; localId?: string };
export const STUDIO_PROJECT = 'lezz-val-universo';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = { letters: ['id', 'title', 'body', 'author', 'tag', 'occasion', 'createdAt'], songs: ['id', 'title', 'artist', 'note', 'author', 'url', 'kind', 'createdAt'], plans: ['id', 'title', 'note', 'category', 'date', 'done', 'createdAt', 'author'] } as const;
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
const text = (value: unknown, max: number, required = true): value is string => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const author = (value: unknown) => value === 'Ale' || value === 'Val';
const iso = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  return new Date(value).toISOString() === value.replace(/(?:\.(\d{1,3}))?Z$/, (_, ms: string | undefined) => `.${(ms ?? '').padEnd(3, '0')}Z`);
};
export function validPlanDate(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return value >= '1900-01-01' && value <= '2200-12-31' && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function spotifyLink(raw: string): { url: string; kind: StudioSong['kind'] } | null {
  try {
    const url = new URL(raw.trim());
    if (raw.length > 500 || url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-zA-Z-]+\/)?(track|playlist|album)\/([a-zA-Z0-9]{1,100})\/?$/);
    return match ? { url: `https://open.spotify.com/${match[1]}/${match[2]}`, kind: match[1] as StudioSong['kind'] } : null;
  } catch { return null; }
}
/** Permissive presentation of historical drafts; never rewrites or discards their raw storage. */
export function localStudioRecords<K extends StudioCollection>(kind: K, raw: unknown): StudioRecords[K][] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is StudioRecords[K] => {
    if (!object(item) || !['id', 'title', 'createdAt'].every(key => typeof item[key] === 'string')) return false;
    if (kind === 'letters') return typeof item.body === 'string' && typeof item.occasion === 'string' && author(item.author) && ['Para hoy', 'Abre cuando'].includes(String(item.tag));
    if (kind === 'songs') return ['artist', 'note', 'url'].every(key => typeof item[key] === 'string') && author(item.author) && !!spotifyLink(String(item.url)) && ['track', 'playlist', 'album'].includes(String(item.kind));
    return typeof item.note === 'string' && typeof item.date === 'string' && typeof item.done === 'boolean' && planCategories.includes(item.category as StudioPlan['category']) && (item.author === undefined || author(item.author));
  });
}
/** Exact outbound schema. It copies known properties and never spreads untrusted draft metadata. */
export function validateStudioDraft<K extends StudioCollection>(kind: K, value: unknown): StudioRecords[K] {
  if (!object(value) || Object.keys(value).some(key => !(fields[kind] as readonly string[]).includes(key)) || !uuid.test(String(value.id)) || !iso(value.createdAt) || new Date(value.createdAt).toISOString() !== value.createdAt) throw new Error('El borrador no tiene un identificador o una fecha válidos.');
  let valid = false;
  if (kind === 'letters') valid = text(value.title, 100) && text(value.body, 12000) && author(value.author) && ['Para hoy', 'Abre cuando'].includes(String(value.tag)) && text(value.occasion, 120, value.tag === 'Abre cuando') && (value.tag !== 'Para hoy' || value.occasion === '');
  if (kind === 'songs') {
    const link = typeof value.url === 'string' ? spotifyLink(value.url) : null;
    valid = text(value.title, 140) && text(value.artist, 120) && text(value.note, 2000) && author(value.author) && !!link && link.url === value.url && link.kind === value.kind;
  }
  if (kind === 'plans') valid = text(value.title, 140) && text(value.note, 2000, false) && author(value.author) && planCategories.includes(value.category as StudioPlan['category']) && validPlanDate(value.date) && typeof value.done === 'boolean';
  if (!valid) throw new Error('Revisa los campos y sus límites antes de compartir.');
  return Object.fromEntries(fields[kind].map(key => [key, value[key]])) as StudioRecords[K];
}
export function parseSharedStudio<K extends StudioCollection>(kind: K, id: string, raw: unknown): SharedStudio<StudioRecords[K]> {
  const allowed = [...fields[kind], 'createdBy', 'schemaVersion', 'savedAt', ...(kind === 'plans' ? ['updatedAt'] : [])];
  if (!object(raw) || Object.keys(raw).some(key => !allowed.includes(key)) || raw.id !== id || !text(raw.createdBy, 128) || raw.schemaVersion !== 1 || !(raw.savedAt instanceof Timestamp) || (raw.updatedAt !== undefined && !(raw.updatedAt instanceof Timestamp))) throw new Error('Hay un registro compartido con formato incompatible. Tus datos locales se conservan.');
  const draft = Object.fromEntries(fields[kind].map(key => [key, raw[key]]));
  validateStudioDraft(kind, draft);
  return { ...draft, createdBy: raw.createdBy, schemaVersion: 1, savedAt: raw.savedAt, ...(raw.updatedAt ? { updatedAt: raw.updatedAt } : {}) } as SharedStudio<StudioRecords[K]>;
}
export function connectedStudioUid(namespace: string): string | null { const match = /^nh:user:([^:\s/]{1,128})$/.exec(namespace); return match?.[1] ?? null; }
export function assertStudioIdentity(namespace: string, identity: { uid: string | undefined; projectId: string | undefined; dbProjectId: string | undefined }): void {
  const expected = connectedStudioUid(namespace);
  if (!expected || identity.uid !== expected || identity.projectId !== STUDIO_PROJECT || identity.dbProjectId !== STUDIO_PROJECT) throw new Error('La sesión cambió. Abre de nuevo este apartado antes de compartir.');
}
function context(namespace: string) {
  const current = requireConnectedGallery();
  assertStudioIdentity(namespace, { uid: current.auth.currentUser?.uid, projectId: current.auth.app.options.projectId, dbProjectId: current.db.app.options.projectId });
  return current;
}
/** Legacy local IDs get a stable UUIDv5; the original local record is left intact. */
export async function sharedDraftId(namespace: string, kind: StudioCollection, item: { id: string; createdAt: string }): Promise<string> {
  if (uuid.test(item.id)) return item.id.toLowerCase();
  const uid = connectedStudioUid(namespace);
  if (!uid) return item.id;
  const namespaceBytes = Uint8Array.from([0x2f, 0xcb, 0xb6, 0xe2, 0xe0, 0x2a, 0x5a, 0xab, 0x91, 0x6f, 0xa0, 0x5f, 0x91, 0x76, 0xe2, 0x35]);
  const name = new TextEncoder().encode(JSON.stringify([uid, kind, item.id, item.createdAt]));
  const bytes = new Uint8Array(namespaceBytes.length + name.length); bytes.set(namespaceBytes); bytes.set(name, namespaceBytes.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16); hash[6] = (hash[6] & 15) | 0x50; hash[8] = (hash[8] & 63) | 0x80;
  const hex = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function prepareStudioDraft<K extends StudioCollection>(namespace: string, kind: K, item: StudioRecords[K], selectedAuthor?: StudioAuthor): Promise<StudioRecords[K]> {
  const draft = Object.fromEntries(fields[kind].map(key => [key, (item as unknown as Record<string, unknown>)[key]]));
  draft.id = await sharedDraftId(namespace, kind, item);
  if (!iso(item.createdAt)) throw new Error('La fecha del borrador no es válida para compartir. La copia local se conserva.');
  draft.createdAt = new Date(item.createdAt).toISOString();
  if (kind === 'plans' && !author(draft.author) && selectedAuthor) draft.author = selectedAuthor;
  if (kind === 'songs' && typeof draft.url === 'string') draft.url = spotifyLink(draft.url)?.url ?? draft.url;
  return validateStudioDraft(kind, draft);
}
export function mergeStudioRecords<T extends { id: string; createdAt: string }>(local: readonly T[], shared: readonly T[], ids: ReadonlyMap<string, string> = new Map()): StudioRow<T>[] {
  const remote = new Map(shared.map(item => [item.id, item]));
  const seen = new Set<string>(); const rows: StudioRow<T>[] = [];
  for (const item of local) {
    const id = ids.get(item.id) ?? item.id;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ item: remote.get(id) ?? item, scope: remote.has(id) ? 'shared' : 'local', hasLocalCopy: true, localId: item.id });
  }
  for (const item of shared) if (!seen.has(item.id)) { seen.add(item.id); rows.push({ item, scope: 'shared', hasLocalCopy: false }); }
  return rows.sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
}
export function prependStudioLocal<T extends { id: string }>(raw: unknown, item: T): unknown {
  if (!Array.isArray(raw)) throw new Error('El almacenamiento local tiene otro formato. Exporta una copia antes de modificarlo.');
  return raw.some(value => object(value) && value.id === item.id) ? raw : [item, ...raw];
}
export function toggleStudioLocalPlan(raw: unknown, id: string, done: boolean): unknown {
  if (!Array.isArray(raw)) throw new Error('El almacenamiento local tiene otro formato. Exporta una copia antes de modificarlo.');
  return raw.map(item => object(item) && item.id === id && typeof item.done === 'boolean' ? { ...item, done } : item);
}
/** A retry is a no-op only for the same author and immutable content. No existing doc is ever rewritten. */
export function assertIdempotentStudioCreate<K extends StudioCollection>(kind: K, existing: unknown, desired: StudioRecords[K], uid: string): void {
  const record = parseSharedStudio(kind, desired.id, existing);
  if (record.createdBy !== uid || fields[kind].some(key => key !== 'done' && (record as unknown as Record<string, unknown>)[key] !== (desired as unknown as Record<string, unknown>)[key])) throw new Error('Ese identificador ya pertenece a otro contenido. No se ha sobrescrito.');
}
export function studioError(error: unknown): string {
  const code = object(error) && typeof error.code === 'string' ? error.code : '';
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'No tienes permiso para sincronizar este apartado. El borrador sigue aquí; revisa la sesión y vuelve a intentarlo.';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'No pudimos confirmar el guardado. Conservamos el formulario; vuelve a intentarlo al recuperar la conexión.';
  return error instanceof Error && !code ? error.message : 'No pudimos confirmar la sincronización. Tus datos locales y el formulario se conservan.';
}
export function watchStudio<K extends StudioCollection>(namespace: string, kind: K, onData: (items: SharedStudio<StudioRecords[K]>[], cached: boolean) => void, onError: (message: string) => void): () => void {
  try {
    const { db } = context(namespace);
    return onSnapshot(collection(db, kind), { includeMetadataChanges: true }, snapshot => {
      try {
        context(namespace);
        // Pending local writes do not count as confirmed shared content.
        if (snapshot.metadata.hasPendingWrites) return;
        onData(snapshot.docs.map(item => parseSharedStudio(kind, item.id, item.data())), snapshot.metadata.fromCache);
      } catch (error) { onError(studioError(error)); }
    }, error => onError(studioError(error)));
  } catch (error) { onError(studioError(error)); return () => {}; }
}
export async function createStudioRecord<K extends StudioCollection>(namespace: string, kind: K, value: StudioRecords[K]): Promise<SharedStudio<StudioRecords[K]>> {
  const desired = validateStudioDraft(kind, value);
  const { db, user } = context(namespace); const ref = doc(db, kind, desired.id);
  await runTransaction(db, async transaction => {
    context(namespace);
    const existing = await transaction.get(ref);
    context(namespace);
    if (existing.exists()) { assertIdempotentStudioCreate(kind, existing.data(), desired, user.uid); return; }
    transaction.set(ref, { ...desired, createdBy: user.uid, schemaVersion: 1, savedAt: serverTimestamp() });
  });
  context(namespace);
  const confirmed = await getDocFromServer(ref);
  context(namespace);
  if (!confirmed.exists()) throw new Error('No pudimos confirmar el registro compartido. Puedes reintentar sin duplicarlo.');
  return parseSharedStudio(kind, confirmed.id, confirmed.data());
}
export async function setSharedPlanDone(namespace: string, id: string, done: boolean): Promise<SharedStudio<StudioPlan>> {
  if (!uuid.test(id) || typeof done !== 'boolean') throw new Error('El plan no tiene un formato válido.');
  const { db } = context(namespace); const ref = doc(db, 'plans', id);
  await updateDoc(ref, { done, updatedAt: serverTimestamp() });
  context(namespace);
  const confirmed = await getDocFromServer(ref); context(namespace);
  if (!confirmed.exists()) throw new Error('No pudimos confirmar el cambio del plan.');
  return parseSharedStudio('plans', confirmed.id, confirmed.data());
}
