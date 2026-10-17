import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { assertIdempotentStudioCreate, assertStudioIdentity, connectedStudioUid, localStudioRecords, mergeStudioRecords, parseSharedStudio, prepareStudioDraft, prependStudioLocal, sharedDraftId, spotifyLink, studioError, toggleStudioLocalPlan, validateStudioDraft, validPlanDate, type StudioLetter, type StudioPlan, type StudioSong } from '../src/data/studio-sync';

const namespace = 'nh:user:synthetic-ale';
const letter: StudioLetter = { id: 'dcfe9576-546d-4d7c-9d9e-b891ed153f1c', title: 'Una carta', body: '<img src=x onerror="alert(1)">', author: 'Ale', tag: 'Para hoy', occasion: '', createdAt: '2026-10-17T12:34:56.000Z' };
const plan: StudioPlan = { id: '1bdc3401-76cd-49a8-af27-620428c4b30c', title: 'Una cita', note: '', category: 'Una cita', date: '', done: false, author: 'Val', createdAt: letter.createdAt };
const song: StudioSong = { id: '3ce2e7ed-1f24-469a-86bc-e45a447392a4', title: 'Canción', artist: 'Artista', note: 'Un recuerdo', author: 'Ale', url: 'https://open.spotify.com/track/abc123', kind: 'track', createdAt: letter.createdAt };
const metadata = { createdBy: 'synthetic-ale', schemaVersion: 1, savedAt: Timestamp.fromMillis(1_792_240_000_000) };

test('connected namespace must match actual UID and both new-project identities', () => {
  assert.equal(connectedStudioUid(namespace), 'synthetic-ale');
  assert.equal(connectedStudioUid('nh:demo'), null);
  assert.equal(connectedStudioUid('nh:user:a:b'), null);
  const identity = { uid: 'synthetic-ale', projectId: 'lezz-val-universo', dbProjectId: 'lezz-val-universo' };
  assert.doesNotThrow(() => assertStudioIdentity(namespace, identity));
  for (const invalid of [{ ...identity, uid: 'synthetic-val' }, { ...identity, projectId: 'galeria-lezz-y-val' }, { ...identity, dbProjectId: 'galeria-lezz-y-val' }, { ...identity, uid: undefined }]) assert.throws(() => assertStudioIdentity(namespace, invalid));
  assert.throws(() => assertStudioIdentity('nh:local', identity));
});

test('legacy IDs map deterministically per user and collection without changing the source', async () => {
  const legacy = Object.freeze({ ...letter, id: 'old-letter', createdAt: '2026-01-14T12:00:00Z' });
  const first = await sharedDraftId(namespace, 'letters', legacy);
  assert.match(first, /^[a-f\d]{8}-[a-f\d]{4}-5[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
  assert.equal(await sharedDraftId(namespace, 'letters', legacy), first);
  assert.notEqual(await sharedDraftId('nh:user:synthetic-val', 'letters', legacy), first);
  assert.notEqual(await sharedDraftId(namespace, 'songs', legacy), first);
  const prepared = await prepareStudioDraft(namespace, 'letters', legacy);
  assert.equal(prepared.id, first);
  assert.equal(prepared.createdAt, '2026-01-14T12:00:00.000Z');
  assert.equal(legacy.id, 'old-letter');
  assert.equal(legacy.createdAt, '2026-01-14T12:00:00Z');
});

test('new UUIDs stay stable across retries, and HTML remains literal text', async () => {
  const frozen = Object.freeze({ ...letter });
  assert.equal(await sharedDraftId(namespace, 'letters', frozen), letter.id);
  const result = validateStudioDraft('letters', frozen);
  assert.deepEqual(result, letter);
  assert.notEqual(result, frozen);
  assert.equal(result.body, '<img src=x onerror="alert(1)">');
});

test('strict outbound schemas reject extra metadata, missing content and oversize fields', () => {
  for (const bad of [{ ...letter, admin: true }, { ...letter, createdBy: 'other' }, { ...letter, title: '' }, { ...letter, title: 'a'.repeat(101) }, { ...letter, body: 'a'.repeat(12001) }, { ...letter, tag: 'Abre cuando', occasion: '' }, { ...letter, occasion: 'hidden text' }, { ...letter, author: 'Another' }, { ...letter, createdAt: '2026-02-30T00:00:00.000Z' }]) assert.throws(() => validateStudioDraft('letters', bad));
  assert.throws(() => validateStudioDraft('songs', { ...song, kind: 'playlist' }));
  assert.throws(() => validateStudioDraft('songs', { ...song, note: 'a'.repeat(2001) }));
  assert.throws(() => validateStudioDraft('plans', { ...plan, author: undefined }));
});

test('Spotify URLs are canonical and cannot carry scripts, credentials or foreign hosts', async () => {
  assert.deepEqual(spotifyLink('https://open.spotify.com/intl-es/track/abc123?si=public-tracking'), { url: song.url, kind: 'track' });
  for (const bad of ['javascript:alert(1)', 'http://open.spotify.com/track/abc', 'https://open.spotify.com.evil.invalid/track/abc', 'https://user:password@open.spotify.com/track/abc', 'https://open.spotify.com/track/' + 'a'.repeat(101), 'https://open.spotify.com/track/abc/extra']) assert.equal(spotifyLink(bad), null);
  const local = Object.freeze({ ...song, url: 'https://open.spotify.com/intl-es/track/abc123?si=tracking' });
  assert.equal((await prepareStudioDraft(namespace, 'songs', local)).url, song.url);
  assert.match(local.url, /tracking/);
});

test('plan dates reject calendar rollover and legacy author is explicitly selected only for sharing', async () => {
  for (const date of ['', '2024-02-29', '1900-01-01', '2200-12-31']) assert.equal(validPlanDate(date), true);
  for (const date of ['2025-02-29', '2026-02-30', '2026-13-01', '1899-12-31', '2201-01-01']) assert.equal(validPlanDate(date), false);
  const legacy = Object.freeze({ ...plan, author: undefined });
  assert.equal(localStudioRecords('plans', [legacy]).length, 1);
  await assert.rejects(prepareStudioDraft(namespace, 'plans', legacy));
  assert.equal((await prepareStudioDraft(namespace, 'plans', legacy, 'Val')).author, 'Val');
  assert.equal(legacy.author, undefined);
});

test('shared records require exact metadata, server timestamps and matching document IDs', () => {
  assert.equal(parseSharedStudio('letters', letter.id, { ...letter, ...metadata }).savedAt, metadata.savedAt);
  for (const bad of [{ ...letter, ...metadata, id: plan.id }, { ...letter, ...metadata, schemaVersion: 2 }, { ...letter, ...metadata, savedAt: new Date() }, { ...letter, ...metadata, role: 'admin' }, { ...letter, ...metadata, updatedAt: metadata.savedAt }]) assert.throws(() => parseSharedStudio('letters', letter.id, bad));
  assert.throws(() => parseSharedStudio('plans', plan.id, { ...plan, ...metadata, updatedAt: 'client time' }));
});

test('idempotent retry accepts same owner and content, rejects collisions and never modifies existing data', () => {
  const existing = Object.freeze({ ...letter, ...metadata });
  assert.doesNotThrow(() => assertIdempotentStudioCreate('letters', existing, letter, metadata.createdBy));
  assert.throws(() => assertIdempotentStudioCreate('letters', existing, { ...letter, body: 'changed' }, metadata.createdBy));
  assert.throws(() => assertIdempotentStudioCreate('letters', existing, letter, 'synthetic-val'));
  assert.deepEqual(existing, { ...letter, ...metadata });
});

test('retrying an old plan draft preserves a later shared completion state', () => {
  const completed = Object.freeze({ ...plan, ...metadata, done: true, updatedAt: metadata.savedAt });
  assert.doesNotThrow(() => assertIdempotentStudioCreate('plans', completed, plan, metadata.createdBy));
  assert.equal(completed.done, true);
  assert.throws(() => assertIdempotentStudioCreate('plans', completed, { ...plan, author: 'Ale' }, metadata.createdBy));
});

test('local additions and plan toggles preserve unknown fields and unrecognized entries', () => {
  const unknown = Object.freeze({ futureVersion: 8, preciousData: ['keep'] });
  const original = Object.freeze({ ...plan, unknownField: { keep: true } });
  const raw = Object.freeze([unknown, original, null, 'legacy']);
  const added = prependStudioLocal(raw, letter) as unknown[];
  assert.equal(added.length, 5);
  assert.equal(added[1], unknown);
  assert.equal(added[2], original);
  const changed = toggleStudioLocalPlan(raw, plan.id, true) as Array<Record<string, unknown>>;
  assert.equal(changed[0], unknown);
  assert.equal(changed[1].done, true);
  assert.deepEqual(changed[1].unknownField, { keep: true });
  assert.equal(original.done, false);
  assert.equal(raw.length, 4);
  assert.equal(prependStudioLocal(added, letter), added);
  assert.throws(() => prependStudioLocal({ oldFormat: 'preserve me' }, letter));
});

test('merged views deduplicate a shared draft, retain scope and preserve local source arrays', async () => {
  const legacy = Object.freeze({ ...letter, id: 'legacy-id' });
  const remote = { ...(await prepareStudioDraft(namespace, 'letters', legacy)), ...metadata };
  const local = Object.freeze([legacy]);
  const rows = mergeStudioRecords<StudioLetter>(local, [remote, remote], new Map([[legacy.id, remote.id]]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scope, 'shared');
  assert.equal(rows[0].hasLocalCopy, true);
  assert.equal(rows[0].localId, legacy.id);
  assert.equal(rows[0].item, remote);
  assert.equal(local[0].id, 'legacy-id');
  const unshared = mergeStudioRecords([letter], []);
  assert.equal(unshared[0].scope, 'local');
  assert.equal(unshared[0].item, letter);
});

test('permission and connectivity errors report no false success or raw backend detail', () => {
  assert.match(studioError({ code: 'permission-denied', message: 'private backend content' }), /borrador sigue aquí/);
  assert.doesNotMatch(studioError({ code: 'permission-denied', message: 'private backend content' }), /private backend/);
  assert.match(studioError({ code: 'unavailable' }), /No pudimos confirmar/);
});
