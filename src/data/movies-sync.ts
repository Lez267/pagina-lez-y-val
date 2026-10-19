import { collection, doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { requireConnectedGallery } from './firebase';
import { assertStudioIdentity, type StudioAuthor } from './studio-sync';

/** Unknown historical fields remain available to the full JSON backup. */
export interface StudioMovie {
  [key: string]: unknown;
  id: string; title: string; year?: number | string; poster?: string; stars?: string;
  note: string; author: StudioAuthor; watched: boolean; watchedDate?: string;
  createdAt: string; duration?: string; classification?: string; format?: string;
  createdBy?: string; archived?: boolean;
}
export interface MovieReservation {
  [key: string]: unknown;
  id?: string; movieId: string; movieTitle: string; poster?: string; dateName: string;
  showDate?: string; showtime: string; reservedAt: string; createdBy?: string;
  status?: 'active' | 'cancelled';
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const safeId = /^[a-zA-Z0-9_-]{1,128}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number, required = false): value is string => typeof value === 'string' && value.length <= max && (!required || !!value.trim());
const iso = (value: unknown): value is string => typeof value === 'string' && value.length <= 35 && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function validCinemaDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return value >= '1900-01-01' && value <= '2300-12-31' && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function posterUrl(value: unknown): boolean {
  if (!text(value, 2048, true)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port; } catch { return false; }
}
const optionalText = (value: unknown): string | undefined => typeof value === 'string' && value ? value : undefined;
export function parseFirestoreMovie(id: string, raw: unknown): StudioMovie {
  const data = object(raw) ? raw : {};
  return { ...data, id: id || String(data.id || ''), title: String(data.title || ''),
    year: typeof data.year === 'number' || typeof data.year === 'string' ? data.year : undefined,
    poster: optionalText(data.poster), stars: optionalText(data.stars), note: String(data.note || ''),
    author: data.author === 'Val' ? 'Val' : 'Ale', watched: data.watched === true,
    watchedDate: optionalText(data.watchedDate), createdAt: String(data.createdAt || ''),
    duration: optionalText(data.duration), classification: optionalText(data.classification), format: optionalText(data.format),
    createdBy: optionalText(data.createdBy), archived: data.archived === true };
}
export function parseFirestoreReservation(id: string, raw: unknown): MovieReservation {
  const data = object(raw) ? raw : {};
  return { ...data, id, movieId: String(data.movieId || id), movieTitle: String(data.movieTitle || ''),
    poster: optionalText(data.poster), dateName: String(data.dateName || ''), showDate: optionalText(data.showDate),
    showtime: String(data.showtime || ''), reservedAt: String(data.reservedAt || ''),
    createdBy: optionalText(data.createdBy), status: data.status === 'cancelled' ? 'cancelled' : 'active' };
}
export function localCinemaMovies(raw: unknown): StudioMovie[] {
  return Array.isArray(raw) ? raw.filter(item => object(item) && text(item.id, 128, true) && text(item.title, 200, true)).map(item => parseFirestoreMovie(item.id, item)) : [];
}
export function localCinemaReservations(raw: unknown): Record<string, MovieReservation> {
  if (!object(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, item]) => safeId.test(id) && object(item) && text(item.movieTitle, 200, true) && text(item.showtime, 40, true)).map(([id, item]) => [id, parseFirestoreReservation(id, item)]));
}
/** A snapshot is a source of confirmed values, never an instruction to erase local drafts. */
export function mergeCinemaMovies(local: readonly StudioMovie[], shared: readonly StudioMovie[]): StudioMovie[] {
  const merged = new Map(local.map(item => [item.id, item]));
  for (const item of shared) merged.set(item.id, item);
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function mergeCinemaReservations(local: Record<string, MovieReservation>, shared: Record<string, MovieReservation>): Record<string, MovieReservation> { return { ...local, ...shared }; }
export function activeCinemaReservations(raw: Record<string, MovieReservation>): Record<string, MovieReservation> {
  const result: Record<string, MovieReservation> = Object.create(null);
  for (const item of Object.values(raw).sort((a, b) => a.reservedAt.localeCompare(b.reservedAt))) if (item.status !== 'cancelled') result[item.movieId] = item;
  return result;
}
export function cinemaDateOptions(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(item => item.type === name)?.value ?? '';
  const base = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(base); day.setUTCDate(base.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    const dayWeek = offset === 0 ? 'HOY' : new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(day).replace('.', '').toUpperCase();
    const dayNum = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(day).replace('.', '').toUpperCase();
    return { id: date, date, dayWeek, dayNum, label: `${dayWeek} ${dayNum}` };
  });
}
export function cinemaToday(now = new Date()): string { return cinemaDateOptions(now)[0].date; }
function clean(fields: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)); }
export function movieCreateFields(movie: StudioMovie): Record<string, unknown> {
  if (!safeId.test(movie.id) || !text(movie.title, 200, true) || !text(movie.note, 10000) || !['Ale', 'Val'].includes(movie.author) || typeof movie.watched !== 'boolean' || !iso(movie.createdAt)) throw new Error('Revisa título, nota y fecha de la película. La copia local se conserva.');
  if ((movie.year !== undefined && !(text(movie.year, 10) || (typeof movie.year === 'number' && Number.isInteger(movie.year) && movie.year >= 1880 && movie.year <= 2300))) || (movie.poster !== undefined && !posterUrl(movie.poster)) || (movie.stars !== undefined && !text(movie.stars, 1000)) || (movie.watchedDate !== undefined && !validCinemaDate(movie.watchedDate)) || (movie.duration !== undefined && !text(movie.duration, 80)) || (movie.classification !== undefined && !text(movie.classification, 40)) || (movie.format !== undefined && !text(movie.format, 80))) throw new Error('Revisa los campos opcionales y usa un póster HTTPS sin credenciales. La copia local se conserva.');
  return clean({ id: movie.id, title: movie.title, note: movie.note, author: movie.author, watched: movie.watched, createdAt: movie.createdAt, year: movie.year, poster: movie.poster, stars: movie.stars, watchedDate: movie.watchedDate, duration: movie.duration, classification: movie.classification, format: movie.format });
}
export function reservationCreateFields(reservation: MovieReservation): Record<string, unknown> {
  if (!uuid.test(reservation.id ?? '') || !safeId.test(reservation.movieId) || !text(reservation.movieTitle, 200, true) || !text(reservation.dateName, 100, true) || !validCinemaDate(reservation.showDate) || !text(reservation.showtime, 40, true) || !iso(reservation.reservedAt) || (reservation.poster !== undefined && !posterUrl(reservation.poster))) throw new Error('Revisa película, fecha y horario de la reserva. La copia local se conserva.');
  return clean({ id: reservation.id, movieId: reservation.movieId, movieTitle: reservation.movieTitle, poster: reservation.poster, dateName: reservation.dateName, showDate: reservation.showDate, showtime: reservation.showtime, reservedAt: reservation.reservedAt, status: 'active' });
}
function context(namespace: string) {
  const current = requireConnectedGallery();
  assertStudioIdentity(namespace, { uid: current.auth.currentUser?.uid, projectId: current.auth.app.options.projectId, dbProjectId: current.db.app.options.projectId });
  return current;
}
export function watchFirestoreMovies(namespace: string, onMovies: (movies: StudioMovie[], originals: Record<string, unknown>) => void, onError?: (err: unknown) => void): () => void {
  try {
    const { db } = context(namespace);
    return onSnapshot(collection(db, 'movies'), snapshot => { try { context(namespace); onMovies(snapshot.docs.map(item => parseFirestoreMovie(item.id, item.data())), Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]))); } catch (error) { onError?.(error); } }, error => onError?.(error));
  } catch (error) { onError?.(error); return () => {}; }
}
export function watchFirestoreReservations(namespace: string, onReservations: (reservations: Record<string, MovieReservation>, originals: Record<string, unknown>) => void, onError?: (err: unknown) => void): () => void {
  try {
    const { db } = context(namespace);
    return onSnapshot(collection(db, 'reservations'), snapshot => { try { context(namespace); onReservations(Object.fromEntries(snapshot.docs.map(item => [item.id, parseFirestoreReservation(item.id, item.data())])), Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]))); } catch (error) { onError?.(error); } }, error => onError?.(error));
  } catch (error) { onError?.(error); return () => {}; }
}
async function createOnly(namespace: string, collectionName: 'movies' | 'reservations', id: string, fields: Record<string, unknown>) {
  const { db, user } = context(namespace); const ref = doc(db, collectionName, id);
  await runTransaction(db, async transaction => {
    context(namespace); const existing = await transaction.get(ref); context(namespace);
    if (existing.exists()) {
      const data = existing.data();
      if (data.createdBy !== user.uid || Object.entries(fields).some(([key, value]) => data[key] !== value)) throw new Error('Ese identificador ya tiene otro contenido compartido. No se sobrescribió; conserva y exporta tu copia local.');
      return;
    }
    transaction.set(ref, { ...fields, schemaVersion: 2, createdBy: user.uid, savedAt: serverTimestamp() });
  });
  context(namespace); const confirmed = await getDocFromServer(ref); context(namespace);
  if (!confirmed.exists()) throw new Error('Firebase no confirmó el guardado. Tu copia local se conserva para reintentar.');
  return confirmed;
}
export async function saveMovieToFirestore(namespace: string, movie: StudioMovie): Promise<StudioMovie> {
  const confirmed = await createOnly(namespace, 'movies', movie.id, movieCreateFields(movie));
  return parseFirestoreMovie(confirmed.id, confirmed.data());
}
async function reviseCinema(namespace: string, kind: 'movies' | 'reservations', id: string, changes: Record<string, unknown>) {
  const { db, user } = context(namespace); const ref = doc(db, kind, id); const revisionId = crypto.randomUUID();
  await runTransaction(db, async transaction => {
    context(namespace); const before = await transaction.get(ref); context(namespace);
    if (!before.exists()) throw new Error('El contenido original no está disponible. No se sustituyó.');
    transaction.set(doc(ref, 'revisions', revisionId), { before: before.data(), editedBy: user.uid, savedAt: serverTimestamp() });
    transaction.update(ref, { ...changes, revisionId });
  });
  context(namespace); const confirmed = await getDocFromServer(ref); context(namespace);
  if (!confirmed.exists()) throw new Error('No se confirmó el cambio. El contenido y su historial se conservan.');
  return confirmed;
}
export async function setMovieWatchedInFirestore(namespace: string, id: string, watched: boolean): Promise<StudioMovie> {
  if (!safeId.test(id)) throw new Error('Identificador de película inválido.');
  const confirmed = await reviseCinema(namespace, 'movies', id, { watched, ...(watched ? { watchedDate: cinemaToday() } : {}), updatedAt: serverTimestamp() });
  return parseFirestoreMovie(id, confirmed.data());
}
export async function archiveMovieInFirestore(namespace: string, id: string, archived = true): Promise<StudioMovie> {
  if (!safeId.test(id)) throw new Error('Identificador de película inválido.');
  const { user } = context(namespace);
  const confirmed = await reviseCinema(namespace, 'movies', id, { archived, archivedAt: serverTimestamp(), archivedBy: user.uid });
  return parseFirestoreMovie(id, confirmed.data());
}
export async function saveReservationToFirestore(namespace: string, reservation: MovieReservation): Promise<MovieReservation> {
  const fields = reservationCreateFields(reservation);
  const { db } = context(namespace); const movie = await getDocFromServer(doc(db, 'movies', reservation.movieId)); context(namespace);
  if (!movie.exists()) throw new Error('Comparte primero la película con Firebase. La reserva local se conserva para reintentar.');
  const confirmed = await createOnly(namespace, 'reservations', reservation.id ?? '', fields);
  return parseFirestoreReservation(confirmed.id, confirmed.data());
}
export async function cancelReservationInFirestore(namespace: string, id: string): Promise<MovieReservation> {
  if (!safeId.test(id)) throw new Error('Identificador de reserva inválido.');
  const { user } = context(namespace);
  const confirmed = await reviseCinema(namespace, 'reservations', id, { status: 'cancelled', cancelledAt: serverTimestamp(), cancelledBy: user.uid });
  return parseFirestoreReservation(id, confirmed.data());
}

/** Imported source remains in the pre-import backup; conflicts receive new IDs, never overwrite. */
export function parseCinemaImport(value: unknown, existingMovies: readonly StudioMovie[], existingReservations: Record<string, MovieReservation>, newId: () => string = () => crypto.randomUUID()) {
  const root = object(value) ? value : {};
  const rawMovies = Array.isArray(value) ? value : root.movies ?? root.cartelera;
  const rawReservations = root.reservations ?? {};
  if (!Array.isArray(rawMovies) || rawMovies.length > 2000 || !object(rawReservations) || Object.keys(rawReservations).length > 4000) throw new Error('El respaldo debe incluir una cartelera y como máximo 2000 películas y 4000 reservas.');
  const movieIds = new Set(existingMovies.map(item => item.id)); const reservationIds = new Set(Object.keys(existingReservations));
  const idMapping = new Map<string, string>(); const movies: StudioMovie[] = []; const reservations: Record<string, MovieReservation> = {}; let rejected = 0;
  for (const raw of rawMovies) {
    if (!object(raw) || !text(raw.title, 200, true) || (raw.id !== undefined && !text(raw.id, 128, true)) || (raw.note !== undefined && !text(raw.note, 10000)) || (raw.author !== undefined && !['Ale', 'Val'].includes(String(raw.author))) || (raw.watched !== undefined && typeof raw.watched !== 'boolean')) { rejected++; continue; }
    const originalId = typeof raw.id === 'string' && safeId.test(raw.id) ? raw.id : '';
    const old = existingMovies.find(item => item.id === originalId);
    if (old && JSON.stringify(old) === JSON.stringify(parseFirestoreMovie(originalId, raw))) { idMapping.set(originalId, originalId); continue; }
    const id = originalId && !movieIds.has(originalId) ? originalId : newId(); movieIds.add(id); if (originalId) idMapping.set(originalId, id);
    const item = parseFirestoreMovie(id, { ...raw, ...(originalId && originalId !== id ? { originalId } : {}), createdAt: iso(raw.createdAt) ? raw.createdAt : new Date().toISOString() });
    try { movieCreateFields(item); } catch { rejected++; continue; }
    movies.push(item);
  }
  for (const [key, raw] of Object.entries(rawReservations)) {
    if (!object(raw) || !text(raw.movieId ?? key, 128, true) || !text(raw.movieTitle, 200, true) || !text(raw.showtime, 40, true) || !text(raw.dateName, 100, true) || (raw.showDate !== undefined && !validCinemaDate(raw.showDate)) || (raw.reservedAt !== undefined && !iso(raw.reservedAt)) || (raw.poster !== undefined && !posterUrl(raw.poster))) { rejected++; continue; }
    const originalId = typeof raw.id === 'string' && safeId.test(raw.id) ? raw.id : key;
    const parsed = parseFirestoreReservation(originalId, raw);
    if (existingReservations[originalId] && JSON.stringify(existingReservations[originalId]) === JSON.stringify(parsed)) continue;
    const id = safeId.test(originalId) && !reservationIds.has(originalId) ? originalId : newId(); reservationIds.add(id);
    const movieId = String(raw.movieId || key);
    reservations[id] = { ...parsed, id, movieId: idMapping.get(movieId) ?? movieId, ...(id !== originalId ? { originalId } : {}), reservedAt: iso(raw.reservedAt) ? raw.reservedAt : new Date().toISOString() };
  }
  return { movies, reservations, rejected };
}
