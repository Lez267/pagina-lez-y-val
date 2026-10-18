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
