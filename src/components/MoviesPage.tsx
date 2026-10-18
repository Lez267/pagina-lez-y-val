'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Calendar,
  Check,
  Clapperboard,
  Clock,
  Download,
  Eye,
  EyeOff,
  Film,
  Heart,
  Loader2,
  MapPin,
  Popcorn,
  Plus,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { downloadJson, readLocal, useLocalState } from '../lib/storage';
import { StudioDialog, studioIsDemo } from './LettersPage';
import { identifyGooglePlayer } from '../lib/game-progression';
import type { GallerySession } from '../data/types';
import type { StudioAuthor } from '../data/studio-sync';
import './studio.css';
import './cinepolis.css';

export interface StudioMovie {
  id: string;
  title: string;
  year?: number | string;
  poster?: string;
  stars?: string;
  note: string;
  author: StudioAuthor;
  watched: boolean;
  watchedDate?: string;
  createdAt: string;
  duration?: string;
  classification?: string;
  format?: string;
}

export interface IMDbSuggestion {
  id: string;
  title: string;
  year?: number | string;
  stars?: string;
  poster?: string;
}

export interface MovieReservation {
  movieId: string;
  movieTitle: string;
  poster?: string;
  dateName: string;
  showtime: string;
  reservedAt: string;
}

export const SHOWTIME_PRESETS = [
  '4:00 PM',
  '5:15 PM',
  '6:30 PM',
  '7:15 PM',
  '8:00 PM',
  '8:45 PM',
  '9:30 PM',
  '10:15 PM',
  '11:00 PM',
];

export async function downloadImageFile(blob: Blob, fileName: string): Promise<void> {
  // Método 1: File System Access API (Nativo en Chrome/Edge desktop)
  if (typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Imagen PNG del Boleto VIP',
            accept: { 'image/png': ['.png'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Cancelado por el usuario
    }
  }

  // Método 2: Descarga por URL de Objeto Blob (mismo origen, nunca data: URI que Chrome bloquea)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();

  // Conservar la URL en memoria durante 2 minutos completos para que el gestor de descargas de Chrome no falle
  setTimeout(() => {
    try {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, 120000);
}

export async function generateTicketImage(
  movie: StudioMovie,
  showtime: string,
  dateName: string
): Promise<Blob | null> {
  const width = 800;
  const height = 1040;

  async function render(includePosterImage: boolean): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fondo principal de cine oscuro VIP
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#0b0f19');
    bgGrad.addColorStop(1, '#160c18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Borde dorado VIP
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Borde interior sutil
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // Cabecera Cinepelis VIP
    ctx.fillStyle = '#f3c64c';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ CINEPELIS VIP · NUESTRO RINCÓN ★', width / 2, 68);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('BOLETO EXCLUSIVO DE CINE EN PAREJA', width / 2, 92);

    // Línea separadora dorada
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.beginPath();
    ctx.moveTo(40, 110);
    ctx.lineTo(width - 40, 110);
    ctx.stroke();

    // Sección póster e información
    const posterX = 48;
    const posterY = 135;
    const posterW = 210;
    const posterH = 310;

    // Contenedor de póster
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(posterX, posterY, posterW, posterH);

    let drewPoster = false;
    if (includePosterImage && movie.poster) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const imgLoaded = await new Promise<boolean>(resolve => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = movie.poster!;
        });
        if (imgLoaded) {
          ctx.drawImage(img, posterX, posterY, posterW, posterH);
          drewPoster = true;
        }
      } catch {
        drewPoster = false;
      }
    }

    if (!drewPoster) {
      ctx.fillStyle = '#f3c64c';
      ctx.font = '48px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🎬', posterX + posterW / 2, posterY + posterH / 2);
    }

    // Borde dorado para el póster
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(posterX, posterY, posterW, posterH);

    // Lado derecho: información
    const infoX = 285;
    ctx.textAlign = 'left';

    // Badges
    ctx.fillStyle = '#f3c64c';
    ctx.fillRect(infoX, 140, 115, 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText(movie.format || '2D VIP ATMOS', infoX + 10, 158);

    ctx.fillStyle = '#334155';
    ctx.fillRect(infoX + 125, 140, 50, 26);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(movie.classification || 'B', infoX + 138, 158);

    if (movie.year) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(infoX + 185, 140, 55, 26);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(String(movie.year), infoX + 194, 158);
    }

    // Título de la película
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Georgia, serif';
    const words = movie.title.split(' ');
    let line = '';
    let titleY = 205;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 460 && n > 0) {
        ctx.fillText(line, infoX, titleY);
        line = words[n] + ' ';
        titleY += 32;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, infoX, titleY);

    // Tabla de detalles clave
    const fields = [
      { label: 'COMPLEJO', val: 'Cinepelis Nuestro Rincón' },
      { label: 'FUNCIÓN', val: `${showtime} · ${dateName}`, gold: true },
      { label: 'ASIENTOS', val: 'Sala 1 VIP · Fila C (7 y 8 - Juntitos ♡)', gold: true },
      { label: 'ADMIT', val: '2 Personas (Ale & Val)' },
      { label: 'PRECIO', val: 'Infinito amor ♡', gold: true },
    ];

    let fieldY = Math.max(titleY + 38, 255);
    fields.forEach(f => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(f.label, infoX, fieldY);

      ctx.fillStyle = f.gold ? '#f3c64c' : '#ffffff';
      ctx.font = f.gold ? 'bold 15px system-ui' : '14px system-ui';
      ctx.fillText(f.val, infoX, fieldY + 18);

      fieldY += 34;
    });

    // Dedicatoria / Sinopsis
    if (movie.note) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('DEDICATORIA / SINOPSIS:', 48, 515);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'italic 14px Georgia, serif';
      const noteWords = movie.note.split(' ');
      let noteLine = '“';
      let noteY = 538;
      for (let i = 0; i < noteWords.length; i++) {
        const test = noteLine + noteWords[i] + ' ';
        if (ctx.measureText(test).width > 700 && i > 0) {
          ctx.fillText(noteLine, 48, noteY);
          noteLine = noteWords[i] + ' ';
          noteY += 22;
          if (noteY > 640) {
            noteLine += '…”';
            break;
          }
        } else {
          noteLine = test;
        }
      }
      if (!noteLine.endsWith('…”')) noteLine += '”';
      ctx.fillText(noteLine, 48, noteY);
    }

    // Perforación / línea de corte del boleto
    const cutY = 690;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(35, cutY);
    ctx.lineTo(width - 35, cutY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Muescas de corte en los lados
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(16, cutY, 18, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(width - 16, cutY, 18, Math.PI / 2, -Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    // Pie del boleto: Código de barras
    const barcodeY = 740;
    const barcodeX = 60;
    const barcodeW = width - 120;
    ctx.fillStyle = '#ffffff';
    let curX = barcodeX;
    const barPattern = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 3, 2, 1];
    for (let i = 0; i < 48; i++) {
      const w = barPattern[i % barPattern.length] * 2.5;
      if (i % 2 === 0) {
        ctx.fillRect(curX, barcodeY, w, 50);
      }
      curX += w + 2;
      if (curX > barcodeX + barcodeW) break;
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'monospace 13px system-ui';
    ctx.textAlign = 'center';
    const serial = `VAL-ALE-VIP-${movie.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8) || '20261017'}`;
    ctx.fillText(serial, width / 2, barcodeY + 75);

    // Sello romántico de confirmación
    ctx.fillStyle = '#f3c64c';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('❤ CITA DE CINE CONFIRMADA · VALERIA & ALEJANDRO ❤', width / 2, 860);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.fillText('¡Presenta este boleto para canjear besos, palomitas y abrazos infinitos!', width / 2, 888);

    try {
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    } catch {
      return null;
    }
  }

  const initial = await render(true);
  if (initial) return initial;
  return await render(false);
}

const DEFAULT_MOVIES: StudioMovie[] = [
  {
    id: 'movie-1',
    title: 'La La Land: Una historia de amor',
    year: 2016,
    poster: 'https://m.media-amazon.com/images/M/MV5BMDllYjliOTUtMDJjZC00ODIzLWJmNGMtOWI2NzQxMjA2NzdlXkEyXkFqcGc@._V1_.jpg',
    stars: 'Ryan Gosling, Emma Stone',
    note: 'Nuestra película de jazz, atardeceres y canciones que nos sabemos de memoria. ¡Para verla abrazaditos y cantando cada tema!',
    author: 'Ale',
    watched: true,
    watchedDate: '2026-02-14',
    createdAt: '2026-01-14T12:00:00Z',
    duration: '128 min',
    classification: 'B',
    format: '2D VIP ATMOS',
  },
  {
    id: 'movie-2',
    title: 'Cuestión de tiempo (About Time)',
    year: 2013,
    poster: 'https://m.media-amazon.com/images/M/MV5BMTA1ODUzMDA3NzFeQTJeQWpwZ15BbWU3MDgxMTYxNTk@._V1_.jpg',
    stars: 'Domhnall Gleeson, Rachel McAdams',
    note: 'Para recordar que el mayor tesoro es vivir cada día ordinario contigo como si fuera el más especial de nuestra vida.',
    author: 'Val',
    watched: false,
    createdAt: '2026-01-15T14:30:00Z',
    duration: '123 min',
    classification: 'B',
    format: '2D VIP',
  },
  {
    id: 'movie-3',
    title: 'Your Name (Kimi no Na wa)',
    year: 2016,
    poster: 'https://m.media-amazon.com/images/M/MV5BMjI1ODZkYTgtYTY3Yy00ZTJkLWFkOTgtZDUyYWM4MzQwNjk0XkEyXkFqcGc@._V1_.jpg',
    stars: 'Ryunosuke Kamiki, Mone Kamishiraishi',
    note: 'El hilo rojo del destino. Una tarde de sushi, mantita suave y lagrimitas de emoción.',
    author: 'Ale',
    watched: false,
    createdAt: '2026-01-16T18:00:00Z',
    duration: '107 min',
    classification: 'A',
    format: 'MACRO XE',
  },
  {
    id: 'movie-4',
    title: 'Orgullo y Prejuicio',
    year: 2005,
    poster: 'https://m.media-amazon.com/images/M/MV5BMTA4NDc4Mjg5MzheQTJeQWpwZ15BbWU3MDQ3NTIxMTg@._V1_.jpg',
    stars: 'Keira Knightley, Matthew Macfadyen',
    note: '“Me has hechizado en cuerpo y alma y te amo...” Una tarde lluviosa de domingo con té calentito.',
    author: 'Val',
    watched: true,
    watchedDate: '2026-03-01',
    createdAt: '2026-01-18T10:00:00Z',
    duration: '127 min',
    classification: 'A',
    format: 'SALA DE ARTE',
  },
  {
    id: 'movie-5',
    title: 'El increíble castillo vagabundo',
    year: 2004,
    poster: 'https://m.media-amazon.com/images/M/MV5BMTY1OTg0MjE3MV5BMl5BanBnXkFtZTcwNTUxMTkyMQ@@._V1_.jpg',
    stars: 'Chieko Baishô, Takuya Kimura',
    note: 'La magia de Ghibli, Howl y Sophie. Ideal para desconectar del mundo y soñar despiertos.',
    author: 'Ale',
    watched: false,
    createdAt: '2026-01-20T16:20:00Z',
    duration: '119 min',
    classification: 'A',
    format: '2D VIP',
  },
  {
    id: 'movie-6',
    title: 'Coco',
    year: 2017,
    poster: 'https://m.media-amazon.com/images/M/MV5BYjQ5NjM0Y2YtNjZkNC00ZDhkLWJjMWItN2UxNDNkNmFjODU0XkEyXkFqcGc@._V1_.jpg',
    stars: 'Anthony Gonzalez, Gael García Bernal',
    note: '“Recuérdame, hoy me tengo que ir mi amor...” Para llorar de amor y abrazarnos muy fuerte.',
    author: 'Val',
    watched: false,
    createdAt: '2026-01-22T19:00:00Z',
    duration: '105 min',
    classification: 'A',
    format: '3D VIP',
  },
];

const SPANISH_TITLE_ALIASES: Record<string, string> = {
  // Animación / Disney / Pixar / Ghibli
  'intensamente': 'inside out',
  'intensa mente': 'inside out',
  'intensamente 2': 'inside out 2',
  'intensa mente 2': 'inside out 2',
  'elementos': 'elemental',
  'valiente': 'brave',
  'enredados': 'tangled',
  'coco': 'coco',
  'la bella y la bestia': 'beauty and the beast',
  'el rey leon': 'the lion king',
  'la sirenita': 'the little mermaid',
  'los increibles': 'the incredibles',
  'los increibles 2': 'incredibles 2',
  'buscando a nemo': 'finding nemo',
  'buscando a dory': 'finding dory',
  'mi villano favorito': 'despicable me',
  'mi villano favorito 2': 'despicable me 2',
  'mi villano favorito 3': 'despicable me 3',
  'mi villano favorito 4': 'despicable me 4',
  'los minions': 'minions',
  'el cadaver de la novia': 'corpse bride',
  'el extrano mundo de jack': 'the nightmare before christmas',
  'el extraño mundo de jack': 'the nightmare before christmas',
  'coraline y la puerta secreta': 'coraline',
  'bichos': 'a bugs life',
  'monstruos sa': 'monsters inc',
  'el libro de la selva': 'the jungle book',
  'como entrenar a tu dragon': 'how to train your dragon',
  'el gato con botas': 'puss in boots',
  'el viaje de chihiro': 'spirited away',
  'el castillo vagabundo': 'howls moving castle',
  'el castillo ambulante': 'howls moving castle',
  'mi vecino totoro': 'my neighbor totoro',
  'la princesa mononoke': 'princess mononoke',
  'el nino y la garza': 'the boy and the heron',
  'el niño y la garza': 'the boy and the heron',
  'el tiempo contigo': 'weathering with you',
  'up una aventura de altura': 'up',
  'wall e': 'wall e',
  'wall-e': 'wall e',

  // Romance y citas en pareja
  'diario de una pasion': 'the notebook',
  'el diario de noah': 'the notebook',
  'cuestion de tiempo': 'about time',
  'yo antes de ti': 'me before you',
  'bajo la misma estrella': 'the fault in our stars',
  'un paseo para recordar': 'a walk to remember',
  'un amor para recordar': 'a walk to remember',
  'votos de amor': 'the vow',
  'cartas a julieta': 'letters to juliet',
  'medianoche en paris': 'midnight in paris',
  'el gran showman': 'the greatest showman',
  'el stand de los besos': 'the kissing booth',
  'el stand de los besos 2': 'the kissing booth 2',
  'el stand de los besos 3': 'the kissing booth 3',
  'a dos metros de ti': 'five feet apart',
  'todos los lugares brillantes': 'all the bright places',
  'la propuesta': 'the proposal',
  'el diario de la princesa': 'the princess diaries',
  'el diario de la princesa 2': 'the princess diaries 2',
  'si decido quedarme': 'if i stay',
  'la teoria del todo': 'the theory of everything',
  'la razon de estar contigo': 'a dogs purpose',
  'eterno resplandor': 'eternal sunshine of the spotless mind',
  'eterno resplandor de una mente sin recuerdos': 'eternal sunshine of the spotless mind',
  '10 cosas que odio de ti': '10 things i hate about you',
  'diez cosas que odio de ti': '10 things i hate about you',
  'siempre el mismo dia': 'one day',
  'posdata te amo': 'p.s. i love you',
  '500 dias con ella': '500 days of summer',
  '500 dias juntos': '500 days of summer',
  'la la land': 'la la land',
  'la forma del agua': 'the shape of water',
  'con todos menos contigo': 'anyone but you',
  'el lado bueno de las cosas': 'silver linings playbook',
  'el diablo viste a la moda': 'the devil wears prada',
  'juego de gemelas': 'the parent trap',
  'amigos con beneficios': 'friends with benefits',

  // Películas épicas, drama y suspenso
  'el señor de los anillos': 'the lord of the rings',
  'el senor de los anillos': 'the lord of the rings',
  'el retorno del rey': 'the return of the king',
  'la comunidad del anillo': 'the fellowship of the ring',
  'las dos torres': 'the two towers',
  'los juegos del hambre': 'the hunger games',
  'en llamas': 'catching fire',
  'sinsajo': 'mockingjay',
  'el origen': 'inception',
  'interestelar': 'interstellar',
  'volver al futuro': 'back to the future',
  'volver al futuro 2': 'back to the future part ii',
  'volver al futuro 3': 'back to the future part iii',
  'el club de la pelea': 'fight club',
  'rapidos y furiosos': 'fast and furious',
  'parque jurasico': 'jurassic park',
  'mundo jurasico': 'jurassic world',
  'mision imposible': 'mission impossible',
  'amigos intocables': 'the intouchables',
  'el caballero de la noche': 'the dark knight',
  'el caballero de la noche asciende': 'the dark knight rises',
  'el conjuro': 'the conjuring',
  'el conjuro 2': 'the conjuring 2',
  'un lugar en silencio': 'a quiet place',
  'un lugar en silencio 2': 'a quiet place part ii',
  'la sociedad de la nieve': 'society of the snow',
  'en busca de la felicidad': 'the pursuit of happyness',
  'el gran gatsby': 'the great gatsby',
  'el lobo de wall street': 'the wolf of wall street',
  'los vengadores': 'the avengers',
  'el padrino': 'the godfather',
  'el silencio de los inocentes': 'the silence of the lambs',
  'el efecto mariposa': 'the butterfly effect',
  'la vida es bella': 'life is beautiful',
  'el club de los poetas muertos': 'dead poets society',
  'la sociedad de los poetas muertos': 'dead poets society',
  'naufrago': 'cast away',
};

const QUICK_INSPIRATION = [
  'La La Land',
  'Cuestión de tiempo',
  'Orgullo y Prejuicio',
  'Your Name',
  'El Castillo Ambulante',
  'Diario de una pasión',
  'Coco',
  'Sing Street',
  '10 cosas que odio de ti',
  '500 días con ella',
];

const DATE_OPTIONS = [
  { id: 'all', dayWeek: 'TODAS', dayNum: 'TODAS' },
  { id: 'today', dayWeek: 'HOY', dayNum: '18 OCT' },
  { id: 'tomorrow', dayWeek: 'DOM', dayNum: '19 OCT' },
  { id: 'next', dayWeek: 'LUN', dayNum: '20 OCT' },
  { id: 'weekend', dayWeek: 'FINDE', dayNum: '24-25' },
  { id: 'date_night', dayWeek: 'CITA', dayNum: 'PRÓXIMA ♡' },
];

export default function MoviesPage({ namespace, session }: { namespace: string; session?: GallerySession | null }) {
  const demo = studioIsDemo(namespace);

  // Inicialización: mantiene las películas que el usuario ha guardado.
  // Si no hay ninguna, empieza limpia ([]) para no imponer películas que el usuario no agregó.
  const getInitialMovies = (): StudioMovie[] => {
    const existing = readLocal<StudioMovie[] | null>(`${namespace}:movies:v1`, null);
    if (existing && Array.isArray(existing)) return existing;
    const demoExisting = readLocal<StudioMovie[] | null>('nh:demo:movies:v1', null);
    if (demoExisting && Array.isArray(demoExisting)) return demoExisting;
    return [];
  };

  const [movies, setMovies] = useLocalState<StudioMovie[]>(`${namespace}:movies:v1`, getInitialMovies());

  // Identificar el usuario conectado con Google (Ale vs Val)
  const currentUserAuthor: StudioAuthor | null = session
    ? (identifyGooglePlayer(session, namespace) === 'valeria' ? 'Val' : 'Ale')
    : null;

  const canDeleteMovie = (movie: StudioMovie): boolean => {
    if (!currentUserAuthor) return true; // Modo demo / invitado
    return movie.author === currentUserAuthor;
  };

  // Filtros de la cartelera
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'watched'>('pending');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDateTab, setSelectedDateTab] = useState('today');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [movieToDelete, setMovieToDelete] = useState<StudioMovie | null>(null);
  const [ticketMovie, setTicketMovie] = useState<StudioMovie | null>(null);
  const [ticketShowtime, setTicketShowtime] = useState<string>('8:30 PM');

  // Reservaciones de funciones de cine para ver juntos
  const getInitialReservations = (): Record<string, MovieReservation> => {
    const existing = readLocal<Record<string, MovieReservation> | null>(`${namespace}:cinepelis-reservations:v1`, null);
    if (existing && Object.keys(existing).length > 0) return existing;
    const demoExisting = readLocal<Record<string, MovieReservation> | null>('nh:demo:cinepelis-reservations:v1', null);
    if (demoExisting && Object.keys(demoExisting).length > 0) return demoExisting;
    return {};
  };

  const [reservations, setReservations] = useLocalState<Record<string, MovieReservation>>(
    `${namespace}:cinepelis-reservations:v1`,
    getInitialReservations()
  );

  const importFileRef = useRef<HTMLInputElement>(null);
  const handleImportCartelera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const imported = Array.isArray(parsed) ? parsed : (parsed.movies || parsed.cartelera || []);
        if (Array.isArray(imported) && imported.length > 0) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOnes = imported.filter((m: StudioMovie) => m && m.title && !existingIds.has(m.id));
            return [...newOnes, ...prev];
          });
          alert(`¡Cartelera importada con éxito! Se añadieron ${imported.length} películas.`);
        } else {
          alert('El archivo no contiene un formato de películas válido.');
        }
      } catch {
        alert('No se pudo leer el archivo de cartelera.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Película seleccionada al azar (para no estar de indecisos)
  const [randomPickedMovie, setRandomPickedMovie] = useState<StudioMovie | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // Formulario de agregar película
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [formSearching, setFormSearching] = useState(false);
  const [formSuggestions, setFormSuggestions] = useState<IMDbSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<IMDbSuggestion | null>(null);

  const [inputTitle, setInputTitle] = useState('');
  const [inputYear, setInputYear] = useState('');
  const [inputPoster, setInputPoster] = useState('');
  const [inputStars, setInputStars] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [inputAuthor, setInputAuthor] = useState<StudioAuthor>(currentUserAuthor ?? 'Ale');
  const [inputWatched, setInputWatched] = useState(false);
  const [inputClassification, setInputClassification] = useState('B');
  const [inputFormat, setInputFormat] = useState('2D VIP');
  const [inputDuration, setInputDuration] = useState('120 min');
  const [formError, setFormError] = useState('');

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Mantener autor sincronizado si cambia la sesión de Google
  useEffect(() => {
    if (currentUserAuthor) {
      setInputAuthor(currentUserAuthor);
    }
  }, [currentUserAuthor]);

  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (randomPickedMovie) setRandomPickedMovie(null);
        if (ticketMovie) setTicketMovie(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticketMovie, randomPickedMovie]);

  // Búsqueda inteligente en IMDb con debounce y traducciones en español
  const handleQueryChange = (query: string) => {
    setFormSearchQuery(query);
    setFormError('');

    if (!selectedSuggestion) {
      setInputTitle(query);
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const clean = query
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ');

    if (!clean) {
      setFormSuggestions([]);
      setFormSearching(false);
      return;
    }

    setFormSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const alias = SPANISH_TITLE_ALIASES[clean];
        const termsToSearch = alias && alias !== clean ? [alias, clean] : [clean];

        const collected: Array<IMDbSuggestion & { isMovie?: boolean }> = [];
        const seenIds = new Set<string>();

        await Promise.all(
          termsToSearch.map(async term => {
            try {
              const firstChar = term.charAt(0) || 'a';
              const encodedTerm = encodeURIComponent(term.replace(/\s+/g, '_'));
              const url = `https://v3.sg.media-imdb.com/suggestion/${encodeURIComponent(firstChar)}/${encodedTerm}.json`;
              const res = await fetch(url);
              if (!res.ok) return;
              const data = (await res.json()) as {
                d?: Array<{
                  id?: string;
                  l?: string;
                  y?: number | string;
                  s?: string;
                  q?: string;
                  qid?: string;
                  i?: { imageUrl?: string };
                }>;
              };

              if (Array.isArray(data?.d)) {
                for (const item of data.d) {
                  if (!item.id || !item.id.startsWith('tt')) continue;
                  if (!item.l) continue;
                  if (seenIds.has(item.id)) continue;
                  seenIds.add(item.id);

                  const highResPoster = item.i?.imageUrl
                    ? item.i.imageUrl.replace(/\._V1_.*\.jpg$/, '._V1_.jpg')
                    : undefined;

                  collected.push({
                    id: item.id,
                    title: item.l,
                    year: item.y,
                    stars: item.s,
                    poster: highResPoster,
                    isMovie: item.qid === 'movie' || item.q === 'feature',
                  });
                }
              }
            } catch {
              // Ignorar fallas de sub-búsquedas individuales
            }
          })
        );

        collected.sort((a, b) => {
          const aClean = a.title.toLowerCase();
          const bClean = b.title.toLowerCase();
          const matchA = aClean === clean || (alias && aClean === alias);
          const matchB = bClean === clean || (alias && bClean === alias);
          if (matchA && !matchB) return -1;
          if (!matchA && matchB) return 1;

          if (a.isMovie && !b.isMovie) return -1;
          if (!a.isMovie && b.isMovie) return 1;

          if (a.poster && !b.poster) return -1;
          if (!a.poster && b.poster) return 1;

          return 0;
        });

        setFormSuggestions(collected.slice(0, 8));
      } catch {
        setFormSuggestions([]);
      } finally {
        setFormSearching(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = (sug: IMDbSuggestion) => {
    setSelectedSuggestion(sug);
    setInputTitle(sug.title);
    setInputYear(sug.year ? String(sug.year) : '');
    setInputPoster(sug.poster || '');
    setInputStars(sug.stars || '');
    setFormSuggestions([]);
  };

  const resetForm = () => {
    setFormSearchQuery('');
    setFormSuggestions([]);
    setSelectedSuggestion(null);
    setInputTitle('');
    setInputYear('');
    setInputPoster('');
    setInputStars('');
    setInputNote('');
    setInputAuthor(currentUserAuthor ?? 'Ale');
    setInputWatched(false);
    setInputClassification('B');
    setInputFormat('2D VIP');
    setInputDuration('120 min');
    setFormError('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleCreateMovie = (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = inputTitle.trim() || formSearchQuery.trim();
    if (!cleanTitle) {
      setFormError('Por favor escribe el título de la película.');
      return;
    }

    const newMovie: StudioMovie = {
      id: `movie-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      year: inputYear.trim() || undefined,
      poster: inputPoster.trim() || undefined,
      stars: inputStars.trim() || undefined,
      note: inputNote.trim(),
      author: inputAuthor,
      watched: inputWatched,
      watchedDate: inputWatched ? new Date().toISOString().slice(0, 10) : undefined,
      createdAt: new Date().toISOString(),
      duration: inputDuration.trim() || '120 min',
      classification: inputClassification || 'B',
      format: inputFormat || '2D VIP',
    };

    setMovies(prev => [newMovie, ...prev]);
    setShowAddModal(false);
    resetForm();
  };

  // Toggle estado de vista/pendiente
  const handleToggleWatched = (id: string) => {
    setMovies(prev =>
      prev.map(movie => {
        if (movie.id !== id) return movie;
        const nextWatched = !movie.watched;
        const updated = {
          ...movie,
          watched: nextWatched,
          watchedDate: nextWatched ? new Date().toISOString().slice(0, 10) : undefined,
        };
        // Si el boleto está abierto para esta película, sincronizarlo en tiempo real
        if (ticketMovie?.id === id) {
          setTicketMovie(updated);
        }
        return updated;
      })
    );
  };

  // Abrir boleto de cine VIP
  const handleOpenTicket = (movie: StudioMovie, showtime: string = '8:30 PM') => {
    setTicketMovie(movie);
    setTicketShowtime(showtime);
  };

  // Escoger película aleatoria para no estar de indecisos
  const handlePickRandomMovie = () => {
    const candidates = movies.filter(m => !m.watched);
    const pool = candidates.length > 0 ? candidates : movies;
    if (pool.length === 0) return;

    setIsShuffling(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * pool.length);
      setRandomPickedMovie(pool[randomIndex]);
      setIsShuffling(false);
    }, 450);
  };

  // Reservar o cancelar función de cine para ver juntos
  const handleReserveShowtime = (movie: StudioMovie, showtime: string, dateName?: string) => {
    const resDate = dateName || activeDateName;
    const newReservation: MovieReservation = {
      movieId: movie.id,
      movieTitle: movie.title,
      poster: movie.poster,
      dateName: resDate,
      showtime,
      reservedAt: new Date().toISOString(),
    };
    setReservations(prev => ({
      ...prev,
      [movie.id]: newReservation,
    }));
  };

  const handleCancelReservation = (movieId: string) => {
    setReservations(prev => {
      const next = { ...prev };
      delete next[movieId];
      return next;
    });
  };

  const [customTimeText, setCustomTimeText] = useState('');
  const [isGeneratingTicketImage, setIsGeneratingTicketImage] = useState(false);
  const [ticketActionNotice, setTicketActionNotice] = useState('');

  const handleShareTicketImage = async () => {
    if (!ticketMovie) return;
    setIsGeneratingTicketImage(true);
    setTicketActionNotice('');
    try {
      const blob = await generateTicketImage(ticketMovie, ticketShowtime, activeDateName);
      if (!blob) throw new Error('No se pudo generar la imagen');

      const fileName = `boleto-cinepelis-${ticketMovie.title.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Boleto VIP: ${ticketMovie.title}`,
          text: `¡Tenemos cita de cine! Boleto VIP para ver ${ticketMovie.title} a las ${ticketShowtime} en Cinepelis ♡`,
        });
        setTicketActionNotice('¡Boleto compartido con éxito! ♡');
      } else {
        await downloadImageFile(blob, fileName);
        try {
          await navigator.clipboard.writeText(`¡Tenemos cita de cine! Boleto VIP para ver ${ticketMovie.title} a las ${ticketShowtime} en Cinepelis ♡`);
        } catch {}
        setTicketActionNotice('Boleto descargado como imagen y mensaje copiado al portapapeles para enviar ♡');
      }
    } catch {
      setTicketActionNotice('No se pudo compartir automáticamente. Descargando imagen del boleto…');
      handleDownloadTicketImage();
    } finally {
      setIsGeneratingTicketImage(false);
    }
  };

  const handleDownloadTicketImage = async () => {
    if (!ticketMovie) return;
    setIsGeneratingTicketImage(true);
    setTicketActionNotice('');
    try {
      const blob = await generateTicketImage(ticketMovie, ticketShowtime, activeDateName);
      if (!blob) throw new Error('No se pudo generar la imagen');
      const fileName = `boleto-cinepelis-${ticketMovie.title.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      await downloadImageFile(blob, fileName);
      setTicketActionNotice('¡Imagen del boleto VIP guardada con éxito! ♡');
    } catch {
      setTicketActionNotice('Error al guardar la imagen del boleto.');
    } finally {
      setIsGeneratingTicketImage(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteConfirm = () => {
    if (!movieToDelete) return;
    setMovies(prev => prev.filter(m => m.id !== movieToDelete.id));
    if (ticketMovie?.id === movieToDelete.id) {
      setTicketMovie(null);
    }
    setMovieToDelete(null);
  };

  // Películas filtradas
  const pendingCount = movies.filter(m => !m.watched).length;
  const watchedCount = movies.filter(m => m.watched).length;

  const filteredMovies = movies.filter(movie => {
    if (filterTab === 'pending' && movie.watched) return false;
    if (filterTab === 'watched' && !movie.watched) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = movie.title.toLowerCase().includes(q);
      const matchNote = movie.note.toLowerCase().includes(q);
      const matchStars = movie.stars?.toLowerCase().includes(q);
      return matchTitle || matchNote || matchStars;
    }
    return true;
  });

  const activeDateOption = DATE_OPTIONS.find(d => d.id === selectedDateTab) ?? DATE_OPTIONS[1];
  const activeDateName = activeDateOption.id === 'all' ? 'Función Estelar' : `${activeDateOption.dayWeek} ${activeDateOption.dayNum}`;

  return (
    <div className="cartelera-page cinepolis-theme">
      {/* Marquesina Header Estilo Cinepelis */}
      <header className="cinepolis-marquee-header">
        <div className="cinepolis-top-brand-strip">
          <div className="cinepolis-logo-group">
            <span className="cinepolis-stars-glow">★ ★ ★ ★ ★</span>
            <div className="cinepolis-brand-badge">
              <span className="cinepolis-brand-wordmark">CINEPELIS</span>
            </div>
          </div>

          <div className="cinepolis-cinema-selector" title="Cine seleccionado para nuestras citas">
            <MapPin size={14} className="selector-icon" />
            <span>Complejo: <strong>Cinepelis Nuestro Rincón · Sala 1</strong></span>
          </div>
        </div>

        <div className="cinepolis-hero-titles">
          <h1 className="cinepolis-title">
            Nuestra <em>Cartelera</em> de Pelis
          </h1>
          <p className="cinepolis-subtitle">
            Películas que tenemos pendientes por ver juntos. ♡
          </p>
        </div>

        <div className="cinepolis-header-actions">
          <button
            type="button"
            className="cinepolis-cta-random"
            onClick={handlePickRandomMovie}
            disabled={isShuffling || movies.length === 0}
            title="Elegir una película al azar para no estar de indecisos"
          >
            <Shuffle size={17} className={isShuffling ? 'is-shuffling-spin' : ''} />
            <span>Escoger película aleatoria</span>
          </button>

          <button className="cinepolis-cta-add" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Agregar película</span>
          </button>

          <button
            className="cinepolis-cta-export"
            onClick={() => downloadJson('cartelera-cinepelis-ale-val.json', movies)}
            title="Descargar lista de películas en JSON"
          >
            <Download size={15} />
            <span>Descargar cartelera</span>
          </button>

          <input
            type="file"
            ref={importFileRef}
            accept="application/json"
            onChange={handleImportCartelera}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="cinepolis-cta-export"
            onClick={() => importFileRef.current?.click()}
            title="Importar lista de películas en JSON"
          >
            <Upload size={15} />
            <span>Importar cartelera</span>
          </button>
        </div>
      </header>

      {/* Banner de Citas de Cine Reservadas Juntos */}
      {Object.values(reservations).length > 0 && (
        <section className="cinepelis-reservations-banner" aria-label="Citas de cine reservadas">
          <div className="reservations-banner-header">
            <div className="reservations-banner-title">
              <Ticket size={18} className="gold-icon" />
              <h3>Nuestras Citas de Cine Reservadas ♡</h3>
            </div>
            <span className="reservations-banner-badge">
              {Object.keys(reservations).length} {Object.keys(reservations).length === 1 ? 'función reservada' : 'funciones reservadas'}
            </span>
          </div>

          <div className="reservations-grid">
            {Object.values(reservations).map(res => {
              const movieObj = movies.find(m => m.id === res.movieId);
              return (
                <div key={res.movieId} className="reservation-card">
                  {res.poster ? (
                    <img src={res.poster} alt={res.movieTitle} className="reservation-poster" />
                  ) : (
                    <div className="reservation-poster-placeholder">
                      <Film size={20} />
                    </div>
                  )}

                  <div className="reservation-info">
                    <h4 className="reservation-movie-title">{res.movieTitle}</h4>
                    <div className="reservation-meta">
                      <span className="reservation-pill date-pill">
                        <Calendar size={12} />
                        {res.dateName}
                      </span>
                      <span className="reservation-pill time-pill">
                        <Clock size={12} />
                        {res.showtime}
                      </span>
                      <span className="reservation-pill seats-pill">Sala 1 · Fila C (7 y 8)</span>
                    </div>
                  </div>

                  <div className="reservation-actions">
                    <button
                      type="button"
                      className="reservation-view-ticket-btn"
                      onClick={() => {
                        if (movieObj) {
                          handleOpenTicket(movieObj, res.showtime);
                        }
                      }}
                      title="Ver boleto VIP de esta cita"
                    >
                      <Ticket size={14} />
                      <span>Ver boleto</span>
                    </button>

                    <button
                      type="button"
                      className="reservation-cancel-btn"
                      onClick={() => handleCancelReservation(res.movieId)}
                      title="Cancelar reservación"
                      aria-label={`Cancelar cita para ${res.movieTitle}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Selector de Fechas de Función estilo Cinépolis */}
      <div className="cinepolis-date-ribbon">
        <div className="date-ribbon-label">
          <Calendar size={15} />
          <span>Fechas de Función:</span>
        </div>
        <div className="date-ribbon-items">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`date-ribbon-btn ${selectedDateTab === opt.id ? 'is-active' : ''}`}
              onClick={() => setSelectedDateTab(opt.id)}
            >
              <span className="date-day-week">{opt.dayWeek}</span>
              <strong className="date-day-num">{opt.dayNum}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Barra de estadísticas y conteos estilo Cinépolis */}
      <div className="cartelera-stats-bar cinepolis-stats">
        <div className="cartelera-stat-item" onClick={() => setFilterTab('pending')} role="button" tabIndex={0}>
          <div className="cartelera-stat-icon pending-icon">
            <Popcorn size={18} />
          </div>
          <div className="cartelera-stat-info">
            <strong>{pendingCount} en cartelera</strong>
            <span>listas para nuestra próxima cita</span>
          </div>
        </div>

        <div className="cartelera-stat-item" onClick={() => setFilterTab('watched')} role="button" tabIndex={0}>
          <div className="cartelera-stat-icon watched-icon">
            <Check size={18} />
          </div>
          <div className="cartelera-stat-info">
            <strong>{watchedCount} ya estrenadas</strong>
            <span>noches de cine que ya vivimos</span>
          </div>
        </div>

        <div className="cartelera-stat-item" onClick={() => setFilterTab('all')} role="button" tabIndex={0}>
          <div className="cartelera-stat-icon total-icon">
            <Clapperboard size={18} />
          </div>
          <div className="cartelera-stat-info">
            <strong>{movies.length} en cartelera total</strong>
            <span>en nuestra sala VIP privada</span>
          </div>
        </div>
      </div>

      {/* Filtros de Categoría y Buscador */}
      <div className="cartelera-filter-controls cinepolis-filters">
        <div className="cartelera-tabs" role="tablist" aria-label="Filtrar películas">
          <button
            className={`cartelera-tab tab-pending ${filterTab === 'pending' ? 'is-active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            <Popcorn size={15} />
            <span>Por ver ({pendingCount})</span>
          </button>
          <button
            className={`cartelera-tab tab-watched ${filterTab === 'watched' ? 'is-active' : ''}`}
            onClick={() => setFilterTab('watched')}
          >
            <Check size={15} />
            <span>Ya las vimos ({watchedCount})</span>
          </button>
          <button
            className={`cartelera-tab ${filterTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            <Film size={15} />
            <span>Todas ({movies.length})</span>
          </button>
        </div>

        <div className="cartelera-search-box cinepolis-search">
          <Search size={16} className="cartelera-search-icon" />
          <input
            type="search"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Buscar película, actor o nota de amor..."
            className="cartelera-search-input"
          />
          {searchFilter && (
            <button className="cartelera-search-clear" onClick={() => setSearchFilter('')} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Cuadrícula de películas estilo cartelera de Cinépolis */}
      {filteredMovies.length === 0 ? (
        <div className="cartelera-empty-state cinepolis-empty">
          <div className="cartelera-empty-icon">
            <Clapperboard size={50} strokeWidth={1.5} />
          </div>
          <h3>
            {filterTab === 'pending'
              ? '¡No hay películas pendientes por ver en cartelera!'
              : filterTab === 'watched'
              ? 'Aún no han marcado películas como vistas en su sala.'
              : 'No se encontraron títulos con esa búsqueda.'}
          </h3>
          <p>
            {filterTab === 'pending'
              ? 'Pueden programar una nueva película para su próxima cita de mantita y palomitas.'
              : 'Agrega una película a la cartelera para disfrutar de su siguiente función privada.'}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
            <button className="cinepolis-cta-add" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Agregar película a cartelera</span>
            </button>
            {movies.length === 0 && (
              <button
                type="button"
                className="cinepolis-cta-export"
                onClick={() => importFileRef.current?.click()}
                title="Importar lista de películas desde tu archivo descargado"
              >
                <Upload size={16} />
                <span>Importar mi cartelera</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="cartelera-grid cinepolis-grid">
          {filteredMovies.map(movie => {
            const canDelete = canDeleteMovie(movie);
            const clasif = movie.classification || (movie.title.includes('Coco') || movie.title.includes('Ghibli') ? 'A' : 'B');
            const format = movie.format || '2D VIP';
            const duration = movie.duration || (movie.year ? `${movie.year}` : '120 min');

            return (
              <article key={movie.id} className={`cinepolis-card ${movie.watched ? 'is-watched' : 'is-pending'}`}>
                {/* Poster estilo Cartelera de Cinépolis */}
                <div
                  className="cinepolis-poster-container"
                  onClick={() => handleOpenTicket(movie, '8:30 PM')}
                  role="button"
                  tabIndex={0}
                  title="Haz clic para ver el boleto de cine VIP"
                >
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={`Póster oficial de ${movie.title}`}
                      className="cinepolis-poster-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="cinepolis-poster-placeholder">
                      <Film size={44} />
                      <span>{movie.title}</span>
                    </div>
                  )}

                  {/* Badges superiores sobre el póster: Clasificación y Formato */}
                  <div className="cinepolis-badge-top-left">
                    <span className={`cinepolis-clasif-pill clasif-${clasif.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                      {clasif}
                    </span>
                    <span className="cinepolis-format-pill">{format}</span>
                  </div>

                  {/* Estado en cartelera / ya vista */}
                  <div className="cinepolis-badge-top-right">
                    <span className={`cinepolis-status-tag ${movie.watched ? 'tag-watched' : 'tag-pending'}`}>
                      {movie.watched ? (
                        <>
                          <Check size={11} strokeWidth={2.5} />
                          <span>VISTA ♡</span>
                        </>
                      ) : (
                        <>
                          <Popcorn size={11} />
                          <span>EN CARTELERA</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Overlay interactivo al pasar el cursor */}
                  <div className="cinepolis-poster-hover-hint">
                    <Ticket size={24} />
                    <span>Ver Boleto VIP</span>
                  </div>
                </div>

                {/* Contenido de la ficha cinematográfica */}
                <div className="cinepolis-card-content">
                  {/* Fila de metadatos (año, duración, idioma) */}
                  <div className="cinepolis-meta-row">
                    {movie.year && <span className="cinepolis-year">{movie.year}</span>}
                    <span className="cinepolis-dot">•</span>
                    <span className="cinepolis-duration">{duration}</span>
                    <span className="cinepolis-dot">•</span>
                    <span className="cinepolis-lang">SUB ESP</span>
                  </div>

                  {/* Título de la película */}
                  <h3
                    className="cinepolis-movie-title"
                    onClick={() => handleOpenTicket(movie, '8:30 PM')}
                    role="button"
                    tabIndex={0}
                  >
                    {movie.title}
                  </h3>

                  {/* Actores / Reparto */}
                  {movie.stars && (
                    <p className="cinepolis-actors">
                      <Star size={12} className="cinepolis-star-icon" fill="currentColor" />
                      <span>{movie.stars}</span>
                    </p>
                  )}

                  {/* Sinopsis de nuestra cita (nota personal) */}
                  {movie.note && (
                    <div className="cinepolis-synopsis-box">
                      <span className="cinepolis-synopsis-label">SINOPSIS DE NUESTRA CITA:</span>
                      <p className="cinepolis-synopsis-text">“{movie.note}”</p>
                    </div>
                  )}

                  {/* Programador / Sugerencia */}
                  <div className="cinepolis-programmer-row">
                    <Sparkles size={12} className="cinepolis-sparkle" />
                    <span>
                      Sugerencia de <strong>{movie.author}</strong>
                    </span>
                  </div>

                  {/* SECCIÓN DE HORARIOS ESTILO CINEPELIS */}
                  <div className="cinepolis-showtimes-section">
                    <div className="cinepolis-showtimes-header">
                      <Clock size={12} />
                      <span>FUNCIONES SALA 1 ({activeDateName}):</span>
                    </div>

                    <div className="cinepolis-showtimes-grid">
                      {['4:00 PM', '5:30 PM', '6:45 PM', '8:00 PM', '9:15 PM', '10:30 PM'].map(time => {
                        const isThisTimeReserved = reservations[movie.id]?.showtime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            className={`cinepolis-showtime-btn ${isThisTimeReserved ? 'is-reserved' : ''}`}
                            onClick={() => handleOpenTicket(movie, time)}
                            title={
                              isThisTimeReserved
                                ? `Función reservada para las ${time} ♡`
                                : `Ver boleto VIP o reservar para las ${time}`
                            }
                          >
                            <span className="showtime-format">{format}</span>
                            <span className="showtime-hour">
                              {time}
                              {isThisTimeReserved && ' ✓'}
                            </span>
                          </button>
                        );
                      })}
                      {reservations[movie.id]?.showtime && !['4:00 PM', '5:30 PM', '6:45 PM', '8:00 PM', '9:15 PM', '10:30 PM'].includes(reservations[movie.id].showtime) && (
                        <button
                          type="button"
                          className="cinepolis-showtime-btn is-reserved"
                          onClick={() => handleOpenTicket(movie, reservations[movie.id].showtime)}
                          title={`Tu horario personalizado reservado: ${reservations[movie.id].showtime}`}
                        >
                          <span className="showtime-format">{format}</span>
                          <span className="showtime-hour">{reservations[movie.id].showtime} ✓</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="cinepolis-showtime-btn more-times-btn"
                        onClick={() => handleOpenTicket(movie, reservations[movie.id]?.showtime || '8:30 PM')}
                        title="Ver más horarios o personalizar hora de la función"
                      >
                        <span className="showtime-format">PERSONALIZAR</span>
                        <span className="showtime-hour">+ Más horas</span>
                      </button>
                    </div>
                  </div>

                  {/* Insignia de reservación activa en la tarjeta */}
                  {reservations[movie.id] && (
                    <div className="cinepolis-card-reservation-badge">
                      <Ticket size={12} />
                      <span>
                        Cita reservada: <strong>{reservations[movie.id].showtime} ({reservations[movie.id].dateName})</strong>
                      </span>
                    </div>
                  )}

                  {/* Acciones principales del pie de tarjeta */}
                  <div className="cinepolis-card-actions">
                    <button
                      type="button"
                      className={`cinepolis-btn-ticket ${reservations[movie.id] ? 'has-reservation' : ''}`}
                      onClick={() => handleOpenTicket(movie, reservations[movie.id]?.showtime || '8:30 PM')}
                    >
                      <Ticket size={14} />
                      <span>{reservations[movie.id] ? 'Ver Reservación' : 'Boleto VIP'}</span>
                    </button>

                    <button
                      type="button"
                      className={`cinepolis-btn-watched ${movie.watched ? 'is-watched' : 'is-pending'}`}
                      onClick={() => handleToggleWatched(movie.id)}
                      title={movie.watched ? 'Cambiar a pendiente de ver' : 'Marcar como vista'}
                    >
                      {movie.watched ? (
                        <>
                          <Check size={14} />
                          <span>Vista</span>
                        </>
                      ) : (
                        <>
                          <Popcorn size={14} />
                          <span>Marcar vista</span>
                        </>
                      )}
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        className="cinepolis-btn-delete"
                        onClick={() => setMovieToDelete(movie)}
                        title="Eliminar de la cartelera"
                        aria-label={`Eliminar ${movie.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL: BOLETO DE CINE CINEPELIS INTERACTIVO */}
      {ticketMovie && (
        <div className="cinepolis-ticket-overlay" onClick={() => setTicketMovie(null)}>
          <div className="cinepolis-ticket-card" onClick={e => e.stopPropagation()}>
            <button className="cinepolis-ticket-close" onClick={() => setTicketMovie(null)} aria-label="Cerrar boleto">
              <X size={20} />
            </button>

            {/* Cabecera del Boleto */}
            <div className="cinepolis-ticket-header">
              <div className="cinepolis-ticket-brand">
                <span className="cinepolis-ticket-stars">★ ★ ★ ★ ★</span>
                <strong>CINEPELIS</strong>
                <span>PASE DOBLE DE CINE · SALA ALE &amp; VAL</span>
              </div>
              <span className="cinepolis-ticket-room-badge">SALA 1 VIP</span>
            </div>

            {/* Cuerpo del Boleto */}
            <div className="cinepolis-ticket-body">
              {ticketMovie.poster && (
                <div className="cinepolis-ticket-poster-wrap">
                  <img src={ticketMovie.poster} alt={ticketMovie.title} className="cinepolis-ticket-poster" />
                </div>
              )}

              <div className="cinepolis-ticket-details">
                <h2 className="cinepolis-ticket-title">{ticketMovie.title}</h2>
                <div className="cinepolis-ticket-badges-row">
                  <span className="cinepolis-ticket-format">{ticketMovie.format || '2D VIP ATMOS'}</span>
                  <span className="cinepolis-ticket-clasif">{ticketMovie.classification || 'B'}</span>
                  {ticketMovie.year && <span className="cinepolis-ticket-year">{ticketMovie.year}</span>}
                </div>

                <div className="cinepolis-ticket-grid">
                  <div className="ticket-field">
                    <span className="ticket-label">COMPLEJO</span>
                    <strong className="ticket-value">Cinepelis Nuestro Rincón</strong>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-label">FUNCIÓN ACTUAL</span>
                    <strong className="ticket-value highlight-gold">
                      {ticketShowtime} · {activeDateName}
                    </strong>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-label">ASIENTOS</span>
                    <strong className="ticket-value highlight-gold">Fila C · Asientos 7 y 8 (Juntitos ♡)</strong>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-label">ADMIT</span>
                    <strong className="ticket-value">2 Personas (Ale &amp; Val)</strong>
                  </div>
                  <div className="ticket-field">
                    <span className="ticket-label">PRECIO</span>
                    <strong className="ticket-value highlight-gold">Infinito amor ♡</strong>
                  </div>
                </div>

                {/* Selector de horario dentro del boleto */}
                <div className="ticket-showtime-picker-wrap">
                  <span className="ticket-label">CAMBIAR / ELEGIR HORARIO DE FUNCIÓN:</span>
                  <div className="ticket-showtime-buttons">
                    {SHOWTIME_PRESETS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={`ticket-time-btn ${ticketShowtime === time ? 'is-active' : ''}`}
                        onClick={() => setTicketShowtime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  {/* Selector interactivo para personalizar cualquier hora */}
                  <div className="ticket-custom-time-row">
                    <Clock size={13} style={{ color: '#ffb800', flexShrink: 0 }} />
                    <input
                      type="text"
                      className="ticket-custom-time-input"
                      placeholder="Escribir otra hora (ej. 7:00 PM, 9:00 PM…)"
                      value={customTimeText}
                      onChange={e => setCustomTimeText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customTimeText.trim()) {
                          e.preventDefault();
                          setTicketShowtime(customTimeText.trim());
                          setCustomTimeText('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ticket-custom-time-btn"
                      disabled={!customTimeText.trim()}
                      onClick={() => {
                        if (customTimeText.trim()) {
                          setTicketShowtime(customTimeText.trim());
                          setCustomTimeText('');
                        }
                      }}
                    >
                      Fijar hora
                    </button>
                  </div>
                </div>

                {/* Caja de Reservación de Función para verla juntos */}
                <div className="cinepolis-ticket-booking-box">
                  {reservations[ticketMovie.id] ? (
                    <div className="booking-status confirmed">
                      <div className="booking-status-header">
                        <Check size={16} />
                        <strong>¡Cita de cine reservada con éxito!</strong>
                      </div>
                      <p>
                        Reservaron para ver <strong>{ticketMovie.title}</strong> el{' '}
                        <strong>{reservations[ticketMovie.id].dateName}</strong> a las{' '}
                        <span className="highlight-gold">{reservations[ticketMovie.id].showtime}</span> en Sala 1 VIP.
                      </p>
                      <div className="booking-status-actions">
                        {reservations[ticketMovie.id].showtime !== ticketShowtime && (
                          <button
                            type="button"
                            className="booking-btn-change"
                            onClick={() => handleReserveShowtime(ticketMovie, ticketShowtime, activeDateName)}
                          >
                            Actualizar horario a las {ticketShowtime}
                          </button>
                        )}
                        <button
                          type="button"
                          className="booking-btn-cancel"
                          onClick={() => handleCancelReservation(ticketMovie.id)}
                        >
                          Cancelar reservación
                        </button>
                      </div>

                      {/* Compartir o descargar imagen del boleto completo */}
                      <div className="ticket-share-section">
                        <button
                          type="button"
                          className="ticket-share-btn primary"
                          onClick={handleShareTicketImage}
                          disabled={isGeneratingTicketImage}
                          title="Enviar o compartir la imagen completa del boleto"
                        >
                          {isGeneratingTicketImage ? (
                            <><Loader2 size={15} className="spinner" /> Generando imagen del boleto…</>
                          ) : (
                            <><Share2 size={15} /> 📲 Enviar / Compartir imagen del boleto</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="ticket-share-btn secondary"
                          onClick={handleDownloadTicketImage}
                          disabled={isGeneratingTicketImage}
                          title="Guardar la imagen del boleto en tu celular o PC"
                        >
                          <Download size={14} /> Guardar imagen del boleto
                        </button>
                        <button
                          type="button"
                          className="ticket-share-btn secondary"
                          onClick={async () => {
                            if (!ticketMovie) return;
                            const blob = await generateTicketImage(ticketMovie, ticketShowtime, activeDateName);
                            if (!blob) return;
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            setTimeout(() => URL.revokeObjectURL(url), 120000);
                          }}
                          disabled={isGeneratingTicketImage}
                          title="Abrir imagen en pestaña nueva para verla en pantalla completa o guardarla"
                        >
                          <Eye size={14} /> Abrir imagen completa
                        </button>
                      </div>

                      {ticketActionNotice && (
                        <p className="ticket-share-notice" role="status">
                          <Check size={13} /> {ticketActionNotice}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="booking-status prompt">
                      <p>
                        ¿Quieren ver esta película juntos a las <strong>{ticketShowtime}</strong>?
                      </p>
                      <button
                        type="button"
                        className="booking-btn-reserve"
                        onClick={() => handleReserveShowtime(ticketMovie, ticketShowtime, activeDateName)}
                      >
                        <Ticket size={16} />
                        <span>Reservar boleto juntos a las {ticketShowtime} ({activeDateName}) ♡</span>
                      </button>
                    </div>
                  )}
                </div>

                {ticketMovie.note && (
                  <div className="cinepolis-ticket-note">
                    <span className="ticket-label">SINOPSIS / DEDICATORIA:</span>
                    <p>“{ticketMovie.note}”</p>
                  </div>
                )}
              </div>
            </div>

            {/* Perforación / Separador de corte de boleto de cine */}
            <div className="cinepolis-ticket-perforations">
              <span className="notch notch-left"></span>
              <span className="dashed-line"></span>
              <span className="notch notch-right"></span>
            </div>

            {/* Pie del Boleto con Código de Barras y Acción */}
            <div className="cinepolis-ticket-footer">
              <div className="cinepolis-barcode-wrap">
                <div className="cinepolis-barcode-lines" aria-hidden="true"></div>
                <span className="cinepolis-barcode-number">
                  VAL-ALE-VIP-{ticketMovie.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8) || '20261017'}
                </span>
              </div>

              <div className="cinepolis-ticket-actions">
                <button
                  type="button"
                  className="ticket-share-btn-compact"
                  onClick={handleShareTicketImage}
                  disabled={isGeneratingTicketImage}
                  title="Compartir imagen del boleto"
                >
                  <Share2 size={14} />
                  <span>Compartir imagen</span>
                </button>
                <button
                  type="button"
                  className={`cinepolis-ticket-action-btn ${ticketMovie.watched ? 'is-watched' : 'is-pending'}`}
                  onClick={() => handleToggleWatched(ticketMovie.id)}
                >
                  {ticketMovie.watched ? (
                    <>
                      <Check size={16} />
                      <span>¡Ya la vimos juntos! ♡</span>
                    </>
                  ) : (
                    <>
                      <Popcorn size={16} />
                      <span>Marcar como ya vista</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PELÍCULA ALEATORIA ESCOGIDA (PARA NO ESTAR DE INDECISOS) */}
      {randomPickedMovie && (
        <div className="cinepolis-random-overlay" onClick={() => setRandomPickedMovie(null)}>
          <div className="cinepolis-random-card" onClick={e => e.stopPropagation()}>
            <button
              className="cinepolis-ticket-close"
              onClick={() => setRandomPickedMovie(null)}
              aria-label="Cerrar selección aleatoria"
            >
              <X size={20} />
            </button>

            <div className="random-modal-header">
              <span className="random-sparkles-tag">🎲 SELECCIÓN ALEATORIA</span>
              <h2 className="random-modal-title">¡Película Elegida para Hoy!</h2>
              <p className="random-modal-subtitle">Para no estar de indecisos escogiendo película ♡</p>
            </div>

            <div className="random-modal-body">
              {randomPickedMovie.poster ? (
                <div className="random-poster-wrap">
                  <img
                    src={randomPickedMovie.poster}
                    alt={randomPickedMovie.title}
                    className="random-movie-poster"
                  />
                </div>
              ) : (
                <div className="random-poster-placeholder">
                  <Film size={48} />
                </div>
              )}

              <div className="random-movie-info">
                <div className="random-meta-badges">
                  <span className="cinepolis-clasif-pill">{randomPickedMovie.classification || 'B'}</span>
                  <span className="cinepolis-format-pill">{randomPickedMovie.format || '2D VIP'}</span>
                  {randomPickedMovie.year && <span className="random-year-pill">{randomPickedMovie.year}</span>}
                  <span className="random-duration-pill">{randomPickedMovie.duration || '120 min'}</span>
                </div>

                <h3 className="random-title">{randomPickedMovie.title}</h3>

                {randomPickedMovie.stars && (
                  <p className="random-stars">
                    <Star size={13} fill="currentColor" />
                    <span>{randomPickedMovie.stars}</span>
                  </p>
                )}

                {randomPickedMovie.note && (
                  <div className="random-synopsis">
                    <strong>SINOPSIS DE NUESTRA CITA:</strong>
                    <p>“{randomPickedMovie.note}”</p>
                  </div>
                )}

                <p className="random-programmer">
                  Sugerencia de <strong>{randomPickedMovie.author}</strong>
                </p>
              </div>
            </div>

            <div className="random-modal-footer">
              <button
                type="button"
                className="random-btn-roll-again"
                onClick={handlePickRandomMovie}
                disabled={isShuffling}
              >
                <Shuffle size={16} className={isShuffling ? 'is-shuffling-spin' : ''} />
                <span>Elegir otra al azar</span>
              </button>

              <button
                type="button"
                className="random-btn-accept"
                onClick={() => {
                  const m = randomPickedMovie;
                  setRandomPickedMovie(null);
                  handleOpenTicket(m, '8:30 PM');
                }}
              >
                <Ticket size={16} />
                <span>¡Ver esta película! (Reservar boleto)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Película con Buscador IMDb en Vivo */}
      {showAddModal && (
        <StudioDialog
          title="Agregar a nuestra cartelera Cinepelis"
          subtitle="Busca cualquier película para obtener su póster oficial y programarla en Sala 1"
          onClose={() => setShowAddModal(false)}
          wide
        >
          <form onSubmit={handleCreateMovie} className="cartelera-form cinepolis-add-form">
            {/* Buscador inteligente */}
            <div className="cartelera-search-field-wrap cinepolis-form-search">
              <label className="field-label">
                <span>Buscar película automáticamente</span>
                <span className="field-hint">Escribe el título y selecciona la sugerencia</span>
              </label>

              <div className="cartelera-search-input-box">
                <Search size={18} className="cartelera-input-search-icon" />
                <input
                  type="text"
                  value={formSearchQuery}
                  onChange={e => handleQueryChange(e.target.value)}
                  placeholder="Ej: La La Land, Shrek, Coco, Orgullo y Prejuicio, Interestelar..."
                  className="input-text cartelera-live-search-input"
                  autoFocus
                />
                {formSearching && <Loader2 size={18} className="cartelera-spinner" />}
                {formSearchQuery && !formSearching && (
                  <button
                    type="button"
                    className="cartelera-search-clear-btn"
                    onClick={() => {
                      setFormSearchQuery('');
                      setFormSuggestions([]);
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Píldoras rápidas de inspiración */}
              <div className="cartelera-pills-row">
                <span className="pills-label">Ideas para ver juntos:</span>
                <div className="pills-scroll">
                  {QUICK_INSPIRATION.map(item => (
                    <button
                      key={item}
                      type="button"
                      className="cartelera-quick-pill"
                      onClick={() => handleQueryChange(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista desplegable de sugerencias con pósters oficiales */}
              {formSuggestions.length > 0 && (
                <div className="cartelera-suggestions-list" role="listbox">
                  {formSuggestions.map(sug => (
                    <div
                      key={sug.id}
                      className={`cartelera-suggestion-item ${selectedSuggestion?.id === sug.id ? 'is-selected' : ''}`}
                      onClick={() => handleSelectSuggestion(sug)}
                      role="option"
                      aria-selected={selectedSuggestion?.id === sug.id}
                    >
                      <div className="suggestion-poster-wrap">
                        {sug.poster ? (
                          <img src={sug.poster} alt={sug.title} className="suggestion-poster-img" />
                        ) : (
                          <div className="suggestion-poster-fallback">
                            <Film size={18} />
                          </div>
                        )}
                      </div>

                      <div className="suggestion-info">
                        <div className="suggestion-title-row">
                          <strong className="suggestion-title">{sug.title}</strong>
                          {sug.year && <span className="suggestion-year">({sug.year})</span>}
                        </div>
                        {sug.stars && <p className="suggestion-stars">{sug.stars}</p>}
                      </div>

                      <div className="suggestion-select-action">
                        <Check size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sugerencias vacías pero con búsqueda ingresada */}
              {formSearchQuery.trim().length > 1 && !formSearching && formSuggestions.length === 0 && (
                <div className="cartelera-no-sug-tip">
                  <span>
                    ¿No aparece en la lista automática? ¡No te preocupes! Puedes agregar{' '}
                    <strong>«{formSearchQuery.trim()}»</strong> directamente.
                  </span>
                  <button
                    type="button"
                    className="cartelera-use-title-btn"
                    onClick={() => {
                      setInputTitle(formSearchQuery.trim());
                      setFormSuggestions([]);
                    }}
                  >
                    Usar «{formSearchQuery.trim()}»
                  </button>
                </div>
              )}
            </div>

            {/* Vista previa y campos del formulario */}
            <div className="cartelera-form-details-layout">
              {/* Preview del póster */}
              <div className="cartelera-form-poster-preview">
                {inputPoster ? (
                  <img src={inputPoster} alt="Póster de la película" className="form-preview-poster-img" />
                ) : (
                  <div className="form-preview-poster-empty">
                    <Film size={36} />
                    <span>Selecciona una película para ver su póster oficial</span>
                  </div>
                )}
              </div>

              {/* Campos manuales / confirmación */}
              <div className="cartelera-form-inputs">
                <div className="field-group">
                  <label className="field-label" htmlFor="movie-title-input">
                    Título de la película *
                  </label>
                  <input
                    id="movie-title-input"
                    type="text"
                    value={inputTitle}
                    onChange={e => setInputTitle(e.target.value)}
                    placeholder="Título de la película"
                    className="input-text"
                    required
                  />
                </div>

                <div className="form-row-2col">
                  <div className="field-group">
                    <label className="field-label" htmlFor="movie-year-input">
                      Año
                    </label>
                    <input
                      id="movie-year-input"
                      type="text"
                      value={inputYear}
                      onChange={e => setInputYear(e.target.value)}
                      placeholder="Ej: 2016"
                      className="input-text"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="movie-author-select">
                      Propuesta por:
                    </label>
                    <select
                      id="movie-author-select"
                      value={inputAuthor}
                      onChange={e => setInputAuthor(e.target.value as StudioAuthor)}
                      className="input-select"
                      disabled={!!currentUserAuthor}
                    >
                      <option value="Ale">Sugerencia de Ale</option>
                      <option value="Val">Sugerencia de Val</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="field-group">
                    <label className="field-label" htmlFor="movie-clasif-select">
                      Clasificación
                    </label>
                    <select
                      id="movie-clasif-select"
                      value={inputClassification}
                      onChange={e => setInputClassification(e.target.value)}
                      className="input-select"
                    >
                      <option value="A">A (Todo público)</option>
                      <option value="B">B (Adolescentes)</option>
                      <option value="B15">B15 (+15 años)</option>
                      <option value="VIP">VIP Romántica</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="movie-format-select">
                      Formato de Sala
                    </label>
                    <select
                      id="movie-format-select"
                      value={inputFormat}
                      onChange={e => setInputFormat(e.target.value)}
                      className="input-select"
                    >
                      <option value="2D VIP">2D VIP</option>
                      <option value="2D VIP ATMOS">2D VIP ATMOS</option>
                      <option value="MACRO XE">MACRO XE</option>
                      <option value="SALA DE ARTE">SALA DE ARTE</option>
                      <option value="3D VIP">3D VIP</option>
                    </select>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="movie-stars-input">
                    Reparto / Actores (opcional)
                  </label>
                  <input
                    id="movie-stars-input"
                    type="text"
                    value={inputStars}
                    onChange={e => setInputStars(e.target.value)}
                    placeholder="Ej: Ryan Gosling, Emma Stone"
                    className="input-text"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="movie-note-input">
                    ¿Por qué queremos verla? / Nota de nuestra cita
                  </label>
                  <textarea
                    id="movie-note-input"
                    value={inputNote}
                    onChange={e => setInputNote(e.target.value)}
                    placeholder="Ej: Para una noche de palomitas y mantita, me dijeron que está hermosa..."
                    rows={2}
                    className="input-textarea"
                  />
                </div>

                {/* Estado inicial */}
                <div className="field-group">
                  <label className="field-label">Estado inicial:</label>
                  <div className="cartelera-status-radios">
                    <label className={`status-radio-option ${!inputWatched ? 'is-checked' : ''}`}>
                      <input
                        type="radio"
                        name="movie-status"
                        checked={!inputWatched}
                        onChange={() => setInputWatched(false)}
                      />
                      <Popcorn size={16} />
                      <span>🍿 Pendiente por ver</span>
                    </label>
                    <label className={`status-radio-option ${inputWatched ? 'is-checked' : ''}`}>
                      <input
                        type="radio"
                        name="movie-status"
                        checked={inputWatched}
                        onChange={() => setInputWatched(true)}
                      />
                      <Check size={16} />
                      <span>✓ ¡Ya la vimos juntos!</span>
                    </label>
                  </div>
                </div>

                {/* Campo URL del póster por si se quiere personalizar */}
                <details className="cartelera-poster-details">
                  <summary className="cartelera-poster-summary">Editar enlace de la imagen manualmente</summary>
                  <div className="field-group" style={{ marginTop: '0.5rem' }}>
                    <input
                      type="url"
                      value={inputPoster}
                      onChange={e => setInputPoster(e.target.value)}
                      placeholder="https://..."
                      className="input-text input-small"
                    />
                  </div>
                </details>

                {formError && (
                  <p className="error-message" role="alert">
                    {formError}
                  </p>
                )}
              </div>
            </div>

            {/* Acciones del formulario */}
            <div className="modal-actions-row">
              <button type="button" className="button button-secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="cinepolis-cta-add">
                <Heart size={16} fill="currentColor" />
                <span>Programar en cartelera</span>
              </button>
            </div>
          </form>
        </StudioDialog>
      )}

      {/* Modal de confirmación para eliminar */}
      {movieToDelete && (
        <StudioDialog
          title="Eliminar de la cartelera"
          subtitle="¿Seguro que deseas quitar esta película?"
          onClose={() => setMovieToDelete(null)}
        >
          <div className="cartelera-delete-modal-content">
            <p>
              ¿Quieres quitar <strong>«{movieToDelete.title}»</strong> de nuestra cartelera de cine?
            </p>
            <div className="modal-actions-row">
              <button type="button" className="button button-secondary" onClick={() => setMovieToDelete(null)}>
                Cancelar
              </button>
              <button type="button" className="button button-danger" onClick={handleDeleteConfirm}>
                <Trash2 size={16} />
                <span>Sí, eliminar película</span>
              </button>
            </div>
          </div>
        </StudioDialog>
      )}
    </div>
  );
}
