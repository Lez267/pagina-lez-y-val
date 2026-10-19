import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFirestoreMovie,
  parseFirestoreReservation,
  type StudioMovie,
  type MovieReservation,
} from '../src/data/movies-sync';

test('parseFirestoreMovie correctly parses valid movie data and handles missing fields', () => {
  const raw = {
    title: 'Interestelar',
    year: '2014',
    author: 'Ale',
    note: 'Nuestra favorita de ciencia ficción',
    watched: true,
    watchedDate: '2026-10-18',
    createdAt: '2026-10-18T00:00:00.000Z',
    duration: '169 min',
    classification: 'B',
    format: 'IMAX VIP',
  };

  const parsed = parseFirestoreMovie('movie-123', raw);
  assert.equal(parsed.id, 'movie-123');
  assert.equal(parsed.title, 'Interestelar');
  assert.equal(parsed.year, '2014');
  assert.equal(parsed.author, 'Ale');
  assert.equal(parsed.watched, true);
  assert.equal(parsed.watchedDate, '2026-10-18');
  assert.equal(parsed.duration, '169 min');
  assert.equal(parsed.format, 'IMAX VIP');
});

test('parseFirestoreMovie falls back gracefully when fields are missing or unexpected', () => {
  const parsed = parseFirestoreMovie('fallback-id', {});
  assert.equal(parsed.id, 'fallback-id');
  assert.equal(parsed.title, '');
  assert.equal(parsed.author, 'Ale'); // defaults to 'Ale' when not 'Val'
  assert.equal(parsed.watched, false);
  assert.equal(parsed.note, '');
  assert.equal(parsed.year, undefined);
  assert.equal(parsed.poster, undefined);
  assert.equal(parsed.stars, undefined);
});

test('parseFirestoreReservation correctly parses reservations', () => {
  const raw = {
    movieTitle: 'Interestelar',
    poster: 'https://image.tmdb.org/t/p/w500/xyz.jpg',
    dateName: 'HOY 18 OCT',
    showtime: '8:30 PM',
    reservedAt: '2026-10-18T06:00:00.000Z',
  };

  const parsed = parseFirestoreReservation('movie-123', raw);
  assert.equal(parsed.movieId, 'movie-123');
  assert.equal(parsed.movieTitle, 'Interestelar');
  assert.equal(parsed.poster, 'https://image.tmdb.org/t/p/w500/xyz.jpg');
  assert.equal(parsed.dateName, 'HOY 18 OCT');
  assert.equal(parsed.showtime, '8:30 PM');
  assert.equal(parsed.reservedAt, '2026-10-18T06:00:00.000Z');
});

import {
  activeCinemaReservations,
  cinemaDateOptions,
  localCinemaMovies,
  mergeCinemaMovies,
  mergeCinemaReservations,
  movieCreateFields,
  parseCinemaImport,
  reservationCreateFields,
} from '../src/data/movies-sync';

const movie = (id: string, extra: Record<string, unknown> = {}): StudioMovie => ({ id, title: 'Coco', note: '', author: 'Val', watched: false, createdAt: '2026-10-18T06:00:00.000Z', ...extra });

test('cloud snapshots cannot erase local pending movies or reservation history', () => {
  const local = [movie('a'), movie('b', { legacyField: { keep: true } })];
  assert.deepEqual(mergeCinemaMovies(local, []).map(item => item.id), ['a', 'b']);
  const merged = mergeCinemaMovies(local, [movie('a', { watched: true })]);
  assert.equal(merged.find(item => item.id === 'a')?.watched, true);
  assert.deepEqual(merged.find(item => item.id === 'b')?.legacyField, { keep: true });
  const old: MovieReservation = { id: 'old', movieId: 'a', movieTitle: 'Coco', dateName: 'DOM 18 OCT', showtime: '8:30 PM', reservedAt: '2026-10-18T06:00:00.000Z' };
  const history = mergeCinemaReservations({ old }, { next: { ...old, id: 'next', status: 'cancelled', reservedAt: '2026-10-19T06:00:00.000Z' } });
  assert.equal(Object.keys(history).length, 2);
  assert.equal(history.next.status, 'cancelled');
  assert.equal(activeCinemaReservations(history).a.id, 'old');
});

test('cinema imports normalize missing note and retain conflicting records and remap reservations', () => {
  const imported = { movies: [{ ...movie('same'), title: 'Otra película', extra: { original: true } }, { id: 'missing-fields', title: 'Película sin nota' }, { title: 42 }], reservations: { booking: { movieId: 'same', movieTitle: 'Otra película', dateName: 'DOM 18 OCT', showtime: '8 PM', reservedAt: '2026-10-18T06:00:00.000Z', extra: 'keep' } } };
  const result = parseCinemaImport(imported, [movie('same')], {}, () => 'ec39ab05-fbdc-4f86-a313-38a9986a7e7d');
  assert.equal(result.rejected, 1);
  assert.equal(result.movies.length, 2);
  assert.equal(result.movies[0].originalId, 'same');
  assert.deepEqual(result.movies[0].extra, { original: true });
  assert.equal(result.movies[1].note, '');
  assert.equal(result.reservations.booking.movieId, result.movies[0].id);
  assert.equal(result.reservations.booking.extra, 'keep');
  assert.equal(imported.movies[0].id, 'same');
});

test('new writes enforce exact cinema schema while legacy unknown fields survive presentation', () => {
  const parsed = localCinemaMovies([movie('legacy', { unknown: { a: 1 }, poster: 'https://image.tmdb.org/poster.jpg' })])[0];
  assert.deepEqual(parsed.unknown, { a: 1 });
  const fields = movieCreateFields(parsed);
  assert.equal(fields.id, 'legacy');
  assert.equal('unknown' in fields, false);
  assert.throws(() => movieCreateFields(movie('bad/id')));
  assert.throws(() => movieCreateFields(movie('okay', { poster: 'https://user:secret@example.com/x' })));
  assert.throws(() => movieCreateFields(movie('okay', { year: 100 })));
  assert.throws(() => reservationCreateFields({ id: 'legacy', movieId: 'legacy', movieTitle: 'Coco', dateName: 'HOY', showtime: '8 PM', reservedAt: '2026-10-18T06:00:00.000Z' }));
});

test('cinema dates follow Mexico City midnight and roll across month and year boundaries', () => {
  const beforeMidnight = cinemaDateOptions(new Date('2026-10-19T05:30:00Z'));
  assert.equal(beforeMidnight[0].date, '2026-10-18');
  assert.equal(beforeMidnight[1].date, '2026-10-19');
  const year = cinemaDateOptions(new Date('2027-01-01T05:30:00Z'));
  assert.equal(year[0].date, '2026-12-31');
  assert.equal(year[1].date, '2027-01-01');
});
