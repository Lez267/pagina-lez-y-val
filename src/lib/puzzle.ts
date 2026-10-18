export type PuzzleSize = 3 | 4 | 5;
export type PuzzleState = { tiles: number[]; moves: number; hints: number; history: number[][] };

export function solvedTiles(size: PuzzleSize): number[] {
  return Array.from({ length: size * size }, (_, index) => index);
}

export function isSolved(tiles: readonly number[]): boolean {
  return tiles.length > 0 && tiles.every((tile, index) => tile === index);
}

export function isPermutation(tiles: unknown, size: PuzzleSize): tiles is number[] {
  return Array.isArray(tiles) && tiles.length === size * size && new Set(tiles).size === tiles.length &&
    tiles.every(tile => Number.isInteger(tile) && tile >= 0 && tile < size * size);
}

/** Fisher–Yates, with a deterministic fallback when the random order is solved. */
export function shuffleTiles(size: PuzzleSize, random: () => number = Math.random): number[] {
  const tiles = solvedTiles(size);
  for (let index = tiles.length - 1; index > 0; index--) {
    const sample = random();
    const other = Math.min(index, Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * (index + 1))));
    [tiles[index], tiles[other]] = [tiles[other], tiles[index]];
  }
  if (isSolved(tiles)) [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  return tiles;
}

export function newPuzzle(size: PuzzleSize, random?: () => number): PuzzleState {
  return { tiles: shuffleTiles(size, random), moves: 0, hints: 0, history: [] };
}

export function validPuzzle(value: unknown, size: PuzzleSize): value is PuzzleState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PuzzleState;
  return isPermutation(candidate.tiles, size) && Number.isInteger(candidate.moves) && candidate.moves >= 0 &&
    Number.isInteger(candidate.hints) && candidate.hints >= 0 && Array.isArray(candidate.history) &&
    candidate.history.length <= 100 && candidate.history.every(tiles => isPermutation(tiles, size));
}

export function movePuzzle(state: PuzzleState, from: number, to: number): PuzzleState {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || from < 0 || to < 0 ||
    from >= state.tiles.length || to >= state.tiles.length || isSolved(state.tiles)) return state;
  const tiles = [...state.tiles];
  [tiles[from], tiles[to]] = [tiles[to], tiles[from]];
  return { ...state, tiles, moves: state.moves + 1, history: [...state.history, state.tiles].slice(-100) };
}

export function undoPuzzle(state: PuzzleState): PuzzleState {
  const previous = state.history.at(-1);
  return previous ? { ...state, tiles: [...previous], moves: Math.max(0, state.moves - 1), history: state.history.slice(0, -1) } : state;
}

export function correctTiles(tiles: readonly number[]): number {
  return tiles.reduce((count, tile, index) => count + Number(tile === index), 0);
}

export type RGB = readonly [number, number, number];
export type MosaicPattern = { columns: number; rows: number; palette: RGB[]; cells: number[]; fingerprint: string };
type ColorPoint = { color: RGB; weight: number };

function average(points: ColorPoint[]): RGB {
  const weight = points.reduce((total, point) => total + point.weight, 0);
  return [0, 1, 2].map(channel => Math.round(points.reduce((sum, point) => sum + point.color[channel] * point.weight, 0) / weight)) as unknown as RGB;
}

function spread(points: ColorPoint[]): { channel: number; range: number } {
  const ranges = [0, 1, 2].map(channel => Math.max(...points.map(point => point.color[channel])) - Math.min(...points.map(point => point.color[channel])));
  const range = Math.max(...ranges);
  return { channel: ranges.indexOf(range), range };
}

/** Weighted median-cut quantization: the original file is never altered. */
export function createMosaic(pixels: Uint8ClampedArray, columns = 24, rows = 32, colors = 20): MosaicPattern {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns <= 0 || rows <= 0 || pixels.length !== columns * rows * 4) {
    throw new Error('Los píxeles no corresponden al tamaño del mosaico.');
  }
  const histogram = new Map<string, { sums: number[]; weight: number }>();
  const samples: RGB[] = [];
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const opacity = pixels[offset + 3] / 255;
    const color: RGB = [0, 1, 2].map(channel => Math.round(pixels[offset + channel] * opacity + [253, 248, 240][channel] * (1 - opacity))) as unknown as RGB;
    samples.push(color);
    const key = color.map(channel => channel >> 3).join(',');
    const bucket = histogram.get(key) ?? { sums: [0, 0, 0], weight: 0 };
    bucket.weight++;
    for (let channel = 0; channel < 3; channel++) bucket.sums[channel] += color[channel];
    histogram.set(key, bucket);
  }
  const points = [...histogram.values()].map(bucket => ({ color: bucket.sums.map(sum => sum / bucket.weight) as unknown as RGB, weight: bucket.weight }));
  const boxes: ColorPoint[][] = [points];
  const limit = Math.min(24, Math.max(1, Math.round(colors)));
  while (boxes.length < limit) {
    let chosen = -1;
    let best = -1;
    boxes.forEach((box, index) => {
      if (box.length < 2) return;
      const score = spread(box).range * Math.sqrt(box.reduce((weight, point) => weight + point.weight, 0));
      if (score > best) { chosen = index; best = score; }
    });
    if (chosen === -1 || best <= 0) break;
    const channel = spread(boxes[chosen]).channel;
    const box = [...boxes[chosen]].sort((a, b) => a.color[channel] - b.color[channel]);
    const middleWeight = box.reduce((weight, point) => weight + point.weight, 0) / 2;
    let accumulated = 0;
    let split = 1;
    for (; split < box.length; split++) { accumulated += box[split - 1].weight; if (accumulated >= middleWeight) break; }
    split = Math.min(box.length - 1, split);
    boxes.splice(chosen, 1, box.slice(0, split), box.slice(split));
  }
  const palette = boxes.map(average).sort((a, b) => a[0] * .299 + a[1] * .587 + a[2] * .114 - b[0] * .299 - b[1] * .587 - b[2] * .114);
  const cells = samples.map(color => {
    let nearest = 0;
    let distance = Infinity;
    palette.forEach((candidate, index) => {
      const score = (color[0] - candidate[0]) ** 2 * .299 + (color[1] - candidate[1]) ** 2 * .587 + (color[2] - candidate[2]) ** 2 * .114;
      if (score < distance) { nearest = index; distance = score; }
    });
    return nearest;
  });
  let hash = 2166136261;
  for (const value of [...palette.flat(), ...cells]) { hash ^= value; hash = Math.imul(hash, 16777619); }
  return { columns, rows, palette, cells, fingerprint: `${columns}x${rows}-${(hash >>> 0).toString(36)}` };
}

export function canPaintCell(pattern: MosaicPattern, cell: number, color: number, painted: readonly number[]): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < pattern.cells.length && pattern.cells[cell] === color && !painted.includes(cell);
}
