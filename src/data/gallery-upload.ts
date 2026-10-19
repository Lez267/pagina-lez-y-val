import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { MediaItem } from './types';
import { requireConnectedGallery } from './firebase';
import { validateGalleryFiles, validateGalleryMetadata, type GalleryPublication } from '../lib/gallery';
import { encodePublicationMedia, samePublicationValue } from '../lib/publication';

type SignedUpload = { uploadUrl: string; resourceType: 'image' | 'video'; cloudName: string; apiKey: string; params: Record<string, string>; signature: string };
const uploadedFiles = new WeakMap<File, { uid: string; media: MediaItem }>();
const publicationIds = new WeakMap<File, { uid: string; id: string }>();
const timeoutSignal = (milliseconds: number) => AbortSignal.timeout(milliseconds);

function assertSameUser(uid: string) {
  if (requireConnectedGallery().user.uid !== uid) throw new Error('La sesión cambió. Abre tu galería de nuevo antes de publicar.');
}
async function uploadFile(file: File, uid: string): Promise<MediaItem> {
  assertSameUser(uid);
  const previous = uploadedFiles.get(file);
  if (previous?.uid === uid) return previous.media;
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  const token = await requireConnectedGallery().user.getIdToken();
  const signedResponse = await fetch('/api/uploads/sign', {
    method: 'POST', credentials: 'same-origin', signal: timeoutSignal(30000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, bytes: file.size }),
  });
  if (!signedResponse.ok) throw new Error('No se pudo autorizar la subida. Revisa tu sesión e inténtalo de nuevo.');
  const signed = await signedResponse.json() as SignedUpload;
  if (signed.cloudName !== 'dc7x4qjzu' || signed.resourceType !== kind || signed.uploadUrl !== `https://api.cloudinary.com/v1_1/dc7x4qjzu/${kind}/upload` || signed.params.overwrite !== 'false' || !/^nuestro-universo\/[a-f0-9]{24}\/[A-Za-z0-9_-]{20,80}$/.test(signed.params.public_id) || !/^[a-f0-9]{64}$/.test(signed.signature)) throw new Error('La configuración de subida no coincide con este jardín.');
  assertSameUser(uid);
  const form = new FormData();
  for (const [key, value] of Object.entries(signed.params)) form.append(key, value);
  form.append('api_key', signed.apiKey); form.append('signature', signed.signature); form.append('file', file);
  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form, credentials: 'omit', redirect: 'error', signal: timeoutSignal(300000) });
  if (!response.ok) throw new Error('Cloudinary no pudo guardar este archivo. Los archivos anteriores se conservan para reintentar.');
  const result = await response.json() as Record<string, unknown>;
  const url = new URL(String(result.secure_url ?? ''));
  if (result.public_id !== signed.params.public_id || result.resource_type !== kind || result.type !== 'upload' || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/dc7x4qjzu/${kind}/upload/`) || !url.pathname.includes(`/${signed.params.public_id}.`)) throw new Error('No se pudo comprobar la respuesta de Cloudinary. El archivo se conserva sin publicar.');
  const media: MediaItem = { id: crypto.randomUUID(), url: url.href, type: kind, storagePath: String(result.public_id) };
  uploadedFiles.set(file, { uid, media });
  assertSameUser(uid);
  return media;
}

/** New namespace only. Never destroys files, overwrites assets, or replaces a post. */
export async function publishGalleryMemory(draft: GalleryPublication, onProgress?: (completed: number, total: number) => void): Promise<string> {
  const problems = [...validateGalleryMetadata(draft), ...validateGalleryFiles(draft.files)];
  if (problems.length || !Number.isInteger(draft.coverIndex) || draft.coverIndex < 0 || draft.coverIndex >= draft.files.length) throw new Error(problems[0] || 'Elige una portada válida.');
  const { db, user } = requireConnectedGallery();
  const uid = user.uid;
  const first = draft.files[0];
  let pending = publicationIds.get(first);
  if (!pending || pending.uid !== uid) { pending = { uid, id: doc(collection(db, 'memories')).id }; publicationIds.set(first, pending); }
  const uploaded: MediaItem[] = [];
  for (const file of draft.files) { uploaded.push(await uploadFile(file, uid)); onProgress?.(uploaded.length, draft.files.length); }
  const encodedMedia = encodePublicationMedia(pending.id, uploaded, draft.coverIndex);
  assertSameUser(uid);
  const details = {
    title: draft.title.trim(), description: draft.description.trim(), photoDate: draft.date,
    location: draft.location.trim(), album: draft.album.trim(), tags: [...draft.tags],
    author: draft.author.trim(), createdBy: uid, ...encodedMedia, favorites: [],
    ...(draft.reminder?.enabled ? { reminder: { ...draft.reminder } } : {}),
  };
  const reference = doc(db, 'memories', pending.id);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(reference);
    assertSameUser(uid);
    if (existing.exists()) {
      const saved = existing.data();
      // A retry can confirm a preceding uncertain commit, without overwriting it.
      if (Object.entries(details).every(([key, value]) => samePublicationValue(saved[key], value))) return;
      throw new Error('Ya existe un recuerdo con este identificador. No se sobrescribió.');
    }
    transaction.set(reference, { ...details, createdAt: serverTimestamp() });
  });
  return pending.id;
}
