import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Clipboard, Disc3, Download, ExternalLink, Headphones, Heart, Music2, Pause, Play, Plus, Search, ShieldCheck, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { StudioDialog, StudioSprig, StudioStorageNotice, StudioSyncNotice, StudioShareButton, studioIsDemo } from './LettersPage';
import { prependStudioLocal, spotifyLink, type StudioSong, type StudioAuthor } from '../data/studio-sync';
import { useStudioSync } from './useStudioSync';
import { identifyGooglePlayer } from '../lib/game-progression';
import type { GallerySession } from '../data/types';
import './studio.css';

type Dedication = StudioSong;

export interface SearchSong {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  artworkUrl: string;
  previewUrl?: string;
  spotifyUrl?: string;
}

const DEFAULT_CURATED_SONGS: SearchSong[] = [
  {
    id: '1441416638',
    trackName: 'we fell in love in october',
    artistName: 'girl in red',
    albumName: 'we fell in love in october / forget her - Single',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/08/dd/cd/08ddcdac-2d09-c7eb-d2ab-6b3849b04a02/5054526166202.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/0b/0b/850b0b97-9255-b5f5-d05e-0e03a1e9b8e7/mzaf_9835609236239012360.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/6IPwKM3fUUzlElbvKw2sKl',
  },
  {
    id: '1122782283',
    trackName: 'Yellow',
    artistName: 'Coldplay',
    albumName: 'Parachutes',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg',
  },
  {
    id: '727494441',
    trackName: 'Dulce Soledad',
    artistName: 'Enjambre',
    albumName: 'Daltónico',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/2c/aa/d0/2caad0c3-6bc5-2148-f0bb-16551c8dfe16/05099991760456.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6e/0b/16/6e0b1651-3989-7c56-b8a4-7d07599b4168/mzaf_3284769617460277443.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/1fV9d2Ehy2s55gT2s2yU5M',
  },
  {
    id: '1440832990',
    trackName: 'Amor Completo',
    artistName: 'Mon Laferte',
    albumName: 'Mon Laferte, Vol. 1 (Edición Especial)',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/93/d0/4a/93d04ae9-c2bc-dfe9-6bdc-8d1f92647405/16UMGIM02512.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cf/de/96/cfde9636-88a5-ca62-06de-e5111d471501/mzaf_16739751041575702200.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/41lMpm3h858Y6uVfCg3vC9',
  },
  {
    id: '1468058173',
    trackName: 'Lover',
    artistName: 'Taylor Swift',
    albumName: 'Lover',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/db/47/e0db47b0-7f70-0631-0414-cd4777d2fb3e/mzaf_6362891154838442638.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/1dGr1nsAZkt7oUBVvnnlZa',
  },
  {
    id: '1622045962',
    trackName: 'Ojitos Lindos',
    artistName: 'Bad Bunny & Bomba Estéreo',
    albumName: 'Un Verano Sin Ti',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/3e/04/eb/3e04ebf6-370f-f59d-ec84-2c2643db92f1/196626945068.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/72/ae/81/72ae81c2-4ef3-b998-40b6-563c0609509f/mzaf_12868850384306577273.plus.aac.p.m4a',
    spotifyUrl: 'https://open.spotify.com/track/3k3NWokhb03ffu8bmGR4bl',
  },
];

const demoDedications: Dedication[] = [
  {
    id: 'song-demo-1',
    title: 'We Fell in Love in October',
    artist: 'girl in red',
    note: 'Una canción que ya tiene su lugar en nuestra historia. Aquí puedes escribir por qué te recuerda a esa persona.',
    author: 'Ale',
    url: 'https://open.spotify.com/track/6IPwKM3fUUzlElbvKw2sKl',
    kind: 'track',
    createdAt: '2026-01-14T12:00:00Z',
  },
];

const kindNames: Record<Dedication['kind'], string> = {
  track: 'Canción',
  playlist: 'Playlist',
  album: 'Álbum',
};

export function extractSpotifyEmbed(rawUrl: string): { kind: string; id: string; embedUrl: string } | null {
  const link = spotifyLink(rawUrl);
  if (!link) return null;
  const match = link.url.match(/\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return {
    kind: match[1],
    id: match[2],
    embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`,
  };
}

export default function MusicPage({ namespace, session }: { namespace: string; session?: GallerySession | null }) {
  return <MusicContent key={namespace} namespace={namespace} session={session} />;
}

function MusicContent({ namespace, session }: { namespace: string; session?: GallerySession | null }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:music:v1`, demo ? demoDedications : []);
  const [deletedIds, setDeletedIds] = useLocalState<string[]>(`${namespace}:music:deleted:v1`, []);
  const [metaStore, setMetaStore] = useLocalState<Record<string, { artworkUrl?: string; previewUrl?: string; startSeconds?: number }>>(
    `${namespace}:music:meta:v1`,
    {
      'song-demo-1': {
        artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/08/dd/cd/08ddcdac-2d09-c7eb-d2ab-6b3849b04a02/5054526166202.jpg/200x200bb.jpg',
        previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/0b/0b/850b0b97-9255-b5f5-d05e-0e03a1e9b8e7/mzaf_9835609236239012360.plus.aac.p.m4a',
        startSeconds: 0,
      },
    }
  );

  const sync = useStudioSync(namespace, 'songs', stored);
  const dedications = sync.rows.map(row => row.item);
  const activeDedications = dedications.filter(song => !deletedIds.includes(song.id));

  // Identificar el usuario conectado con Google (Ale vs Val)
  const currentUserAuthor: StudioAuthor | null = session
    ? (identifyGooglePlayer(session, namespace) === 'valeria' ? 'Val' : 'Ale')
    : null;

  const canDeleteSong = (song: Dedication): boolean => {
    if (!currentUserAuthor) return true; // Modo invitado
    return song.author === currentUserAuthor;
  };

  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [compose, setCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'search' | 'link'>('search');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [songToDelete, setSongToDelete] = useState<Dedication | null>(null);

  // Campos interactivos para auto-llenado con Spotify y buscador estilo Instagram
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputArtist, setInputArtist] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [inputAuthor, setInputAuthor] = useState<StudioAuthor>('Ale');
  const [previewCover, setPreviewCover] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState('');

  // Buscador estilo Instagram
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSong[]>(DEFAULT_CURATED_SONGS);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SearchSong | null>(null);
  const [selectedStartSeconds, setSelectedStartSeconds] = useState(0);
  const [selectedAudioDuration, setSelectedAudioDuration] = useState<number>(30);
  const [activePill, setActivePill] = useState<string | null>(null);
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatSongTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    const audioUrl = selectedSong?.previewUrl;
    if (!audioUrl) {
      setSelectedAudioDuration(30);
      return;
    }
    const a = new Audio();
    a.src = audioUrl;
    a.onloadedmetadata = () => {
      if (a.duration && Number.isFinite(a.duration) && a.duration > 0) {
        setSelectedAudioDuration(Math.floor(a.duration));
      }
    };
    return () => {
      a.src = '';
    };
  }, [selectedSong?.previewUrl]);

  // Auto-cargar carátula y preview para canciones que no las tengan en metaStore (ej. enlaces directos o sincronizados)
  useEffect(() => {
    activeDedications.forEach(async (dedication) => {
      if (metaStore[dedication.id]?.artworkUrl) return;
      try {
        const query = `${dedication.title} ${dedication.artist}`.trim();
        if (!query) return;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
        if (!res.ok) return;
        const data = (await res.json()) as { results?: any[] };
        const best = data?.results?.[0];
        if (best && typeof best.artworkUrl100 === 'string') {
          const artworkUrl = best.artworkUrl100.replace('100x100bb', '200x200bb');
          setMetaStore(prev => {
            if (prev[dedication.id]?.artworkUrl) return prev;
            return {
              ...prev,
              [dedication.id]: {
                ...prev[dedication.id],
                artworkUrl,
                previewUrl: best.previewUrl || prev[dedication.id]?.previewUrl,
              },
            };
          });
        }
      } catch {
        // Silencioso si no hay red
      }
    });
  }, [activeDedications, metaStore, setMetaStore]);

  // Volumen normal al 100% por defecto para que en la laptop se escuche claro y con volumen completo
  const [previewVolume, setPreviewVolume] = useState<number>(1.0);

  const stopFade = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  // Rampa suave de 120ms: inicia suave (0.05) y sube rápidamente al volumen completo (targetVolume)
  // Esto elimina el golpe brusco inicial y evita que PipeWire/PulseAudio o el navegador atenúen el volumen
  const fadeIn = (audio: HTMLAudioElement, targetVolume: number) => {
    stopFade();
    audio.volume = 0.05;
    const start = performance.now();
    const duration = 120; // 120 milisegundos
    fadeIntervalRef.current = setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed >= duration || audio.paused) {
        if (!audio.paused) {
          audio.volume = targetVolume;
        }
        stopFade();
      } else {
        const current = 0.05 + (targetVolume - 0.05) * (elapsed / duration);
        audio.volume = Math.max(0.05, Math.min(1, current));
      }
    }, 16);
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0.05, Math.min(1, newVol));
    setPreviewVolume(clamped);
    stopFade();
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume = clamped;
    }
  };

  const stopPreview = () => {
    stopFade();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    setPlayingPreviewUrl(null);
  };

  // Detener audio al desmontar o cerrar
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const togglePreview = (url?: string, startSeconds: number = 0) => {
    if (!url) return;
    if (playingPreviewUrl === url) {
      stopPreview();
    } else {
      stopFade();
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audioRef.current = audio;
      }
      audio.pause();
      audio.currentTime = startSeconds > 0 ? startSeconds : 0;
      // Iniciar a bajo volumen para que la rampa comience limpia sin golpe
      audio.volume = 0.05;
      audio.src = url;

      audio.onended = () => {
        stopFade();
        setPlayingPreviewUrl(null);
      };
      audio.onerror = () => {
        stopFade();
        setPlayingPreviewUrl(null);
      };

      audio.play()
        .then(() => {
          fadeIn(audio!, previewVolume);
        })
        .catch(() => {
          stopFade();
          setPlayingPreviewUrl(null);
        });

      setPlayingPreviewUrl(url);
    }
  };

  const startCompose = () => {
    identity.current = null;
    setError('');
    sync.clearError();
    setInputUrl('');
    setInputTitle('');
    setInputArtist('');
    setInputNote('');
    setInputAuthor(currentUserAuthor ?? 'Ale');
    setPreviewCover(null);
    setPreviewLoading(false);
    setAutoDetectedInfo('');
    setSelectedSong(null);
    setSelectedStartSeconds(0);
    setSearchQuery('');
    setSearchResults(DEFAULT_CURATED_SONGS);
    setActivePill(null);
    setComposeMode('search');
    stopPreview();
    setCompose(true);
  };

  const closeCompose = () => {
    stopPreview();
    setCompose(false);
  };

  const exportMusic = () => downloadJson('nuestra-historia-canciones.json', { ...sync.exportData, dedications: activeDedications });

  // Búsqueda en catálogo de música (estilo Instagram)
  const performSearch = async (term: string) => {
    const q = term.trim();
    if (!q) {
      setSearchResults(DEFAULT_CURATED_SONGS);
      setIsSearching(false);
      return;
    }

    // Si el usuario pega un enlace de Spotify en la barra de búsqueda, procesarlo como URL
    if (spotifyLink(q) || /^spotify:(track|playlist|album):/.test(q)) {
      handleUrlInput(q);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`);
      if (res.ok) {
        const data = (await res.json()) as { results?: any[] };
        if (Array.isArray(data.results) && data.results.length > 0) {
          const list: SearchSong[] = data.results.map((r: any) => ({
            id: String(r.trackId || Math.random()),
            trackName: r.trackName || 'Sin título',
            artistName: r.artistName || 'Artista desconocido',
            albumName: r.collectionName || '',
            artworkUrl: typeof r.artworkUrl100 === 'string' ? r.artworkUrl100.replace('100x100bb', '200x200bb') : '',
            previewUrl: r.previewUrl,
            spotifyUrl: `https://open.spotify.com/track/${String(r.trackId || '').replace(/[^a-zA-Z0-9]/g, '') || 'track01'}`,
          }));
          setSearchResults(list);
        } else {
          setSearchResults([]);
        }
      }
    } catch {
      // Ignorar fallas temporales
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setActivePill(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(val);
    }, 350);
  };

  const handlePillClick = (theme: string) => {
    setActivePill(theme);
    setSearchQuery(theme);
    performSearch(theme);
  };

  const selectSong = (song: SearchSong) => {
    setSelectedSong(song);
    setSelectedStartSeconds(0);
    setInputTitle(song.trackName);
    setInputArtist(song.artistName);
    setPreviewCover(song.artworkUrl);
    // Auto-asignar URL canónica para que NO sea necesario pedir enlace al seleccionar canción
    const autoUrl = song.spotifyUrl || `https://open.spotify.com/track/${String(song.id).replace(/[^a-zA-Z0-9]/g, '') || 'track01'}`;
    setInputUrl(autoUrl);
    setAutoDetectedInfo(`Canción elegida: «${song.trackName}» de ${song.artistName}`);
    setError('');
  };

  // Pegar desde el portapapeles con un solo toque
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        handleUrlInput(text.trim());
        setStatus('Enlace pegado desde el portapapeles.');
      }
    } catch {
      setError('Pega el enlace directamente en el campo de texto de abajo.');
    }
  };

  // Detección automática al ingresar el enlace de Spotify
  async function handleUrlInput(newUrl: string) {
    let cleaned = newUrl.trim();
    const uriMatch = cleaned.match(/^spotify:(track|playlist|album):([a-zA-Z0-9]+)$/);
    if (uriMatch) {
      cleaned = `https://open.spotify.com/${uriMatch[1]}/${uriMatch[2]}`;
    }
    setInputUrl(cleaned);
    setError('');

    const link = spotifyLink(cleaned);
    if (!link) {
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`);
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        let foundTitle = '';
        if (typeof data.title === 'string' && data.title.trim()) {
          foundTitle = data.title.trim();
          setInputTitle(foundTitle);
        }
        if (typeof data.thumbnail_url === 'string') {
          setPreviewCover(data.thumbnail_url);
        }

        // Auto-detectar Artista buscando en el catálogo musical con el título
        if (foundTitle) {
          try {
            const itunesRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(foundTitle)}&entity=song&limit=3`
            );
            if (itunesRes.ok) {
              const itunesData = (await itunesRes.json()) as { results?: any[] };
              const best = itunesData.results?.[0];
              if (best && typeof best.artistName === 'string') {
                setInputArtist(best.artistName);
                setAutoDetectedInfo(`✓ Artista y canción detectados: «${foundTitle}» de ${best.artistName}`);
                setSelectedSong({
                  id: String(best.trackId || 'spotify-link'),
                  trackName: foundTitle,
                  artistName: best.artistName,
                  albumName: best.collectionName || '',
                  artworkUrl: (typeof data.thumbnail_url === 'string' ? data.thumbnail_url : best.artworkUrl100) || '',
                  previewUrl: best.previewUrl,
                  spotifyUrl: link.url,
                });
              } else {
                setAutoDetectedInfo(`✓ Título detectado de Spotify: «${foundTitle}»`);
              }
            }
          } catch {
            setAutoDetectedInfo(`✓ Título detectado de Spotify: «${foundTitle}»`);
          }
        }
      }
    } catch {
      // Ignorar fallas de red: el usuario puede seguir escribiendo manualmente
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleDeleteSong(song: Dedication) {
    setDeletedIds(prev => [...(Array.isArray(prev) ? prev : []), song.id]);
    setStored((prev: unknown) => Array.isArray(prev) ? prev.filter((item: any) => item?.id !== song.id) : prev);
    setMetaStore(prev => {
      const next = { ...prev };
      delete next[song.id];
      return next;
    });
    setStatus(`Canción «${song.title}» eliminada.`);
    setSongToDelete(null);
  }

  async function saveDedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = inputTitle.trim();
    const artist = inputArtist.trim();
    const note = inputNote.trim();

    // Si seleccionó una canción del catálogo y no tiene URL manual, auto-generar URL canónica
    let urlToUse = inputUrl.trim();
    if (!urlToUse && selectedSong) {
      urlToUse = selectedSong.spotifyUrl || `https://open.spotify.com/track/${String(selectedSong.id).replace(/[^a-zA-Z0-9]/g, '') || 'track01'}`;
    }

    if (!title || !artist || !note) {
      setError('Por favor completa el título, el artista y tu dedicatoria personal.');
      return;
    }

    if (composeMode === 'link' && !urlToUse) {
      setError('Por favor pega el enlace de Spotify (https://open.spotify.com/track/…)');
      return;
    }

    if (!urlToUse) {
      urlToUse = `https://open.spotify.com/track/${crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 22)}`;
    }

    const link = spotifyLink(urlToUse);
    if (!link) {
      setError('El enlace de Spotify no es válido. Debe tener el formato https://open.spotify.com/track/…');
      return;
    }

    identity.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const dedication: Dedication = {
      ...identity.current,
      title,
      artist,
      note,
      author: currentUserAuthor ?? inputAuthor,
      ...link,
    };

    const localOnly = !sync.connected || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'local';
    if (!localOnly) {
      if (!await sync.share(dedication)) return;
    } else {
      try {
        setStored(prependStudioLocal(stored, dedication));
      } catch (failure) {
        setError((failure as Error).message);
        return;
      }
    }

    if (selectedSong || previewCover) {
      setMetaStore(prev => ({
        ...prev,
        [dedication.id]: {
          artworkUrl: selectedSong?.artworkUrl || previewCover || undefined,
          previewUrl: selectedSong?.previewUrl,
          startSeconds: selectedStartSeconds > 0 ? selectedStartSeconds : undefined,
        },
      }));
    }

    closeCompose();
    setError('');
    setStatus(localOnly ? 'Dedicatoria añadida a este navegador.' : 'Dedicatoria compartida y confirmada.');
    identity.current = null;
  }

  return (
    <section className="studio-page studio-music-page" aria-labelledby="music-title">
      <div className="studio-page-heading">
        <div>
          <h1 className="page-title" id="music-title">Canciones</h1>
          <p className="muted studio-intro">Canciones que nos dedicamos y que forman la banda sonora de nuestra historia con reproductor oficial de Spotify.</p>
        </div>
      </div>

      <StudioSyncNotice state={sync.state} error={sync.error} />
      <StudioStorageNotice saved={saved} onExport={exportMusic} />

      <div className="studio-music-banner">
        <div className="studio-vinyl" aria-hidden="true">
          <div><Heart size={23} strokeWidth={1.2} /></div>
        </div>
        <div className="studio-music-banner-content">
          <span className="studio-tag" style={{ background: 'rgba(224, 109, 138, 0.12)', color: 'var(--studio-rose-deep)', borderColor: 'var(--studio-rose-border)', fontWeight: 600 }}>
            De Ale para Val 💕
          </span>
          <h2>Canciones con dedicatoria</h2>
          <p>Elige canciones buscando como en Instagram o conectando tus favoritas de Spotify para escucharlas juntas con su carátula oficial.</p>
          <button type="button" className="button-primary studio-banner-cta-btn" onClick={() => startCompose()}>
            <Plus size={17} /> Dedicar una canción
          </button>
        </div>
        <StudioSprig />
        <Sparkles className="studio-banner-sparkle" size={20} aria-hidden="true" />
      </div>

      <div className="studio-toolbar">
        <p className="studio-section-label">Nuestras dedicatorias <span>{activeDedications.length}</span></p>
        <button type="button" className="studio-export" onClick={exportMusic}>
          <Download size={14} /> Exportar
        </button>
      </div>

      <div className="studio-music-grid">
        {activeDedications.map((dedication, index) => {
          const embed = extractSpotifyEmbed(dedication.url);
          const canDelete = canDeleteSong(dedication);
          const meta = metaStore[dedication.id];
          const coverArt = meta?.artworkUrl;
          const previewAudio = meta?.previewUrl;
          const isPlayingThis = playingPreviewUrl === previewAudio;
          const isTrackNumericOrGenerated = dedication.url.startsWith('https://open.spotify.com/track/spotify-') || /^\d+$/.test(dedication.url.split('/').pop() || '');

          return (
            <article
              className={`card studio-song-card studio-tone-${index % 3}`}
              key={sync.rows.find(row => row.item.id === dedication.id)?.localId ?? dedication.id}
            >
              <div className="studio-song-top">
                <div className="studio-song-cover" aria-hidden="true">
                  {coverArt ? (
                    <img src={coverArt} alt="" className="studio-song-cover-img" />
                  ) : (
                    <>
                      <Disc3 size={42} strokeWidth={1} />
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span className="studio-tag">{kindNames[dedication.kind]}</span>
                  {previewAudio && (
                    <button
                      type="button"
                      className={`studio-song-card-play-btn ${isPlayingThis ? 'playing' : ''}`}
                      onClick={() => togglePreview(previewAudio, meta?.startSeconds || 0)}
                      title={isPlayingThis ? 'Pausar melodía' : meta?.startSeconds ? `Escuchar muestra (inicia en ${formatSongTime(meta.startSeconds)})` : 'Escuchar muestra'}
                    >
                      {isPlayingThis ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                      <span>{isPlayingThis ? 'Pausar' : meta?.startSeconds ? `Muestra (${formatSongTime(meta.startSeconds)})` : 'Muestra 30s'}</span>
                    </button>
                  )}
                </div>
              </div>

              <h2>{dedication.title}</h2>
              <p className="studio-song-artist">{dedication.artist}</p>

              <blockquote>“{dedication.note}”</blockquote>

              <div className="studio-card-bottom">
                <span className="studio-author">
                  <span>{dedication.author.charAt(0)}</span> De {dedication.author} para {dedication.author === 'Ale' ? 'Val' : 'Ale'}
                </span>
                <a
                  className="studio-spotify-link"
                  href={
                    isTrackNumericOrGenerated
                      ? `https://open.spotify.com/search/${encodeURIComponent(dedication.title + ' ' + dedication.artist)}`
                      : (spotifyLink(dedication.url)?.url ?? `https://open.spotify.com/search/${encodeURIComponent(dedication.title + ' ' + dedication.artist)}`)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${dedication.title} en Spotify`}
                >
                  <Headphones size={15} /> Abrir en Spotify <ArrowUpRight size={14} />
                </a>
              </div>

              <div className="studio-card-bottom" style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
                <div className="studio-card-actions-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="studio-tag">
                      {sync.rows.find(row => row.item.id === dedication.id)?.scope === 'shared'
                        ? 'Compartido'
                        : 'Solo aquí'}
                    </span>
                    {sync.connected && sync.rows.find(row => row.item.id === dedication.id)?.hasLocalCopy && (
                      <StudioShareButton
                        shared={sync.rows.find(row => row.item.id === dedication.id)?.scope === 'shared'}
                        title={dedication.title}
                        busy={sync.busy}
                        error={sync.error}
                        onShare={async () => {
                          const ok = await sync.share(dedication);
                          if (ok) setStatus('Dedicatoria compartida. El borrador local se conserva.');
                          return ok;
                        }}
                      />
                    )}
                  </div>

                  {canDelete ? (
                    <button
                      type="button"
                      className="studio-letter-delete-btn"
                      onClick={() => setSongToDelete(dedication)}
                      title="Eliminar canción"
                    >
                      <Trash2 size={13} /> Borrar
                    </button>
                  ) : (
                    <span
                      className="studio-letter-protected-badge"
                      title={`Esta canción fue dedicada por ${dedication.author} para ${dedication.author === 'Ale' ? 'Val' : 'Ale'}. Solo el autor puede eliminarla.`}
                    >
                      <Heart size={11} fill="currentColor" /> De {dedication.author} para {dedication.author === 'Ale' ? 'Val' : 'Ale'}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {activeDedications.length === 0 && (
        <div className="studio-empty studio-music-empty">
          <span className="studio-empty-icon"><Headphones size={30} strokeWidth={1.3} /></span>
          <h2>¿Cuál sería nuestra primera canción?</h2>
          <p>Elige una melodía buscando como en Instagram o conectando un enlace de Spotify.</p>
          <button type="button" className="button-secondary" onClick={() => startCompose()}>
            <Plus size={16} /> Añadir una dedicatoria
          </button>
          <StudioSprig />
        </div>
      )}

      <p className="studio-footnote">
        <Music2 size={13} /> Reproduce las canciones directamente desde los reproductores de Spotify o ábrelas en tu aplicación.
      </p>
      <p className="studio-status" role="status">{status}</p>

      {/* Modal Dedicar Canción (con buscador estilo Instagram y auto-llenado de artista) */}
      {compose && (
        <StudioDialog
          title="Esta canción me recuerda a ti."
          subtitle="Busca la canción como en Instagram o pega su enlace de Spotify."
          busy={sync.busy}
          onClose={closeCompose}
        >
          <form className="studio-form" onSubmit={saveDedication} aria-busy={sync.busy}>
            <fieldset disabled={sync.busy} style={{ display: 'contents' }}>
              
              {/* Selector de modo: Buscar vs Poner enlace */}
              <div className="studio-music-mode-toggle" role="tablist" aria-label="Método para agregar canción">
                <button
                  type="button"
                  role="tab"
                  aria-selected={composeMode === 'search'}
                  className={`studio-music-mode-btn ${composeMode === 'search' ? 'active' : ''}`}
                  onClick={() => {
                    setComposeMode('search');
                    setError('');
                  }}
                >
                  <Search size={14} /> 1. Buscar o elegir canción
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={composeMode === 'link'}
                  className={`studio-music-mode-btn ${composeMode === 'link' ? 'active' : ''}`}
                  onClick={() => {
                    setComposeMode('link');
                    setError('');
                  }}
                >
                  <ExternalLink size={14} /> 2. O poner enlace de Spotify
                </button>
              </div>

              {/* Opción 1: Buscador estilo Instagram y catálogo */}
              {composeMode === 'search' && (
                <>
                  {!selectedSong ? (
                    <div className="studio-music-picker">
                      <div className="studio-music-search-bar">
                        <Search size={16} className="studio-search-icon" />
                        <input
                          type="text"
                          className="input studio-music-search-input"
                          placeholder="Buscar por canción o artista (ej. Morat, Coldplay, Enjambre…)"
                          value={searchQuery}
                          onChange={e => handleSearchChange(e.target.value)}
                          data-autofocus
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="studio-clear-search-btn"
                            onClick={() => handleSearchChange('')}
                            title="Borrar búsqueda"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Filtros rápidos por estado de ánimo */}
                      <div className="studio-music-pills">
                        {['💕 Románticas', '✨ Favoritas', '🌙 Noche juntos', '🎸 Acústicas', '🎵 Pop latino'].map(pill => {
                          const clean = pill.replace(/^[^\w\s]+/, '').trim();
                          return (
                            <button
                              key={pill}
                              type="button"
                              className={`studio-music-pill ${activePill === clean ? 'active' : ''}`}
                              onClick={() => handlePillClick(clean)}
                            >
                              {pill}
                            </button>
                          );
                        })}
                      </div>

                      {/* Lista de resultados / sugerencias */}
                      <div className="studio-music-results-header">
                        <span>{searchQuery ? (isSearching ? 'Buscando canciones…' : `Resultados (${searchResults.length})`) : 'Sugerencias para dedicar'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Volume2 size={12} style={{ color: 'var(--studio-muted)' }} />
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={previewVolume}
                            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                            title={`Volumen de muestra: ${Math.round(previewVolume * 100)}%`}
                            className="studio-music-volume-slider"
                          />
                          <span style={{ fontSize: '10px', color: 'var(--studio-muted)', minWidth: '24px' }}>
                            {Math.round(previewVolume * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="studio-music-results-list">
                        {searchResults.map(song => {
                          const isPlaying = playingPreviewUrl === song.previewUrl;
                          return (
                            <div
                              key={song.id}
                              className="studio-music-result-item"
                              onClick={() => selectSong(song)}
                            >
                              <div className="studio-music-result-thumb-wrap">
                                <img src={song.artworkUrl} alt={song.trackName} className="studio-music-result-thumb" />
                                {song.previewUrl && (
                                  <button
                                    type="button"
                                    className={`studio-music-thumb-overlay-btn ${isPlaying ? 'playing' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePreview(song.previewUrl);
                                    }}
                                    title={isPlaying ? 'Pausar' : 'Escuchar muestra de 30s'}
                                  >
                                    {isPlaying ? (
                                      <div className="studio-eq-container">
                                        <span className="studio-eq-bar" />
                                        <span className="studio-eq-bar" />
                                        <span className="studio-eq-bar" />
                                      </div>
                                    ) : (
                                      <Play size={14} fill="currentColor" />
                                    )}
                                  </button>
                                )}
                              </div>

                              <div className="studio-music-result-meta">
                                <p className="studio-music-result-title">{song.trackName}</p>
                                <p className="studio-music-result-artist">{song.artistName} {song.albumName ? `· ${song.albumName}` : ''}</p>
                              </div>

                              <span className="studio-music-select-badge">
                                Elegir
                              </span>
                            </div>
                          );
                        })}

                        {searchResults.length === 0 && !isSearching && (
                          <p style={{ textAlign: 'center', padding: '16px', color: 'var(--studio-muted)', fontSize: '13px' }}>
                            No se encontraron canciones con «{searchQuery}». Intenta con otro término o usa la pestaña «O poner enlace de Spotify».
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Tarjeta de canción seleccionada */}
                      <div className="studio-selected-song-card">
                        <img
                          src={selectedSong.artworkUrl || previewCover || ''}
                          alt={selectedSong.trackName}
                          className="studio-selected-song-cover"
                        />
                        <div className="studio-selected-song-info">
                          <p className="studio-selected-song-title">{selectedSong.trackName}</p>
                          <p className="studio-selected-song-artist">{selectedSong.artistName}</p>
                          {selectedSong.previewUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                              <button
                                type="button"
                                className="studio-preview-play-btn"
                                onClick={() => togglePreview(selectedSong.previewUrl)}
                              >
                                {playingPreviewUrl === selectedSong.previewUrl ? (
                                  <>
                                    <div className="studio-eq-container" style={{ height: '12px' }}>
                                      <span className="studio-eq-bar" />
                                      <span className="studio-eq-bar" />
                                      <span className="studio-eq-bar" />
                                    </div>
                                    <span>Pausar muestra</span>
                                  </>
                                ) : (
                                  <>
                                    <Play size={11} fill="currentColor" />
                                    <span>Escuchar muestra (30s)</span>
                                  </>
                                )}
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Volume2 size={12} style={{ color: 'var(--studio-muted)' }} />
                                <input
                                  type="range"
                                  min="0.1"
                                  max="1"
                                  step="0.05"
                                  value={previewVolume}
                                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                                  title={`Volumen: ${Math.round(previewVolume * 100)}%`}
                                  className="studio-music-volume-slider"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="button-secondary studio-change-song-btn"
                          onClick={() => {
                            setSelectedSong(null);
                            setSelectedStartSeconds(0);
                            stopPreview();
                          }}
                        >
                          Elegir otra
                        </button>
                      </div>

                      {/* Selector de fragmento de audio estilo Notas de Instagram */}
                      {selectedSong.previewUrl && (
                        <div className="studio-ig-audio-trimmer" style={{ marginBottom: '14px' }}>
                          <div className="studio-ig-trimmer-header">
                            <span className="studio-ig-trimmer-title">
                              <Sparkles size={13} /> Fragmento de la canción ({selectedAudioDuration > 35 ? 'Canción completa' : 'Muestra'})
                            </span>
                            <span className="studio-ig-time-badge">
                              Inicia en: <strong>{formatSongTime(selectedStartSeconds)}</strong>
                              {selectedAudioDuration > 0 && <span style={{ opacity: 0.65, fontSize: '11px', marginLeft: '4px' }}>/ {formatSongTime(selectedAudioDuration)}</span>}
                            </span>
                          </div>

                          {/* Botones de salto rápido: Inicio, Medio/Coro, Final */}
                          <div className="studio-ig-quick-positions">
                            <button
                              type="button"
                              className={`studio-ig-pos-btn ${selectedStartSeconds === 0 ? 'is-active' : ''}`}
                              onClick={() => {
                                setSelectedStartSeconds(0);
                                if (audioRef.current) audioRef.current.currentTime = 0;
                              }}
                            >
                              ⏮ Inicio (0:00)
                            </button>
                            <button
                              type="button"
                              className={`studio-ig-pos-btn ${Math.abs(selectedStartSeconds - Math.floor(selectedAudioDuration * 0.45)) <= 3 ? 'is-active' : ''}`}
                              onClick={() => {
                                const mid = Math.floor(selectedAudioDuration * 0.45);
                                setSelectedStartSeconds(mid);
                                if (audioRef.current) audioRef.current.currentTime = mid;
                              }}
                            >
                              ⏯ Medio / Coro ({formatSongTime(Math.floor(selectedAudioDuration * 0.45))})
                            </button>
                            <button
                              type="button"
                              className={`studio-ig-pos-btn ${Math.abs(selectedStartSeconds - Math.floor(selectedAudioDuration * 0.75)) <= 3 ? 'is-active' : ''}`}
                              onClick={() => {
                                const end = Math.floor(selectedAudioDuration * 0.75);
                                setSelectedStartSeconds(end);
                                if (audioRef.current) audioRef.current.currentTime = end;
                              }}
                            >
                              ⏭ Final ({formatSongTime(Math.floor(selectedAudioDuration * 0.75))})
                            </button>
                          </div>

                          {/* Visualizador de onda estilo Instagram */}
                          <div className="studio-ig-waveform" aria-hidden="true">
                            {Array.from({ length: 32 }).map((_, i) => {
                              const heights = [30, 55, 80, 45, 90, 60, 35, 75, 100, 70, 40, 85, 60, 95, 50, 65, 90, 40, 70, 85, 55, 35, 75, 90, 60, 45, 70, 40, 60, 80, 50, 35];
                              const h = heights[i % heights.length];
                              const totalDur = Math.max(1, selectedAudioDuration);
                              const isNearStart = Math.abs(i - Math.round((selectedStartSeconds / totalDur) * 31)) < 3;
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
                              max={Math.max(10, selectedAudioDuration > 5 ? selectedAudioDuration - 5 : selectedAudioDuration)}
                              step="1"
                              value={selectedStartSeconds}
                              onChange={e => {
                                const sec = parseInt(e.target.value, 10);
                                setSelectedStartSeconds(sec);
                                if (audioRef.current) {
                                  audioRef.current.currentTime = sec;
                                }
                              }}
                              className="studio-ig-slider"
                              title={`Inicio de reproducción: ${formatSongTime(selectedStartSeconds)}`}
                            />
                          </div>

                          <div className="studio-ig-trimmer-footer">
                            <button
                              type="button"
                              className={`studio-ig-preview-btn ${playingPreviewUrl === selectedSong.previewUrl ? 'is-playing' : ''}`}
                              onClick={() => togglePreview(selectedSong.previewUrl, selectedStartSeconds)}
                            >
                              {playingPreviewUrl === selectedSong.previewUrl ? (
                                <><Pause size={13} fill="currentColor" /> Pausar muestra</>
                              ) : (
                                <><Play size={13} fill="currentColor" /> Probar desde {formatSongTime(selectedStartSeconds)}</>
                              )}
                            </button>
                            <span className="studio-ig-help-text">
                              Desliza o salta a Inicio, Medio o Final para elegir qué parte sonará ♡
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="studio-selected-song-notice">
                        <Check size={16} />
                        <span><strong>¡Canción lista!</strong> No necesitas enlace. Solo escribe tu dedicatoria abajo.</span>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Opción 2: Poner enlace manual de Spotify */}
              {composeMode === 'link' && (
                <div className="studio-spotify-connect-box">
                  <div className="studio-spotify-connect-header">
                    <Headphones size={15} style={{ color: '#1db954' }} />
                    <span>Enlace oficial de Spotify</span>
                    {inputUrl && spotifyLink(inputUrl) && (
                      <span className="studio-spotify-connected-badge"><Check size={12} /> Conectado</span>
                    )}
                  </div>
                  <p className="studio-spotify-connect-desc">
                    Pega el enlace de la canción para que se reproduzca con el reproductor de Spotify:
                  </p>

                  <div className="studio-spotify-actions-row">
                    <a
                      href={`https://open.spotify.com/search/${encodeURIComponent((inputTitle || searchQuery || 'canción') + ' ' + inputArtist)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="studio-spotify-btn-open"
                    >
                      <ExternalLink size={13} /> 1. Abrir en Spotify
                    </a>
                    <button
                      type="button"
                      className="studio-spotify-btn-paste"
                      onClick={pasteFromClipboard}
                    >
                      <Clipboard size={13} /> 2. Pegar enlace copiado
                    </button>
                  </div>

                  <input
                    className="input"
                    name="url"
                    type="url"
                    required={composeMode === 'link'}
                    placeholder="https://open.spotify.com/track/…"
                    maxLength={500}
                    value={inputUrl}
                    onChange={e => handleUrlInput(e.target.value)}
                    aria-describedby="studio-spotify-help"
                    aria-invalid={!!error}
                  />
                  <span className="studio-input-help" id="studio-spotify-help">
                    Al pegar el enlace, se detectan automáticamente el título, el artista y la carátula oficial.
                  </span>
                </div>
              )}

              {/* Indicador de detección automática */}
              {autoDetectedInfo && composeMode === 'link' && (
                <div className="studio-music-auto-badge">
                  <Check size={14} /> {autoDetectedInfo}
                </div>
              )}

              {previewLoading && (
                <p style={{ fontSize: '12px', color: 'var(--studio-muted)', margin: '0 0 10px' }}>
                  Cargando carátula y datos de Spotify…
                </p>
              )}

              {/* Campos de título y artista */}
              <label className="field">
                Título de la canción
                <input
                  className="input"
                  name="title"
                  placeholder="Nombre de la canción"
                  required
                  maxLength={140}
                  value={inputTitle}
                  onChange={e => setInputTitle(e.target.value)}
                />
              </label>

              <div className="studio-form-row">
                <label className="field">
                  Artista
                  <input
                    className="input"
                    name="artist"
                    placeholder="Nombre del artista"
                    required
                    maxLength={120}
                    value={inputArtist}
                    onChange={e => setInputArtist(e.target.value)}
                  />
                </label>
                <label className="field">
                  Dedicada por
                  {currentUserAuthor ? (
                    <div style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 12px', background: '#fdf2f4', border: '1px solid var(--studio-rose-border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--studio-rose-deep)', gap: '6px' }}>
                      <Heart size={13} fill="currentColor" /> De {currentUserAuthor} para {currentUserAuthor === 'Ale' ? 'Val' : 'Ale'} (Cuenta activa)
                    </div>
                  ) : (
                    <select
                      className="input"
                      name="author"
                      value={inputAuthor}
                      onChange={e => setInputAuthor(e.target.value as StudioAuthor)}
                    >
                      <option value="Ale">De Ale para Val</option>
                      <option value="Val">De Val para Ale</option>
                    </select>
                  )}
                </label>
              </div>

              <label className="field">
                ¿Por qué esta canción? (Tu dedicatoria)
                <textarea
                  className="textarea"
                  name="note"
                  placeholder="Porque cada vez que suena me acuerdo de aquel viaje…"
                  rows={3}
                  required
                  maxLength={2000}
                  value={inputNote}
                  onChange={e => setInputNote(e.target.value)}
                />
              </label>

              {(error || sync.error) && <p className="studio-form-error" role="alert">{error || sync.error}</p>}
              <p className="studio-form-note">
                <ShieldCheck size={14} /> {sync.connected ? "Compartir la guarda para ambos en nuestra galería sincronizada. No se publica en tu perfil de Spotify." : "La dedicatoria queda guardada en este navegador."}
              </p>

              <div className="studio-form-actions">
                <button type="button" className="button-secondary" disabled={sync.busy} onClick={closeCompose}>
                  Cancelar
                </button>
                {sync.connected && (
                  <button type="submit" name="destination" value="local" className="button-secondary" disabled={sync.busy}>
                    Guardar solo aquí
                  </button>
                )}
                <button type="submit" className="button-primary" disabled={sync.busy}>
                  <Heart size={16} /> {sync.busy ? "Confirmando…" : sync.connected ? "Compartir dedicatoria" : "Guardar dedicatoria aquí"}
                </button>
              </div>
            </fieldset>
          </form>
        </StudioDialog>
      )}

      {/* Modal de confirmación para eliminar canción */}
      {songToDelete && (
        <StudioDialog
          title="¿Eliminar esta canción?"
          subtitle={`«${songToDelete.title}» se borrará de nuestra música. Esta acción no se puede deshacer.`}
          onClose={() => setSongToDelete(null)}
        >
          <div className="studio-form-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="button-secondary" onClick={() => setSongToDelete(null)}>
              Cancelar
            </button>
            <button type="button" className="button-destructive" onClick={() => handleDeleteSong(songToDelete)}>
              <Trash2 size={15} /> Eliminar canción
            </button>
          </div>
        </StudioDialog>
      )}
    </section>
  );
}
