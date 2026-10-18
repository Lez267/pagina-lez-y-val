export type PlayerId = 'valeria' | 'ale';

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  shortName: string;
  avatar: string;
  color: string;
  badge: string;
}

export const PLAYERS: Record<PlayerId, PlayerInfo> = {
  valeria: {
    id: 'valeria',
    name: 'Valeria',
    shortName: 'Val',
    avatar: '👑',
    color: '#E85D88',
    badge: '',
  },
  ale: {
    id: 'ale',
    name: 'Ale',
    shortName: 'Ale',
    avatar: '⚡',
    color: '#4E7D96',
    badge: '',
  },
};

export type GameType = 'puzzle' | 'memory' | 'diamond';

export interface GameLevelDef {
  level: number;
  title: string;
  subtitle: string;
  requirement: string;
  badge: string;
  puzzleSize?: 3 | 4 | 5;
  memoryPairs?: 4 | 6 | 8 | 10 | 12;
  diamondDensity?: 'standard' | 'hd';
}

export const GAME_LEVELS: Record<GameType, GameLevelDef[]> = {
  puzzle: [
    { level: 1, title: 'Nivel 1', subtitle: 'Rompecabezas 3×3 con foto guía', requirement: 'Arma las 9 piezas', badge: '3×3', puzzleSize: 3 },
    { level: 2, title: 'Nivel 2', subtitle: 'Rompecabezas 3×3', requirement: 'Arma las 9 piezas en menos de 20 movimientos', badge: '3×3', puzzleSize: 3 },
    { level: 3, title: 'Nivel 3', subtitle: 'Rompecabezas 4×4', requirement: 'Arma las 16 piezas', badge: '4×4', puzzleSize: 4 },
    { level: 4, title: 'Nivel 4', subtitle: 'Rompecabezas 4×4', requirement: 'Arma las 16 piezas en menos de 40 movimientos', badge: '4×4', puzzleSize: 4 },
    { level: 5, title: 'Nivel 5', subtitle: 'Rompecabezas 5×5', requirement: 'Arma las 25 piezas', badge: '5×5', puzzleSize: 5 },
  ],
  memory: [
    { level: 1, title: 'Nivel 1', subtitle: '8 cartas', requirement: 'Encuentra las 4 parejas', badge: '4 parejas', memoryPairs: 4 },
    { level: 2, title: 'Nivel 2', subtitle: '12 cartas', requirement: 'Encuentra las 6 parejas en menos de 16 intentos', badge: '6 parejas', memoryPairs: 6 },
    { level: 3, title: 'Nivel 3', subtitle: '16 cartas', requirement: 'Encuentra las 8 parejas en menos de 22 intentos', badge: '8 parejas', memoryPairs: 8 },
    { level: 4, title: 'Nivel 4', subtitle: '20 cartas', requirement: 'Encuentra las 10 parejas en menos de 28 intentos', badge: '10 parejas', memoryPairs: 10 },
    { level: 5, title: 'Nivel 5', subtitle: '24 cartas', requirement: 'Encuentra las 12 parejas', badge: '12 parejas', memoryPairs: 12 },
  ],
  diamond: [
    { level: 1, title: 'Nivel 1', subtitle: 'Lienzo estándar', requirement: 'Coloca tus primeras piedritas', badge: 'Lienzo 1', diamondDensity: 'standard' },
    { level: 2, title: 'Nivel 2', subtitle: 'Lienzo estándar', requirement: 'Completa al menos el 75% del cuadro', badge: '75%', diamondDensity: 'standard' },
    { level: 3, title: 'Nivel 3', subtitle: 'Lienzo estándar', requirement: 'Termina el cuadro al 100%', badge: '100%', diamondDensity: 'standard' },
    { level: 4, title: 'Nivel 4', subtitle: 'Lienzo HD', requirement: 'Llena el lienzo HD con precisión', badge: 'HD', diamondDensity: 'hd' },
    { level: 5, title: 'Nivel 5', subtitle: 'Lienzo HD', requirement: 'Cuadro en alta definición al 100%', badge: 'HD 100%', diamondDensity: 'hd' },
  ],
};

export interface LevelRecord {
  level: number;
  stars: 1 | 2 | 3;
  score: number;
  completedAt: string;
  bestMetricLabel: string;
}

export interface PlayerGameProgress {
  unlockedLevel: number;
  levels: Record<number, LevelRecord>;
  totalScore: number;
  totalStars: number;
}

export interface PlayerData {
  puzzle: PlayerGameProgress;
  memory: PlayerGameProgress;
  diamond: PlayerGameProgress;
}

export interface GameProgressionStore {
  activePlayer: PlayerId;
  valeria: PlayerData;
  ale: PlayerData;
}

export function createDefaultPlayerGameProgress(): PlayerGameProgress {
  return {
    unlockedLevel: 1,
    levels: {},
    totalScore: 0,
    totalStars: 0,
  };
}

export function createDefaultPlayerData(): PlayerData {
  return {
    puzzle: createDefaultPlayerGameProgress(),
    memory: createDefaultPlayerGameProgress(),
    diamond: createDefaultPlayerGameProgress(),
  };
}

export function createDefaultProgressionStore(): GameProgressionStore {
  return {
    activePlayer: 'valeria',
    valeria: createDefaultPlayerData(),
    ale: createDefaultPlayerData(),
  };
}

export function calculatePuzzleScore(
  level: number,
  moves: number,
  hints: number
): { stars: 1 | 2 | 3; score: number } {
  const baseScore = level * 200;
  let stars: 1 | 2 | 3 = 1;

  if (level === 1) {
    if (moves <= 16 && hints === 0) stars = 3;
    else if (moves <= 26) stars = 2;
  } else if (level === 2) {
    if (moves <= 14 && hints === 0) stars = 3;
    else if (moves <= 22) stars = 2;
  } else if (level === 3) {
    if (moves <= 35 && hints <= 1) stars = 3;
    else if (moves <= 55) stars = 2;
  } else if (level === 4) {
    if (moves <= 30 && hints === 0) stars = 3;
    else if (moves <= 45) stars = 2;
  } else {
    if (moves <= 65 && hints <= 2) stars = 3;
    else if (moves <= 95) stars = 2;
  }

  const bonus = stars === 3 ? 300 : stars === 2 ? 150 : 50;
  const hintsPenalty = hints * 15;
  const score = Math.max(level * 100, baseScore + bonus - hintsPenalty);
  return { stars, score };
}

export function calculateMemoryScore(
  level: number,
  moves: number,
  seconds: number
): { stars: 1 | 2 | 3; score: number } {
  const baseScore = level * 200;
  let stars: 1 | 2 | 3 = 1;

  if (level === 1) {
    if (moves <= 6 && seconds <= 25) stars = 3;
    else if (moves <= 10) stars = 2;
  } else if (level === 2) {
    if (moves <= 10 && seconds <= 40) stars = 3;
    else if (moves <= 16) stars = 2;
  } else if (level === 3) {
    if (moves <= 14 && seconds <= 65) stars = 3;
    else if (moves <= 22) stars = 2;
  } else if (level === 4) {
    if (moves <= 18 && seconds <= 90) stars = 3;
    else if (moves <= 28) stars = 2;
  } else {
    if (moves <= 24 && seconds <= 130) stars = 3;
    else if (moves <= 36) stars = 2;
  }

  const bonus = stars === 3 ? 300 : stars === 2 ? 150 : 50;
  const timeBonus = Math.max(0, 80 - Math.floor(seconds / 2));
  const score = baseScore + bonus + timeBonus;
  return { stars, score };
}

export function calculateDiamondScore(
  level: number,
  completedRatio: number
): { stars: 1 | 2 | 3; score: number } {
  const baseScore = level * 250;
  let stars: 1 | 2 | 3 = 1;

  if (completedRatio >= 0.999) {
    stars = 3;
  } else if (completedRatio >= 0.75) {
    stars = 2;
  }

  const bonus = stars === 3 ? 350 : stars === 2 ? 180 : 60;
  const score = baseScore + bonus;
  return { stars, score };
}

export function recordLevelCompletion(
  store: GameProgressionStore,
  playerId: PlayerId,
  game: GameType,
  level: number,
  stars: 1 | 2 | 3,
  score: number,
  metricLabel: string
): GameProgressionStore {
  const player = store[playerId];
  const progress = player[game];
  const existing = progress.levels[level];

  const bestStars = existing ? (Math.max(existing.stars, stars) as 1 | 2 | 3) : stars;
  const bestScore = existing ? Math.max(existing.score, score) : score;

  const nextUnlocked = stars >= 1 ? Math.min(5, Math.max(progress.unlockedLevel, level + 1)) : progress.unlockedLevel;

  const updatedLevels: Record<number, LevelRecord> = {
    ...progress.levels,
    [level]: {
      level,
      stars: bestStars,
      score: bestScore,
      completedAt: new Date().toISOString(),
      bestMetricLabel: existing && existing.score > score ? existing.bestMetricLabel : metricLabel,
    },
  };

  const totalScore = Object.values(updatedLevels).reduce((sum, r) => sum + r.score, 0);
  const totalStars = Object.values(updatedLevels).reduce((sum, r) => sum + r.stars, 0);

  const updatedProgress: PlayerGameProgress = {
    unlockedLevel: nextUnlocked,
    levels: updatedLevels,
    totalScore,
    totalStars,
  };

  return {
    ...store,
    [playerId]: {
      ...player,
      [game]: updatedProgress,
    },
  };
}

export function getPlayerOverallStats(playerData: PlayerData) {
  const totalScore = playerData.puzzle.totalScore + playerData.memory.totalScore + playerData.diamond.totalScore;
  const totalStars = playerData.puzzle.totalStars + playerData.memory.totalStars + playerData.diamond.totalStars;
  const completedLevels =
    Object.keys(playerData.puzzle.levels).length +
    Object.keys(playerData.memory.levels).length +
    Object.keys(playerData.diamond.levels).length;

  return {
    totalScore,
    totalStars,
    completedLevels,
  };
}

export const KNOWN_VALERIA_UIDS = ['DV7KauCOERWGAmEl38C5z0iPLuJ3', 'ToJa2Pea8scsqUVww1HHB1HIArE2'];
export const KNOWN_ALE_UIDS = ['bIlEa1IXdbO73ahuiESYy8Zbfgv1'];

const LEGACY_ALE_HASH = '798325c978231df073b118795facaa91392bba25f9d3e4a86b77666977495a2e';
const LEGACY_VAL_HASHES = [
  '57c7f9e9a1bbf5f4aa8758a639193393cdeafed5b84bc5ce2246a1f525835f1b',
  '51a62b09d3405f16d9b2ef14bb63e5b84b01e9f93497c1416f538e1d5ca61165',
];

function digestEmail(text: string): string {
  const bytes = new TextEncoder().encode(text.trim().toLowerCase());
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bytes.length * 8, false);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotate = (value: number, count: number) => (value >>> count) | (value << (32 - count));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + w[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) >>> 0; }
    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i++) { const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0; const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0; h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0; }
    [a,b,c,d,e,f,g,h].forEach((value, i) => { state[i] = (state[i] + value) >>> 0; });
  }
  return state.map(value => value.toString(16).padStart(8, '0')).join('');
}

export function identifyGooglePlayer(
  info?: { uid?: string; email?: string; displayName?: string } | null,
  namespace?: string
): PlayerId | null {
  const uid = info?.uid || (namespace ? namespace.replace(/^nh:user:/, '') : '');
  if (uid) {
    if (KNOWN_VALERIA_UIDS.includes(uid)) return 'valeria';
    if (KNOWN_ALE_UIDS.includes(uid)) return 'ale';
  }

  const email = (info?.email || '').trim().toLowerCase();
  if (email) {
    const hash = digestEmail(email);
    if (LEGACY_VAL_HASHES.includes(hash)) return 'valeria';
    if (hash === LEGACY_ALE_HASH) return 'ale';
    if (email.includes('valeria') || email.includes('vale')) return 'valeria';
    if (email.includes('ale') || email.includes('alejandro') || email.includes('lezz')) return 'ale';
  }

  const name = (info?.displayName || '').trim().toLowerCase();
  if (name.includes('valeria') || name.includes('vale')) return 'valeria';
  if (name.includes('alejandro') || name.includes('ale') || name.includes('lezz')) return 'ale';

  return null;
}

export function mergePlayerGameProgress(a: PlayerGameProgress, b: PlayerGameProgress): PlayerGameProgress {
  const unlockedLevel = Math.max(a?.unlockedLevel ?? 1, b?.unlockedLevel ?? 1);
  const aLevels = a?.levels ?? {};
  const bLevels = b?.levels ?? {};
  const allLevels = new Set([...Object.keys(aLevels), ...Object.keys(bLevels)].map(Number));
  const levels: Record<number, LevelRecord> = {};

  for (const lvl of allLevels) {
    const recA = aLevels[lvl];
    const recB = bLevels[lvl];
    if (recA && recB) {
      levels[lvl] = recA.score >= recB.score ? recA : recB;
    } else {
      levels[lvl] = (recA || recB)!;
    }
  }

  const totalScore = Object.values(levels).reduce((sum, r) => sum + r.score, 0);
  const totalStars = Object.values(levels).reduce((sum, r) => sum + r.stars, 0);

  return { unlockedLevel, levels, totalScore, totalStars };
}

export function mergePlayerData(a: PlayerData, b: PlayerData): PlayerData {
  return {
    puzzle: mergePlayerGameProgress(a?.puzzle, b?.puzzle),
    memory: mergePlayerGameProgress(a?.memory, b?.memory),
    diamond: mergePlayerGameProgress(a?.diamond, b?.diamond),
  };
}

export function mergeProgressionStores(base: GameProgressionStore, incoming: GameProgressionStore): GameProgressionStore {
  return {
    activePlayer: incoming?.activePlayer || base?.activePlayer || 'valeria',
    valeria: mergePlayerData(base.valeria, incoming.valeria),
    ale: mergePlayerData(base.ale, incoming.ale),
  };
}
