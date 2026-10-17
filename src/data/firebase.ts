import { getApps, initializeApp } from 'firebase/app';
import { browserSessionPersistence, getAuth, GoogleAuthProvider, setPersistence, signInWithPopup, signOut, type Auth } from 'firebase/auth';
import { collection, getDocs, getFirestore, onSnapshot } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';
import { normalizeMemory } from './normalizer';
import type { GallerySession } from './types';

let galleryAuth: Auth | undefined;
let pendingConnection: Promise<GallerySession> | undefined;
let connectionEpoch = 0;
let latestAttemptEpoch = 0;
let authCleanup: Promise<void> = Promise.resolve();

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
  if (!user || auth.app.options.projectId !== 'lezz-val-universo') throw new Error('Primero abre la galería con Google.');
  return { auth, db: getFirestore(auth.app), user };
}

export async function readCurrentMemories() {
  const { auth, db, user } = requireConnectedGallery();
  const snapshot = await getDocs(collection(db, 'memories'));
  if (auth.currentUser?.uid !== user.uid) throw new Error('La sesión cambió mientras se leían los recuerdos.');
  return snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase'))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function watchCurrentMemories(onMemories: (memories: GallerySession['memories']) => void, onError: () => void) {
  const { auth, db, user } = requireConnectedGallery();
  return onSnapshot(collection(db, 'memories'), snapshot => {
    if (auth.currentUser?.uid !== user.uid) return;
    onMemories(snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase')).sort((a, b) => b.date.localeCompare(a.date)));
  }, () => { if (auth.currentUser?.uid === user.uid) onError(); });
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
      await setPersistence(auth, browserSessionPersistence);
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      const snapshot = await getDocs(collection(getFirestore(auth.app), 'memories'));
      if (epoch !== connectionEpoch) throw new Error('La conexión fue cancelada.');
      const memories = snapshot.docs.map(item => normalizeMemory(item.id, item.data(), 'firebase'))
        .sort((a, b) => b.date.localeCompare(a.date));
      return { memories, uid: result.user.uid, displayName: result.user.displayName || 'Nuestra galería' };
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

/** Ends only this app's Firebase session. Does not remove records, files or subscriptions. */
export async function disconnectGallery(): Promise<void> {
  connectionEpoch += 1;
  pendingConnection = undefined;
  if (galleryAuth) await queueSignOut(galleryAuth);
}
