import { arrayRemove, arrayUnion, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { requireConnectedGallery } from './firebase';
import { normalizeMemory } from './normalizer';
import { validGalleryDate, type GalleryEdit } from '../lib/gallery';

const TARGET_PROJECT = 'lezz-val-universo';
// The public legacy app uses these email hashes. No Auth backup data is bundled.
const LEGACY_ALE_HASH = '798325c978231df073b118795facaa91392bba25f9d3e4a86b77666977495a2e';
const LEGACY_VAL_HASHES = ['57c7f9e9a1bbf5f4aa8758a639193393cdeafed5b84bc5ce2246a1f525835f1b', '51a62b09d3405f16d9b2ef14bb63e5b84b01e9f93497c1416f538e1d5ca61165'];

/** Synchronous SHA-256 for compatibility with the existing public alias map.
 * This labels legacy favorites only; Firestore Rules enforce authorization. */
export function legacyEmailDigest(email: string): string {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bytes.length * 8, false);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotate = (value: number, count: number) => (value >>> count) | (value << (32 - count));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>> 0; }
    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i++) { const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0; const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0; h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0; }
    [a,b,c,d,e,f,g,h].forEach((value, i) => { state[i] = (state[i] + value) >>> 0; });
  }
  return state.map(value => value.toString(16).padStart(8, '0')).join('');
}

export function legacyAliasForEmail(email: string | null): 'Alejandro' | 'Valeria' {
  const digest = email ? legacyEmailDigest(email) : '';
  if (digest === LEGACY_ALE_HASH) return 'Alejandro';
  if (LEGACY_VAL_HASHES.includes(digest)) return 'Valeria';
  throw new Error('Esta identidad no tiene un alias autorizado en la galería.');
}

function context() {
  const connected = requireConnectedGallery();
  const { auth, db, user } = connected;
  if (auth.app.options.projectId !== TARGET_PROJECT || db.app.options.projectId !== TARGET_PROJECT || !user.emailVerified || !user.providerData.some(provider => provider.providerId === 'google.com')) {
    throw new Error('La operación requiere la sesión Google verificada de la galería independiente.');
  }
  const assertCurrent = () => {
    if (auth.currentUser !== user || auth.currentUser?.uid !== user.uid) throw new Error('La sesión cambió. Vuelve a abrir la galería.');
  };
  assertCurrent();
  return { ...connected, assertCurrent };
}

function validId(id: string) {
  if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..' || id.length > 500) throw new Error('El identificador del recuerdo no es válido.');
}

export function getCurrentFavoriteKeys(): string[] {
  const { user } = context();
  const alias = legacyAliasForEmail(user.email);
  return [user.uid, alias];
}

type MetadataPatch = {
  title: string; description: string; photoDate: string; location: string; tags: string[];
  album: string; coverMediaId: string;
  reminder?: { enabled: boolean; date: string; label: string; repeat: 'once' | 'yearly' };
};

/** Pure, allowlisted patch builder; it never copies unknown or immutable fields. */
export function buildGalleryMetadataPatch(id: string, original: unknown, changes: GalleryEdit): MetadataPatch {
  validId(id);
  const current = normalizeMemory(id, original, 'firebase');
  const textFields = [['title', 160], ['description', 12000], ['date', 10], ['location', 200], ['album', 100]] as const;
  for (const [key, limit] of textFields) {
    if (typeof changes[key] !== 'string' || changes[key].length > limit) throw new Error('Revisa el formato y la longitud de los detalles del recuerdo.');
  }
  if (!changes.title.trim()) throw new Error('El recuerdo necesita un título.');
  if (changes.date && !validGalleryDate(changes.date)) throw new Error('La fecha del recuerdo no es válida.');
  if (!Array.isArray(changes.tags) || changes.tags.length > 12 || changes.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40) || new Set(changes.tags.map(tag => tag.trim())).size !== changes.tags.length) throw new Error('Usa hasta doce etiquetas distintas de cuarenta caracteres.');
  if (!Array.isArray(changes.media) || changes.media.length !== current.media.length) throw new Error('Los archivos cambiaron. Recarga el recuerdo antes de editar sus detalles.');
  const seen = new Set<string>();
  for (const media of changes.media) {
    const originalMedia = current.media.find(item => item.id === media.id);
    if (!originalMedia || seen.has(media.id) || media.url !== originalMedia.url || media.type !== originalMedia.type || media.storagePath !== originalMedia.storagePath) throw new Error('La edición de detalles no puede añadir, sustituir ni quitar archivos.');
    seen.add(media.id);
  }
  const cover = changes.coverMediaId ?? current.coverMediaId ?? current.media[0]?.id ?? '';
  if (typeof cover !== 'string' || cover.length > 180 || (current.media.length ? !current.media.some(item => item.id === cover) : cover !== '')) throw new Error('Elige una portada que pertenezca a este recuerdo.');
  const patch: MetadataPatch = { title: changes.title.trim(), description: changes.description, photoDate: changes.date, location: changes.location.trim(), tags: changes.tags.map(tag => tag.trim()), album: changes.album.trim(), coverMediaId: cover };
  if (changes.reminder !== undefined) {
    const reminder = changes.reminder;
    if (!reminder || typeof reminder.enabled !== 'boolean' || typeof reminder.date !== 'string' || reminder.date.length > 10 || typeof reminder.label !== 'string' || reminder.label.length > 120 || !['once', 'yearly'].includes(reminder.repeat) || (reminder.date && !validGalleryDate(reminder.date)) || (reminder.enabled && (!reminder.date || !reminder.label.trim()))) throw new Error('El recordatorio necesita una fecha y un nombre válidos.');
    patch.reminder = { enabled: reminder.enabled, date: reminder.date, label: reminder.label.trim(), repeat: reminder.repeat };
  }
  return patch;
}

export async function updateGalleryMetadata(id: string, changes: GalleryEdit): Promise<void> {
  validId(id);
  const { db, assertCurrent } = context();
  await runTransaction(db, async transaction => {
    assertCurrent();
    const reference = doc(db, 'memories', id);
    const snapshot = await transaction.get(reference);
    assertCurrent();
    if (!snapshot.exists()) throw new Error('Este recuerdo ya no está disponible.');
    const patch = buildGalleryMetadataPatch(id, snapshot.data(), changes);
    transaction.update(reference, { ...patch, updatedAt: serverTimestamp() });
  });
  assertCurrent();
}

export async function toggleGalleryFavorite(id: string): Promise<void> {
  validId(id);
  const { db, user, assertCurrent } = context();
  const keys = getCurrentFavoriteKeys();
  await runTransaction(db, async transaction => {
    assertCurrent();
    const reference = doc(db, 'memories', id);
    const snapshot = await transaction.get(reference);
    assertCurrent();
    if (!snapshot.exists()) throw new Error('Este recuerdo ya no está disponible.');
    const favorites: unknown = snapshot.data().favorites ?? [];
    if (!Array.isArray(favorites) || favorites.some(item => typeof item !== 'string')) throw new Error('Los favoritos de este recuerdo necesitan revisión antes de modificarse.');
    const active = keys.some(key => favorites.includes(key));
    // Add the canonical UID. Removal may remove only this UID and its own legacy alias.
    transaction.update(reference, { favorites: active ? arrayRemove(...keys) : arrayUnion(user.uid), updatedAt: serverTimestamp() });
  });
  assertCurrent();
}
