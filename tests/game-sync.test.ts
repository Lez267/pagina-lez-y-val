import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { assertGameIdentity, gameRecordId, gameRecordsProgress, ownGameRecordDrafts, parseGameRecord } from '../src/data/game-sync.ts';
import { createDefaultProgressionStore, diamondLevelKey, meetsLevelObjective, mergeLevelRecords, mergePlayerGameProgress, ownsLegacyBoard, puzzleLevelKey, recordLevelCompletion } from '../src/lib/game-progression.ts';
import type { LevelRecord } from '../src/lib/game-progression.ts';

const ale = 'bIlEa1IXdbO73ahuiESYy8Zbfgv1';
const val = 'DV7KauCOERWGAmEl38C5z0iPLuJ3';
const val2 = 'ToJa2Pea8scsqUVww1HHB1HIArE2';
const record = (stars: 1 | 2 | 3, score: number): LevelRecord => ({ level: 1, stars, score, completedAt: '2026-10-18T20:00:00.000Z', bestMetricLabel: '12 movimientos' });
const shared = (uid: string, stars: 1 | 2 | 3, score: number) => ({ schemaVersion: 1, uid, player: uid === ale ? 'ale' : 'valeria', game: 'puzzle', ...record(stars, score), metricLabel: record(stars, score).bestMetricLabel, savedAt: Timestamp.now() });
function parsed(uid: string, stars: 1 | 2 | 3, score: number) {
  const raw: Record<string, unknown> = shared(uid, stars, score);
  delete raw.bestMetricLabel;
  return parseGameRecord(gameRecordId(uid, 'puzzle', 1), raw);
}

test('a completed baseline board cannot become the next level of the same size', () => {
  assert.notEqual(puzzleLevelKey('nh:user:ale', 'photo', 1, 3), puzzleLevelKey('nh:user:ale', 'photo', 2, 3));
  assert.notEqual(diamondLevelKey('nh:user:ale', 'photo', 1, '32x40'), diamondLevelKey('nh:user:ale', 'photo', 2, '32x40'));
  assert.equal(ownsLegacyBoard('puzzle', 1, 3), true);
  assert.equal(ownsLegacyBoard('puzzle', 2, 3), false);
  assert.equal(ownsLegacyBoard('puzzle', 3, 4), true);
  assert.equal(ownsLegacyBoard('puzzle', 4, 4), false);
  assert.equal(ownsLegacyBoard('diamond', 1, 'standard'), true);
  assert.equal(ownsLegacyBoard('diamond', 2, 'standard'), false);
  assert.equal(ownsLegacyBoard('diamond', 4, 'hd'), true);
  assert.equal(ownsLegacyBoard('diamond', 5, 'hd'), false);
});

test('objectives match strict advertised movement limits and diamond percentages', () => {
  for (const [game, level, before, boundary] of [['puzzle', 2, 19, 20], ['puzzle', 4, 39, 40], ['memory', 2, 15, 16], ['memory', 3, 21, 22], ['memory', 4, 27, 28]] as const) {
    assert.equal(meetsLevelObjective(game, level, before), true);
    assert.equal(meetsLevelObjective(game, level, boundary), false);
  }
  for (const [level, target] of [[1, .25], [2, .75], [3, 1], [4, .75], [5, 1]]) {
    assert.equal(meetsLevelObjective('diamond', level, target - .001), false);
    assert.equal(meetsLevelObjective('diamond', level, target), true);
  }
});

test('merging records independently retains best stars and points on both devices', () => {
  const a = record(3, 500), b = record(1, 650);
  assert.deepEqual(mergeLevelRecords(a, b), { ...b, stars: 3 });
  assert.deepEqual(mergeLevelRecords(b, a), { ...b, stars: 3 });
  const merged = mergePlayerGameProgress({ unlockedLevel: 2, levels: { 1: a }, totalScore: 500, totalStars: 3 }, { unlockedLevel: 2, levels: { 1: b }, totalScore: 650, totalStars: 1 });
  assert.equal(merged.totalStars, 3);
  assert.equal(merged.totalScore, 650);
  assert.equal(merged.unlockedLevel, 2);
});

test('Google UID owns cloud progress; matching display names or changed namespaces never authorize it', () => {
  const identity = { uid: ale, projectId: 'lezz-val-universo', dbProjectId: 'lezz-val-universo', emailVerified: true, google: true };
  assert.deepEqual(assertGameIdentity(`nh:user:${ale}`, identity), { uid: ale, player: 'ale' });
  assert.throws(() => assertGameIdentity(`nh:user:${val}`, identity));
  assert.throws(() => assertGameIdentity(`nh:user:${ale}`, { ...identity, google: false }));
  assert.throws(() => assertGameIdentity(`nh:user:${ale}`, { ...identity, emailVerified: false }));
  assert.throws(() => assertGameIdentity(`nh:user:${ale}`, { ...identity, dbProjectId: 'galeria-lezz-y-val' }));
  assert.throws(() => assertGameIdentity('nh:user:unknown', { ...identity, uid: 'unknown' }));
});

test('importing a couple-wide historical cache only shares the authenticated player records', () => {
  let store = createDefaultProgressionStore();
  store = recordLevelCompletion(store, 'ale', 'memory', 1, 2, 600, '8 intentos');
  store = recordLevelCompletion(store, 'valeria', 'diamond', 1, 3, 800, '100%');
  assert.deepEqual(ownGameRecordDrafts(store, ale).map(row => row.game), ['memory']);
  assert.deepEqual(ownGameRecordDrafts(store, val).map(row => row.game), ['diamond']);
  assert.deepEqual(ownGameRecordDrafts(store, 'unknown'), []);
});

test('ranking merges two Val UIDs by maximum per level without double counting or losing Ale', () => {
  const store = gameRecordsProgress([parsed(val, 3, 500), parsed(val2, 1, 700), parsed(ale, 2, 650)]);
  assert.equal(store.valeria.puzzle.totalScore, 700);
  assert.equal(store.valeria.puzzle.totalStars, 3);
  assert.equal(store.ale.puzzle.totalScore, 650);
  assert.equal(store.ale.puzzle.totalStars, 2);
  assert.throws(() => parseGameRecord(gameRecordId(ale, 'puzzle', 1), { ...parsed(ale, 2, 650), player: 'valeria' }));
  assert.throws(() => parseGameRecord(gameRecordId(ale, 'puzzle', 1), { ...parsed(ale, 2, 650), score: 10001 }));
});

test('retrying a finished level improves its record without decreasing earlier stars or losing another game', () => {
  let store = createDefaultProgressionStore();
  store = recordLevelCompletion(store, 'ale', 'puzzle', 1, 3, 500, '16 movimientos');
  store = recordLevelCompletion(store, 'ale', 'memory', 1, 2, 650, '8 intentos');
  const firstDate = store.ale.puzzle.levels[1].completedAt;
  store = recordLevelCompletion(store, 'ale', 'puzzle', 1, 1, 450, '30 movimientos');
  assert.equal(store.ale.puzzle.levels[1].completedAt, firstDate);
  store = recordLevelCompletion(store, 'ale', 'puzzle', 1, 2, 600, '12 movimientos');
  assert.equal(store.ale.puzzle.levels[1].stars, 3);
  assert.equal(store.ale.puzzle.levels[1].score, 600);
  assert.equal(store.ale.memory.totalScore, 650);
  assert.equal(store.ale.puzzle.totalScore, 600);
});
