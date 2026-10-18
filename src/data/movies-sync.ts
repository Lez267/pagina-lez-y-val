import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { requireConnectedGallery } from './firebase';
import type { StudioAuthor } from './studio-sync';

export interface StudioMovie {
  id: string;
  title: string;
  year?: number | string;
  poster?: string;
  stars?: string;
  note: string;
  author: StudioAuthor;
  watched: boolean;
  watchedDate?: string;
  createdAt: string;
  duration?: string;
  classification?: string;
  format?: string;
}

export interface MovieReservation {
  movieId: string;
  movieTitle: string;
  poster?: string;
  dateName: string;
  showtime: string;
  reservedAt: string;
}

function cleanDocData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null) {
      clean[key] = val;
    }
  }
  return clean;
}

export function parseFirestoreMovie(id: string, data: any): StudioMovie {
  return {
    id: id || String(data?.id || ''),
    title: String(data?.title || ''),
    year: data?.year !== undefined ? data.year : undefined,
    poster: data?.poster ? String(data.poster) : undefined,
    stars: data?.stars ? String(data.stars) : undefined,
    note: String(data?.note || ''),
    author: (data?.author === 'Val' ? 'Val' : 'Ale') as StudioAuthor,
    watched: Boolean(data?.watched),
    watchedDate: data?.watchedDate ? String(data.watchedDate) : undefined,
    createdAt: String(data?.createdAt || new Date().toISOString()),
    duration: data?.duration ? String(data.duration) : undefined,
    classification: data?.classification ? String(data.classification) : undefined,
    format: data?.format ? String(data.format) : undefined,
  };
}

export function parseFirestoreReservation(movieId: string, data: any): MovieReservation {
  return {
    movieId: movieId || String(data?.movieId || ''),
    movieTitle: String(data?.movieTitle || ''),
    poster: data?.poster ? String(data.poster) : undefined,
    dateName: String(data?.dateName || ''),
    showtime: String(data?.showtime || ''),
    reservedAt: String(data?.reservedAt || new Date().toISOString()),
  };
}

export function watchFirestoreMovies(
  onMovies: (movies: StudioMovie[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const { db } = requireConnectedGallery();
    const colRef = collection(db, 'movies');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: StudioMovie[] = [];
        snapshot.forEach((docSnap) => {
          items.push(parseFirestoreMovie(docSnap.id, docSnap.data()));
        });
        // Orden cronológico inverso (lo más reciente primero)
        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onMovies(items);
      },
      (err) => {
        console.warn('[MoviesSync] Error en snapshot de películas:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

export function watchFirestoreReservations(
  onReservations: (reservations: Record<string, MovieReservation>) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const { db } = requireConnectedGallery();
    const colRef = collection(db, 'reservations');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const result: Record<string, MovieReservation> = {};
        snapshot.forEach((docSnap) => {
          result[docSnap.id] = parseFirestoreReservation(docSnap.id, docSnap.data());
        });
        onReservations(result);
      },
      (err) => {
        console.warn('[MoviesSync] Error en snapshot de reservaciones:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

export async function saveMovieToFirestore(movie: StudioMovie): Promise<void> {
  const { db } = requireConnectedGallery();
  const docRef = doc(db, 'movies', movie.id);
  const data = cleanDocData({
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster,
    stars: movie.stars,
    note: movie.note || '',
    author: movie.author,
    watched: Boolean(movie.watched),
    watchedDate: movie.watchedDate,
    createdAt: movie.createdAt || new Date().toISOString(),
    duration: movie.duration,
    classification: movie.classification,
    format: movie.format,
  });
  await setDoc(docRef, data, { merge: true });
}

export async function deleteMovieFromFirestore(movieId: string): Promise<void> {
  const { db } = requireConnectedGallery();
  await deleteDoc(doc(db, 'movies', movieId));
  try {
    await deleteDoc(doc(db, 'reservations', movieId));
  } catch {
    // Si no había reservación, ignorar
  }
}

export async function saveReservationToFirestore(reservation: MovieReservation): Promise<void> {
  const { db } = requireConnectedGallery();
  const docRef = doc(db, 'reservations', reservation.movieId);
  const data = cleanDocData({
    movieId: reservation.movieId,
    movieTitle: reservation.movieTitle,
    poster: reservation.poster,
    dateName: reservation.dateName,
    showtime: reservation.showtime,
    reservedAt: reservation.reservedAt || new Date().toISOString(),
  });
  await setDoc(docRef, data, { merge: true });
}

export async function deleteReservationFromFirestore(movieId: string): Promise<void> {
  const { db } = requireConnectedGallery();
  await deleteDoc(doc(db, 'reservations', movieId));
}

export async function batchUploadMoviesToFirestore(movies: StudioMovie[]): Promise<void> {
  if (!movies || movies.length === 0) return;
  const { db } = requireConnectedGallery();
  const batch = writeBatch(db);
  for (const movie of movies) {
    const docRef = doc(db, 'movies', movie.id);
    const data = cleanDocData({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
      stars: movie.stars,
      note: movie.note || '',
      author: movie.author,
      watched: Boolean(movie.watched),
      watchedDate: movie.watchedDate,
      createdAt: movie.createdAt || new Date().toISOString(),
      duration: movie.duration,
      classification: movie.classification,
      format: movie.format,
    });
    batch.set(docRef, data, { merge: true });
  }
  await batch.commit();
}

export async function batchUploadReservationsToFirestore(
  reservations: Record<string, MovieReservation>
): Promise<void> {
  const entries = Object.values(reservations);
  if (entries.length === 0) return;
  const { db } = requireConnectedGallery();
  const batch = writeBatch(db);
  for (const res of entries) {
    const docRef = doc(db, 'reservations', res.movieId);
    const data = cleanDocData({
      movieId: res.movieId,
      movieTitle: res.movieTitle,
      poster: res.poster,
      dateName: res.dateName,
      showtime: res.showtime,
      reservedAt: res.reservedAt || new Date().toISOString(),
    });
    batch.set(docRef, data, { merge: true });
  }
  await batch.commit();
}
