import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Disc3, Download, Headphones, Heart, Music2, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { StudioDialog, StudioLocalNote, StudioSprig, StudioStorageNotice, studioIsDemo } from './LettersPage';
import './studio.css';

type Dedication = { id: string; title: string; artist: string; note: string; author: 'Ale' | 'Val'; url: string; kind: 'track' | 'playlist' | 'album'; createdAt: string };
const demoDedications: Dedication[] = [{ id: 'song-demo-1', title: 'We Fell in Love in October', artist: 'girl in red', note: 'Una canción que ya tiene su lugar en nuestra historia. Aquí puedes escribir por qué te recuerda a esa persona.', author: 'Ale', url: 'https://open.spotify.com/track/6IPwKM3fUUzlElbvKw2sKl', kind: 'track', createdAt: '2026-01-14T12:00:00Z' }];
function spotifyLink(raw: string): { url: string; kind: Dedication['kind'] } | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-zA-Z-]+\/)?(track|playlist|album)\/([a-zA-Z0-9]+)\/?$/);
    if (!match) return null;
    return { url: `https://open.spotify.com/${match[1]}/${match[2]}`, kind: match[1] as Dedication['kind'] };
  } catch { return null; }
}
function safeDedications(value: unknown): Dedication[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item: unknown): item is Dedication => {
    if (!item || typeof item !== 'object') return false;
    const value = item as Record<string, unknown>;
    return ['id', 'title', 'artist', 'note', 'url', 'createdAt'].every(key => typeof value[key] === 'string') && (value.author === 'Ale' || value.author === 'Val') && ['track', 'playlist', 'album'].includes(String(value.kind)) && !!spotifyLink(String(value.url));
  });
}
const kindNames: Record<Dedication['kind'], string> = { track: 'CANCIÓN', playlist: 'PLAYLIST', album: 'ÁLBUM' };

export default function MusicPage({ namespace }: { namespace: string }) { return <MusicContent key={namespace} namespace={namespace} />; }
function MusicContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<Dedication[]>(`${namespace}:music:v1`, demo ? demoDedications : []);
  const dedications = safeDedications(stored);
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const exportMusic = () => downloadJson('nuestra-historia-canciones.json', { version: 1, dedications });
  function saveDedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const artist = String(data.get('artist') ?? '').trim();
    const note = String(data.get('note') ?? '').trim();
    const link = spotifyLink(String(data.get('url') ?? ''));
    if (!link) { setError('Pega un enlace HTTPS de una canción, playlist o álbum de open.spotify.com.'); form.querySelector<HTMLInputElement>('[name="url"]')?.focus(); return; }
    if (!title || !artist || !note) { setError('Completa el título, el artista o nombre de la playlist y tu dedicatoria.'); return; }
    const dedication: Dedication = { id: crypto.randomUUID(), title, artist, note, author: data.get('author') === 'Val' ? 'Val' : 'Ale', ...link, createdAt: new Date().toISOString() };
    setStored(previous => [dedication, ...safeDedications(previous)]);
    setCompose(false);
    setError('');
    setStatus('Dedicatoria añadida a este navegador.');
  }
  return <section className="studio-page studio-music-page" aria-labelledby="music-title">
    <div className="studio-page-heading"><div><p className="eyebrow"><Music2 size={14} /> NUESTRA BANDA SONORA</p><h1 className="page-title" id="music-title">Hay canciones que<br />suenan a <em>ti.</em></h1><p className="muted studio-intro">Para los viajes, las tardes y todo eso que una canción<br className="studio-desktop-break" /> dice mejor que nosotros.</p></div><button type="button" className="button-primary studio-add-button" onClick={() => { setError(''); setCompose(true); }}><Plus size={17} /> Dedicar una canción</button></div>
    <StudioLocalNote demo={demo} />
    <StudioStorageNotice saved={saved} onExport={exportMusic} />
    <div className="studio-music-banner"><div className="studio-vinyl" aria-hidden="true"><div><Heart size={23} strokeWidth={1.2} /></div></div><div><p className="eyebrow">DARLE PLAY A UN RECUERDO</p><h2>Una canción. Mil maneras<br />de decir <em>te quiero.</em></h2><p>Guarda un enlace de Spotify y la historia que hay detrás.</p></div><StudioSprig /><Sparkles className="studio-banner-sparkle" size={20} aria-hidden="true" /></div>
    <div className="studio-toolbar"><p className="studio-section-label">Nuestras dedicatorias <span>{dedications.length}</span></p>{dedications.length > 0 && <button type="button" className="studio-export" onClick={exportMusic}><Download size={14} /> Exportar</button>}</div>
    <div className="studio-music-grid">{dedications.map((dedication, index) => <article className={`card studio-song-card studio-tone-${index % 3}`} key={dedication.id}>
      <div className="studio-song-top"><div className="studio-song-cover" aria-hidden="true"><Disc3 size={42} strokeWidth={1} /><span>{String(index + 1).padStart(2, '0')}</span></div><span className="studio-tag">{kindNames[dedication.kind]}</span></div><h2>{dedication.title}</h2><p className="studio-song-artist">{dedication.artist}</p><blockquote>“{dedication.note}”</blockquote><div className="studio-card-bottom"><span className="studio-author"><span>{dedication.author.charAt(0)}</span> De {dedication.author}</span><a className="studio-spotify-link" href={spotifyLink(dedication.url)!.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${dedication.title} en Spotify, en una pestaña nueva`}><Headphones size={15} /> Spotify <ArrowUpRight size={14} /></a></div>
    </article>)}</div>
    {dedications.length === 0 && <div className="studio-empty studio-music-empty"><span className="studio-empty-icon"><Headphones size={30} strokeWidth={1.3} /></span><h2>¿Cuál sería nuestra primera canción?</h2><p>Una melodía, una dedicatoria y un enlace para volver a escucharla.</p><button type="button" className="button-secondary" onClick={() => { setError(''); setCompose(true); }}><Plus size={16} /> Añadir una dedicatoria</button><StudioSprig /></div>}
    <p className="studio-footnote"><Music2 size={13} /> Los enlaces se abren en Spotify. Este apartado no conecta tu cuenta ni reproduce música por sí solo.</p>
    <p className="studio-status" role="status">{status}</p>
    {compose && <StudioDialog title="Esta canción me recuerda a ti." subtitle="Guarda una canción, una playlist o un álbum con unas palabras tuyas." onClose={() => setCompose(false)}>
      <form className="studio-form" onSubmit={saveDedication}>
        <label className="field">Enlace de Spotify<input className="input" name="url" type="url" required placeholder="https://open.spotify.com/track/…" maxLength={500} data-autofocus aria-describedby="studio-spotify-help" aria-invalid={!!error} onChange={() => setError('')} /><span className="studio-input-help" id="studio-spotify-help">Copia el enlace desde Compartir en Spotify.</span></label>
        <label className="field">Título de la canción, playlist o álbum<input className="input" name="title" placeholder="La que siempre cantamos" required maxLength={140} /></label>
        <div className="studio-form-row"><label className="field">Artista o creador<input className="input" name="artist" placeholder="Nombre del artista" required maxLength={120} /></label><label className="field">Dedicada por<select className="input" name="author" defaultValue="Ale"><option>Ale</option><option>Val</option></select></label></div>
        <label className="field">¿Por qué esta canción?<textarea className="textarea" name="note" placeholder="Porque cada vez que suena…" rows={4} required maxLength={2000} /></label>
        {error && <p className="studio-form-error" role="alert">{error}</p>}
        <p className="studio-form-note"><ShieldCheck size={14} /> La dedicatoria queda en este navegador. No se publica en Spotify ni se envía a la otra persona.</p>
        <div className="studio-form-actions"><button type="button" className="button-secondary" onClick={() => setCompose(false)}>Cancelar</button><button type="submit" className="button-primary"><Heart size={16} /> Guardar dedicatoria aquí</button></div>
      </form>
    </StudioDialog>}
  </section>;
}
