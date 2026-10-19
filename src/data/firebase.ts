import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getIdTokenResult, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { collection, getDocsFromServer, getFirestore, onSnapshot } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import { normalizeMemory } from './normalizer';
import type { GallerySession } from './types';

let galleryAuth: Auth | undefined;
let pendingConnection: Promise<GallerySession> | undefined;
let connectionEpoch = 0;
let latestAttemptEpoch = 0;
let authCleanup: Promise<void> = Promise.resolve();
const allowedUids = new Set(['bIlEa1IXdbO73ahuiESYy8Zbfgv1', 'DV7KauCOERWGAmEl38C5z0iPLuJ3', 'ToJa2Pea8scsqUVww1HHB1HIArE2']);
const authorized = (user: User | null): user is User => !!user && allowedUids.has(user.uid) && user.emailVerified && user.providerData.some(provider => provider.providerId === 'google.com');

async function verifiedSession(auth: Auth, user: User, epoch: number): Promise<GallerySession> {
  if (!authorized(user)) throw new Error('Esta cuenta no está autorizada.');
  const token = await getIdTokenResult(user, true);
  if ((token.claims.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider !== 'google.com') throw new Error('La sesión requiere Google.');
  const snapshot = await getDocsFromServer(collection(getFirestore(auth.app), 'memories'));
  if (epoch !== connectionEpoch || auth.currentUser !== user) throw new Error('La conexión fue cancelada.');
  return { memories: snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase')).sort((a, b) => b.date.localeCompare(a.date)), uid: user.uid, displayName: user.displayName || 'Nuestra galería', email: user.email || '', photoURL: user.photoURL || '' };
}

function queueSignOut(auth: Auth, stillRelevant: () => boolean = () => true): Promise<void> {
  // Finish earlier cleanup before a new popup can establish another session.
  const cleanup = authCleanup.then(async () => { if (stillRelevant()) await signOut(auth); });
  authCleanup = cleanup.catch(() => undefined);
  return cleanup;
}

function getGalleryAuth(): Auth {
  if (firebaseConfig.projectId !== 'lezz-val-universo') throw new Error('La conexión requiere el proyecto independiente verificado.');
  if (!galleryAuth) {
    const name = `nuestra-historia-gallery-${firebaseConfig.projectId}`;
    const app = getApps().find(item => item.name === name) ?? initializeApp(firebaseConfig, name);
    if (app.options.projectId !== 'lezz-val-universo') throw new Error('La sesión no pertenece al proyecto independiente.');
    galleryAuth = getAuth(app);
  }
  return galleryAuth;
}

/** The only client context available to optional write services is the new project. */
export function requireConnectedGallery() {
  const auth = getGalleryAuth();
  const user = auth.currentUser;
  if (!authorized(user) || auth.app.options.projectId !== 'lezz-val-universo') throw new Error('Primero abre la galería con tu cuenta Google autorizada.');
  return { auth, db: getFirestore(auth.app), user };
}

export async function readCurrentMemories() {
  const { auth, db, user } = requireConnectedGallery();
  const snapshot = await getDocsFromServer(collection(db, 'memories'));
  if (auth.currentUser?.uid !== user.uid) throw new Error('La sesión cambió mientras se leían los recuerdos.');
  return snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase'))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function watchCurrentMemories(onMemories: (memories: GallerySession['memories']) => void, onError?: () => void, expectedUid?: string) {
  try {
    const auth = getGalleryAuth();
    let unsubsSnapshot: (() => void) | undefined;
    let cancelled = false;

    const unsubsAuth = onAuthStateChanged(auth, user => {
      if (cancelled) return;
      if (!authorized(user) || (expectedUid && user.uid !== expectedUid) || auth.app.options.projectId !== 'lezz-val-universo') {
        unsubsSnapshot?.();
        unsubsSnapshot = undefined;
        onError?.();
        return;
      }
      if (unsubsSnapshot) return;
      const db = getFirestore(auth.app);
      unsubsSnapshot = onSnapshot(collection(db, 'memories'), snapshot => {
        if (cancelled || auth.currentUser?.uid !== user.uid || snapshot.metadata.fromCache) return;
        onMemories(snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase')).sort((a, b) => b.date.localeCompare(a.date)));
      }, () => {
        if (!cancelled && auth.currentUser?.uid === user.uid && onError) onError();
      });
    }, () => {
      if (!cancelled && onError) onError();
    });

    return () => {
      cancelled = true;
      unsubsSnapshot?.();
      unsubsAuth();
    };
  } catch {
    onError?.();
    return () => {};
  }
}

function friendlyError(error: unknown): Error {
  const code = error !== null && typeof error === 'object' && 'code' in error
    ? String(error.code) : '';
  switch (code) {
    case 'auth/unauthorized-domain': {
      const host = typeof window === 'undefined' ? 'este dominio' : window.location.hostname;
      return new Error(`Firebase no autoriza ${host}. Agrega ese dominio en Firebase Console → Authentication → Settings → Authorized domains y vuelve a intentarlo.`);
    }
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new Error('Se cerró el acceso con Google. Puedes volver a conectarte cuando quieras.');
    case 'auth/popup-blocked':
      return new Error('El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio y vuelve a conectarte.');
    case 'permission-denied':
      return new Error('Esta cuenta no tiene permiso para leer la galería. Conéctate con una de las cuentas autorizadas en sus reglas de Firebase.');
    case 'auth/network-request-failed':
    case 'unavailable':
      return new Error('No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.');
    default:
      return error instanceof Error && error.message === 'La conexión fue cancelada.'
        ? error : new Error('No se pudo leer la galería. Revisa la configuración de Google Auth y los permisos de Firebase.');
  }
}

/** Call from a deliberate user click. Reads the independent copy; never writes it. */
export function connectGallery(): Promise<GallerySession> {
  if (pendingConnection) return pendingConnection;
  const epoch = ++connectionEpoch;
  latestAttemptEpoch = epoch;
  const connection: Promise<GallerySession> = (async () => {
    const auth = getGalleryAuth();
    try {
      await authCleanup;
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      await setPersistence(auth, browserLocalPersistence);
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      return await verifiedSession(auth, result.user, epoch);
    } catch (error) {
      // An old popup may settle after cancellation. Clear it only if no newer
      // attempt has taken ownership; otherwise its cleanup must leave that
      // attempt's authentication alone.
      await queueSignOut(auth, () => latestAttemptEpoch === epoch).catch(() => undefined);
      throw friendlyError(epoch === connectionEpoch ? error : new Error('La conexión fue cancelada.'));
    }
  })().finally(() => { if (pendingConnection === connection) pendingConnection = undefined; });
  pendingConnection = connection;
  return connection;
}

/** Restores an existing persisted session across browser restarts. */
export async function restoreSavedSession(): Promise<GallerySession | null> {
  const epoch = connectionEpoch;
  try {
    const auth = getGalleryAuth();
    await authCleanup;
    await auth.authStateReady();
    if (epoch !== connectionEpoch || !authorized(auth.currentUser)) return null;
    return await verifiedSession(auth, auth.currentUser, epoch);
  } catch { return null; }
}

/** Ends only this app's Firebase session. Does not remove records, files or subscriptions. */
export async function disconnectGallery(): Promise<void> {
  connectionEpoch += 1;
  pendingConnection = undefined;
  if (galleryAuth) await queueSignOut(galleryAuth);
}


/** Raw Firestore wire records for backup only. Never restores or writes data. */
export async function readGalleryBackupRecords(signal?: AbortSignal) {
  const { auth, user } = requireConnectedGallery();
  const documents: unknown[] = []; let pageToken: string | undefined;
  do {
    if (signal?.aborted || auth.currentUser !== user) throw new Error('La sesión cambió o se detuvo el respaldo.');
    const url = new URL('https://firestore.googleapis.com/v1/projects/lezz-val-universo/databases/(default)/documents/memories');
    url.searchParams.set('pageSize', '100'); if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + await user.getIdToken() }, credentials: 'omit', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('No se pudieron confirmar los datos originales para el respaldo.');
    const batch = await response.json() as { documents?: {name?:string}[]; nextPageToken?:string };
    if (auth.currentUser !== user) throw new Error('La sesión cambió.');
    if ((batch.documents ?? []).some(item => !item.name?.startsWith('projects/lezz-val-universo/databases/(default)/documents/memories/'))) throw new Error('El respaldo no pertenece a la galería independiente.');
    documents.push(...(batch.documents ?? []));
    if (documents.length > 10000) throw new Error('Divide el respaldo en colecciones más pequeñas.');
    pageToken = batch.nextPageToken;
  } while (pageToken);
  return { format: 'firestore-wire-records/v1', project: 'lezz-val-universo', readAt: new Date().toISOString(), documents };
}
