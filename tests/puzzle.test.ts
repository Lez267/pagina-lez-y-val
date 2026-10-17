import test from 'node:test';
import assert from 'node:assert/strict';
import { canPaintCell, correctTiles, createMosaic, isPermutation, isSolved, movePuzzle, newPuzzle, shuffleTiles, solvedTiles, undoPuzzle, validPuzzle } from '../src/lib/puzzle.ts';

test('both difficulties always start with a complete, unsolved permutation, even at random boundaries', () => {
  for (const size of [3, 4] as const) {
    for (const random of [() => 0, () => .5, () => .999999999, () => 1]) {
      const tiles = shuffleTiles(size, random);
      assert.equal(isPermutation(tiles, size), true);
      assert.deepEqual([...tiles].sort((a, b) => a - b), solvedTiles(size));
      assert.equal(isSolved(tiles), false);
    }
  }
});

test('two taps exchange precisely the selected pieces, count one move, and can finish the puzzle', () => {
  const original = { tiles: [1, 0, 2, 3, 4, 5, 6, 7, 8], moves: 7, hints: 2, history: [] };
  const result = movePuzzle(original, 0, 1);
  assert.equal(result.moves, 8);
  assert.equal(result.hints, 2);
  assert.equal(isSolved(result.tiles), true);
  assert.equal(correctTiles(result.tiles), 9);
  assert.deepEqual(original.tiles, [1, 0, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(movePuzzle(result, 0, 1), result, 'a completed game cannot accidentally become scrambled');
});

test('same-piece taps and invalid positions never count as moves', () => {
  const state = newPuzzle(4, () => 0);
  for (const [from, to] of [[0, 0], [-1, 4], [16, 0], [0, 16], [0.5, 2]]) assert.equal(movePuzzle(state, from, to), state);
});

test('undo restores the prior board and move count without discarding hint use', () => {
  const state = newPuzzle(3, () => 0);
  state.hints = 3;
  assert.deepEqual(undoPuzzle(movePuzzle(state, 0, 4)), state);
  assert.equal(undoPuzzle(state), state);
  assert.equal(validPuzzle({ ...state, tiles: Array(9).fill(0) }, 3), false);
  assert.equal(validPuzzle(state, 3), true);
});

test('mosaic uses the source pixels, a bounded palette, and reproducible cells', () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
  const pattern = createMosaic(pixels, 2, 2, 20);
  assert.equal(pattern.palette.length, 2);
  assert.equal(pattern.cells[0], pattern.cells[2]);
  assert.notEqual(pattern.cells[0], pattern.cells[1]);
  assert.deepEqual(pattern, createMosaic(pixels, 2, 2, 20));
  assert.equal(canPaintCell(pattern, 0, pattern.cells[0], []), true);
  assert.equal(canPaintCell(pattern, 0, pattern.cells[1], []), false);
  assert.equal(canPaintCell(pattern, 0, pattern.cells[0], [0]), false);
  assert.equal(canPaintCell(pattern, 4, 0, []), false);
});

test('dominant colors and transparent pixels do not create empty or invalid palette buckets', () => {
  const pixels = new Uint8ClampedArray(24 * 32 * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set(index < 8 ? [0, 0, 0, 255] : [255, 255, 255, 255], index);
  pixels.set([255, 0, 255, 0], 0);
  const pattern = createMosaic(pixels);
  assert.ok(pattern.palette.length >= 2 && pattern.palette.length <= 20);
  assert.ok(pattern.palette.flat().every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255));
  assert.equal(pattern.cells.length, 768);
  assert.ok(pattern.cells.every(index => index >= 0 && index < pattern.palette.length));
});
