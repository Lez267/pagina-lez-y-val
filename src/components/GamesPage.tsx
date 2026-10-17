import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ArrowRight, Check, Eye, Flower2, Gem, Hand, Heart, ImagePlus, LoaderCircle, Paintbrush, Puzzle, RotateCcw, Shuffle, Sparkles, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { Memory } from '../data/types';
import { readLocal, useLocalState, writeLocal } from '../lib/storage';
import { canPaintCell, correctTiles, createMosaic, isSolved, movePuzzle, newPuzzle, undoPuzzle, validPuzzle } from '../lib/puzzle';
import type { MosaicPattern, PuzzleSize, RGB } from '../lib/puzzle';
import './games.css';

type Photo = { id: string; url: string; title: string; local?: boolean };
type Selection = { mode: 'puzzle' | 'diamond'; photoId: string; size: PuzzleSize };
type ConfirmAction = { title: string; body: string; action: () => void };
type PaintState = { fingerprint: string; painted: number[]; history: number[][] };
const SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CELL_SIZE = 24;

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

export function GamesPage({ memories, namespace }: { memories: Memory[]; namespace: string }) {
  return <GamesSession key={namespace} memories={memories} namespace={namespace} />;
}

function GamesSession({ memories, namespace }: { memories: Memory[]; namespace: string }) {
  const photos = useMemo<Photo[]>(() => memories.flatMap(memory => memory.media.filter(media => media.type === 'image' && safeImageUrl(media.url)).map((media, index) => ({ id: `${memory.id}:${media.id}`, url: media.url, title: `${memory.title || 'Nuestro recuerdo'}${memory.media.length > 1 ? ` · foto ${index + 1}` : ''}` }))), [memories]);
  const [storedSelection, setSelection] = useLocalState<Selection>(`${namespace}:games:selection`, { mode: 'puzzle', photoId: photos[0]?.id ?? '', size: 3 });
  const selection: Selection = { mode: storedSelection?.mode === 'diamond' ? 'diamond' : 'puzzle', size: storedSelection?.size === 4 ? 4 : 3, photoId: typeof storedSelection?.photoId === 'string' ? storedSelection.photoId : '' };
  const [localPhoto, setLocalPhoto] = useState<Photo | null>(null);
  const [fileError, setFileError] = useState('');
  const objectUrl = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photo = (localPhoto?.id === selection.photoId ? localPhoto : photos.find(item => item.id === selection.photoId)) ?? photos[0] ?? localPhoto;
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
    <header className="page-header"><div><p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Pequeñas pausas juntos</p><h1 className="page-title">Nuestros recuerdos, en juego</h1><p className="muted">Reconstruir un momento. Llenarlo de color. Quedarnos un ratito aquí.</p></div><span className="game-heading-flower" aria-hidden="true"><Flower2 /></span></header>
    <div className="game-mode-tabs" role="tablist" aria-label="Elige un juego">
      <button id="puzzle-tab" type="button" role="tab" aria-selected={selection.mode === 'puzzle'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'puzzle' })} className={selection.mode === 'puzzle' ? 'is-active' : ''}><Puzzle size={21} /><span>Rompecabezas<small>Un recuerdo, pieza a pieza</small></span></button>
      <button id="diamond-tab" type="button" role="tab" aria-selected={selection.mode === 'diamond'} aria-controls="game-panel" onClick={() => setSelection({ ...selection, mode: 'diamond' })} className={selection.mode === 'diamond' ? 'is-active' : ''}><Gem size={21} /><span>Diamantitos<small>Una foto que florece en color</small></span></button>
    </div>
    <section className="card game-photo-picker" aria-label="Fotografía para jugar">
      <div className="game-chosen-photo">{photo ? <img src={photo.url} alt="" loading="lazy" /> : <span className="game-photo-placeholder"><ImagePlus /></span>}<div><span className="eyebrow">El recuerdo de hoy</span><strong>{photo?.title ?? 'Elige una fotografía'}</strong><p className="muted game-small">Cada foto y dificultad conserva su propia partida en este navegador.</p></div></div>
      <details className="game-photo-choices"><summary className="button button-secondary"><ImagePlus size={16} /> Cambiar fotografía</summary><div className="game-photo-options">
        {photos.length > 0 && <div className="game-photo-grid">{photos.map(item => <button type="button" key={item.id} className={photo?.id === item.id ? 'is-selected' : ''} onClick={() => setSelection({ ...selection, photoId: item.id })} aria-label={`Jugar con ${item.title}`} aria-pressed={photo?.id === item.id}><img src={item.url} alt="" loading="lazy" /><span>{item.title}</span>{photo?.id === item.id && <Check size={16} />}</button>)}</div>}
        <p className="muted game-small">Cambiar de foto conserva el avance de la anterior. Las imágenes de la galería siguen intactas.</p><button className="button button-secondary" type="button" onClick={() => fileInput.current?.click()}><ImagePlus size={16} /> Usar foto de este dispositivo</button>
      </div></details>
      <input className="game-file-input" ref={fileInput} type="file" accept="image/*" aria-label="Elegir foto de este dispositivo, sin subirla" onChange={event => { chooseLocal(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
      {fileError && <p className="game-error" role="alert">{fileError}</p>}
    </section>
    {photo?.local && <p className="game-local-note"><Heart size={14} aria-hidden="true" /> Esta foto se queda en tu dispositivo. Para retomar otro día, elige de nuevo el mismo archivo.</p>}
    <section id="game-panel" role="tabpanel" aria-labelledby={selection.mode === 'puzzle' ? 'puzzle-tab' : 'diamond-tab'}>
      {!photo ? <div className="empty-state card game-empty"><Flower2 size={42} /><h2>El primer recuerdo lo eliges tú</h2><p className="muted">Puedes añadir fotografías en Recuerdos o jugar con una imagen de este dispositivo. No se subirá a la galería.</p><button className="button button-primary" onClick={() => fileInput.current?.click()}><ImagePlus size={17} /> Elegir fotografía</button></div> : selection.mode === 'puzzle' ? <PuzzleGame key={`${namespace}:${photo.id}:${selection.size}`} photo={photo} namespace={namespace} size={selection.size} changeSize={size => setSelection({ ...selection, size })} /> : <DiamondGame key={`${namespace}:${photo.id}:${photo.url}`} photo={photo} namespace={namespace} chooseLocal={() => fileInput.current?.click()} />}
    </section>
    <p className="game-privacy-note"><Heart size={14} aria-hidden="true" /> El avance se guarda sólo en este navegador. Ningún juego edita, elimina ni vuelve a subir tus recuerdos.</p>
  </div>;
}

function PuzzleGame({ photo, namespace, size, changeSize }: { photo: Photo; namespace: string; size: PuzzleSize; changeSize: (size: PuzzleSize) => void }) {
  const initial = useMemo(() => newPuzzle(size), [size]);
  const [stored, setGame, saved] = useLocalState(`${namespace}:puzzle:v1:${photo.id}:${size}`, initial);
  const game = validPuzzle(stored, size) ? stored : initial;
  const [selected, setSelected] = useState<number | null>(null);
  const [numbers, setNumbers] = useState(false);
  const [preview, setPreview] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const pieces = useRef<(HTMLButtonElement | null)[]>([]);
  const complete = isSolved(game.tiles);
  const correct = correctTiles(game.tiles);
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
    <div className="card game-board-card"><div className="game-board-heading"><div><span className="eyebrow">Rompecabezas</span><h2>Todo encaja contigo</h2></div><span className="game-badge">{size * size} piezas</span></div>
      {imageError && <p className="game-error" role="alert">Esta fotografía no se pudo abrir. Elige otra imagen o una foto de tu dispositivo.</p>}
      <div className={`game-puzzle-board ${complete ? 'is-complete' : ''}`} style={{ '--puzzle-size': size } as CSSProperties} role="group" aria-label={`Rompecabezas de ${size} por ${size}. Selecciona dos piezas para intercambiarlas.`}>
        {game.tiles.map((tile, index) => <button key={index} ref={element => { pieces.current[index] = element; }} type="button" className={`game-puzzle-piece ${selected === index ? 'is-selected' : ''} ${hint?.from === index || hint?.to === index ? 'is-hint' : ''}`} aria-label={`Casilla ${index + 1}, pieza ${tile + 1}${tile === index ? ', colocada correctamente' : ''}`} aria-pressed={selected === index} onClick={() => selectPiece(index)} onKeyDown={event => keyboard(event, index)} aria-disabled={complete}>
          <img src={photo.url} alt="" draggable="false" onError={() => setImageError(true)} style={{ width: `${size * 100}%`, height: `${size * 100}%`, left: `${-(tile % size) * 100}%`, top: `${-Math.floor(tile / size) * 100}%` }} />
          {(numbers || hint !== null) && <span className="game-piece-number">{tile + 1}</span>}{selected === index && <span className="game-piece-picked"><Check size={20} /></span>}
        </button>)}
      </div>
      <p className="game-board-help" aria-live="polite">{complete ? '¡Lo lograron! El recuerdo está completo.' : hint ? `Pista: la pieza ${hint.to + 1} va en la casilla ${hint.to + 1}. Ambas están iluminadas.` : selected !== null ? `Pieza ${game.tiles[selected] + 1} seleccionada. Toca otra para intercambiarlas; toca la misma para cancelar.` : 'Toca una pieza y después otra para intercambiarlas. Con teclado: flechas y Enter.'}</p>
      {complete && <div className="game-celebration" role="status"><Flower2 size={29} /><div><strong>Un recuerdo completo, otra vez.</strong><p>{game.moves} movimientos y {game.hints} {game.hints === 1 ? 'pista' : 'pistas'}. Sin prisa, a su manera.</p></div><Heart size={23} /></div>}
    </div>
    <aside className="game-side-panel"><div className="card game-controls-card"><span className="eyebrow">A tu ritmo</span><h3>Una pequeña pausa bonita</h3><label className="field">Tamaño del rompecabezas<select className="input" value={size} onChange={event => changeSize(Number(event.target.value) as PuzzleSize)}><option value={3}>3 × 3 · un ratito juntos</option><option value={4}>4 × 4 · para quedarnos más</option></select></label>
      <div className="game-progress-label"><span>Piezas en su lugar</span><strong>{correct} / {size * size}</strong></div><progress className="game-progress" max={size * size} value={correct} aria-label="Piezas correctamente colocadas" />
      <dl className="game-stats"><div><dt>Movimientos</dt><dd>{game.moves}</dd></div><div><dt>Pistas</dt><dd>{game.hints}</dd></div></dl>
      <div className="game-control-buttons"><button className="button button-secondary" onClick={() => setPreview(true)}><Eye size={16} /> Ver fotografía</button><button className="button button-secondary" onClick={giveHint} disabled={complete}><Sparkles size={16} /> Una pista</button><button className="button button-secondary" onClick={() => { setGame(undoPuzzle(game)); setSelected(null); setHint(null); }} disabled={!game.history.length}><Undo2 size={16} /> Deshacer movimiento</button><button className="button button-secondary" onClick={() => setConfirmation({ title: '¿Mezclamos este recuerdo?', body: 'Se reiniciarán los movimientos y el avance de esta partida en este dispositivo. La fotografía, el recuerdo y las otras partidas se conservan.', action: () => { setGame(newPuzzle(size)); setSelected(null); setHint(null); } })}><Shuffle size={16} /> Mezclar de nuevo</button></div>
      <label className="game-checkbox"><input type="checkbox" checked={numbers} onChange={event => setNumbers(event.target.checked)} /> Mostrar números en las piezas</label><p className={`game-save-state ${saved ? '' : 'game-error'}`} role="status">{saved ? 'Avance guardado en este navegador' : 'No se pudo guardar. El almacenamiento del navegador está lleno o deshabilitado.'}</p>
    </div><div className="game-whisper"><Flower2 size={23} /><p>No hace falta hacerlo rápido.<br />Los momentos bonitos se disfrutan.</p></div></aside>
    {preview && <PhotoPreview photo={photo} close={() => setPreview(false)} />}{confirmation && <ConfirmDialog confirmation={confirmation} close={() => setConfirmation(null)} />}
  </div>;
}

function DiamondGame({ photo, namespace, chooseLocal }: { photo: Photo; namespace: string; chooseLocal: () => void }) {
  const [pattern, setPattern] = useState<MosaicPattern | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPattern(null); setError('');
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement('canvas'); canvas.width = 24; canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('image');
        const scale = Math.max(24 / image.naturalWidth, 32 / image.naturalHeight);
        const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
        context.fillStyle = '#fdf8f0'; context.fillRect(0, 0, 24, 32);
        context.drawImage(image, (24 - width) / 2, (32 - height) / 2, width, height);
        setPattern(createMosaic(context.getImageData(0, 0, 24, 32).data));
      } catch { setError('El navegador no pudo leer los colores de esta foto. Algunos servicios privados impiden procesarla con Canvas (CORS). Puedes jugar con otra foto o elegir el archivo desde tu dispositivo, sin subirlo.'); }
    };
    image.onerror = () => { if (active) setError('No pudimos abrir esta imagen para crear el mosaico. Su enlace puede haber caducado, no permitir lectura de colores (CORS) o tener un formato incompatible. Elige otra foto o usa el archivo de tu dispositivo; no se subirá.'); };
    image.src = photo.url;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [photo.url, retry]);
  if (error) return <div className="card game-load-state"><Gem size={36} /><h2>Esta foto necesita un pequeño paso más</h2><p className="muted">{error}</p><div className="game-dialog-actions"><button className="button button-secondary" onClick={() => setRetry(value => value + 1)}><RotateCcw size={16} /> Volver a intentar</button><button className="button button-primary" onClick={chooseLocal}><ImagePlus size={16} /> Usar foto de este dispositivo</button></div></div>;
  if (!pattern) return <div className="card game-load-state" role="status"><LoaderCircle size={30} className="game-spinner" /><h2>Preparando sus colores…</h2><p className="muted">Un recuerdo se está convirtiendo en pequeños diamantitos.</p></div>;
  return <PaintingBoard key={pattern.fingerprint} pattern={pattern} photo={photo} namespace={namespace} />;
}

function validPaintState(value: unknown, pattern: MosaicPattern): value is PaintState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PaintState;
  const validIndices = (array: unknown): array is number[] => Array.isArray(array) && array.length <= pattern.cells.length && new Set(array).size === array.length && array.every(index => Number.isInteger(index) && index >= 0 && index < pattern.cells.length);
  return candidate.fingerprint === pattern.fingerprint && validIndices(candidate.painted) && Array.isArray(candidate.history) && candidate.history.length <= 100 && candidate.history.every(validIndices);
}

function rgb(color: RGB, opacity = 1) { return `rgba(${color.join(',')},${opacity})`; }
function readableText(color: RGB) { return color[0] * .299 + color[1] * .587 + color[2] * .114 > 150 ? '#493e3a' : '#ffffff'; }

function PaintingBoard({ pattern, photo, namespace }: { pattern: MosaicPattern; photo: Photo; namespace: string }) {
  const key = `${namespace}:diamond:v1:${photo.id}:${pattern.fingerprint}`;
  const initial: PaintState = { fingerprint: pattern.fingerprint, painted: [], history: [] };
  const [game, setGame] = useState<PaintState>(() => { const stored = readLocal<unknown>(key, null); return validPaintState(stored, pattern) ? stored : initial; });
  const current = useRef(game); current.current = game;
  const [saved, setSaved] = useState(true);
  const [color, setColor] = useState(() => pattern.cells.find((_, index) => !game.painted.includes(index)) ?? 0);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<'paint' | 'pan'>('paint');
  const [preview, setPreview] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [feedback, setFeedback] = useState('Elige un color y completa las casillas con su letra.');
  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const stroke = useRef<number[] | null>(null);
  const lastCell = useRef<number | null>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const completed = game.painted.length === pattern.cells.length;
  const painted = useMemo(() => new Set(game.painted), [game.painted]);
  const remaining = useMemo(() => pattern.palette.map((_, index) => pattern.cells.reduce((count, target, cell) => count + Number(target === index && !painted.has(cell)), 0)), [pattern, painted]);

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
    const node = canvas.current; if (!node) return;
    const context = node.getContext('2d'); if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    node.width = pattern.columns * CELL_SIZE * ratio; node.height = pattern.rows * CELL_SIZE * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '600 11px system-ui, sans-serif';
    pattern.cells.forEach((target, index) => {
      const x = index % pattern.columns * CELL_SIZE; const y = Math.floor(index / pattern.columns) * CELL_SIZE;
      const shade = pattern.palette[target];
      context.fillStyle = '#fffaf2'; context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      if (painted.has(index) || preview) {
        context.fillStyle = rgb(shade); context.beginPath(); context.moveTo(x + CELL_SIZE / 2, y + 1); context.lineTo(x + CELL_SIZE - 1, y + CELL_SIZE / 2); context.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 1); context.lineTo(x + 1, y + CELL_SIZE / 2); context.closePath(); context.fill();
        context.fillStyle = 'rgba(255,255,255,.24)'; context.beginPath(); context.moveTo(x + CELL_SIZE / 2, y + 2); context.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2); context.lineTo(x + 2, y + CELL_SIZE / 2); context.closePath(); context.fill();
        context.fillStyle = 'rgba(0,0,0,.10)'; context.beginPath(); context.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2); context.lineTo(x + CELL_SIZE - 2, y + CELL_SIZE / 2); context.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 2); context.closePath(); context.fill();
      } else {
        context.fillStyle = rgb(shade, .16); context.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        if (target === color) { context.strokeStyle = '#8e4d60'; context.lineWidth = 1.5; context.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4); }
        context.fillStyle = '#68594f'; context.fillText(SYMBOLS[target], x + CELL_SIZE / 2, y + CELL_SIZE / 2 + .5);
      }
      context.strokeStyle = 'rgba(89,70,53,.10)'; context.lineWidth = .5; context.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    });
    if (focused && !preview) { const x = cursor % pattern.columns * CELL_SIZE; const y = Math.floor(cursor / pattern.columns) * CELL_SIZE; context.strokeStyle = '#422a35'; context.lineWidth = 2; context.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2); }
  }, [pattern, painted, preview, color, cursor, focused]);

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
    } else if (!paintCell(cell) && !current.current.painted.includes(cell)) setFeedback('Ese cuadrito lleva otro color. Busca la letra del color que elegiste.');
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
      if (paintCell(cursor)) { finishStroke(); setFeedback('Diamantito colocado.'); } else setFeedback(painted.has(cursor) ? 'Esta casilla ya está completa.' : `Esta casilla necesita la letra ${SYMBOLS[pattern.cells[cursor]]}.`);
    }
  }
  function undo() {
    finishStroke(); const last = current.current.history.at(-1); if (!last) return;
    const remove = new Set(last); persist({ ...current.current, painted: current.current.painted.filter(cell => !remove.has(cell)), history: current.current.history.slice(0, -1) }); setFeedback('Último trazo deshecho.');
  }
  return <div className="game-layout game-diamond-layout">
    <div className="card game-board-card"><div className="game-board-heading"><div><span className="eyebrow">Diamantitos</span><h2>Un recuerdo que brilla</h2></div><span className="game-badge">24 × 32</span></div>
      <div className="game-canvas-toolbar"><div className="game-tool-group" role="group" aria-label="Herramienta del lienzo"><button className={tool === 'paint' ? 'is-active' : ''} aria-pressed={tool === 'paint'} onClick={() => { finishStroke(); setTool('paint'); }}><Paintbrush size={16} /> Pintar</button><button className={tool === 'pan' ? 'is-active' : ''} aria-pressed={tool === 'pan'} onClick={() => { finishStroke(); setTool('pan'); }}><Hand size={16} /> Mover</button></div><div className="game-zoom-controls"><button className="game-icon-button" aria-label="Alejar lienzo" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}><ZoomOut size={17} /></button><span aria-live="polite">{zoom * 100}%</span><button className="game-icon-button" aria-label="Acercar lienzo" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))}><ZoomIn size={17} /></button></div></div>
      {preview && <p className="game-preview-label" role="status"><Eye size={15} /> Vista del resultado. Desactívala para seguir pintando.</p>}
      <div className={`game-canvas-viewport ${tool === 'pan' ? 'is-pan' : ''}`} ref={viewport}>
        <canvas className="game-diamond-canvas" ref={canvas} style={{ width: `${zoom * 100}%`, touchAction: tool === 'paint' && !preview ? 'none' : 'pan-x pan-y' }} tabIndex={0} role="application" aria-label="Lienzo de diamantitos. Usa las flechas para elegir una casilla y Enter o espacio para colocar el color seleccionado." aria-describedby="diamond-keyboard-help" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={keyboard}
          onPointerDown={event => { if (event.button !== 0 || preview) return; finishStroke(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); if (tool === 'pan' && viewport.current) pan.current = { x: event.clientX, y: event.clientY, left: viewport.current.scrollLeft, top: viewport.current.scrollTop }; else { stroke.current = []; paintPointer(event); } }}
          onPointerMove={event => { if (pan.current && viewport.current) { viewport.current.scrollLeft = pan.current.left - (event.clientX - pan.current.x); viewport.current.scrollTop = pan.current.top - (event.clientY - pan.current.y); } else if (stroke.current !== null) paintPointer(event); }}
          onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} />
      </div>
      <p className="game-board-help" id="diamond-keyboard-help">{tool === 'paint' ? 'Pinta las letras del color elegido. Acerca el lienzo para ver los detalles; usa Mover para desplazarlo.' : 'Arrastra para recorrer el lienzo. Vuelve a Pintar cuando encuentres tus casillas.'} Con teclado: flechas y Enter.</p>
      <p className="game-small game-cursor-status" aria-live="polite">Casilla {cursor + 1} · letra {SYMBOLS[pattern.cells[cursor]]}{painted.has(cursor) ? ' · completada' : ''}. {feedback}</p>
      {completed && <div className="game-celebration" role="status"><Gem size={29} /><div><strong>Todos los pequeños colores, un gran recuerdo.</strong><p>Su mosaico está completo. La foto original sigue intacta.</p></div><Heart size={23} /></div>}
    </div>
    <aside className="game-side-panel"><div className="card game-controls-card"><span className="eyebrow">Tu paleta de recuerdos</span><h3>Elige un color</h3><p className="muted game-small">Cada letra es un color. Las casillas de tu elección se iluminan en el lienzo.</p>
      <div className="game-palette" role="group" aria-label="Colores de los diamantitos">{pattern.palette.map((shade, index) => <button key={index} className={`${color === index ? 'is-selected' : ''} ${remaining[index] === 0 ? 'is-finished' : ''}`} style={{ '--swatch': rgb(shade), '--swatch-text': readableText(shade) } as CSSProperties} onClick={() => setColor(index)} aria-pressed={color === index} aria-label={`Color ${index + 1}, letra ${SYMBOLS[index]}, ${remaining[index]} casillas pendientes`}><span className="game-color-symbol">{remaining[index] === 0 ? <Check size={15} /> : SYMBOLS[index]}</span><span className="game-color-count">{remaining[index]}</span></button>)}</div>
      <button className="button button-secondary game-next-color" disabled={completed} onClick={() => { const next = remaining.findIndex((count, index) => count > 0 && index > color); setColor(next >= 0 ? next : Math.max(0, remaining.findIndex(count => count > 0))); }}><ArrowRight size={16} /> Siguiente color pendiente</button>
      <div className="game-progress-label"><span>Un poquito más de brillo</span><strong>{Math.round(game.painted.length / pattern.cells.length * 100)}%</strong></div><progress className="game-progress" max={pattern.cells.length} value={game.painted.length} aria-label="Diamantitos colocados" /><p className="muted game-small">{game.painted.length} de {pattern.cells.length} diamantitos colocados</p>
      <div className="game-control-buttons"><button className="button button-secondary" onClick={() => { finishStroke(); setPreview(value => !value); }} aria-pressed={preview}><Eye size={16} /> {preview ? 'Volver a pintar' : 'Vista del resultado'}</button><button className="button button-secondary" onClick={() => setPhotoPreview(true)}><Eye size={16} /> Ver fotografía</button><button className="button button-secondary" disabled={!game.history.length} onClick={undo}><Undo2 size={16} /> Deshacer último trazo</button><button className="button button-secondary" onClick={() => setConfirmation({ title: '¿Empezamos este mosaico de nuevo?', body: 'Se borrará sólo el avance local de este mosaico en este dispositivo. La fotografía, el recuerdo y tus otras partidas se conservan.', action: () => { finishStroke(); persist(initial); setFeedback('Un lienzo listo para volver a empezar.'); } })}><RotateCcw size={16} /> Reiniciar mosaico</button></div>
      <p className={`game-save-state ${saved ? '' : 'game-error'}`} role="status">{saved ? 'Avance guardado en este navegador' : 'No se pudo guardar. El almacenamiento del navegador está lleno o deshabilitado.'}</p><p className="muted game-small">La foto se adapta al formato del mosaico y a un máximo de 20 colores. El archivo original no cambia.</p>
    </div><div className="game-whisper"><Gem size={22} /><p>Un diamantito a la vez.<br />Así también se construye lo bonito.</p></div></aside>
    {photoPreview && <PhotoPreview photo={photo} close={() => setPhotoPreview(false)} />}{confirmation && <ConfirmDialog confirmation={confirmation} close={() => setConfirmation(null)} />}
  </div>;
}

export default GamesPage;
