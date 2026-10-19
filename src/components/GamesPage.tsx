'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ArrowRight, Check, Download, Eye, Flower2, Gem, Hand, Heart, ImagePlus, LoaderCircle, Paintbrush, Puzzle, RotateCcw, Shuffle, Sparkles, Star, Trophy, Undo2, Users, Wand2, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { GallerySession, Memory } from '../data/types';
import { readLocal, useLocalState, writeLocal } from '../lib/storage';
import { canPaintCell, correctTiles, createMosaic, isSolved, movePuzzle, newPuzzle, undoPuzzle, validPuzzle } from '../lib/puzzle';
import type { MosaicPattern, PuzzleSize, RGB } from '../lib/puzzle';
import { createMemoryDeck, isMemoryComplete } from '../lib/memory';
import type { MemoryCard, MemoryDifficulty } from '../lib/memory';
import {
  createDefaultProgressionStore,
  calculatePuzzleScore,
  calculateMemoryScore,
  calculateDiamondScore,
  getPlayerOverallStats,
  recordLevelCompletion,
  playerForUid,
  meetsLevelObjective,
  puzzleLevelKey,
  diamondLevelKey,
  ownsLegacyBoard,
  mergeProgressionStores,
  PLAYERS,
} from '../lib/game-progression';
import type { GameProgressionStore, GameType, PlayerGameProgress, PlayerId } from '../lib/game-progression';
import { gameRecordsProgress, gameSyncError, ownGameRecordDrafts, saveGameRecord, watchGameRecords } from '../data/game-sync';
import { GameLevelBar } from './games/GameLevelBar';
import { GameRankingSection } from './games/GameRankingSection';
import './games.css';

type Photo = { id: string; url: string; title: string; local?: boolean; date?: string; location?: string };
type Selection = { mode: 'puzzle' | 'memory' | 'diamond' | 'ranking'; photoId: string; size: PuzzleSize };
type ConfirmAction = { title: string; body: string; action: () => void };
type PaintState = { fingerprint: string; painted: number[]; history: number[][] };
const SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
const CELL_SIZE = 18;

function safeImageUrl(raw: string): boolean {
  if (!raw || raw.length > 10_000_000) return false;
  if (/^data:image\/(png|jpeg|webp|gif|avif|svg\+xml)[;,]/i.test(raw)) return true;
  try { return ['http:', 'https:', 'blob:'].includes(new URL(raw, window.location.href).protocol); } catch { return false; }
}

function GameDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const box = dialog.current;
    box?.querySelector<HTMLButtonElement>('button')?.focus();
    const handle = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !box) return;
      const controls = Array.from(box.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex="0"]')).filter(element => !element.hasAttribute('disabled'));
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop game-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal game-dialog" role="dialog" aria-modal="true" aria-label={title} ref={dialog}>
      <div className="game-dialog-heading"><h2>{title}</h2><button className="game-icon-button" onClick={onClose} aria-label="Cerrar ventana"><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}

function ConfirmDialog({ confirmation, close }: { confirmation: ConfirmAction; close: () => void }) {
  return <GameDialog title={confirmation.title} onClose={close}><p className="muted">{confirmation.body}</p><div className="game-dialog-actions">
    <button className="button button-secondary" onClick={close}>Conservar mi avance</button>
    <button className="button button-primary" onClick={() => { confirmation.action(); close(); }}>Reiniciar esta partida</button>
  </div></GameDialog>;
}

function PhotoPreview({ photo, close }: { photo: Photo; close: () => void }) {
  return <GameDialog title={photo.title} onClose={close}><img className="game-photo-preview" src={photo.url} alt={photo.title} /><p className="muted game-small">Ésta es la fotografía original. Jugar no la modifica.</p></GameDialog>;
}

export function GamesPage({
  memories,
  namespace,
  session,
  onOpenConnect,
}: {
  memories: Memory[];
  namespace: string;
  session?: GallerySession | null;
  onOpenConnect?: () => void;
}) {
  return <GamesSession key={namespace} memories={memories} namespace={namespace} session={session} onOpenConnect={onOpenConnect} />;
}

function GamesSession({
  memories,
  namespace,
  session,
  onOpenConnect,
}: {
  memories: Memory[];
  namespace: string;
  session?: GallerySession | null;
  onOpenConnect?: () => void;
}) {
  const photos = useMemo<Photo[]>(() => memories.flatMap(memory => memory.media.filter(media => media.type === 'image' && safeImageUrl(media.url)).map((media, index) => ({ id: `${memory.id}:${media.id}`, url: media.url, title: `${memory.title || 'Nuestro recuerdo'}${memory.media.length > 1 ? ` · foto ${index + 1}` : ''}`, date: memory.date, location: memory.location }))), [memories]);
  const [storedSelection, setSelection] = useLocalState<Selection>(`${namespace}:games:selection`, { mode: 'puzzle', photoId: photos[0]?.id ?? '', size: 3 });
  const selection: Selection = {
    mode: storedSelection?.mode === 'memory' ? 'memory' : storedSelection?.mode === 'diamond' ? 'diamond' : storedSelection?.mode === 'ranking' ? 'ranking' : 'puzzle',
    size: storedSelection?.size === 4 ? 4 : 3,
    photoId: typeof storedSelection?.photoId === 'string' ? storedSelection.photoId : '',
  };
  const [localPhoto, setLocalPhoto] = useState<Photo | null>(null);
  const [fileError, setFileError] = useState('');
  const objectUrl = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photo = (localPhoto?.id === selection.photoId ? localPhoto : photos.find(item => item.id === selection.photoId)) ?? photos[0] ?? localPhoto;
  const allPhotos = useMemo<Photo[]>(() => {
    if (localPhoto && !photos.some(item => item.id === localPhoto.id)) {
      return [localPhoto, ...photos];
    }
    return photos;
  }, [localPhoto, photos]);

  const detectedPlayer = useMemo(() => {
    return session?.uid && namespace === `nh:user:${session.uid}` ? playerForUid(session.uid) : null;
  }, [session, namespace]);

  const initialProgression = useMemo<GameProgressionStore>(() => {
    const base = createDefaultProgressionStore();
    const legacy1 = readLocal<GameProgressionStore | null>(`${namespace}:game-progression:v1`, null);
    const legacy2 = readLocal<GameProgressionStore | null>('nh:couple:game-progression:v1', null);
    const legacy3 = readLocal<GameProgressionStore | null>('nh:couple:game-progression:v2', null);
    let merged = base;
    if (legacy1) merged = mergeProgressionStores(merged, legacy1);
    if (legacy2) merged = mergeProgressionStores(merged, legacy2);
    if (legacy3) merged = mergeProgressionStores(merged, legacy3);
    return merged;
  }, [namespace]);

  const [rawProgression, setProgression] = useLocalState<GameProgressionStore>(
    `${namespace}:game-progression:v3`,
    initialProgression
  );

  // Sincroniza automáticamente el jugador activo según la cuenta de Google con la que se inició sesión
  useEffect(() => {
    if (detectedPlayer && rawProgression?.activePlayer !== detectedPlayer) {
      setProgression(prev => ({
        ...(prev || createDefaultProgressionStore()),
        activePlayer: detectedPlayer,
      }));
    }
  }, [detectedPlayer, rawProgression?.activePlayer, setProgression]);

  const progressionStore = useMemo<GameProgressionStore>(() => {
    const merged = mergeProgressionStores(createDefaultProgressionStore(), rawProgression);
    return { ...merged, activePlayer: detectedPlayer ?? merged.activePlayer };
  }, [rawProgression, detectedPlayer]);
  const progressionRef = useRef(progressionStore);
  progressionRef.current = progressionStore;
  const mounted = useRef(true);
  const [syncMessage, setSyncMessage] = useState('Los tableros se guardan en este navegador. Tus récords se comparten con tu cuenta de Google.');
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    mounted.current = true;
    if (!detectedPlayer) return () => { mounted.current = false; };
    let active = true;
    const stop = watchGameRecords(namespace, (records, cached) => {
      if (!active) return;
      const next = mergeProgressionStores(progressionRef.current, gameRecordsProgress(records));
      next.activePlayer = detectedPlayer;
      progressionRef.current = next;
      setProgression(next);
      setSyncMessage(cached ? 'Mostrando récords guardados; esperamos confirmación de la nube.' : 'Récords compartidos actualizados, combinados con los históricos de este navegador. Puedes sincronizar tus récords guardados con el botón de abajo.');
    }, message => { if (active) setSyncMessage(message); });
    return () => { active = false; mounted.current = false; stop(); };
  }, [namespace, detectedPlayer, setProgression]);

  async function shareOwnRecords() {
    if (!detectedPlayer || syncing) return;
    setSyncing(true);
    setSyncMessage('Confirmando tus récords de este navegador…');
    const results = await Promise.allSettled(ownGameRecordDrafts(progressionRef.current, session?.uid ?? '').map(({ game, record }) => saveGameRecord(namespace, game, record)));
    if (!mounted.current) return;
    setSyncing(false);
    const failed = results.find(result => result.status === 'rejected');
    setSyncMessage(failed?.status === 'rejected' ? gameSyncError(failed.reason) : 'Tus récords están confirmados en la nube. Los récords históricos de la otra persona siguen intactos en este navegador.');
  }

  const activePlayerId: PlayerId = progressionStore.activePlayer;
  const activePlayerData = progressionStore[activePlayerId];
  const activePlayerInfo = PLAYERS[activePlayerId];

  const [puzzleLevel, setPuzzleLevel] = useState<number>(1);
  const [memoryLevel, setMemoryLevel] = useState<number>(1);
  const [diamondLevel, setDiamondLevel] = useState<number>(1);

  function handleSwitchPlayer(player: PlayerId) {
    setProgression(prev => ({
      ...(prev || createDefaultProgressionStore()),
      activePlayer: player,
    }));
  }

  function handleRecordLevel(game: GameType, level: number, stars: 1 | 2 | 3, score: number, metricLabel: string) {
    const current = progressionRef.current;
    const active = detectedPlayer ?? current.activePlayer;
    const next = recordLevelCompletion(current, active, game, level, stars, score, metricLabel);
    progressionRef.current = next;
    setProgression(next);
    if (!detectedPlayer) return;
    const record = next[detectedPlayer][game].levels[level];
    if (!record) return;
    setSyncMessage('Récord guardado aquí; confirmando en la nube…');
    void saveGameRecord(namespace, game, record).then(() => {
      if (mounted.current) setSyncMessage('Récord confirmado y compartido.');
    }).catch(error => { if (mounted.current) setSyncMessage(gameSyncError(error)); });
  }

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  function chooseLocal(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFileError('Elige una fotografía en JPG, PNG, WebP u otro formato de imagen compatible.'); return; }
    if (file.size > 25 * 1024 * 1024) { setFileError('Para jugar en el teléfono, elige una foto de menos de 25 MB.'); return; }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file); objectUrl.current = url;
    const next: Photo = { id: `device:${file.name}:${file.size}:${file.lastModified}`, url, title: file.name.replace(/\.[^.]+$/, ''), local: true };
    setLocalPhoto(next); setSelection({ ...selection, photoId: next.id }); setFileError('');
  }

  return <div className="games-page">
    <header className="page-header"><div><h1 className="page-title">Minijuegos</h1><p className="muted"></p></div><span className="game-heading-flower" aria-hidden="true"><Flower2 /></span></header>
    <div className="game-mode-tabs" role="tablist" aria-label="Elige un juego">
      <button id="puzzle-tab" type="button" role="tab" aria-selected={selection.mode === 'puzzle'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'puzzle' })} className={selection.mode === 'puzzle' ? 'is-active' : ''}><Puzzle size={21} /><span>Rompecabezas<small>Armar foto pieza por pieza</small></span></button>
      <button id="memory-tab" type="button" role="tab" aria-selected={selection.mode === 'memory'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'memory' })} className={selection.mode === 'memory' ? 'is-active' : ''}><Sparkles size={21} /><span>Memorama<small>Descubrir parejas de fotos</small></span></button>
      <button id="diamond-tab" type="button" role="tab" aria-selected={selection.mode === 'diamond'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'diamond' })} className={selection.mode === 'diamond' ? 'is-active' : ''}><Gem size={21} /><span>Diamantitos<small>Pintar y colorear con números</small></span></button>
      <button id="ranking-tab" type="button" role="tab" aria-selected={selection.mode === 'ranking'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'ranking' })} className={selection.mode === 'ranking' ? 'is-active' : ''}><Trophy size={21} /><span>Ranking & Récords<small>Val vs Ale · Puntos y Trofeos</small></span></button>
    </div>

    {selection.mode !== 'memory' && selection.mode !== 'ranking' && (
      <section className="card game-photo-picker" aria-label="Fotografía para jugar">
        <div className="game-chosen-photo">{photo ? <img src={photo.url} alt="" loading="lazy" /> : <span className="game-photo-placeholder"><ImagePlus /></span>}<div><span className="eyebrow">Foto seleccionada</span><strong>{photo?.title ?? 'Elige una fotografía'}</strong><p className="muted game-small">Cada foto y nivel conserva su propia partida en este navegador.</p></div></div>
        <details className="game-photo-choices"><summary className="button button-secondary"><ImagePlus size={16} /> Cambiar fotografía</summary><div className="game-photo-options">
          {photos.length > 0 && <div className="game-photo-grid">{photos.map(item => <button type="button" key={item.id} className={photo?.id === item.id ? 'is-selected' : ''} onClick={() => setSelection({ ...selection, photoId: item.id })} aria-label={`Jugar con ${item.title}`} aria-pressed={photo?.id === item.id}><img src={item.url} alt="" loading="lazy" /><span>{item.title}</span>{photo?.id === item.id && <Check size={16} />}</button>)}</div>}
          <p className="muted game-small">Cambiar de foto conserva el avance de la anterior. Las imágenes de la galería siguen intactas.</p><button className="button button-secondary" type="button" onClick={() => fileInput.current?.click()}><ImagePlus size={16} /> Usar foto de este dispositivo</button>
        </div></details>
      </section>
    )}
    <input className="game-file-input" ref={fileInput} type="file" accept="image/*" aria-label="Elegir foto de este dispositivo, sin subirla" onChange={event => { chooseLocal(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    {fileError && <p className="game-error" role="alert">{fileError}</p>}
    {selection.mode !== 'memory' && selection.mode !== 'ranking' && photo?.local && <p className="game-local-note"><Heart size={14} aria-hidden="true" /> Esta foto se queda en tu dispositivo. Para retomar otro día, elige de nuevo el mismo archivo.</p>}

    <section id="game-panel" role="tabpanel" aria-labelledby={`${selection.mode}-tab`}>
      {selection.mode === 'ranking' ? (
        <GameRankingSection
          store={progressionStore}
          detectedPlayer={detectedPlayer}
          onSwitchPlayer={handleSwitchPlayer}
          onGoToGame={game => {
            setSelection({ ...selection, mode: game });
          }}
        />
      ) : selection.mode === 'memory' ? (
        <MemoryGame
          key={`${namespace}:memory:${allPhotos.map(item => item.id).join('|')}:${memoryLevel}:${activePlayerId}`}
          photos={allPhotos}
          namespace={namespace}
          level={memoryLevel}
          onSelectLevel={setMemoryLevel}
          unlockedLevel={activePlayerData.memory.unlockedLevel}
          playerProgress={activePlayerData.memory}
          activePlayerName={activePlayerInfo.name}
          onRecordResult={(stars, score, metric) => handleRecordLevel('memory', memoryLevel, stars, score, metric)}
          chooseLocal={() => fileInput.current?.click()}
        />
      ) : !photo ? (
        <div className="empty-state card game-empty"><Flower2 size={42} /><h2>El primer recuerdo lo eliges tú</h2><p className="muted">Puedes añadir fotografías en Recuerdos o jugar con una imagen de este dispositivo. No se subirá a la galería.</p><button className="button button-primary" onClick={() => fileInput.current?.click()}><ImagePlus size={17} /> Elegir fotografía</button></div>
      ) : selection.mode === 'puzzle' ? (
        <PuzzleGame
          key={`${namespace}:${photo.id}:${puzzleLevel}:${activePlayerId}`}
          photo={photo}
          namespace={namespace}
          level={puzzleLevel}
          onSelectLevel={setPuzzleLevel}
          unlockedLevel={activePlayerData.puzzle.unlockedLevel}
          playerProgress={activePlayerData.puzzle}
          activePlayerName={activePlayerInfo.name}
          onRecordResult={(stars, score, metric) => handleRecordLevel('puzzle', puzzleLevel, stars, score, metric)}
        />
      ) : (
        <DiamondGame
          key={`${namespace}:${photo.id}:${photo.url}:${diamondLevel}:${activePlayerId}`}
          photo={photo}
          namespace={namespace}
          level={diamondLevel}
          onSelectLevel={setDiamondLevel}
          unlockedLevel={activePlayerData.diamond.unlockedLevel}
          playerProgress={activePlayerData.diamond}
          activePlayerName={activePlayerInfo.name}
          onRecordResult={(stars, score, metric) => handleRecordLevel('diamond', diamondLevel, stars, score, metric)}
          chooseLocal={() => fileInput.current?.click()}
        />
      )}
    </section>
    <p className="game-save-state" role="status">{syncMessage}</p>
    {detectedPlayer && <button type="button" className="button button-secondary" disabled={syncing} onClick={() => { void shareOwnRecords(); }}><Users size={16} /> {syncing ? 'Confirmando récords…' : 'Sincronizar mis récords guardados'}</button>}
    <p className="game-privacy-note"><Heart size={14} aria-hidden="true" /> Los récords se comparten por cuenta; los tableros en curso se guardan aquí. Ningún juego edita, elimina ni vuelve a subir tus recuerdos.</p>
  </div>;
}

function PuzzleGame({
  photo,
  namespace,
  level,
  onSelectLevel,
  unlockedLevel,
  playerProgress,
  activePlayerName,
  onRecordResult,
}: {
  photo: Photo;
  namespace: string;
  level: number;
  onSelectLevel: (lvl: number) => void;
  unlockedLevel: number;
  playerProgress: PlayerGameProgress;
  activePlayerName: string;
  onRecordResult: (stars: 1 | 2 | 3, score: number, metric: string) => void;
}) {
  const size: PuzzleSize = level >= 5 ? 5 : level >= 3 ? 4 : 3;
  const initial = useMemo(() => {
    const legacy = ownsLegacyBoard('puzzle', level, size) ? readLocal<unknown>(`${namespace}:puzzle:v1:${photo.id}:${size}`, null) : null;
    return validPuzzle(legacy, size) ? legacy : newPuzzle(size);
  }, [namespace, photo.id, level, size]);
  const [stored, setGame, saved] = useLocalState(puzzleLevelKey(namespace, photo.id, level, size), initial);
  const game = validPuzzle(stored, size) ? stored : initial;
  const [selected, setSelected] = useState<number | null>(null);
  const [numbers, setNumbers] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [imageError, setImageError] = useState(false);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const pieces = useRef<(HTMLButtonElement | null)[]>([]);
  const complete = isSolved(game.tiles);
  const correct = correctTiles(game.tiles);
  const objectiveMet = complete && meetsLevelObjective('puzzle', level, game.moves);

  const scoreResult = useMemo(() => {
    return calculatePuzzleScore(level, game.moves, game.hints);
  }, [level, game.moves, game.hints]);

  const recordedRef = useRef(false);
  useEffect(() => {
    if (objectiveMet && !recordedRef.current) {
      recordedRef.current = true;
      onRecordResult(scoreResult.stars, scoreResult.score, `${game.moves} movs`);
    }
  }, [objectiveMet, scoreResult, onRecordResult, game.moves]);

  useEffect(() => {
    const img = new Image();
    img.src = photo.url;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [photo.url]);

  function selectPiece(index: number) {
    if (complete) return;
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else { setGame(movePuzzle(game, selected, index)); setSelected(null); setHint(null); }
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / size); const column = index % size;
    const direction: Record<string, number> = { ArrowLeft: column > 0 ? index - 1 : index, ArrowRight: column < size - 1 ? index + 1 : index, ArrowUp: row > 0 ? index - size : index, ArrowDown: row < size - 1 ? index + size : index, Home: row * size, End: row * size + size - 1 };
    if (event.key in direction) { event.preventDefault(); pieces.current[direction[event.key]]?.focus(); }
    if (event.key === 'Escape') setSelected(null);
  }
  function giveHint() {
    const to = game.tiles.findIndex((tile, index) => tile !== index);
    if (to < 0) return;
    const from = game.tiles.indexOf(to);
    setHint({ from, to }); setGame({ ...game, hints: game.hints + 1 });
  }
  return <div className="game-layout">
    <div className="card game-board-card">
      <GameLevelBar
        game="puzzle"
        activeLevel={level}
        unlockedLevel={unlockedLevel}
        playerProgress={playerProgress}
        activePlayerName={activePlayerName}
        onSelectLevel={lvl => {
          recordedRef.current = false;
          onSelectLevel(lvl);
        }}
      />
      <div className="game-board-heading">
        <div><span className="eyebrow">Rompecabezas · Nivel {level}</span><h2>{photo.title}</h2></div>
        <span className="game-badge">{size * size} piezas</span>
      </div>
      {imageError && <p className="game-error" role="alert">Esta fotografía no se pudo abrir. Elige otra imagen o una foto de tu dispositivo.</p>}
      <div
        className={`game-puzzle-board ${complete ? 'is-complete' : ''}`}
        style={{ '--puzzle-size': size, '--puzzle-aspect': `${aspectRatio}` } as CSSProperties}
        role="group"
        aria-label={`Rompecabezas de ${size} por ${size}. Selecciona dos piezas para intercambiarlas.`}
      >
        {showGuide && (
          <div className="game-puzzle-ghost-guide" aria-hidden="true">
            <img src={photo.url} alt="" />
          </div>
        )}
        {game.tiles.map((tile, index) => <button
          key={index}
          ref={element => { pieces.current[index] = element; }}
          type="button"
          className={`game-puzzle-piece ${selected === index ? 'is-selected' : ''} ${hint?.from === index || hint?.to === index ? 'is-hint' : ''}`}
          aria-label={`Casilla ${index + 1}, pieza ${tile + 1}${tile === index ? ', colocada correctamente' : ''}`}
          aria-pressed={selected === index}
          onClick={() => selectPiece(index)}
          onKeyDown={event => keyboard(event, index)}
          aria-disabled={complete}
        >
          <img
            src={photo.url}
            alt=""
            draggable="false"
            onError={() => setImageError(true)}
            style={{
              width: `${size * 100}%`,
              height: `${size * 100}%`,
              left: `${-(tile % size) * 100}%`,
              top: `${-Math.floor(tile / size) * 100}%`,
            }}
          />
          {(numbers || hint !== null) && <span className="game-piece-number">{tile + 1}</span>}
          {selected === index && <span className="game-piece-picked"><Check size={20} /></span>}
        </button>)}
      </div>
      <p className="game-board-help" aria-live="polite">
        {complete ? `¡Lo lograste, ${activePlayerName}! El recuerdo está completo.` : hint ? `Pista: la pieza ${hint.to + 1} va en la casilla ${hint.to + 1}. Ambas están iluminadas.` : selected !== null ? `Pieza ${game.tiles[selected] + 1} seleccionada. Toca otra para intercambiarlas; toca la misma para cancelar.` : 'Toca una pieza y después otra para intercambiarlas. Con teclado: flechas y Enter.'}
      </p>
      {complete && <div className="game-celebration" role="status">
        <Flower2 size={29} />
        <div>
          <strong>{objectiveMet ? `¡Nivel ${level} completado por ${activePlayerName}!` : 'Foto armada. Reintenta para cumplir el objetivo del nivel.'}</strong>
          <p>{game.moves} movimientos y {game.hints} {game.hints === 1 ? 'pista' : 'pistas'}.</p>
          {objectiveMet && <div className="celebration-stars-score">
            <div className="celebration-stars">
              {[1, 2, 3].map(s => (
                <Star
                  key={s}
                  size={18}
                  className={s <= scoreResult.stars ? 'star-gold' : 'star-empty'}
                  fill={s <= scoreResult.stars ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="celebration-pts">+{scoreResult.score} pts</span>
          </div>}
          {objectiveMet && level < 5 && (
            <button
              type="button"
              className="button button-primary celebration-next-btn"
              onClick={() => {
                recordedRef.current = false;
                onSelectLevel(level + 1);
              }}
            >
              Jugar Nivel {level + 1} ➔
            </button>
          )}
        </div>
        <Heart size={23} />
      </div>}
    </div>
    <aside className="game-side-panel">
      <div className="card game-controls-card">
        <span className="eyebrow">Dificultad Progresiva</span>
        <h3>Nivel {level} de 5</h3>
        <p className="muted game-small">
          Tablero actual: <strong>{size} × {size} ({size * size} piezas)</strong>. {level === 2 ? 'Objetivo: menos de 20 movimientos.' : level === 4 ? 'Objetivo: menos de 40 movimientos.' : 'Objetivo: armar todas las piezas.'}
        </p>
        <div className="game-progress-label"><span>Piezas en su lugar</span><strong>{correct} / {size * size}</strong></div>
        <progress className="game-progress" max={size * size} value={correct} aria-label="Piezas correctamente colocadas" />
        <dl className="game-stats"><div><dt>Movimientos</dt><dd>{game.moves}</dd></div><div><dt>Pistas</dt><dd>{game.hints}</dd></div></dl>
        <div className="game-control-buttons">
          <button
            type="button"
            className={`button button-secondary ${showGuide ? 'is-active' : ''}`}
            onClick={() => setShowGuide(value => !value)}
            aria-pressed={showGuide}
            title="Activa o desactiva la foto guía translúcida de fondo"
          >
            <Eye size={16} /> {showGuide ? 'Ocultar foto guía' : 'Foto guía de fondo'}
          </button>
          <button className="button button-secondary" onClick={() => setPreview(true)}><Eye size={16} /> Ver fotografía</button>
          <button className="button button-secondary" onClick={giveHint} disabled={complete}><Sparkles size={16} /> Una pista</button>
          <button className="button button-secondary" onClick={() => { setGame(undoPuzzle(game)); setSelected(null); setHint(null); }} disabled={!game.history.length}><Undo2 size={16} /> Deshacer movimiento</button>
          <button className="button button-secondary" onClick={() => setConfirmation({ title: '¿Mezclamos este recuerdo?', body: 'Se reiniciarán los movimientos y el avance de esta partida en este dispositivo. La fotografía, el recuerdo y las otras partidas se conservan.', action: () => { recordedRef.current = false; setGame(newPuzzle(size)); setSelected(null); setHint(null); } })}><Shuffle size={16} /> Mezclar de nuevo</button>
        </div>
        <label className="game-checkbox"><input type="checkbox" checked={numbers} onChange={event => setNumbers(event.target.checked)} /> Mostrar números en las piezas</label>
        <p className={`game-save-state ${saved ? '' : 'game-error'}`} role="status">{saved ? 'Avance guardado en este navegador' : 'No se pudo guardar. El almacenamiento del navegador está lleno o deshabilitado.'}</p>
      </div>

      <div className="card game-photo-reference-card">
        <div className="game-photo-reference-header">
          <span className="eyebrow">Foto de referencia</span>
          <button type="button" className="game-text-link" onClick={() => setPreview(true)}>
            <ZoomIn size={14} /> Ampliar
          </button>
        </div>
        <div
          className="game-photo-reference-thumb"
          onClick={() => setPreview(true)}
          role="button"
          tabIndex={0}
          aria-label="Ampliar fotografía de referencia"
        >
          <img src={photo.url} alt={photo.title} />
          <span className="game-photo-reference-badge">Original completa</span>
        </div>
        <p className="muted game-small">Foto completa sin recortar para saber cómo debe quedar.</p>
      </div>

      <div className="game-whisper"><Flower2 size={23} /><p>No hace falta hacerlo rápido.<br />Los momentos bonitos se disfrutan.</p></div>
    </aside>
    {preview && <PhotoPreview photo={photo} close={() => setPreview(false)} />}
    {confirmation && <ConfirmDialog confirmation={confirmation} close={() => setConfirmation(null)} />}
  </div>;
}

function DiamondGame({
  photo,
  namespace,
  level,
  onSelectLevel,
  unlockedLevel,
  playerProgress,
  activePlayerName,
  onRecordResult,
  chooseLocal,
}: {
  photo: Photo;
  namespace: string;
  level: number;
  onSelectLevel: (lvl: number) => void;
  unlockedLevel: number;
  playerProgress: PlayerGameProgress;
  activePlayerName: string;
  onRecordResult: (stars: 1 | 2 | 3, score: number, metric: string) => void;
  chooseLocal: () => void;
}) {
  const [density, setDensity] = useState<'standard' | 'hd'>(level >= 4 ? 'hd' : 'standard');
  const [pattern, setPattern] = useState<MosaicPattern | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [cellColors, setCellColors] = useState<RGB[]>([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setDensity(level >= 4 ? 'hd' : 'standard');
  }, [level]);

  useEffect(() => {
    let active = true;
    setPattern(null);
    setLoadedImage(null);
    setCellColors([]);
    setError('');

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active) return;
      try {
        const naturalW = image.naturalWidth || 1;
        const naturalH = image.naturalHeight || 1;
        const ar = naturalW / naturalH;

        let columns = 32;
        let rows = 40;
        if (density === 'hd') {
          if (ar >= 1.25) {
            columns = 56;
            rows = 42;
          } else if (ar <= 0.8) {
            columns = 42;
            rows = 56;
          } else {
            columns = 48;
            rows = 48;
          }
        } else {
          if (ar >= 1.25) {
            columns = 40;
            rows = 30;
          } else if (ar <= 0.8) {
            columns = 30;
            rows = 40;
          } else {
            columns = 34;
            rows = 34;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = columns;
        canvas.height = rows;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('image');

        context.drawImage(image, 0, 0, columns, rows);
        const imgData = context.getImageData(0, 0, columns, rows).data;
        const pat = createMosaic(imgData, columns, rows, 20);

        const extracted: RGB[] = [];
        for (let i = 0; i < imgData.length; i += 4) {
          extracted.push([imgData[i], imgData[i + 1], imgData[i + 2]]);
        }

        setPattern(pat);
        setLoadedImage(image);
        setCellColors(extracted);
      } catch {
        setError('El navegador no pudo procesar esta imagen para crear el cuadro de diamantes. Puedes elegir otra foto o usar el archivo de tu dispositivo.');
      }
    };
    image.onerror = () => {
      if (active) setError('No pudimos abrir esta imagen para el cuadro de diamantes. Elige otra foto o usa el archivo de tu dispositivo.');
    };
    image.src = photo.url;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [photo.url, retry, density]);

  if (error) return <div className="card game-load-state"><Gem size={36} /><h2>Esta foto necesita un pequeño paso más</h2><p className="muted">{error}</p><div className="game-dialog-actions"><button className="button button-secondary" onClick={() => setRetry(value => value + 1)}><RotateCcw size={16} /> Volver a intentar</button><button className="button button-primary" onClick={chooseLocal}><ImagePlus size={16} /> Usar foto de este dispositivo</button></div></div>;
  if (!pattern) return <div className="card game-load-state" role="status"><LoaderCircle size={30} className="game-spinner" /><h2>Preparando tu lienzo de diamantes…</h2><p className="muted">Colocando las marcas numeradas y organizando las piedritas en la bandeja.</p></div>;
  return <PaintingBoard key={`${pattern.fingerprint}:${density}:${level}`} pattern={pattern} photo={photo} namespace={namespace} loadedImage={loadedImage} cellColors={cellColors} density={density} setDensity={setDensity} level={level} onSelectLevel={onSelectLevel} unlockedLevel={unlockedLevel} playerProgress={playerProgress} activePlayerName={activePlayerName} onRecordResult={onRecordResult} />;
}

function validPaintState(value: unknown, pattern: MosaicPattern): value is PaintState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PaintState;
  const validIndices = (array: unknown): array is number[] => Array.isArray(array) && array.length <= pattern.cells.length && new Set(array).size === array.length && array.every(index => Number.isInteger(index) && index >= 0 && index < pattern.cells.length);
  return candidate.fingerprint === pattern.fingerprint && validIndices(candidate.painted) && Array.isArray(candidate.history) && candidate.history.length <= 100 && candidate.history.every(validIndices);
}

function rgb(color: RGB, opacity = 1) { return `rgba(${color.join(',')},${opacity})`; }
function readableText(color: RGB) { return color[0] * .299 + color[1] * .587 + color[2] * .114 > 150 ? '#493e3a' : '#ffffff'; }

function drawDiamondSparkle(ctx: CanvasRenderingContext2D, sx: number, sy: number, size: number) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(sx, sy - size);
  ctx.quadraticCurveTo(sx, sy, sx + size, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy + size);
  ctx.quadraticCurveTo(sx, sy, sx - size, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFacetedDiamondBead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: RGB,
  style: 'round' | 'square' = 'round',
  isFocused = false,
  sparkle = false
) {
  const [r, g, b] = color;
  ctx.save();

  // 1. Drop shadow beneath the 3D diamond bead
  ctx.beginPath();
  if (style === 'square') {
    if (ctx.roundRect) ctx.roundRect(cx - radius + 0.6, cy - radius + 1.2, radius * 2, radius * 2, 2.5);
    else ctx.rect(cx - radius + 0.6, cy - radius + 1.2, radius * 2, radius * 2);
  } else {
    ctx.arc(cx + 0.5, cy + 1.2, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(25, 12, 18, 0.42)';
  ctx.fill();

  // 2. Base solid opaque 3D dome with spherical gradient
  const rL = Math.min(255, Math.round(r * 1.35 + 40));
  const gL = Math.min(255, Math.round(g * 1.35 + 40));
  const bL = Math.min(255, Math.round(b * 1.35 + 40));

  const rD = Math.max(0, Math.round(r * 0.62));
  const gD = Math.max(0, Math.round(g * 0.62));
  const bD = Math.max(0, Math.round(b * 0.62));

  const rDarker = Math.max(0, Math.round(r * 0.45));
  const gDarker = Math.max(0, Math.round(g * 0.45));
  const bDarker = Math.max(0, Math.round(b * 0.45));

  const domeGrad = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.08,
    cx,
    cy,
    radius
  );
  domeGrad.addColorStop(0, `rgb(${rL}, ${gL}, ${bL})`);
  domeGrad.addColorStop(0.42, `rgb(${r}, ${g}, ${b})`);
  domeGrad.addColorStop(0.85, `rgb(${rD}, ${gD}, ${bD})`);
  domeGrad.addColorStop(1, `rgb(${rDarker}, ${gDarker}, ${bDarker})`);

  ctx.beginPath();
  if (style === 'square') {
    if (ctx.roundRect) ctx.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, 2.5);
    else ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = domeGrad;
  ctx.fill();

  // 3. Facets: Authentic 5D Diamond Painting Drill Cuts
  if (style === 'square') {
    const inner = radius * 0.52;
    ctx.beginPath();
    ctx.rect(cx - inner, cy - inner, inner * 2, inner * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 0.65;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - inner, cy - inner); ctx.lineTo(cx - radius, cy - radius);
    ctx.moveTo(cx + inner, cy - inner); ctx.lineTo(cx + radius, cy - radius);
    ctx.moveTo(cx - inner, cy + inner); ctx.lineTo(cx - radius, cy + radius);
    ctx.moveTo(cx + inner, cy + inner); ctx.lineTo(cx + radius, cy + radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  } else {
    const tableR = radius * 0.48;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px = cx + Math.cos(angle) * tableR;
      const py = cy + Math.sin(angle) * tableR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = 0.65;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const px1 = cx + Math.cos(angle) * tableR;
      const py1 = cy + Math.sin(angle) * tableR;
      const px2 = cx + Math.cos(angle) * (radius - 0.5);
      const py2 = cy + Math.sin(angle) * (radius - 0.5);
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // 4. Specular glossy highlight crescent
  ctx.beginPath();
  ctx.ellipse(
    cx - radius * 0.32,
    cy - radius * 0.32,
    radius * 0.24,
    radius * 0.12,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.fill();

  // 5. Crisp perimeter rim definition (prevents blur between beads)
  ctx.beginPath();
  if (style === 'square') {
    if (ctx.roundRect) ctx.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, 2.5);
    else ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.arc(cx, cy, radius - 0.3, 0, Math.PI * 2);
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.lineWidth = 0.65;
  ctx.stroke();

  // 6. Diamond Sparkle Star
  if (sparkle) {
    drawDiamondSparkle(ctx, cx + radius * 0.25, cy - radius * 0.28, radius * 0.48);
  }

  // 7. Focus Ring
  if (isFocused) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function PaintingBoard({
  pattern,
  photo,
  namespace,
  loadedImage,
  cellColors,
  density,
  setDensity,
  level,
  onSelectLevel,
  unlockedLevel,
  playerProgress,
  activePlayerName,
  onRecordResult,
}: {
  pattern: MosaicPattern;
  photo: Photo;
  namespace: string;
  loadedImage: HTMLImageElement | null;
  cellColors: RGB[];
  density: 'standard' | 'hd';
  setDensity: (d: 'standard' | 'hd') => void;
  level: number;
  onSelectLevel: (lvl: number) => void;
  unlockedLevel: number;
  playerProgress: PlayerGameProgress;
  activePlayerName: string;
  onRecordResult: (stars: 1 | 2 | 3, score: number, metric: string) => void;
}) {
  const key = diamondLevelKey(namespace, photo.id, level, pattern.fingerprint);
  const initial: PaintState = { fingerprint: pattern.fingerprint, painted: [], history: [] };
  const [game, setGame] = useState<PaintState>(() => {
    const legacy = ownsLegacyBoard('diamond', level, density) ? readLocal<unknown>(`${namespace}:diamond:v1:${photo.id}:${pattern.fingerprint}`, null) : null;
    const stored = readLocal<unknown>(key, legacy);
    return validPaintState(stored, pattern) ? stored : initial;
  });
  const current = useRef(game);
  current.current = game;
  const [saved, setSaved] = useState(true);
  const [color, setColor] = useState(() => pattern.cells.find((_, index) => !game.painted.includes(index)) ?? 0);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<'paint' | 'pan'>('paint');
  const [preview, setPreview] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(false);
  const [showOriginalClean, setShowOriginalClean] = useState(false);
  const [guideMode, setGuideMode] = useState<'soft' | 'clear' | 'canvas'>('soft');
  const [diamondStyle, setDiamondStyle] = useState<'round' | 'square'>('round');
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState('Elige un número y coloca los diamantitos que brillan en el lienzo.');
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const stroke = useRef<number[] | null>(null);
  const lastCell = useRef<number | null>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const completed = game.painted.length === pattern.cells.length;
  const completedRatio = game.painted.length / pattern.cells.length;
  const objectiveMet = density === (level >= 4 ? 'hd' : 'standard') && meetsLevelObjective('diamond', level, completedRatio);
  const painted = useMemo(() => new Set(game.painted), [game.painted]);
  const remaining = useMemo(
    () => pattern.palette.map((_, index) => pattern.cells.reduce((count, target, cell) => count + Number(target === index && !painted.has(cell)), 0)),
    [pattern, painted]
  );

  const scoreResult = useMemo(() => {
    return calculateDiamondScore(level, completedRatio);
  }, [level, completedRatio]);

  const recordedRef = useRef(0);
  useEffect(() => {
    if (objectiveMet && scoreResult.score > recordedRef.current) {
      recordedRef.current = scoreResult.score;
      onRecordResult(scoreResult.stars, scoreResult.score, `${Math.floor(completedRatio * 100)}% completado`);
    }
  }, [objectiveMet, scoreResult, completedRatio, onRecordResult]);

  function persist(next: PaintState) { current.current = next; setGame(next); setSaved(writeLocal(key, next)); }
  function finishStroke() {
    if (stroke.current?.length) persist({ ...current.current, history: [...current.current.history, stroke.current].slice(-100) });
    stroke.current = null; lastCell.current = null; pan.current = null;
  }
  useEffect(() => {
    const saveWhenHidden = () => { if (document.visibilityState === 'hidden') finishStroke(); };
    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => { document.removeEventListener('visibilitychange', saveWhenHidden); if (stroke.current?.length) writeLocal(key, { ...current.current, history: [...current.current.history, stroke.current].slice(-100) }); };
  }, [key]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const context = node.getContext('2d');
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const totalW = pattern.columns * CELL_SIZE;
    const totalH = pattern.rows * CELL_SIZE;

    node.width = totalW * ratio;
    node.height = totalH * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    // 1. Draw craft canvas texture and guide
    context.fillStyle = '#FAF7F2';
    context.fillRect(0, 0, totalW, totalH);

    // Faint printed photo/template guide on canvas
    if (loadedImage) {
      if (showOriginalClean) {
        context.drawImage(loadedImage, 0, 0, totalW, totalH);
        return;
      }
      context.save();
      const guideAlpha = guideMode === 'clear' ? 0.65 : guideMode === 'canvas' ? 0.20 : 0.42;
      context.globalAlpha = guideAlpha;
      context.drawImage(loadedImage, 0, 0, totalW, totalH);
      context.restore();
    }

    // 2. Render each diamond cell
    pattern.cells.forEach((target, index) => {
      const x = (index % pattern.columns) * CELL_SIZE;
      const y = Math.floor(index / pattern.columns) * CELL_SIZE;
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      const radius = CELL_SIZE / 2 - 0.7;
      const isPainted = painted.has(index) || preview;
      const isCurrentColor = target === color;
      const symbol = SYMBOLS[target % SYMBOLS.length];

      if (isPainted) {
        const palCol = pattern.palette[target];
        const rawPhotoCol = cellColors[index];
        const finalColor: RGB = rawPhotoCol
          ? [
              Math.round(rawPhotoCol[0] * 0.82 + palCol[0] * 0.18),
              Math.round(rawPhotoCol[1] * 0.82 + palCol[1] * 0.18),
              Math.round(rawPhotoCol[2] * 0.82 + palCol[2] * 0.18),
            ]
          : palCol;

        const showGlint = preview || completed || (index % 11 === 0);
        drawFacetedDiamondBead(
          context,
          cx,
          cy,
          radius,
          finalColor,
          diamondStyle,
          index === cursor && focused,
          showGlint
        );
      } else {
        const palCol = pattern.palette[target];

        // Background circle in the socket
        context.beginPath();
        if (diamondStyle === 'square') {
          if (context.roundRect) context.roundRect(cx - radius, cy - radius, radius * 2, radius * 2, 2);
          else context.rect(cx - radius, cy - radius, radius * 2, radius * 2);
        } else {
          context.arc(cx, cy, radius, 0, Math.PI * 2);
        }

        if (isCurrentColor) {
          // Highlight active color socket with glowing pink ring!
          context.fillStyle = 'rgba(255, 240, 246, 0.94)';
          context.fill();
          context.strokeStyle = '#E85D88';
          context.lineWidth = 2.2;
          context.stroke();

          // Outer halo
          context.beginPath();
          context.arc(cx, cy, radius + 1.8, 0, Math.PI * 2);
          context.strokeStyle = 'rgba(232, 93, 136, 0.45)';
          context.lineWidth = 1.2;
          context.stroke();
        } else {
          // Idle socket: printed symbol on canvas
          context.fillStyle = `rgba(${palCol[0]}, ${palCol[1]}, ${palCol[2]}, 0.28)`;
          context.fill();
          context.strokeStyle = 'rgba(60, 40, 50, 0.35)';
          context.lineWidth = 0.85;
          context.stroke();
        }

        // Center printed symbol letter / number
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = isCurrentColor ? 'bold 9px "Plus Jakarta Sans", system-ui, sans-serif' : '600 8px "Plus Jakarta Sans", system-ui, sans-serif';
        context.fillStyle = isCurrentColor ? '#D81B60' : '#2D1B25';
        context.fillText(symbol, cx, cy + 0.5);
      }
    });

    if (focused && !preview) {
      const fx = (cursor % pattern.columns) * CELL_SIZE;
      const fy = Math.floor(cursor / pattern.columns) * CELL_SIZE;
      context.strokeStyle = '#2B1D24';
      context.lineWidth = 2;
      context.strokeRect(fx + 1, fy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }, [pattern, painted, preview, color, cursor, focused, loadedImage, cellColors, guideMode, diamondStyle, completed, showOriginalClean]);

  function paintCell(cell: number) {
    if (!canPaintCell(pattern, cell, color, current.current.painted)) return false;
    stroke.current ??= []; stroke.current.push(cell);
    const next = { ...current.current, painted: [...current.current.painted, cell] };
    current.current = next; setGame(next); return true;
  }
  function cellAt(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const column = Math.floor((event.clientX - rect.left) / rect.width * pattern.columns);
    const row = Math.floor((event.clientY - rect.top) / rect.height * pattern.rows);
    return column >= 0 && row >= 0 && column < pattern.columns && row < pattern.rows ? row * pattern.columns + column : -1;
  }
  function paintPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const cell = cellAt(event); if (cell < 0) return;
    setCursor(cell);
    if (lastCell.current !== null) {
      const start = lastCell.current; const dx = cell % pattern.columns - start % pattern.columns; const dy = Math.floor(cell / pattern.columns) - Math.floor(start / pattern.columns);
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let step = 1; step <= steps; step++) paintCell((Math.floor(start / pattern.columns) + Math.round(dy * step / steps)) * pattern.columns + start % pattern.columns + Math.round(dx * step / steps));
    } else if (!paintCell(cell) && !current.current.painted.includes(cell)) setFeedback(`Ese diamantito lleva otro número. Busca las casillas del número ${color + 1}.`);
    lastCell.current = cell;
  }
  function keyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    const directions: Record<string, number> = { ArrowLeft: cursor % pattern.columns ? cursor - 1 : cursor, ArrowRight: cursor % pattern.columns < pattern.columns - 1 ? cursor + 1 : cursor, ArrowUp: Math.max(0, cursor - pattern.columns), ArrowDown: Math.min(pattern.cells.length - 1, cursor + pattern.columns), Home: Math.floor(cursor / pattern.columns) * pattern.columns, End: Math.floor(cursor / pattern.columns) * pattern.columns + pattern.columns - 1 };
    if (event.key in directions) {
      event.preventDefault(); const next = directions[event.key]; setCursor(next);
      const view = viewport.current; const node = canvas.current;
      if (view && node) { const unit = node.offsetWidth / pattern.columns; const x = next % pattern.columns * unit; const y = Math.floor(next / pattern.columns) * unit; if (x < view.scrollLeft || x + unit > view.scrollLeft + view.clientWidth) view.scrollLeft = Math.max(0, x - view.clientWidth / 2); if (y < view.scrollTop || y + unit > view.scrollTop + view.clientHeight) view.scrollTop = Math.max(0, y - view.clientHeight / 2); }
    }
    if ((event.key === ' ' || event.key === 'Enter') && !preview) {
      event.preventDefault(); finishStroke();
      if (paintCell(cursor)) { finishStroke(); setFeedback('Diamantito colocado.'); } else setFeedback(painted.has(cursor) ? 'Esta casilla ya está completa.' : `Esta casilla necesita el número ${pattern.cells[cursor] + 1}.`);
    }
  }
  function undo() {
    finishStroke(); const last = current.current.history.at(-1); if (!last) return;
    const remove = new Set(last); persist({ ...current.current, painted: current.current.painted.filter(cell => !remove.has(cell)), history: current.current.history.slice(0, -1) }); setFeedback('Último trazo deshecho.');
  }

  function fillCurrentColor() {
    finishStroke();
    const toPaint: number[] = [];
    pattern.cells.forEach((target, index) => {
      if (target === color && !current.current.painted.includes(index)) {
        toPaint.push(index);
      }
    });
    if (toPaint.length === 0) {
      setFeedback(`Todos los diamantitos del número ${color + 1} ya están colocados.`);
      return;
    }
    const nextPainted = [...current.current.painted, ...toPaint];
    const nextHistory = [...current.current.history, toPaint].slice(-100);
    const next = { ...current.current, painted: nextPainted, history: nextHistory };
    persist(next);
    setFeedback(`✨ ¡Varita mágica! Se colocaron ${toPaint.length} diamantitos del color ${color + 1}.`);
  }

  function downloadDiamondArt() {
    const node = canvas.current;
    if (!node) return;
    try {
      const dataUrl = node.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${(photo.title || 'nuestro-recuerdo').replace(/\s+/g, '-').toLowerCase()}-diamantes.png`;
      link.href = dataUrl;
      link.click();
      setFeedback('¡Cuadro de diamantes descargado en alta resolución!');
    } catch {
      setFeedback('No se pudo exportar la imagen debido a permisos del navegador.');
    }
  }

  return <div className="game-layout game-diamond-layout">
    <div className="card game-board-card">
      <GameLevelBar
        game="diamond"
        activeLevel={level}
        unlockedLevel={unlockedLevel}
        playerProgress={playerProgress}
        activePlayerName={activePlayerName}
        onSelectLevel={lvl => {
          recordedRef.current = 0;
          onSelectLevel(lvl);
        }}
      />
      <div className="game-board-heading">
        <div>
          <span className="eyebrow"><Gem size={14} /> Cuadro de Piedritas · Nivel {level}</span>
          <h2>{photo.title}</h2>
        </div>
        <div className="game-heading-badges">
          <span className="game-badge">{pattern.cells.length} diamantes 5D</span>
        </div>
      </div>

      <div className="game-canvas-toolbar">
        <div className="game-tool-group" role="group" aria-label="Herramienta del lienzo">
          <button className={tool === 'paint' ? 'is-active' : ''} aria-pressed={tool === 'paint'} onClick={() => { finishStroke(); setTool('paint'); }}>
            <Paintbrush size={16} /> Pluma de diamantes
          </button>
          <button className={tool === 'pan' ? 'is-active' : ''} aria-pressed={tool === 'pan'} onClick={() => { finishStroke(); setTool('pan'); }}>
            <Hand size={16} /> Mover lienzo
          </button>
        </div>

        <div className="game-toolbar-options">
          <label className="game-pill-select" title="Nivel de detalle de diamantes">
            <span>Detalle:</span>
            <select value={density} onChange={e => setDensity(e.target.value as 'standard' | 'hd')}>
              <option value="standard">Estándar (~1.2k joyas)</option>
              <option value="hd">Alta Definición (~2.4k joyas)</option>
            </select>
          </label>
          <label className="game-pill-select" title="Forma del diamante">
            <span>Forma:</span>
            <select value={diamondStyle} onChange={e => setDiamondStyle(e.target.value as 'round' | 'square')}>
              <option value="round">Redondo (Brillante)</option>
              <option value="square">Cuadrado (Princesa)</option>
            </select>
          </label>
          <label className="game-pill-select" title="Guía en el lienzo">
            <span>Guía:</span>
            <select value={guideMode} onChange={e => setGuideMode(e.target.value as 'soft' | 'clear' | 'canvas')}>
              <option value="soft">Lienzo impreso suave</option>
              <option value="clear">Lienzo nítido</option>
              <option value="canvas">Mosaico puro</option>
            </select>
          </label>
        </div>

        <div className="game-zoom-controls">
          <button className="game-icon-button" aria-label="Alejar lienzo" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>
            <ZoomOut size={17} />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button className="game-icon-button" aria-label="Acercar lienzo" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))}>
            <ZoomIn size={17} />
          </button>
        </div>
      </div>

      {preview && <p className="game-preview-label" role="status"><Eye size={15} /> Vista del cuadro terminado en diamantes. Desactívala para seguir colocando piedritas.</p>}
      <div className={`game-canvas-viewport ${tool === 'pan' ? 'is-pan' : ''}`} ref={viewport}>
        <canvas
          className="game-diamond-canvas"
          ref={canvas}
          style={{
            width: `${zoom * 100}%`,
            touchAction: tool === 'paint' && !preview ? 'none' : 'pan-x pan-y',
            '--diamond-aspect': `${pattern.columns} / ${pattern.rows}`,
          } as CSSProperties}
          tabIndex={0}
          role="application"
          aria-label="Lienzo de diamantitos. Toca o arrastra la pluma para colocar las piedritas."
          aria-describedby="diamond-keyboard-help"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={keyboard}
          onPointerDown={event => { if (event.button !== 0 || preview) return; finishStroke(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); if (tool === 'pan' && viewport.current) pan.current = { x: event.clientX, y: event.clientY, left: viewport.current.scrollLeft, top: viewport.current.scrollTop }; else { stroke.current = []; paintPointer(event); } }}
          onPointerMove={event => { if (pan.current && viewport.current) { viewport.current.scrollLeft = pan.current.left - (event.clientX - pan.current.x); viewport.current.scrollTop = pan.current.top - (event.clientY - pan.current.y); } else if (stroke.current !== null) paintPointer(event); }}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onLostPointerCapture={finishStroke}
        />
      </div>
      <p className="game-board-help" id="diamond-keyboard-help">
        {tool === 'paint' ? 'Toca o arrastra la pluma para colocar las piedritas del color activo. Cada diamante cubre su símbolo en el lienzo.' : 'Arrastra para recorrer el lienzo. Vuelve a Pluma cuando encuentres tus casillas.'} Con teclado: flechas y Enter.
      </p>
      <p className="game-small game-cursor-status" aria-live="polite">
        Casilla {cursor + 1} · símbolo {SYMBOLS[pattern.cells[cursor] % SYMBOLS.length]}{painted.has(cursor) ? ' · diamante colocado' : ''}. {feedback}
      </p>
      {objectiveMet && <div className="game-celebration" role="status">
        <Gem size={29} />
        <div>
          <strong>¡Nivel {level} de Diamantitos completado por {activePlayerName}!</strong>
          <p>{completed ? 'Colocaron todos los diamantitos 5D. Tu cuadro está completo.' : `Objetivo alcanzado con ${Math.floor(completedRatio * 100)}%. Puedes seguir pintando para mejorar tus estrellas.`}</p>
          <div className="celebration-stars-score">
            <div className="celebration-stars">
              {[1, 2, 3].map(s => (
                <Star
                  key={s}
                  size={18}
                  className={s <= scoreResult.stars ? 'star-gold' : 'star-empty'}
                  fill={s <= scoreResult.stars ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="celebration-pts">+{scoreResult.score} pts</span>
          </div>
          {level < 5 && (
            <button
              type="button"
              className="button button-primary celebration-next-btn"
              onClick={() => {
                recordedRef.current = 0;
                onSelectLevel(level + 1);
              }}
            >
              Jugar Nivel {level + 1} ➔
            </button>
          )}
        </div>
        <button className="button button-primary" onClick={downloadDiamondArt}>
          <Download size={16} /> Descargar PNG
        </button>
      </div>}
    </div>

    <aside className="game-side-panel">
      <div className="card game-controls-card">
        <div className="diamond-active-tool-banner">
          <div className="diamond-stylus-icon-wrapper">
            <span className="diamond-stylus-glyph" aria-hidden="true">🖋️</span>
          </div>
          <div className="diamond-stylus-info">
            <div className="diamond-stylus-title">
              <strong>Pluma de Diamantes</strong>
              <span className="diamond-stylus-badge" style={{ backgroundColor: rgb(pattern.palette[color]), color: readableText(pattern.palette[color]) }}>
                {SYMBOLS[color % SYMBOLS.length]}
              </span>
            </div>
            <p>{remaining[color] === 0 ? '¡Piedritas de este color listas!' : `${remaining[color]} piedritas pendientes en el lienzo`}</p>
          </div>
        </div>

        <div className="diamond-tray-container" role="region" aria-label="Bandeja de piedritas">
          <div className="diamond-tray-header">
            <span><Gem size={14} /> Bandeja de piedritas</span>
            <small>{pattern.palette.length} colores DMC</small>
          </div>
          <div className="diamond-groove-tray" role="group" aria-label="Colores de los diamantitos">
            {pattern.palette.map((shade, index) => {
              const sym = SYMBOLS[index % SYMBOLS.length];
              const isFin = remaining[index] === 0;
              const isSel = color === index;
              return (
                <button
                  key={index}
                  type="button"
                  className={`diamond-tray-cell ${isSel ? 'is-selected' : ''} ${isFin ? 'is-finished' : ''}`}
                  onClick={() => setColor(index)}
                  aria-pressed={isSel}
                  aria-label={`Color ${sym}, ${remaining[index]} pendientes`}
                  title={`Color ${sym} (${remaining[index]} pendientes)`}
                >
                  <div className="diamond-drill-sample" style={{ '--drill-color': rgb(shade), '--drill-text': readableText(shade) } as CSSProperties}>
                    <span className="diamond-drill-symbol">
                      {isFin ? <Check size={14} /> : sym}
                    </span>
                  </div>
                  <span className="diamond-drill-count">{isFin ? '✔' : remaining[index]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="game-control-buttons" style={{ marginTop: '10px' }}>
          <button
            className="button button-primary game-magic-btn"
            disabled={remaining[color] === 0}
            onClick={fillCurrentColor}
            title="Coloca automáticamente todos los diamantitos del color seleccionado"
          >
            <Wand2 size={16} /> Varita mágica: rellenar ({remaining[color]})
          </button>
          <button
            className="button button-secondary game-next-color"
            disabled={completed}
            onClick={() => {
              const next = remaining.findIndex((count, index) => count > 0 && index > color);
              setColor(next >= 0 ? next : Math.max(0, remaining.findIndex(count => count > 0)));
            }}
          >
            <ArrowRight size={16} /> Siguiente color pendiente
          </button>
        </div>

        <div className="game-progress-label">
          <span>Progreso del cuadro</span>
          <strong>{Math.round(game.painted.length / pattern.cells.length * 100)}%</strong>
        </div>
        <progress className="game-progress" max={pattern.cells.length} value={game.painted.length} aria-label="Diamantitos colocados" />
        <p className="muted game-small">{game.painted.length} de {pattern.cells.length} diamantitos colocados. Para superar este nivel, usa el lienzo {level >= 4 ? 'HD' : 'estándar'} y alcanza {level === 1 ? '25%' : level === 2 || level === 4 ? '75%' : '100%'}.</p>

        <div className="game-control-buttons">
          <button
            className={`button button-secondary ${preview ? 'is-active' : ''}`}
            onClick={() => { finishStroke(); setPreview(value => !value); }}
            aria-pressed={preview}
          >
            <Sparkles size={16} /> {preview ? 'Volver al lienzo' : 'Vista del cuadro terminado'}
          </button>
          <button
            className={`button button-secondary game-compare-btn ${showOriginalClean ? 'is-active' : ''}`}
            onClick={() => setShowOriginalClean(v => !v)}
            title="Compara la foto original con el acabado en diamantes"
          >
            <Eye size={16} /> {showOriginalClean ? 'Ver en diamantes' : 'Comparar con original'}
          </button>
          <button className="button button-secondary" onClick={downloadDiamondArt}>
            <Download size={16} /> Guardar cuadro (PNG)
          </button>
          <button className="button button-secondary" disabled={!game.history.length} onClick={undo}>
            <Undo2 size={16} /> Deshacer último trazo
          </button>
          <button className="button button-secondary" onClick={() => setConfirmation({ title: '¿Empezamos este cuadro de nuevo?', body: 'Se borrará sólo el avance local de este cuadro en este dispositivo. La fotografía, el recuerdo y tus otras partidas se conservan.', action: () => { finishStroke(); recordedRef.current = 0; persist(initial); setFeedback('Un lienzo listo para volver a empezar.'); } })}>
            <RotateCcw size={16} /> Reiniciar cuadro
          </button>
        </div>
        <p className={`game-save-state ${saved ? '' : 'game-error'}`} role="status">{saved ? 'Avance guardado en este navegador' : 'No se pudo guardar. El almacenamiento del navegador está lleno o deshabilitado.'}</p>
        <p className="muted game-small">Diamantes 5D con facetas 3D sobre lienzo adhesivo. Tu foto original se conserva intacta.</p>
      </div>

      <div className="card game-photo-reference-card">
        <div className="game-photo-reference-header">
          <span className="eyebrow">Foto de referencia</span>
          <button type="button" className="game-text-link" onClick={() => setPhotoPreview(true)}>
            <ZoomIn size={14} /> Ampliar
          </button>
        </div>
        <div
          className="game-photo-reference-thumb"
          onClick={() => setPhotoPreview(true)}
          role="button"
          tabIndex={0}
          aria-label="Ampliar fotografía de referencia"
        >
          <img src={photo.url} alt={photo.title} />
          <span className="game-photo-reference-badge">Referencia</span>
        </div>
        <p className="muted game-small">Guía para el cuadro de piedritas.</p>
      </div>
    </aside>
    {photoPreview && <PhotoPreview photo={photo} close={() => setPhotoPreview(false)} />}
    {confirmation && <ConfirmDialog confirmation={confirmation} close={() => setConfirmation(null)} />}
  </div>;
}

function MemoryGame({
  photos,
  namespace,
  level,
  onSelectLevel,
  unlockedLevel,
  playerProgress,
  activePlayerName,
  onRecordResult,
  chooseLocal,
}: {
  photos: Photo[];
  namespace: string;
  level: number;
  onSelectLevel: (lvl: number) => void;
  unlockedLevel: number;
  playerProgress: PlayerGameProgress;
  activePlayerName: string;
  onRecordResult: (stars: 1 | 2 | 3, score: number, metric: string) => void;
  chooseLocal: () => void;
}) {
  const pairCount: MemoryDifficulty = level === 1 ? 4 : level === 2 ? 6 : level === 3 ? 8 : level === 4 ? 10 : 12;

  const [cards, setCards] = useState<MemoryCard[]>(() => createMemoryDeck(photos, pairCount));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const pairTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pairTimer.current) clearTimeout(pairTimer.current); }, []);

  useEffect(() => {
    recordedRef.current = false;
    if (pairTimer.current) clearTimeout(pairTimer.current);
    setCards(createMemoryDeck(photos, pairCount));
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setIsChecking(false);
    setSeconds(0);
    setTimerRunning(false);
  }, [pairCount, photos.length]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const complete = cards.length > 0 && isMemoryComplete(matchedPairIds, pairCount);
  const objectiveMet = complete && meetsLevelObjective('memory', level, moves);

  useEffect(() => {
    if (complete) {
      setTimerRunning(false);
    }
  }, [complete]);

  const scoreResult = useMemo(() => {
    return calculateMemoryScore(level, moves, seconds);
  }, [level, moves, seconds]);

  const recordedRef = useRef(false);
  useEffect(() => {
    if (objectiveMet && !recordedRef.current) {
      recordedRef.current = true;
      onRecordResult(scoreResult.stars, scoreResult.score, `${moves} intentos · ${formatTime(seconds)}`);
    }
  }, [objectiveMet, scoreResult, onRecordResult, moves, seconds]);

  function handleCardClick(index: number) {
    if (isChecking || complete) return;
    if (flippedIndices.includes(index)) return;
    const clickedCard = cards[index];
    if (!clickedCard || matchedPairIds.includes(clickedCard.pairId)) return;

    if (!timerRunning && moves === 0 && flippedIndices.length === 0) {
      setTimerRunning(true);
    }

    if (flippedIndices.length === 0) {
      setFlippedIndices([index]);
    } else if (flippedIndices.length === 1) {
      const firstIdx = flippedIndices[0];
      const secondIdx = index;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      setFlippedIndices([firstIdx, secondIdx]);
      setMoves(m => m + 1);

      if (firstCard.pairId === secondCard.pairId) {
        setMatchedPairIds(prev => [...prev, firstCard.pairId]);
        setFlippedIndices([]);
      } else {
        setIsChecking(true);
        pairTimer.current = setTimeout(() => {
          setFlippedIndices([]);
          setIsChecking(false);
        }, 900);
      }
    }
  }

  function startNewGame() {
    if (pairTimer.current) clearTimeout(pairTimer.current);
    recordedRef.current = false;
    setCards(createMemoryDeck(photos, pairCount));
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setIsChecking(false);
    setSeconds(0);
    setTimerRunning(false);
  }

  function restartCurrent() {
    if (pairTimer.current) clearTimeout(pairTimer.current);
    recordedRef.current = false;
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setIsChecking(false);
    setSeconds(0);
    setTimerRunning(false);
  }

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  if (photos.length === 0) {
    return (
      <div className="empty-state card game-empty">
        <Flower2 size={42} />
        <h2>Añade fotografías para jugar al memorama</h2>
        <p className="muted">Puedes agregar fotos en la sección de Recuerdos o cargar una imagen desde este dispositivo para empezar a jugar.</p>
        <button className="button button-primary" onClick={chooseLocal}>
          <ImagePlus size={17} /> Elegir fotografía
        </button>
      </div>
    );
  }

  return (
    <div className="memorama-container">
      <GameLevelBar
        game="memory"
        activeLevel={level}
        unlockedLevel={unlockedLevel}
        playerProgress={playerProgress}
        activePlayerName={activePlayerName}
        onSelectLevel={lvl => {
          recordedRef.current = false;
          onSelectLevel(lvl);
        }}
      />

      <div className="memorama-controls-card">
        <div className="memorama-controls-top">
          <div className="memorama-title-block">
            <span className="eyebrow"><Sparkles size={14} /> Memorama · Nivel {level}</span>
            <h2>Encuentra las {pairCount} parejas</h2>
          </div>
          <div className="memorama-difficulty-tabs" role="group" aria-label="Nivel del memorama">
            <span className="game-badge">Nivel {level} de 5 · {pairCount * 2} cartas</span>
          </div>
        </div>

        <div className="memorama-stats-row">
          <div className="memorama-stat-badges">
            <span className="memorama-stat-badge">
              <Sparkles size={15} /> Parejas: <strong>{matchedPairIds.length} / {pairCount}</strong>
            </span>
            <span className="memorama-stat-badge">
              <Hand size={15} /> Intentos: <strong>{moves}</strong>
            </span>
            <span className="memorama-stat-badge">
              <RotateCcw size={15} /> Tiempo: <strong>{formatTime(seconds)}</strong>
            </span>
          </div>

          <div className="memorama-actions">
            <button type="button" className="button button-secondary" onClick={startNewGame} title="Barajar nuevas fotos y reiniciar">
              <Shuffle size={16} /> Barajar fotos
            </button>
            <button type="button" className="button button-secondary" onClick={restartCurrent} title="Volver a empezar con las mismas cartas">
              <RotateCcw size={16} /> Reiniciar
            </button>
          </div>
        </div>
      </div>

      <div className="memorama-board-card">
        <div className={`memorama-grid pairs-${pairCount}`} role="region" aria-label="Tablero de memorama">
          {cards.map((card, index) => {
            const isFlipped = flippedIndices.includes(index);
            const isMatched = matchedPairIds.includes(card.pairId);
            const isOpen = isFlipped || isMatched;

            return (
              <button
                key={card.id}
                type="button"
                className={`memorama-card ${isOpen ? 'is-flipped' : ''} ${isMatched ? 'is-matched' : ''}`}
                onClick={() => handleCardClick(index)}
                aria-label={isOpen ? `${card.title}` : `Carta oculta ${index + 1}`}
                disabled={isChecking && !isOpen}
              >
                <div className="memorama-card-inner">
                  <div className="memorama-card-back">
                    <div className="memorama-seal">
                      <Heart size={22} className="memorama-seal-icon" fill="currentColor" />
                    </div>
                  </div>
                  <div className="memorama-card-front">
                    <img src={card.url} alt={card.title} className="memorama-card-img" loading="lazy" />
                    <div className="memorama-card-caption">
                      <strong>{card.title}</strong>
                      {card.date && <small>{card.date}</small>}
                    </div>
                    {isMatched && (
                      <span className="memorama-matched-badge" title="¡Pareja encontrada!">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {complete && (
          <div className="memorama-victory" role="status">
            <div className="memorama-victory-icon">
              <Heart size={30} fill="currentColor" />
            </div>
            <h3>{objectiveMet ? `¡Nivel ${level} completado por ${activePlayerName}!` : 'Todas las parejas encontradas. Reintenta dentro del límite para pasar de nivel.'}</h3>
            <p>
              Completaron las <strong>{pairCount} parejas</strong> en <strong>{moves} intentos</strong> y un tiempo de <strong>{formatTime(seconds)}</strong>.
            </p>
            {objectiveMet && <div className="celebration-stars-score" style={{ justifyContent: 'center' }}>
              <div className="celebration-stars">
                {[1, 2, 3].map(s => (
                  <Star
                    key={s}
                    size={22}
                    className={s <= scoreResult.stars ? 'star-gold' : 'star-empty'}
                    fill={s <= scoreResult.stars ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span className="celebration-pts">+{scoreResult.score} pts</span>
            </div>}
            <div className="memorama-victory-actions">
              {objectiveMet && level < 5 && (
                <button
                  type="button"
                  className="button button-primary celebration-next-btn"
                  onClick={() => {
                    recordedRef.current = false;
                    onSelectLevel(level + 1);
                  }}
                >
                  Jugar Nivel {level + 1} ➔
                </button>
              )}
              <button type="button" className="button button-secondary" onClick={startNewGame}>
                <Shuffle size={16} /> Jugar otra vez
              </button>
            </div>
          </div>
        )}
      </div>

      {previewPhoto && <PhotoPreview photo={previewPhoto} close={() => setPreviewPhoto(null)} />}
    </div>
  );
}

export default GamesPage;


