import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImport, normalizeMemory } from '../src/data/normalizer';

test('legacy memories preserve their single photo and metadata', () => {
  const result = normalizeMemory('legacy', { url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', type: 'image', storagePath: 'photo', description: 'Nuestra primera foto', photoDate: '2026-04-17', author: 'Val', album: 'Nosotros', favorites: ['Ale'] });
  assert.equal(result.media.length, 1);
  assert.equal(result.media[0].storagePath, 'photo');
  assert.equal(result.date, '2026-04-17');
  assert.equal(result.title, 'Nuestra primera foto');
  assert.equal(result.album, 'Nosotros');
  assert.deepEqual(result.favorites, ['Ale']);
});

test('multi-media and legacy files are combined without duplicate URLs', () => {
  const result = normalizeMemory('multi', { media: [{ url: 'https://example.com/a.jpg', type: 'image' }, { url: 'https://example.com/b.mp4', type: 'video/mp4' }], url: 'https://example.com/a.jpg', storagePath: 'original-a' });
  assert.equal(result.media.length, 2);
  assert.equal(result.media[0].storagePath, 'original-a');
  assert.deepEqual(result.media.map(item => item.type), ['image', 'video']);
  const withExtraLegacy = normalizeMemory('extra', { media: [{ url: 'https://example.com/a.jpg' }], url: 'https://example.com/legacy.jpg' });
  assert.equal(withExtraLegacy.media.length, 2);
});

test('HTML is retained as literal text, never interpreted or rewritten', () => {
  const literal = '<img src=x onerror="alert(1)">';
  const result = normalizeMemory('text', { description: literal, location: '<b>Un lugar</b>', album: "Val's álbum", tags: ['<script>literal</script>'] });
  assert.equal(result.description, literal);
  assert.equal(result.location, '<b>Un lugar</b>');
  assert.equal(result.album, "Val's álbum");
  assert.deepEqual(result.tags, ['<script>literal</script>']);
});

test('unsafe URLs are removed while the document is preserved', () => {
  const result = normalizeMemory('safe', { media: ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.com/a.jpg', '/relative.jpg', 'https://user:password@example.com/a.jpg', 'blob:javascript:bad', 'https://example.com/safe.jpg', 'blob:https://example.com/f8d8d8a7-7cd3-4835-bbd1-738d09869438'] });
  assert.equal(result.id, 'safe');
  assert.equal(result.media.length, 2);
  assert.ok(result.media.every(item => item.url.startsWith('https:') || item.url.startsWith('blob:https:')));
});

test('dates reject impossible days and use valid Timestamp fallback', () => {
  const result = normalizeMemory('date', { photoDate: '2026-02-30', createdAt: { seconds: Date.parse('2026-04-17T12:00:00Z') / 1000, nanoseconds: 0 } });
  assert.equal(result.date, '2026-04-17');
  assert.equal(normalizeMemory('missing', { photoDate: 'not-a-date' }).date, '');
  assert.equal(normalizeMemory('bad-iso', { photoDate: '2026-04-17Tnot-a-time' }).date, '');
  assert.equal(normalizeMemory('out-of-range', { createdAt: { seconds: 8e12 } }).date, '');
  assert.equal(normalizeMemory('leap', { photoDate: '2028-02-29' }).date, '2028-02-29');
});

test('all imported records survive, including text-only and malformed records', () => {
  const result = normalizeImport({ memories: [{ id: 'one', description: 'Solo un mensaje' }, { id: 'one', url: 'javascript:bad' }, null] });
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(item => item.id), ['one', 'one-2', 'import-3']);
  assert.ok(result.every(item => item.source === 'import'));
  assert.ok(result.every(item => item.media.length === 0));
  assert.throws(() => normalizeImport({ unexpected: [] }), /lista de recuerdos/);
});

test('normalization never mutates input records or nested arrays', () => {
  const original = { id: 'frozen', description: 'Texto', photoDate: '2026-04-17', media: [{ url: 'https://example.com/a.jpg', type: 'image' }], tags: [' juntos ', 'juntos'], favorites: ['Ale'] };
  const before = structuredClone(original);
  Object.freeze(original.media[0]); Object.freeze(original.media); Object.freeze(original.tags); Object.freeze(original.favorites); Object.freeze(original);
  const result = normalizeImport([original]);
  assert.deepEqual(original, before);
  assert.deepEqual(result[0].tags, ['juntos']);
  assert.notStrictEqual(result[0].media, original.media);
});
