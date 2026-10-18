import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryAlbums, galleryOnThisDay, galleryToday, galleryWithCoverFirst, isAleFavoriteMemory, isValFavoriteMemory, nextGalleryReminder, recentGalleryStories, upcomingGalleryReminders, validateGalleryFiles, type GalleryMemory, type GalleryReminder } from './gallery';

const memory = (id: string, extra: Partial<GalleryMemory> = {}): GalleryMemory => ({ id, title: id, description: '', date: '2025-10-17', location: '', tags: [], album: '', author: 'Ale', media: [], favorites: [], source: 'demo', ...extra });
test('calendar dates use Mexico City rather than the host time zone', () => {
  assert.equal(galleryToday(new Date('2026-10-18T03:00:00Z')), '2026-10-17');
});
test('on this day includes earlier years only and rejects impossible dates', () => {
  const items = [memory('last-year'), memory('today', { date: '2026-10-17' }), memory('future', { date: '2027-10-17' }), memory('other', { date: '2025-10-18' }), memory('invalid', { date: '2025-02-30' })];
  assert.deepEqual(galleryOnThisDay(items, '2026-10-17').map(item => item.id), ['last-year']);
});
test('stories follow publication time even for old photos, excluding future/missing timestamps', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  const items = [memory('old-photo', { date: '2020-01-01', createdAt: '2026-10-17T10:00:00Z' }), memory('yesterday', { createdAt: { seconds: Date.parse('2026-10-16T12:00:00Z') / 1000 } }), memory('boundary', { createdAt: '2026-10-10T12:00:00Z' }), memory('future', { createdAt: '2026-10-18T12:00:00Z' }), memory('missing')];
  assert.deepEqual(recentGalleryStories(items, now).map(item => item.id), ['old-photo', 'yesterday']);
});
test('cover reordering preserves every original file and does not mutate input', () => {
  const media = [{ id: 'a', url: 'https://example.com/a', type: 'image' as const }, { id: 'b', url: 'https://example.com/b', type: 'video' as const }, { id: 'c', url: 'https://example.com/c', type: 'image' as const }];
  assert.deepEqual(galleryWithCoverFirst(media, 'b').map(item => item.id), ['b', 'a', 'c']);
  assert.deepEqual(media.map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(galleryWithCoverFirst(media, 'missing'), media);
});
test('albums use the chosen cover and count all photos and videos', () => {
  const items = [memory('one', { album: ' Viajes ', coverMediaId: 'b', media: [{ id: 'a', url: 'https://example.com/a', type: 'image' }, { id: 'b', url: 'https://example.com/b', type: 'video' }] }), memory('two', { album: 'Viajes' })];
  const album = galleryAlbums(items)[0];
  assert.equal(album.name, 'Viajes'); assert.equal(album.memories.length, 2); assert.equal(album.fileCount, 2); assert.equal(album.cover?.id, 'b');
});
test('yearly leap day reminders wait for the next real leap day', () => {
  const reminder: GalleryReminder = { enabled: true, date: '2024-02-29', label: 'Un día especial', repeat: 'yearly' };
  assert.equal(nextGalleryReminder(reminder, '2025-02-28'), '2028-02-29');
  assert.equal(nextGalleryReminder(reminder, '2097-01-01'), '2104-02-29');
  assert.equal(nextGalleryReminder({ ...reminder, enabled: false }, '2025-02-28'), null);
  assert.equal(nextGalleryReminder({ ...reminder, repeat: 'once' }, '2025-02-28'), null);
});
test('upcoming reminders include today, cross year boundaries, and exclude expired one-off events', () => {
  const reminder: GalleryReminder = { enabled: true, date: '2025-01-02', label: 'Volver a celebrar', repeat: 'yearly' };
  const items = [memory('annual', { reminder }), memory('past', { reminder: { ...reminder, repeat: 'once' } }), memory('today', { reminder: { ...reminder, date: '2026-12-29', repeat: 'once' } })];
  assert.deepEqual(upcomingGalleryReminders(items, '2026-12-29', 7).map(item => [item.memory.id, item.daysAway]), [['today', 0], ['annual', 4]]);
});
test('file preparation rejects SVG, oversized videos and excessive aggregate sizes', () => {
  assert.ok(validateGalleryFiles([{ name: 'unsafe.svg', type: 'image/svg+xml', size: 100 }]).length);
  assert.ok(validateGalleryFiles([{ name: 'large.mp4', type: 'video/mp4', size: 101 * 1024 * 1024 }]).length);
  assert.deepEqual(validateGalleryFiles([{ name: 'photo.jpg', type: 'image/jpeg', size: 1000 }, { name: 'video.mp4', type: 'video/mp4', size: 1000 }]), []);
});
test('isAleFavoriteMemory and isValFavoriteMemory classify favorites correctly', () => {
  const aleMem = memory('1', { favorites: ['Ale'] });
  const valMem = memory('2', { favorites: ['Valeria'] });
  const bothMem = memory('3', { favorites: ['Ale', 'Val'] });
  const noneMem = memory('4', { favorites: [] });

  assert.equal(isAleFavoriteMemory(aleMem), true);
  assert.equal(isValFavoriteMemory(aleMem), false);

  assert.equal(isAleFavoriteMemory(valMem), false);
  assert.equal(isValFavoriteMemory(valMem), true);

  assert.equal(isAleFavoriteMemory(bothMem), true);
  assert.equal(isValFavoriteMemory(bothMem), true);

  assert.equal(isAleFavoriteMemory(noneMem), false);
  assert.equal(isValFavoriteMemory(noneMem), false);
});

