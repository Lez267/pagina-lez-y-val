import { collection, doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { requireConnectedGallery } from './firebase';
import { createDefaultProgressionStore, mergeLevelRecords, mergePlayerGameProgress, playerForUid, validLevelRecord } from '../lib/game-progression';
import type { GameProgressionStore, GameType, LevelRecord, PlayerId } from '../lib/game-progression';

export const GAME_PROJECT = 'lezz-val-universo';
export type SharedGameRecord = {
  schemaVersion: 1; uid: string; player: PlayerId; game: GameType; level: number;
  stars: 1 | 2 | 3; score: number; completedAt: string; metricLabel: string; savedAt: Timestamp;
};
const keys = ['schemaVersion', 'uid', 'player', 'game', 'level', 'stars', 'score', 'completedAt', 'metricLabel', 'savedAt'];
const games: GameType[] = ['puzzle', 'memory', 'diamond'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function gameRecordId(uid: string, game: GameType, level: number): string { return `${uid}_${game}_${level}`; }
export function parseGameRecord(id: string, raw: unknown): SharedGameRecord {
  if (!object(raw) || Object.keys(raw).length !== keys.length || Object.keys(raw).some(key => !keys.includes(key)) ||
    raw.schemaVersion !== 1 || typeof raw.uid !== 'string' || !playerForUid(raw.uid) || playerForUid(raw.uid) !== raw.player ||
    !games.includes(raw.game as GameType) || id !== gameRecordId(raw.uid, raw.game as GameType, raw.level as number) ||
    !(raw.savedAt instanceof Timestamp) || !validLevelRecord({ level: raw.level, stars: raw.stars, score: raw.score, completedAt: raw.completedAt, bestMetricLabel: raw.metricLabel })) {
    throw new Error('Un récord compartido tiene un formato incompatible. El progreso local se conserva.');
  }
  return raw as unknown as SharedGameRecord;
}
export function asLevelRecord(record: SharedGameRecord): LevelRecord {
  return { level: record.level, stars: record.stars, score: record.score, completedAt: record.completedAt, bestMetricLabel: record.metricLabel };
}
export function gameRecordsProgress(records: readonly SharedGameRecord[]): GameProgressionStore {
  const store = createDefaultProgressionStore();
  for (const record of records) {
    const progress = store[record.player][record.game];
    store[record.player][record.game] = mergePlayerGameProgress(progress, {
      unlockedLevel: Math.min(5, record.level + 1), levels: { [record.level]: asLevelRecord(record) }, totalScore: 0, totalStars: 0,
    });
  }
  return store;
}
/** Historical couple-wide caches are never uploaded for the partner's identity. */
export function ownGameRecordDrafts(store: GameProgressionStore, uid: string): { game: GameType; record: LevelRecord }[] {
  const player = playerForUid(uid);
  if (!player) return [];
  return games.flatMap(game => Object.values(store[player][game].levels).filter(validLevelRecord).map(record => ({ game, record })));
}
export function assertGameIdentity(namespace: string, identity: { uid?: string; projectId?: string; dbProjectId?: string; emailVerified?: boolean; google?: boolean }): { uid: string; player: PlayerId } {
  const match = /^nh:user:([^:\s/]{1,128})$/.exec(namespace);
  const player = playerForUid(identity.uid);
  if (!match || match[1] !== identity.uid || !player || identity.projectId !== GAME_PROJECT || identity.dbProjectId !== GAME_PROJECT || !identity.emailVerified || !identity.google) {
    throw new Error('Abre de nuevo los juegos con tu cuenta de Google para sincronizar tus récords.');
  }
  return { uid: identity.uid!, player };
}
function context(namespace: string) {
  const current = requireConnectedGallery();
  const identity = assertGameIdentity(namespace, {
    uid: current.user.uid, projectId: current.auth.app.options.projectId, dbProjectId: current.db.app.options.projectId,
    emailVerified: current.user.emailVerified, google: current.user.providerData.some(provider => provider.providerId === 'google.com'),
  });
  return { ...current, ...identity };
}
export function gameSyncError(error: unknown): string {
  const code = object(error) && typeof error.code === 'string' ? error.code : '';
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'El récord sigue guardado en este navegador. No se pudo confirmar el permiso para compartirlo; revisa la sesión.';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'Sin conexión para confirmar el récord. Se conserva aquí y puedes sincronizarlo después.';
  return error instanceof Error && !code ? error.message : 'No se pudo confirmar el récord compartido. Tu progreso local se conserva.';
}
export function watchGameRecords(namespace: string, onData: (records: SharedGameRecord[], cached: boolean) => void, onError: (message: string) => void): () => void {
  try {
    const { db } = context(namespace);
    return onSnapshot(collection(db, 'gameRecords'), { includeMetadataChanges: true }, snapshot => {
      try {
        context(namespace);
        if (snapshot.metadata.hasPendingWrites) return;
        onData(snapshot.docs.map(row => parseGameRecord(row.id, row.data())), snapshot.metadata.fromCache);
      } catch (error) { onError(gameSyncError(error)); }
    }, error => onError(gameSyncError(error)));
  } catch (error) { onError(gameSyncError(error)); return () => {}; }
}
/** Only this authenticated UID's record is written. Transactions retain the maximum from other devices. */
export async function saveGameRecord(namespace: string, game: GameType, record: LevelRecord): Promise<SharedGameRecord> {
  if (!games.includes(game) || !validLevelRecord(record)) throw new Error('El récord no tiene un formato válido.');
  const { db, uid, player } = context(namespace);
  const ref = doc(db, 'gameRecords', gameRecordId(uid, game, record.level));
  await runTransaction(db, async transaction => {
    context(namespace);
    const existing = await transaction.get(ref); context(namespace);
    const old = existing.exists() ? parseGameRecord(existing.id, existing.data()) : undefined;
    const best = mergeLevelRecords(old ? asLevelRecord(old) : undefined, record);
    if (old && JSON.stringify(asLevelRecord(old)) === JSON.stringify(best)) return;
    transaction.set(ref, {
      schemaVersion: 1, uid, player, game, level: best.level, stars: best.stars, score: best.score,
      completedAt: best.completedAt, metricLabel: best.bestMetricLabel, savedAt: serverTimestamp(),
    });
  });
  context(namespace);
  const confirmed = await getDocFromServer(ref); context(namespace);
  if (!confirmed.exists()) throw new Error('No se pudo confirmar el récord. Puedes reintentar sin duplicarlo.');
  return parseGameRecord(confirmed.id, confirmed.data());
}
