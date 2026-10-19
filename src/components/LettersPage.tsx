import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Clock, Disc3, Download, Flower2, Heart, Lock, Mail, Music2, Pause, Play, Pencil, PenLine, Search, ShieldCheck, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { connectedStudioUid, prependStudioLocal, reviseStudioLocal, spotifyLink, studioMusicLink, type StudioAuthor, type StudioLetter } from '../data/studio-sync';
import { useStudioSync } from './useStudioSync';
import { identifyGooglePlayer } from '../lib/game-progression';
import type { GallerySession } from '../data/types';
import { type LetterSong, CURATED_LETTER_SONGS, searchLetterSongs } from '../data/letter-music';
import RomanticFlowers from './RomanticFlowers';
import './studio.css';

export type LetterThemeId = 'rose' | 'lavender' | 'peach' | 'mint' | 'sky' | 'gold';

export interface LetterTheme {
  id: LetterThemeId;
  name: string;
  dotColor: string;
  bgLight: string;
}

export const LETTER_THEMES: LetterTheme[] = [
  { id: 'rose', name: 'Rosa Amor', dotColor: '#e25878', bgLight: '#fdf4f7' },
  { id: 'lavender', name: 'Lavanda', dotColor: '#9b72db', bgLight: '#f5f0fb' },
  { id: 'peach', name: 'Melocotón', dotColor: '#eb844e', bgLight: '#fff2e8' },
  { id: 'mint', name: 'Menta', dotColor: '#439e72', bgLight: '#eef9f2' },
  { id: 'sky', name: 'Celeste', dotColor: '#3f89bf', bgLight: '#edf5fd' },
  { id: 'gold', name: 'Vainilla', dotColor: '#deb087', bgLight: '#fcf6e9' },
];

export type Letter = StudioLetter & { color?: LetterThemeId; unlockAt?: string; song?: LetterSong };

const exampleLetters: Letter[] = [
  {
    id: 'letter-demo-1',
    title: 'Qué bonito coincidir contigo',
    body: 'Entre tantas cosas que pasan en un día, siempre hay un pequeño momento en el que pienso en nosotros y sonrío.\n\nEste es un rinconcito especial para guardar esas palabras que a veces cuesta decir en voz alta y atesorarlas siempre.',
    author: 'Ale',
    tag: 'Para hoy',
    occasion: '',
    createdAt: '2026-01-14T12:00:00Z',
    color: 'rose',
    song: CURATED_LETTER_SONGS[0],
  },
  {
    id: 'letter-demo-2',
    title: 'Un abrazo hecho de palabras',
    body: 'Si hoy el mundo se siente un poquito más pesado, respira. No hace falta resolverlo todo de una vez.\n\nImagina un abrazo largo, una taza calentita y nuestro plan favorito: estar juntos.',
    author: 'Val',
    tag: 'Abre cuando',
    occasion: 'necesites un abrazo',
    createdAt: '2026-01-12T12:00:00Z',
    color: 'lavender',
    song: CURATED_LETTER_SONGS[1],
  },
  {
    id: 'letter-demo-3',
    title: 'Por todas las pequeñas cosas',
    body: 'Por las conversaciones sin prisa, las canciones que se quedan y las ganas de inventar más recuerdos.\n\nQué lindo que lo cotidiano también pueda ser especial a tu lado.',
    author: 'Ale',
    tag: 'Para hoy',
    occasion: '',
    createdAt: '2026-01-10T12:00:00Z',
    color: 'gold',
    song: CURATED_LETTER_SONGS[2],
  },
];

export function toLocalDatetimeInput(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function checkLockStatus(unlockAt?: string): {
  isLocked: boolean;
  formattedDate: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  countdownShort: string;
} {
  if (!unlockAt) {
    return { isLocked: false, formattedDate: '', days: 0, hours: 0, minutes: 0, seconds: 0, countdownShort: '' };
  }
  const target = new Date(unlockAt).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0 || isNaN(diff)) {
    return { isLocked: false, formattedDate: '', days: 0, hours: 0, minutes: 0, seconds: 0, countdownShort: '' };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const d = new Date(unlockAt);
  const formattedDate = d.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let countdownShort = '';
  if (days > 0) {
    countdownShort = `Faltan ${days}d ${hours}h`;
  } else if (hours > 0) {
    countdownShort = `Faltan ${hours}h ${minutes}m`;
  } else {
    countdownShort = `Faltan ${minutes}m ${seconds}s`;
  }

  return { isLocked: true, formattedDate, days, hours, minutes, seconds, countdownShort };
}

export function studioIsDemo(namespace: string) { return namespace.startsWith('demo') || namespace === 'nh:demo' || namespace.startsWith('nh:demo:'); }
export function StudioSprig({ className = '' }: { className?: string }) {
  return <svg className={`studio-sprig ${className}`} viewBox="0 0 100 140" fill="none" aria-hidden="true">
    <path d="M49 133C48 104 66 72 54 29M48 116C28 109 20 94 19 79M51 100C74 92 81 74 80 61M54 76C34 66 29 53 32 40" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M20 81C7 78 7 62 9 58C22 62 28 73 20 81ZM33 43C20 38 21 23 26 19C37 26 41 37 33 43ZM78 64C73 50 86 41 92 42C94 55 88 64 78 64ZM49 119C33 125 20 119 17 111C32 103 44 108 49 119ZM53 99C67 102 81 95 83 86C68 82 56 87 53 99Z" fill="currentColor" opacity=".38" />
    <g transform="translate(52 24)"><ellipse cy="-10" rx="7" ry="11" fill="#e7b6ca" /><ellipse cy="-10" rx="7" ry="11" fill="#ecc4d5" transform="rotate(72)" /><ellipse cy="-10" rx="7" ry="11" fill="#f3d7e2" transform="rotate(144)" /><ellipse cy="-10" rx="7" ry="11" fill="#ecc4d5" transform="rotate(216)" /><ellipse cy="-10" rx="7" ry="11" fill="#e7b6ca" transform="rotate(288)" /><circle r="4" fill="#c9a36e" /></g>
  </svg>;
}

export function StudioLocalNote(_props?: { demo?: boolean; connected?: boolean }) {
  return null;
}
export function StudioSyncNotice({ state, error }: { state: string; error: string }) {
  return <>{state === 'loading' && <p className="studio-local-note" role="status">Leyendo contenido compartido…</p>}{state === 'cached' && <p className="studio-local-note" role="status">Mostramos una copia en caché. Esperando confirmación de la conexión.</p>}{error && <p className="studio-form-error" role="alert">{error}</p>}</>;
}
export function StudioShareButton({ title, busy, error, requireAuthor = false, shared = false, onShare }: { title: string; busy: boolean; error: string; requireAuthor?: boolean; shared?: boolean; onShare: (author?: StudioAuthor) => Promise<boolean> }) {
  const [confirm, setConfirm] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<StudioAuthor>('Ale');
  return <>{!shared && <button type="button" className="studio-export" disabled={busy} onClick={() => setConfirm(true)}>Compartir</button>}{confirm && <StudioDialog title="Compartir este borrador" subtitle={`«${title}» se guardará para los dos. La copia de este navegador se conservará.`} busy={busy} onClose={() => { if (!busy) setConfirm(false); }}>
    {requireAuthor && <label className="field">De parte de<select className="input" disabled={busy} value={selectedAuthor} onChange={event => setSelectedAuthor(event.target.value as StudioAuthor)}><option>Ale</option><option>Val</option></select></label>}
    {error && <p className="studio-form-error" role="alert">{error}</p>}<div className="studio-form-actions"><button type="button" className="button-secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button><button type="button" className="button-primary" disabled={busy} onClick={async () => { if (await onShare(requireAuthor ? selectedAuthor : undefined)) setConfirm(false); }}>{busy ? 'Confirmando…' : 'Confirmar y compartir'}</button></div>
  </StudioDialog>}</>;
}

export function StudioStorageNotice({ saved, onExport }: { saved: boolean; onExport: () => void }) {
  if (saved) return null;
  return <div className="studio-storage-warning" role="alert"><span>No pudimos guardar el último cambio en este navegador. Sigue en esta sesión; descarga una copia antes de salir.</span><button type="button" onClick={onExport}><Download size={15} /> Descargar copia</button></div>;
}

export function StudioDialog({ title, subtitle, onClose, children, wide = false, busy = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean; busy?: boolean; flowers?: boolean }) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = () => { if (!busy) onClose(); };
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = ref.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('button');
    first?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => !element.matches(':disabled') && element.getClientRects().length > 0);
      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      if (!firstElement) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === firstElement || !panel.contains(document.activeElement))) { event.preventDefault(); lastElement.focus(); }
      else if (!event.shiftKey && (document.activeElement === lastElement || !panel.contains(document.activeElement))) { event.preventDefault(); firstElement.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return createPortal(<div className="modal-backdrop studio-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} className={`modal studio-dialog${wide ? ' studio-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined} tabIndex={-1}>
      <button type="button" className="studio-dialog-close" aria-label="Cerrar ventana" onClick={onClose} disabled={busy}><X size={20} /></button>
      <h2 id={titleId}>{title}</h2>
      {subtitle && <p id={descriptionId} className="muted studio-dialog-subtitle">{subtitle}</p>}
      {children}
    </div>
  </div>, document.body);
}

export function LetterReaderDialog({
  letter,
  theme = 'rose',
  song,
  canModify = false,
  onClose,
  onEdit,
  onDelete,
}: {
  letter: Letter;
  theme?: LetterThemeId;
  song?: LetterSong;
  canModify?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>('opening');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSong = song || letter.song;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeSong?.previewUrl) return;

    const audio = new Audio(activeSong.previewUrl);
    audio.loop = true;
    if (typeof activeSong.startSeconds === 'number' && activeSong.startSeconds > 0) {
      audio.currentTime = activeSong.startSeconds;
    }
    audio.volume = 0.04;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          const targetVol = 0.22;
          const start = performance.now();
          const duration = 1000;
          fadeTimerRef.current = setInterval(() => {
            const elapsed = performance.now() - start;
            if (elapsed >= duration || audio.paused) {
              if (!audio.paused) audio.volume = targetVol;
              if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
            } else {
              audio.volume = 0.04 + (targetVol - 0.04) * (elapsed / duration);
            }
          }, 25);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }

    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [activeSong?.previewUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.volume = isMuted ? 0 : 0.22;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = 0.22;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    timerRef.current = setTimeout(() => {
      setPhase('open');
    }, 850);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        startClosing();
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearTimeout(timerRef.current);
      previous?.focus();
    };
  }, []);

  const startClosing = () => {
    if (phase === 'closing') return;
    setPhase('closing');
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    if (audioRef.current && !audioRef.current.paused) {
      const audio = audioRef.current;
      const initialVol = audio.volume;
      const start = performance.now();
      const duration = 400;
      const fadeOutTimer = setInterval(() => {
        const elapsed = performance.now() - start;
        if (elapsed >= duration || audio.paused) {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeOutTimer);
        } else {
          audio.volume = Math.max(0, initialVol * (1 - elapsed / duration));
        }
      }, 25);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onClose();
    }, 650);
  };

  const handleBackdrop = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && phase === 'open') {
      startClosing();
    }
  };

  return createPortal(
    <div
      className={`modal-backdrop studio-dialog-backdrop studio-dialog-has-flowers studio-letter-backdrop phase-${phase} theme-${theme}`}
      onMouseDown={handleBackdrop}
    >
      <RomanticFlowers />

      <div className={`envelope-unfold-stage phase-${phase} theme-${theme}`} role="dialog" aria-modal="true" aria-label={letter.title} tabIndex={-1}>
        <button
          type="button"
          className="studio-dialog-close"
          aria-label="Cerrar y guardar carta"
          onClick={startClosing}
        >
          <X size={20} />
        </button>

        {/* Sobre físico 3D animado */}
        <div className="physical-envelope-3d" aria-hidden="true">
          <div className="env-back" />
          <div className="env-flap">
            <div className="env-flap-seal">
              <Heart size={14} fill="#fff" strokeWidth={0} />
            </div>
          </div>
          <div className="env-pocket">
            <div className="env-pocket-stamp">
              <span className="env-pocket-stamp-inner">
                <Heart size={8} fill="currentColor" strokeWidth={0} /> 17 ABR
              </span>
            </div>
          </div>
        </div>

        {/* Carta física que emerge del sobre y se despliega */}
        <div className="letter-sheet-motion">
          {activeSong && (
            <aside className="letter-soundtrack-player" aria-label="Música de fondo">
              <div className="letter-soundtrack-info">
                <div className={`mini-vinyl ${isPlaying ? 'is-spinning' : ''}`} aria-hidden="true">
                  {activeSong.artworkUrl ? (
                    <img src={activeSong.artworkUrl} alt="" className="mini-vinyl-art" />
                  ) : (
                    <Disc3 size={15} />
                  )}
                </div>
                <div className="letter-soundtrack-meta">
                  <span className="letter-soundtrack-badge">
                    <Music2 size={10} /> Melodía de fondo
                  </span>
                  <span className="letter-soundtrack-title">
                    <strong>{activeSong.title}</strong> &bull; {activeSong.artist}
                  </span>
                </div>
              </div>

              <div className="letter-soundtrack-controls">
                <button
                  type="button"
                  className="letter-soundtrack-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pausar melodía' : 'Reproducir melodía'}
                  aria-label={isPlaying ? 'Pausar melodía' : 'Reproducir melodía'}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  className="letter-soundtrack-btn"
                  onClick={toggleMute}
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              </div>
            </aside>
          )}

          <div className="studio-letter-stationery">
            <div className="studio-washi-tape" aria-hidden="true" />
            <div className="studio-postage-stamp" aria-hidden="true">
              <div className="stamp-inner">
                <Heart size={13} fill="currentColor" strokeWidth={0} />
                <span className="stamp-val">17·04</span>
                <span className="stamp-text">2026</span>
              </div>
              <div className="postmark-circle">
                <span className="postmark-date">17.04.2026</span>
                <span className="postmark-bottom">A & V</span>
              </div>
            </div>

            <div className="studio-stationery-header">
              <span className="studio-stationery-tag">
                {letter.tag === 'Abre cuando' ? `Abre cuando ${letter.occasion}` : 'Para hoy ♡'}
              </span>
              <h2 className="studio-stationery-title">{letter.title}</h2>
              <p className="studio-stationery-salutation">
                {letter.author === 'Ale' ? 'Mi querida Valeria,' : 'Mi querido Ale,'}
              </p>
            </div>

            <div className="studio-stationery-body">
              {letter.body}
            </div>

            <div className="studio-stationery-footer">
              <p className="studio-farewell">Con todo mi amor y para siempre,</p>
              <p className="studio-signature">{letter.author} ♡</p>
              <div className="studio-stationery-seal" aria-hidden="true">
                <div className="seal-wax">
                  <Heart size={18} fill="currentColor" strokeWidth={0} />
                </div>
              </div>
            </div>

            <div className="studio-letter-actions">
              <button type="button" className="button-primary studio-btn-fold" onClick={startClosing}>
                <Mail size={16} /> Doblar y guardar en el sobre
              </button>

              {canModify && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                  {onEdit && (
                    <button
                      type="button"
                      className="studio-letter-edit-btn"
                      onClick={() => {
                        startClosing();
                        onEdit();
                      }}
                    >
                      <Pencil size={13} /> Editar carta
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="studio-letter-delete-btn"
                      onClick={() => {
                        startClosing();
                        onDelete();
                      }}
                    >
                      <Trash2 size={13} /> Archivar carta
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LockedLetterDialog({
  letter,
  theme = 'rose',
  unlockAt,
  canModify = false,
  onClose,
  onUnlockNow,
  onDelete,
}: {
  letter: Letter;
  theme?: LetterThemeId;
  unlockAt: string;
  canModify?: boolean;
  onClose: () => void;
  onUnlockNow?: () => void;
  onDelete?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() => checkLockStatus(unlockAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const status = checkLockStatus(unlockAt);
      setTimeLeft(status);
      if (!status.isLocked && onUnlockNow) {
        clearInterval(timer);
        onUnlockNow();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockAt, onUnlockNow]);

  return createPortal(
    <div
      className={`modal-backdrop studio-dialog-backdrop studio-dialog-has-flowers theme-${theme}`}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <RomanticFlowers />
      <div className="locked-dialog-box" role="dialog" aria-modal="true" aria-label={`Carta sellada: ${letter.title}`}>
        <button
          type="button"
          className="studio-dialog-close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="locked-icon-halo">
          <Lock size={36} strokeWidth={2.2} />
        </div>

        <h2 className="locked-dialog-title">{letter.title}</h2>
        <p className="locked-dialog-author">De {letter.author} · Cápsula del tiempo</p>
        
        <p className="locked-dialog-explanation">
          {letter.tag === 'Abre cuando' && letter.occasion ? (
            <>Esta carta tiene una sorpresa reservada para cuando <strong>{letter.occasion}</strong>.</>
          ) : (
            <>La apertura de esta carta está programada para la fecha indicada:</>
          )}
          <br />
          <strong style={{ color: 'var(--studio-rose-deep)', display: 'block', marginTop: '6px' }}>
            📅 {timeLeft.formattedDate}
          </strong>
        </p>

        <div className="locked-countdown-grid" aria-label="Tiempo restante para abrir la carta">
          <div className="locked-countdown-cell">
            <span className="locked-countdown-number">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="locked-countdown-label">Días</span>
          </div>
          <div className="locked-countdown-cell">
            <span className="locked-countdown-number">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="locked-countdown-label">Horas</span>
          </div>
          <div className="locked-countdown-cell">
            <span className="locked-countdown-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="locked-countdown-label">Min</span>
          </div>
          <div className="locked-countdown-cell">
            <span className="locked-countdown-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="locked-countdown-label">Seg</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <button type="button" className="button-primary" onClick={onClose} style={{ width: '100%', maxWidth: '280px' }}>
            <Heart size={16} /> Esperar con ilusión
          </button>
          {canModify && onDelete && (
            <button
              type="button"
              className="studio-letter-delete-btn"
              onClick={onDelete}
              style={{ marginTop: '4px' }}
            >
              <Trash2 size={14} /> Archivar carta
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDeleteDialog({
  title,
  onClose,
  onConfirm,
  busy = false,
  error = '',
}: {
  busy?: boolean;
  error?: string;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <StudioDialog
      busy={busy}
      title="¿Archivar esta carta?"
      subtitle={`«${title}» quedará en el archivo. El contenido y las versiones anteriores se conservan.`}
      onClose={onClose}
    >
      {error && <p className="studio-form-error" role="alert">{error}</p>}
      <div className="studio-form-actions" style={{ marginTop: '20px' }}>
        <button type="button" className="button-secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="button-destructive" disabled={busy} onClick={onConfirm}>
          <Trash2 size={15} /> Archivar carta
        </button>
      </div>
    </StudioDialog>
  );
}

export default function LettersPage({ namespace, session }: { namespace: string; session?: GallerySession | null }) {
  return <LettersContent key={namespace} namespace={namespace} session={session} />;
}

function LettersContent({ namespace, session }: { namespace: string; session?: GallerySession | null }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:letters:v1`, demo ? exampleLetters : []);
  const [metaStore, setMetaStore] = useLocalState<Record<string, { color?: LetterThemeId; unlockAt?: string; song?: LetterSong }>>(`${namespace}:letters:meta:v1`, {});
  const [deletedIds, setDeletedIds] = useLocalState<string[]>(`${namespace}:letters:deleted:v1`, []);
  const [musicStored] = useLocalState<any[]>(`${namespace}:music:v1`, []);

  // Identificación de la cuenta actual de Google
  const detectedPlayerId = identifyGooglePlayer(session, namespace);
  const currentUserAuthor: StudioAuthor | null = detectedPlayerId === 'valeria' ? 'Val' : detectedPlayerId === 'ale' ? 'Ale' : null;

  const sync = useStudioSync(namespace, 'letters', stored);
  const musicSync = useStudioSync(namespace, 'songs', musicStored);
  const letters = sync.rows.map(row => row.item) as Letter[];
  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [error, setError] = useState('');

  const [compose, setCompose] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);

  // Campos de formulario para redactar / editar
  const [formAuthor, setFormAuthor] = useState<StudioAuthor>(currentUserAuthor || 'Ale');
  const [formTag, setFormTag] = useState<Letter['tag']>('Para hoy');
  const [formTitle, setFormTitle] = useState('');
  const [formOccasion, setFormOccasion] = useState('');
  const [formBody, setFormBody] = useState('');
  const [selectedColor, setSelectedColor] = useState<LetterThemeId>('rose');
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [formSong, setFormSong] = useState<LetterSong | undefined>(undefined);
  const [songAudioDuration, setSongAudioDuration] = useState<number>(30);
  const [customAudioInput, setCustomAudioInput] = useState('');
  const [customAudioTitle, setCustomAudioTitle] = useState('');
  const [customAudioArtist, setCustomAudioArtist] = useState('');

  // Estado del buscador de canciones en el formulario
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<LetterSong[]>(CURATED_LETTER_SONGS);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [pickerPreviewUrl, setPickerPreviewUrl] = useState<string | null>(null);
  const pickerAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatSongTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!formSong?.previewUrl) {
      setSongAudioDuration(30);
      return;
    }
    const a = new Audio();
    a.src = formSong.previewUrl;
    a.onloadedmetadata = () => {
      if (a.duration && Number.isFinite(a.duration) && a.duration > 0) {
        setSongAudioDuration(Math.floor(a.duration));
      }
    };
    return () => {
      a.src = '';
    };
  }, [formSong?.previewUrl]);

  const stopPickerAudio = () => {
    if (pickerAudioRef.current) {
      pickerAudioRef.current.pause();
      pickerAudioRef.current.removeAttribute('src');
      pickerAudioRef.current.load();
      pickerAudioRef.current = null;
    }
    setPickerPreviewUrl(null);
  };

  const togglePickerAudio = (url?: string, startSeconds: number = 0) => {
    if (!url) return;
    if (pickerPreviewUrl === url) {
      stopPickerAudio();
    } else {
      stopPickerAudio();
      const audio = new Audio(url);
      audio.volume = 0.25;
      if (startSeconds > 0) {
        audio.currentTime = startSeconds;
      }
      pickerAudioRef.current = audio;
      audio.onended = () => setPickerPreviewUrl(null);
      audio.onerror = () => setPickerPreviewUrl(null);
      audio.play()
        .then(() => setPickerPreviewUrl(url))
        .catch(() => setPickerPreviewUrl(null));
    }
  };

  useEffect(() => {
    return () => {
      stopPickerAudio();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleMusicSearchChange = (val: string) => {
    setMusicQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      setMusicResults(CURATED_LETTER_SONGS);
      setIsSearchingMusic(false);
      return;
    }
    setIsSearchingMusic(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchLetterSongs(val);
      setMusicResults(results.length > 0 ? results : []);
      setIsSearchingMusic(false);
    }, 320);
  };

  const handleSelectSong = async (song: LetterSong) => {
    stopPickerAudio();
    if (song.previewUrl) {
      setFormSong(song);
      return;
    }
    // Si no tiene previewUrl (ej: dedicatoria previa en la sección de música), buscar una en iTunes
    try {
      const results = await searchLetterSongs(`${song.title} ${song.artist}`);
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const found = results.find(r => r.previewUrl && normalize(r.title) === normalize(song.title) && normalize(r.artist) === normalize(song.artist));
      if (found && found.previewUrl) {
        setFormSong({
          ...song,
          previewUrl: found.previewUrl,
          artworkUrl: song.artworkUrl || found.artworkUrl,
        });
        return;
      }
    } catch {
      // Ignorar fallas de búsqueda secundaria
    }
    setFormSong(song);
  };

  // Dedicatorias guardadas en la página de música para ofrecerlas rápidamente
  const dedicationsFromMusic: LetterSong[] = musicSync.rows
    .filter(row => !(row.item as typeof row.item & { archived?: boolean }).archived)
    .map(({ item: song }) => ({
      id: song.id, title: song.title, artist: song.artist,
      ...(spotifyLink(song.url) ? { spotifyUrl: song.url } : studioMusicLink(song.url) ? { catalogUrl: song.url } : {}),
      ...(song.artworkUrl ? { artworkUrl: song.artworkUrl } : {}),
      ...(song.previewUrl ? { previewUrl: song.previewUrl } : {}),
      ...(song.startSeconds ? { startSeconds: song.startSeconds } : {}),
    }));

  const [opened, setOpened] = useState<Letter | null>(null);
  const [lockedLetter, setLockedLetter] = useState<Letter | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
  useEffect(() => {
    setOpened(current => current ? letters.find(letter => letter.id === current.id) ?? current : current);
    setLockedLetter(current => current ? letters.find(letter => letter.id === current.id) ?? current : current);
  }, [sync.rows]);

  const [filter, setFilter] = useState<'Todas' | Letter['tag']>('Todas');
  const [status, setStatus] = useState('');

  const startCompose = () => {
    identity.current = null;
    setError('');
    sync.clearError();
    setEditingLetter(null);
    setFormAuthor(currentUserAuthor || 'Ale');
    setFormTag('Para hoy');
    setFormTitle('');
    setFormOccasion('');
    setFormBody('');
    setSelectedColor('rose');
    setEnableSchedule(false);
    setScheduleDate('');
    stopPickerAudio();
    setFormSong(undefined);
    setMusicQuery('');
    setMusicResults(CURATED_LETTER_SONGS);
    setCompose(true);
  };

  const startEdit = (letter: Letter) => {
    setError('');
    sync.clearError();
    setEditingLetter(letter);
    setFormAuthor(letter.author);
    setFormTag(letter.tag);
    setFormTitle(letter.title);
    setFormOccasion(letter.occasion || '');
    setFormBody(letter.body);
    setSelectedColor(getLetterColor(letter));
    const unlock = getLetterUnlockAt(letter);
    if (unlock) {
      setEnableSchedule(true);
      setScheduleDate(toLocalDatetimeInput(new Date(unlock)));
    } else {
      setEnableSchedule(false);
      setScheduleDate('');
    }
    stopPickerAudio();
    setFormSong(getLetterSong(letter));
    setMusicQuery('');
    setMusicResults(CURATED_LETTER_SONGS);
    setCompose(true);
  };

  const getLetterColor = (letter: Letter): LetterThemeId => {
    return letter.color || ((letter as Letter & { revisionId?: string }).revisionId ? undefined : metaStore[letter.id]?.color) || 'rose';
  };

  const getLetterUnlockAt = (letter: Letter): string | undefined => {
    return letter.unlockAt || ((letter as Letter & { revisionId?: string }).revisionId ? undefined : metaStore[letter.id]?.unlockAt);
  };

  const getLetterSong = (letter: Letter): LetterSong | undefined => {
    return letter.song || ((letter as Letter & { revisionId?: string }).revisionId ? undefined : metaStore[letter.id]?.song);
  };

  const canModifyLetter = (letter: Letter): boolean => {
    const creator = (letter as Letter & { createdBy?: string }).createdBy;
    if (creator) return creator === connectedStudioUid(namespace);
    // Los borradores locales conservan su autoría visual.
    if (!currentUserAuthor) return true;
    // Con cuenta de Google, solo quien la redactó tiene permiso de editar y borrar
    return letter.author === currentUserAuthor;
  };

  const [showArchived, setShowArchived] = useState(false);
  const isArchived = (letter: Letter) => (letter as Letter & { archived?: boolean }).archived === true || deletedIds.includes(letter.id);
  const activeLetters = letters.filter(letter => showArchived === isArchived(letter));
  const visible = filter === 'Todas' ? activeLetters : activeLetters.filter(letter => letter.tag === filter);

  const exportLetters = () =>
    downloadJson('nuestra-historia-cartas.json', {
      ...sync.exportData,
      hiddenLocalIds: deletedIds,
      localMetadata: metaStore,
      letters: letters.map(l => ({
        ...l,
        color: getLetterColor(l),
        unlockAt: getLetterUnlockAt(l),
        song: getLetterSong(l),
      })),
    });

  async function handleDeleteLetter(letter: Letter, archived = true) {
    if (!canModifyLetter(letter)) { setError('Sólo la cuenta que creó esta carta puede archivarla.'); return; }
    const row = sync.rows.find(row => row.item.id === letter.id);
    if (row?.scope === 'shared') {
      if (!await sync.archive(letter, archived)) return;
    } else {
      try { setStored(reviseStudioLocal(stored, row?.localId ?? letter.id, { archived })); }
      catch (failure) { setError((failure as Error).message); return; }
    }
    if (!archived) setDeletedIds(previous => previous.filter(id => id !== letter.id && id !== row?.localId));
    setStatus(`Carta «${letter.title}» ${archived ? 'archivada; conservamos su contenido e historial' : 'restaurada'}.`);
    setLetterToDelete(null);
    if (opened?.id === letter.id) setOpened(null);
    if (lockedLetter?.id === letter.id) setLockedLetter(null);
  }

  async function saveLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formTitle.trim();
    const body = formBody.trim();
    const occasion = formOccasion.trim();
    if (!title || !body || (formTag === 'Abre cuando' && !occasion)) {
      setError('Por favor completa todos los campos requeridos de tu carta.');
      return;
    }

    if (enableSchedule && (!scheduleDate || !Number.isFinite(new Date(scheduleDate).getTime()))) { setError('Elige una fecha y hora válidas para la apertura.'); return; }
    const unlockTimestamp = enableSchedule ? new Date(scheduleDate).toISOString() : undefined;

    if (editingLetter) {
      if (!canModifyLetter(editingLetter)) {
        setError(`Solo ${editingLetter.author} puede editar esta carta.`);
        return;
      }

      stopPickerAudio();

      const updatedLetter: Letter = {
        ...editingLetter,
        title,
        body,
        tag: formTag,
        occasion: formTag === 'Abre cuando' ? occasion : '',
        author: editingLetter.author,
        color: selectedColor,
        unlockAt: unlockTimestamp,
        song: formSong,
      };

      const row = sync.rows.find(row => row.item.id === editingLetter.id);
      if (row?.scope === 'shared') {
        if (!await sync.update(editingLetter, updatedLetter)) return;
      } else {
        try { setStored(reviseStudioLocal(stored, row?.localId ?? editingLetter.id, updatedLetter as unknown as Record<string, unknown>)); }
        catch (failure) { setError((failure as Error).message); return; }
      }
      setMetaStore(previous => ({ ...previous, [editingLetter.id]: { color: selectedColor, unlockAt: unlockTimestamp, song: formSong } }));

      setCompose(false);
      setEditingLetter(null);
      setStatus(`Carta «${title}» actualizada.`);
      return;
    }

    stopPickerAudio();
    identity.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const letter: Letter = {
      ...identity.current,
      title,
      body,
      author: formAuthor,
      tag: formTag,
      occasion: formTag === 'Abre cuando' ? occasion : '',
      color: selectedColor,
      unlockAt: unlockTimestamp,
      song: formSong,
    };

    setMetaStore(prev => ({
      ...prev,
      [letter.id]: {
        color: selectedColor,
        unlockAt: unlockTimestamp,
        song: formSong,
      },
    }));

    const localOnly = !sync.connected || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'local';
    if (!localOnly) {
      if (!await sync.share(letter)) return;
    } else {
      try {
        setStored(prependStudioLocal(stored, letter));
      } catch (failure) {
        setError((failure as Error).message);
        return;
      }
    }

    setCompose(false);
    setFilter('Todas');
    setStatus(localOnly ? 'Carta añadida a este navegador.' : 'Carta compartida y confirmada.');
    identity.current = null;
  }

  return (
    <section className="studio-page studio-letters-page" aria-labelledby="letters-title">
      <div className="studio-page-heading">
        <div>
          <h1 className="page-title" id="letters-title">Cartitas <em>♡</em></h1>
        </div>
        <button type="button" className="button-primary studio-add-button" onClick={() => { setFormTag('Para hoy'); startCompose(); }}>
          <PenLine size={17} /> Escribir una carta
        </button>
      </div>
      <StudioSyncNotice state={sync.state} error={sync.error} />
      <StudioStorageNotice saved={saved} onExport={exportLetters} />

      <div className="studio-toolbar">
        <div className="studio-filter-group" aria-label="Filtrar cartas">
          {(['Todas', 'Para hoy', 'Abre cuando'] as const).map(value => (
            <button
              type="button"
              key={value}
              className={filter === value ? 'studio-filter is-active' : 'studio-filter'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}{value === 'Todas' && <span>{activeLetters.length}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="studio-export" onClick={() => setShowArchived(value => !value)}>{showArchived ? "Ver buzón" : "Ver archivo"}</button>
        <button type="button" className="studio-export" onClick={exportLetters}>
          <Download size={14} /> Exportar
        </button>
      </div>

      <div className="studio-letter-grid">
        {visible.map((letter) => {
          const letterColor = getLetterColor(letter);
          const unlockAt = getLetterUnlockAt(letter);
          const letterSong = getLetterSong(letter);
          const lockInfo = checkLockStatus(unlockAt);
          const canModify = canModifyLetter(letter);

          return (
            <article key={sync.rows.find(row => row.item.id === letter.id)?.localId ?? letter.id}>
              <button
                type="button"
                className={`studio-envelope-card theme-${letterColor}`}
                style={{ width: '100%' }}
                onClick={() => {
                  if (lockInfo.isLocked) {
                    setLockedLetter(letter);
                  } else {
                    setOpened(letter);
                  }
                }}
                aria-label={`Leer ${letter.title}, de ${letter.author}`}
              >
                <div className="studio-envelope-art" aria-hidden="true">
                  {lockInfo.isLocked ? (
                    <div className="studio-lock-ribbon">
                      <Lock size={12} /> {lockInfo.countdownShort}
                    </div>
                  ) : (
                    <div className="studio-envelope-stamp">
                      <span className="envelope-stamp-inner">
                        <Heart size={9} fill="currentColor" strokeWidth={0} /> 17 ABR
                      </span>
                    </div>
                  )}

                  <div className="studio-envelope-outline">
                    <div className="studio-envelope-flap" />
                  </div>

                  <span className="studio-envelope-seal">
                    {lockInfo.isLocked ? (
                      <Lock size={16} strokeWidth={2} />
                    ) : (
                      <Heart size={16} strokeWidth={1.5} />
                    )}
                  </span>
                  <StudioSprig />
                </div>

                <div className="studio-letter-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="studio-tag">{letter.tag === 'Abre cuando' ? 'Abre cuando…' : 'Para hoy'}</span>
                    {letterSong && (
                      <span className="studio-letter-song-pill" title={`Melodía de fondo: ${letterSong.title} — ${letterSong.artist}`}>
                        <Music2 size={10} /> <span>{letterSong.title}</span>
                      </span>
                    )}
                  </div>

                  {lockInfo.isLocked && (
                    <div className="studio-lock-badge">
                      <Clock size={12} /> Se desbloquea: {lockInfo.formattedDate}
                    </div>
                  )}

                  <h2>{letter.title}</h2>
                  <p>
                    {letter.tag === 'Abre cuando'
                      ? letter.occasion
                      : lockInfo.isLocked
                      ? '🔒 Esta carta está sellada con una promesa. Podrás abrirla al cumplirse la fecha programada.'
                      : letter.body.replace(/\s+/g, ' ')}
                  </p>

                  <div className="studio-card-bottom">
                    <span className="studio-author">
                      <span>{letter.author.charAt(0)}</span> De {letter.author}
                    </span>
                    <span className="studio-text-action">
                      {lockInfo.isLocked ? (
                        <><Lock size={14} /> Sellada</>
                      ) : (
                        <>Abrir carta <ArrowUpRight size={15} /></>
                      )}
                    </span>
                  </div>
                </div>
              </button>

              <div className="studio-card-bottom" style={{ marginTop: 0, padding: '10px 12px' }}>
                <div className="studio-card-actions-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="studio-tag">
                      {sync.rows.find(row => row.item.id === letter.id)?.scope === 'shared'
                        ? 'Compartido'
                        : 'Solo aquí'}
                    </span>
                    {sync.connected && sync.rows.find(row => row.item.id === letter.id)?.hasLocalCopy && (
                      <StudioShareButton
                        shared={sync.rows.find(row => row.item.id === letter.id)?.scope === 'shared'}
                        title={letter.title}
                        busy={sync.busy}
                        error={sync.error}
                        onShare={async () => {
                          const ok = await sync.share({ ...letter, color: getLetterColor(letter), unlockAt: getLetterUnlockAt(letter), song: getLetterSong(letter) });
                          if (ok) setStatus('Carta compartida. El borrador local se conserva.');
                          return ok;
                        }}
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {canModify ? (
                      <>
                        <button
                          type="button"
                          className="studio-letter-edit-btn"
                          onClick={() => startEdit(letter)}
                          title="Editar mi carta"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        <button
                          type="button"
                          className="studio-letter-delete-btn"
                          onClick={() => isArchived(letter) ? void handleDeleteLetter(letter, false) : setLetterToDelete(letter)}
                          title={isArchived(letter) ? "Restaurar carta" : "Archivar mi carta"}
                        >
                          <Trash2 size={13} /> {isArchived(letter) ? "Restaurar" : "Archivar"}
                        </button>
                      </>
                    ) : (
                      <span
                        className="studio-letter-protected-badge"
                        title={`Esta carta fue escrita por ${letter.author}. Solo quien la escribió puede editarla o archivarla.`}
                      >
                        <Heart size={11} fill="currentColor" /> De {letter.author}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="studio-empty">
          <span className="studio-empty-icon"><Mail size={30} strokeWidth={1.3} /></span>
          <h2>{activeLetters.length ? 'Todavía no hay cartas con este filtro.' : 'La primera carta empieza contigo.'}</h2>
          <p>{activeLetters.length ? 'Elige otro filtro o escribe unas palabras para este momento.' : 'Escribe algo para hoy, programa una cápsula del tiempo o prepara un abrazo para cuando haga falta.'}</p>
          <button type="button" className="button-secondary" onClick={() => { setFormTag(filter === 'Abre cuando' ? 'Abre cuando' : 'Para hoy'); startCompose(); }}>
            <PenLine size={16} /> Escribir una carta
          </button>
          <StudioSprig />
        </div>
      )}

      <p className="studio-footnote"><Sparkles size={13} /> A veces, el mejor regalo cabe en unas cuantas palabras.</p>
      <p className="studio-status" role="status">{status}</p>

      {/* Modal Redactar / Editar Carta */}
      {compose && (
        <StudioDialog
          title={editingLetter ? "Editar carta" : "Querido amor…"}
          subtitle={
            editingLetter
              ? `Modifica los detalles de «${editingLetter.title}»`
              : sync.connected
              ? "Confirma para compartirla con los dos, o guárdala solo aquí."
              : "Escribe sin prisa. Esta carta se guardará solo en este navegador."
          }
          busy={sync.busy}
          onClose={() => { setCompose(false); setEditingLetter(null); }}
        >
          <form onSubmit={saveLetter} aria-busy={sync.busy} className="studio-form">
            <fieldset disabled={sync.busy} style={{ display: 'contents' }}>
              <div className="studio-form-row">
                <label className="field">
                  De parte de
                  <select
                    className="input"
                    name="author"
                    value={formAuthor}
                    onChange={event => setFormAuthor(event.target.value as StudioAuthor)}
                    disabled={!!editingLetter || !!currentUserAuthor}
                  >
                    <option value="Ale">Ale {currentUserAuthor === 'Ale' ? '(Tú)' : ''}</option>
                    <option value="Val">Val {currentUserAuthor === 'Val' ? '(Tú)' : ''}</option>
                  </select>
                </label>
                <label className="field">
                  Cuándo abrirla
                  <select
                    className="input"
                    value={formTag}
                    onChange={event => setFormTag(event.target.value as Letter['tag'])}
                  >
                    <option value="Para hoy">Para hoy</option>
                    <option value="Abre cuando">Abre cuando</option>
                  </select>
                </label>
              </div>

              {formTag === 'Abre cuando' && (
                <label className="field">
                  Abre cuando…
                  <input
                    className="input"
                    name="occasion"
                    placeholder="necesites recordar cuánto te quiero"
                    maxLength={120}
                    value={formOccasion}
                    onChange={e => setFormOccasion(e.target.value)}
                    required
                  />
                </label>
              )}

              {/* Selector de color */}
              <div style={{ margin: '6px 0 10px' }}>
                <label className="studio-color-picker-label">Color del sobre y carta</label>
                <div className="studio-color-swatches" role="radiogroup" aria-label="Color del sobre">
                  {LETTER_THEMES.map(theme => (
                    <button
                      type="button"
                      key={theme.id}
                      className={`studio-color-chip ${selectedColor === theme.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedColor(theme.id)}
                      style={{
                        borderColor: selectedColor === theme.id ? theme.dotColor : undefined,
                        backgroundColor: theme.bgLight,
                      }}
                    >
                      <span className="studio-color-dot" style={{ backgroundColor: theme.dotColor }} />
                      <span>{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Programar fecha y hora para desbloquearla */}
              <div
                className="studio-schedule-toggle"
                onClick={() => setEnableSchedule(!enableSchedule)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setEnableSchedule(!enableSchedule); } }}
              >
                <input
                  type="checkbox"
                  checked={enableSchedule}
                  onChange={e => setEnableSchedule(e.target.checked)}
                  onClick={e => e.stopPropagation()}
                />
                <Clock size={16} />
                <span>Programar fecha y hora de apertura (Cápsula del tiempo)</span>
              </div>

              {enableSchedule && (
                <div className="studio-schedule-details">
                  <label className="field" style={{ marginBottom: '6px' }}>
                    Se desbloquea el:
                    <input
                      type="datetime-local"
                      className="input"
                      value={scheduleDate}
                      min={toLocalDatetimeInput()}
                      onChange={e => setScheduleDate(e.target.value)}
                      required={enableSchedule}
                    />
                  </label>
                  <p style={{ fontSize: '12px', color: 'var(--studio-muted)', margin: 0 }}>
                    La interfaz la abrirá en esta fecha, en la zona horaria de este dispositivo. Es una sorpresa visual: ambas cuentas autorizadas ya pueden leer el documento guardado.
                  </p>
                </div>
              )}

              {/* Canción de fondo para la carta */}
              <div className="studio-letter-music-section">
                <div className="studio-letter-music-header">
                  <div className="studio-letter-music-label">
                    <Music2 size={16} />
                    <span>Canción de fondo</span>
                    <span className="studio-letter-music-optional">(Opcional)</span>
                  </div>
                  <p className="studio-letter-music-sub">
                    Se reproducirá suavemente de fondo cuando abran el sobre para leer la carta.
                  </p>
                </div>

                {formSong ? (
                  <div className="studio-selected-song-card-wrap">
                    <div className="studio-selected-song-card">
                      <div className="studio-selected-song-cover">
                        {formSong.artworkUrl ? (
                          <img src={formSong.artworkUrl} alt={formSong.title} />
                        ) : (
                          <Disc3 size={24} />
                        )}
                      </div>
                      <div className="studio-selected-song-meta">
                        <span className="selected-song-title">{formSong.title}</span>
                        <span className="selected-song-artist">{formSong.artist}</span>
                        <span className="selected-song-hint">🎵 Sonará de fondo al abrir el sobre</span>
                      </div>
                      <div className="studio-selected-song-actions">
                        <button
                          type="button"
                          className="studio-song-remove-btn"
                          onClick={() => {
                            stopPickerAudio();
                            setFormSong(undefined);
                          }}
                          title="Quitar canción de la carta"
                        >
                          <X size={14} /> Quitar
                        </button>
                      </div>
                    </div>

                    {/* Selector de fragmento de audio estilo Notas de Instagram */}
                    {formSong.previewUrl && (
                      <div className="studio-ig-audio-trimmer">
                        <div className="studio-ig-trimmer-header">
                          <span className="studio-ig-trimmer-title">
                            <Sparkles size={13} /> Fragmento de la canción ({songAudioDuration > 35 ? 'Canción completa' : 'Muestra'})
                          </span>
                          <span className="studio-ig-time-badge">
                            Inicia en: <strong>{formatSongTime(formSong.startSeconds || 0)}</strong>
                            {songAudioDuration > 0 && <span style={{ opacity: 0.65, fontSize: '11px', marginLeft: '4px' }}>/ {formatSongTime(songAudioDuration)}</span>}
                          </span>
                        </div>

                        {/* Botones de salto rápido: Inicio, Medio/Coro, Final */}
                        <div className="studio-ig-quick-positions">
                          <button
                            type="button"
                            className={`studio-ig-pos-btn ${(formSong.startSeconds || 0) === 0 ? 'is-active' : ''}`}
                            onClick={() => {
                              setFormSong(prev => prev ? { ...prev, startSeconds: 0 } : prev);
                              if (pickerAudioRef.current) pickerAudioRef.current.currentTime = 0;
                            }}
                          >
                            ⏮ Inicio (0:00)
                          </button>
                          <button
                            type="button"
                            className={`studio-ig-pos-btn ${Math.abs((formSong.startSeconds || 0) - Math.floor(songAudioDuration * 0.45)) <= 3 ? 'is-active' : ''}`}
                            onClick={() => {
                              const mid = Math.floor(songAudioDuration * 0.45);
                              setFormSong(prev => prev ? { ...prev, startSeconds: mid } : prev);
                              if (pickerAudioRef.current) pickerAudioRef.current.currentTime = mid;
                            }}
                          >
                            ⏯ Medio / Coro ({formatSongTime(Math.floor(songAudioDuration * 0.45))})
                          </button>
                          <button
                            type="button"
                            className={`studio-ig-pos-btn ${Math.abs((formSong.startSeconds || 0) - Math.floor(songAudioDuration * 0.75)) <= 3 ? 'is-active' : ''}`}
                            onClick={() => {
                              const end = Math.floor(songAudioDuration * 0.75);
                              setFormSong(prev => prev ? { ...prev, startSeconds: end } : prev);
                              if (pickerAudioRef.current) pickerAudioRef.current.currentTime = end;
                            }}
                          >
                            ⏭ Final ({formatSongTime(Math.floor(songAudioDuration * 0.75))})
                          </button>
                        </div>

                        {/* Visualizador de onda estilo Instagram */}
                        <div className="studio-ig-waveform" aria-hidden="true">
                          {Array.from({ length: 32 }).map((_, i) => {
                            const heights = [30, 55, 80, 45, 90, 60, 35, 75, 100, 70, 40, 85, 60, 95, 50, 65, 90, 40, 70, 85, 55, 35, 75, 90, 60, 45, 70, 40, 60, 80, 50, 35];
                            const h = heights[i % heights.length];
                            const currentSec = formSong.startSeconds || 0;
                            const totalDur = Math.max(1, songAudioDuration);
                            const isNearStart = Math.abs(i - Math.round((currentSec / totalDur) * 31)) < 3;
                            return (
                              <span
                                key={i}
                                className={`studio-ig-wave-bar ${isNearStart ? 'is-active' : ''}`}
                                style={{ height: `${h}%` }}
                              />
                            );
                          })}
                        </div>

                        <div className="studio-ig-slider-row">
                          <input
                            type="range"
                            min="0"
                            max={Math.max(10, songAudioDuration > 5 ? songAudioDuration - 5 : songAudioDuration)}
                            step="1"
                            value={formSong.startSeconds || 0}
                            onChange={e => {
                              const sec = parseInt(e.target.value, 10);
                              setFormSong(prev => prev ? { ...prev, startSeconds: sec } : prev);
                              if (pickerAudioRef.current) {
                                pickerAudioRef.current.currentTime = sec;
                              }
                            }}
                            className="studio-ig-slider"
                            title={`Inicio de reproducción: ${formatSongTime(formSong.startSeconds || 0)}`}
                          />
                        </div>

                        <div className="studio-ig-trimmer-footer">
                          <button
                            type="button"
                            className={`studio-ig-preview-btn ${pickerPreviewUrl === formSong.previewUrl ? 'is-playing' : ''}`}
                            onClick={() => togglePickerAudio(formSong.previewUrl, formSong.startSeconds || 0)}
                          >
                            {pickerPreviewUrl === formSong.previewUrl ? (
                              <><Pause size={13} fill="currentColor" /> Pausar muestra</>
                            ) : (
                              <><Play size={13} fill="currentColor" /> Probar desde {formatSongTime(formSong.startSeconds || 0)}</>
                            )}
                          </button>
                          <span className="studio-ig-help-text">
                            Elige el fragmento exacto (inicio, medio o final) que sonará al abrir la carta ♡
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="studio-song-picker-panel">
                    <div className="studio-song-search-box">
                      <Search size={14} className="studio-song-search-icon" />
                      <input
                        type="text"
                        className="input studio-song-search-input"
                        placeholder="Buscar canción o artista para acompañar la carta..."
                        value={musicQuery}
                        onChange={e => handleMusicSearchChange(e.target.value)}
                      />
                      {isSearchingMusic && <span className="studio-song-searching-pill">Buscando…</span>}
                    </div>

                    {/* Opción para usar canción completa con enlace directo a MP3/Audio */}
                    <div className="studio-custom-audio-row">
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--studio-rose-deep)' }}>
                        🔗 ¿Quieres usar tu canción completa (MP3 / Audio)?
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '6px 0' }}>
                        <input
                          type="text"
                          className="input"
                          style={{ fontSize: '12px', padding: '6px 8px' }}
                          placeholder="Título de la canción"
                          value={customAudioTitle}
                          onChange={e => setCustomAudioTitle(e.target.value)}
                        />
                        <input
                          type="text"
                          className="input"
                          style={{ fontSize: '12px', padding: '6px 8px' }}
                          placeholder="Artista"
                          value={customAudioArtist}
                          onChange={e => setCustomAudioArtist(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="url"
                          className="input"
                          style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                          placeholder="Enlace directo al audio (ej: https://.../cancion.mp3)"
                          value={customAudioInput}
                          onChange={e => setCustomAudioInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="button-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            if (!customAudioInput.trim()) return;
                            handleSelectSong({
                              id: `custom-song-${Date.now()}`,
                              title: customAudioTitle.trim() || 'Nuestra canción completa',
                              artist: customAudioArtist.trim() || 'Canción especial',
                              previewUrl: customAudioInput.trim(),
                              startSeconds: 0,
                            });
                            setCustomAudioInput('');
                            setCustomAudioTitle('');
                            setCustomAudioArtist('');
                          }}
                        >
                          Usar canción completa
                        </button>
                      </div>
                    </div>

                    {dedicationsFromMusic.length > 0 && !musicQuery && (
                      <div className="studio-picker-group">
                        <span className="studio-picker-group-title">
                          <Heart size={11} fill="currentColor" /> De nuestras canciones dedicadas:
                        </span>
                        <div className="studio-quick-songs-list">
                          {dedicationsFromMusic.slice(0, 4).map(song => (
                            <button
                              type="button"
                              key={song.id || `${song.title}-${song.artist}`}
                              className="studio-quick-song-pill"
                              onClick={() => handleSelectSong(song)}
                            >
                              <Music2 size={11} />
                              <span className="quick-song-name">{song.title}</span>
                              <span className="quick-song-by">&middot; {song.artist}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="studio-picker-group">
                      <span className="studio-picker-group-title">
                        <Sparkles size={11} /> {musicQuery ? 'Resultados encontrados:' : 'Canciones románticas sugeridas:'}
                      </span>
                      <div className="studio-song-results-grid">
                        {musicResults.slice(0, 6).map(song => {
                          const isPlayingThis = pickerPreviewUrl === song.previewUrl;
                          return (
                            <div
                              key={song.id || `${song.title}-${song.artist}`}
                              className="studio-song-result-item"
                            >
                              <div
                                className="studio-song-item-info"
                                onClick={() => handleSelectSong(song)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectSong(song); } }}
                              >
                                <div className="studio-song-item-cover">
                                  {song.artworkUrl ? (
                                    <img src={song.artworkUrl} alt="" />
                                  ) : (
                                    <Disc3 size={18} />
                                  )}
                                </div>
                                <div className="studio-song-item-text">
                                  <span className="song-item-title">{song.title}</span>
                                  <span className="song-item-artist">{song.artist}</span>
                                </div>
                              </div>

                              <div className="studio-song-item-actions">
                                {song.previewUrl && (
                                  <button
                                    type="button"
                                    className={`studio-song-preview-icon-btn ${isPlayingThis ? 'is-playing' : ''}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      togglePickerAudio(song.previewUrl);
                                    }}
                                    title={isPlayingThis ? 'Pausar' : 'Probar sonido'}
                                  >
                                    {isPlayingThis ? <Pause size={12} /> : <Play size={12} />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="studio-song-pick-btn"
                                  onClick={() => handleSelectSong(song)}
                                >
                                  Elegir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <label className="field">
                Título
                <input
                  className="input"
                  name="title"
                  placeholder="Una pequeña razón para sonreír"
                  maxLength={100}
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  data-autofocus
                />
              </label>

              <label className="field">
                Tu carta
                <textarea
                  className="textarea studio-letter-textarea"
                  name="body"
                  placeholder="Hoy quería decirte…"
                  rows={7}
                  maxLength={12000}
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                  required
                />
              </label>

              {(error || sync.error) && <p className="studio-form-error" role="alert">{error || sync.error}</p>}
              <p className="studio-form-note">
                <ShieldCheck size={14} /> {sync.connected ? "Compartir la guarda para ambos. Guardar solo aquí conserva un borrador local." : "Puedes exportar tus cartas para conservar una copia."}
              </p>

              <div className="studio-form-actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={sync.busy}
                  onClick={() => { stopPickerAudio(); setCompose(false); setEditingLetter(null); }}
                >
                  Cancelar
                </button>
                {!editingLetter && sync.connected && (
                  <button type="submit" name="destination" value="local" className="button-secondary" disabled={sync.busy}>
                    Guardar solo aquí
                  </button>
                )}
                <button type="submit" className="button-primary" disabled={sync.busy}>
                  {editingLetter ? (
                    <><Pencil size={15} /> Guardar cambios</>
                  ) : (
                    <><Heart size={16} /> {sync.busy ? "Confirmando…" : sync.connected ? "Compartir carta" : "Guardar carta aquí"}</>
                  )}
                </button>
              </div>
            </fieldset>
          </form>
        </StudioDialog>
      )}

      {/* Lector de carta abierta */}
      {opened && (
        <LetterReaderDialog
          letter={opened}
          theme={getLetterColor(opened)}
          song={getLetterSong(opened)}
          canModify={canModifyLetter(opened)}
          onClose={() => setOpened(null)}
          onEdit={() => startEdit(opened)}
          onDelete={() => setLetterToDelete(opened)}
        />
      )}

      {/* Modal de carta bloqueada (Cápsula del tiempo con cuenta regresiva) */}
      {lockedLetter && (
        <LockedLetterDialog
          letter={lockedLetter}
          theme={getLetterColor(lockedLetter)}
          unlockAt={getLetterUnlockAt(lockedLetter) || ''}
          canModify={canModifyLetter(lockedLetter)}
          onClose={() => setLockedLetter(null)}
          onUnlockNow={() => {
            const letter = lockedLetter;
            setLockedLetter(null);
            setOpened(letter);
          }}
          onDelete={() => setLetterToDelete(lockedLetter)}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {letterToDelete && (
        <ConfirmDeleteDialog
          title={letterToDelete.title}
          busy={sync.busy}
          error={sync.error || error}
          onClose={() => setLetterToDelete(null)}
          onConfirm={() => handleDeleteLetter(letterToDelete)}
        />
      )}
    </section>
  );
}
