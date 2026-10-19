import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildGalleryMetadataPatch, legacyAliasForEmail, legacyEmailDigest } from '../src/data/gallery-write';
import { normalizeMemory } from '../src/data/normalizer';
import type { GalleryEdit } from '../src/lib/gallery';

const raw = { description: 'Un recuerdo de prueba', photoDate: '2025-10-17', author: 'Autor original', createdAt: new Date('2025-10-18T12:00:00Z'), favorites: ['Valeria'], unknown: { retain: ['everything'] }, media: [{ url: 'https://example.com/a.jpg', type: 'image', storagePath: 'original/a' }, { url: 'https://example.com/b.mp4', type: 'video', storagePath: 'original/b' }] };
function edit(overrides: Partial<GalleryEdit> = {}): GalleryEdit { return { ...normalizeMemory('test-memory', raw), title: 'Título editado', coverMediaId: 'test-memory-media-2', ...overrides }; }

test('legacy email hashing matches Node SHA-256 for trimmed lowercase UTF-8 inputs', () => {
  for (const value of ['', 'abc', ' Test@Example.COM ', 'persona+prueba@example.com', 'mañana@example.com', 'x'.repeat(200)]) assert.equal(legacyEmailDigest(value), createHash('sha256').update(value.trim().toLowerCase()).digest('hex'));
  assert.throws(() => legacyAliasForEmail('outsider@example.invalid'));
  assert.throws(() => legacyAliasForEmail(null));
});
test('metadata patch is strictly partial and does not change source media, identity or unknown fields', () => {
  const before = structuredClone(raw);
  const patch = buildGalleryMetadataPatch('test-memory', raw, edit({ media: [...edit().media].reverse(), author: 'Attempted replacement' }));
  assert.deepEqual(Object.keys(patch).sort(), ['album','coverMediaId','coverMediaIndex','description','location','photoDate','tags','title']);
  for (const field of ['media','url','author','createdBy','createdAt','favorites','unknown']) assert.equal(field in patch, false);
  assert.equal(patch.coverMediaId, 'test-memory-media-2');
  assert.equal(patch.coverMediaIndex, 1);
  assert.deepEqual(raw, before);
});
test('metadata edits reject altered, missing, duplicate and foreign media references', () => {
  const media = edit().media;
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ media: media.slice(1) })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ media: [media[0], media[0]] })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ media: [{ ...media[0], url: 'https://example.com/foreign.jpg' }, media[1]] })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ media: [{ ...media[0], storagePath: 'foreign/path' }, media[1]] })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ coverMediaId: 'another-memory-media-1' })));
});
test('explicit media IDs survive metadata patch validation without reordering raw arrays', () => {
  const document = { ...raw, media: raw.media.map((file, index) => ({ ...file, id: `stable-file-${index}` })) };
  const current = normalizeMemory('new-memory', document);
  const patch = buildGalleryMetadataPatch('new-memory', document, { ...current, coverMediaId: 'stable-file-1' });
  assert.equal(patch.coverMediaId, 'stable-file-1'); assert.equal('media' in patch, false);
  assert.equal(patch.coverMediaIndex, 1);
  assert.equal(document.media[0].id, 'stable-file-0');
});
test('dates, tags, text limits and reminders are validated before any write', () => {
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ date: '2025-02-30' })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ title: 'x'.repeat(161) })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ tags: ['juntos', ' juntos '] })));
  assert.throws(() => buildGalleryMetadataPatch('test-memory', raw, edit({ reminder: { enabled: true, label: 'Fecha', date: '', repeat: 'yearly' } })));
  const reminder = { enabled: true, label: 'Volver a celebrar', date: '2028-02-29', repeat: 'yearly' as const };
  assert.deepEqual(buildGalleryMetadataPatch('test-memory', raw, edit({ reminder })).reminder, reminder);
  assert.throws(() => buildGalleryMetadataPatch('other/path', raw, edit()));
});
