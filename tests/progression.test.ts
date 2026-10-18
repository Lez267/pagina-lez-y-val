import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProgressionStore,
  recordLevelCompletion,
  calculatePuzzleScore,
  calculateMemoryScore,
  calculateDiamondScore,
  getPlayerOverallStats,
  GAME_LEVELS,
  PLAYERS,
} from '../src/lib/game-progression.ts';

test('initial store has both players at level 1 with 0 score', () => {
  const store = createDefaultProgressionStore();
  assert.equal(store.activePlayer, 'valeria');
  assert.equal(store.valeria.puzzle.unlockedLevel, 1);
  assert.equal(store.valeria.puzzle.totalScore, 0);
  assert.equal(store.ale.puzzle.unlockedLevel, 1);
  assert.equal(store.ale.puzzle.totalScore, 0);
  assert.equal(PLAYERS.valeria.name, 'Valeria');
  assert.equal(PLAYERS.ale.name, 'Ale');
});

test('calculatePuzzleScore calculates stars and points appropriately', () => {
  const threeStars = calculatePuzzleScore(1, 12, 0);
  assert.equal(threeStars.stars, 3);
  assert.ok(threeStars.score >= 500);

  const twoStars = calculatePuzzleScore(1, 22, 0);
  assert.equal(twoStars.stars, 2);

  const oneStar = calculatePuzzleScore(1, 40, 2);
  assert.equal(oneStar.stars, 1);
});

test('calculateMemoryScore rewards speed and low moves', () => {
  const fast = calculateMemoryScore(1, 5, 18);
  assert.equal(fast.stars, 3);
  assert.ok(fast.score > 500);

  const regular = calculateMemoryScore(1, 9, 35);
  assert.equal(regular.stars, 2);
});

test('calculateDiamondScore awards 3 stars for 100% completion', () => {
  const perfect = calculateDiamondScore(1, 1.0);
  assert.equal(perfect.stars, 3);
  assert.ok(perfect.score >= 500);

  const partial = calculateDiamondScore(1, 0.8);
  assert.equal(partial.stars, 2);
});

test('recordLevelCompletion unlocks next level progressively without modifying other player', () => {
  let store = createDefaultProgressionStore();

  store = recordLevelCompletion(store, 'valeria', 'puzzle', 1, 3, 550, '12 movs');
  assert.equal(store.valeria.puzzle.unlockedLevel, 2);
  assert.equal(store.valeria.puzzle.totalStars, 3);
  assert.equal(store.valeria.puzzle.totalScore, 550);

  // Ale is untouched
  assert.equal(store.ale.puzzle.unlockedLevel, 1);
  assert.equal(store.ale.puzzle.totalScore, 0);

  // Valeria beats level 2
  store = recordLevelCompletion(store, 'valeria', 'puzzle', 2, 2, 450, '18 movs');
  assert.equal(store.valeria.puzzle.unlockedLevel, 3);
  assert.equal(store.valeria.puzzle.totalStars, 5);
  assert.equal(store.valeria.puzzle.totalScore, 1000);

  const stats = getPlayerOverallStats(store.valeria);
  assert.equal(stats.totalScore, 1000);
  assert.equal(stats.totalStars, 5);
  assert.equal(stats.completedLevels, 2);
});

test('all game definitions contain 5 progressive levels', () => {
  assert.equal(GAME_LEVELS.puzzle.length, 5);
  assert.equal(GAME_LEVELS.memory.length, 5);
  assert.equal(GAME_LEVELS.diamond.length, 5);
});

test('PLAYERS contains Val and Ale without nicknames', () => {
  assert.equal(PLAYERS.valeria.name, 'Valeria');
  assert.equal(PLAYERS.valeria.shortName, 'Val');
  assert.equal(PLAYERS.ale.name, 'Ale');
  assert.equal(PLAYERS.valeria.badge, '');
  assert.equal(PLAYERS.ale.badge, '');
  assert.equal(PLAYERS.valeria.avatar, '👑');
  assert.equal(PLAYERS.ale.avatar, '⚡');
});

test('identifyGooglePlayer detects Valeria and Ale from UID, email or name', async () => {
  const { identifyGooglePlayer } = await import('../src/lib/game-progression.ts');
  assert.equal(identifyGooglePlayer({ uid: 'bIlEa1IXdbO73ahuiESYy8Zbfgv1' }), 'ale');
  assert.equal(identifyGooglePlayer({ uid: 'DV7KauCOERWGAmEl38C5z0iPLuJ3' }), 'valeria');
  assert.equal(identifyGooglePlayer(null, 'nh:user:bIlEa1IXdbO73ahuiESYy8Zbfgv1'), 'ale');
  assert.equal(identifyGooglePlayer(null, 'nh:user:ToJa2Pea8scsqUVww1HHB1HIArE2'), 'valeria');
  assert.equal(identifyGooglePlayer({ displayName: 'Valeria Rodriguez' }), 'valeria');
  assert.equal(identifyGooglePlayer({ displayName: 'Alejandro Lezz' }), 'ale');
  assert.equal(identifyGooglePlayer({ email: 'valeria@gmail.com' }), 'valeria');
  assert.equal(identifyGooglePlayer({ email: 'lezz@gmail.com' }), 'ale');
});

test('mergeProgressionStores combines progress from different sessions without loss', async () => {
  const { mergeProgressionStores } = await import('../src/lib/game-progression.ts');
  let storeA = createDefaultProgressionStore();
  let storeB = createDefaultProgressionStore();

  storeA = recordLevelCompletion(storeA, 'valeria', 'puzzle', 1, 3, 600, '10 movs');
  storeB = recordLevelCompletion(storeB, 'ale', 'memory', 1, 3, 580, '4 movs');

  const merged = mergeProgressionStores(storeA, storeB);
  assert.equal(merged.valeria.puzzle.unlockedLevel, 2);
  assert.equal(merged.valeria.puzzle.totalScore, 600);
  assert.equal(merged.ale.memory.unlockedLevel, 2);
  assert.equal(merged.ale.memory.totalScore, 580);
});
