import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDeck, isMemoryComplete } from '../src/lib/memory.ts';

test('createMemoryDeck produces exactly 2 * pairCount cards with paired IDs', () => {
  const samplePhotos = [
    { id: 'p1', url: 'https://example.com/1.jpg', title: 'Recuerdo 1' },
    { id: 'p2', url: 'https://example.com/2.jpg', title: 'Recuerdo 2' },
    { id: 'p3', url: 'https://example.com/3.jpg', title: 'Recuerdo 3' },
    { id: 'p4', url: 'https://example.com/4.jpg', title: 'Recuerdo 4' },
    { id: 'p5', url: 'https://example.com/5.jpg', title: 'Recuerdo 5' },
    { id: 'p6', url: 'https://example.com/6.jpg', title: 'Recuerdo 6' },
  ];

  for (const pairCount of [4, 6, 8] as const) {
    const deck = createMemoryDeck(samplePhotos, pairCount, () => 0.42);
    assert.equal(deck.length, pairCount * 2);

    const counts = new Map<string, number>();
    for (const card of deck) {
      counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
    }

    assert.equal(counts.size, pairCount);
    for (const count of counts.values()) {
      assert.equal(count, 2);
    }
  }
});

test('createMemoryDeck gracefully handles pools with fewer photos than pairCount', () => {
  const fewPhotos = [
    { id: 'p1', url: 'https://example.com/1.jpg', title: 'Única foto' },
  ];

  const deck = createMemoryDeck(fewPhotos, 4, () => 0.1);
  assert.equal(deck.length, 8);
  const counts = new Map<string, number>();
  for (const card of deck) {
    counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1);
  }
  assert.equal(counts.size, 4);
  for (const count of counts.values()) {
    assert.equal(count, 2);
  }
});

test('isMemoryComplete accurately checks matching progress', () => {
  assert.equal(isMemoryComplete(['pair1', 'pair2', 'pair3', 'pair4'], 4), true);
  assert.equal(isMemoryComplete(['pair1', 'pair2', 'pair3'], 4), false);
  assert.equal(isMemoryComplete([], 4), false);
});
