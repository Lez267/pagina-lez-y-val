import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Disc3, Download, Headphones, Heart, Music2, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { StudioDialog, StudioLocalNote, StudioSprig, StudioStorageNotice, StudioSyncNotice, StudioShareButton, studioIsDemo } from './LettersPage';
import { prependStudioLocal, spotifyLink, type StudioSong } from '../data/studio-sync';
import { useStudioSync } from './useStudioSync';
import './studio.css';

type Dedication = StudioSong;
const demoDedications: Dedication[] = [{ id: 'song-demo-1', title: 'We Fell in Love in October', artist: 'girl in red', note: 'Una canción que ya tiene su lugar en nuestra historia. Aquí puedes escribir por qué te recuerda a esa persona.', author: 'Ale', url: 'https://open.spotify.com/track/6IPwKM3fUUzlElbvKw2sKl', kind: 'track', createdAt: '2026-01-14T12:00:00Z' }];
const kindNames: Record<Dedication['kind'], string> = { track: 'CANCIÓN', playlist: 'PLAYLIST', album: 'ÁLBUM' };

export default function MusicPage({ namespace }: { namespace: string }) { return <MusicContent key={namespace} namespace={namespace} />; }
function MusicContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:music:v1`, demo ? demoDedications : []);
  const sync = useStudioSync(namespace, 'songs', stored);
  const dedications = sync.rows.map(row => row.item);
  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const startCompose = () => { identity.current = null; setError(''); sync.clearError(); setCompose(true); };
  const [compose, setCompose] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const exportMusic = () => downloadJson('nuestra-historia-canciones.json', { ...sync.exportData, dedications });
  async function saveDedication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const artist = String(data.get('artist') ?? '').trim();
    const note = String(data.get('note') ?? '').trim();
    const link = spotifyLink(String(data.get('url') ?? ''));
    if (!link) { setError('Pega un enlace HTTPS de una canción, playlist o álbum de open.spotify.com.'); form.querySelector<HTMLInputElement>('[name="url"]')?.focus(); return; }
    if (!title || !artist || !note) { setError('Completa el título, el artista o nombre de la playlist y tu dedicatoria.'); return; }
    identity.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const dedication: Dedication = { ...identity.current, title, artist, note, author: data.get('author') === 'Val' ? 'Val' : 'Ale', ...link };
    const localOnly = !sync.connected || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'local';
    if (!localOnly) { if (!await sync.share(dedication)) return; }
    else { try { setStored(prependStudioLocal(stored, dedication)); } catch (failure) { setError((failure as Error).message); return; } }
    setCompose(false);
    setError('');
    setStatus(localOnly ? 'Dedicatoria añadida a este navegador.' : 'Dedicatoria compartida y confirmada.');
    identity.current = null;
  }
  return <section className="studio-page studio-music-page" aria-labelledby="music-title">
    <div className="studio-page-heading"><div><p className="eyebrow"><Music2 size={14} /> NUESTRA BANDA SONORA</p><h1 className="page-title" id="music-title">Hay canciones que<br />suenan a <em>ti.</em></h1><p className="muted studio-intro">Para los viajes, las tardes y todo eso que una canción<br className="studio-desktop-break" /> dice mejor que nosotros.</p></div><button type="button" className="button-primary studio-add-button" onClick={() => { startCompose(); }}><Plus size={17} /> Dedicar una canción</button></div>
    <StudioLocalNote demo={demo} connected={sync.connected} />
    <StudioSyncNotice state={sync.state} error={sync.error} />
    <StudioStorageNotice saved={saved} onExport={exportMusic} />
    <div className="studio-music-banner"><div className="studio-vinyl" aria-hidden="true"><div><Heart size={23} strokeWidth={1.2} /></div></div><div><p className="eyebrow">DARLE PLAY A UN RECUERDO</p><h2>Una canción. Mil maneras<br />de decir <em>te quiero.</em></h2><p>Guarda un enlace de Spotify y la historia que hay detrás.</p></div><StudioSprig /><Sparkles className="studio-banner-sparkle" size={20} aria-hidden="true" /></div>
    <div className="studio-toolbar"><p className="studio-section-label">Nuestras dedicatorias <span>{dedications.length}</span></p>{<button type="button" className="studio-export" onClick={exportMusic}><Download size={14} /> Exportar</button>}</div>
    <div className="studio-music-grid">{dedications.map((dedication, index) => <article className={`card studio-song-card studio-tone-${index % 3}`} key={sync.rows.find(row => row.item.id === dedication.id)?.localId ?? dedication.id}>
      <div className="studio-song-top"><div className="studio-song-cover" aria-hidden="true"><Disc3 size={42} strokeWidth={1} /><span>{String(index + 1).padStart(2, '0')}</span></div><span className="studio-tag">{kindNames[dedication.kind]}</span></div><h2>{dedication.title}</h2><p className="studio-song-artist">{dedication.artist}</p><blockquote>“{dedication.note}”</blockquote><div className="studio-card-bottom"><span className="studio-author"><span>{dedication.author.charAt(0)}</span> De {dedication.author}</span><a className="studio-spotify-link" href={spotifyLink(dedication.url)!.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${dedication.title} en Spotify, en una pestaña nueva`}><Headphones size={15} /> Spotify <ArrowUpRight size={14} /></a></div>
      <div className="studio-card-bottom"><span className="studio-tag">{sync.rows.find(row => row.item.id === dedication.id)?.scope === 'shared' ? 'Compartido' : demo && dedication.id.startsWith('song-demo-') ? 'Ejemplo · solo aquí' : 'Solo aquí'}</span>{sync.connected && sync.rows.find(row => row.item.id === dedication.id)?.hasLocalCopy && <StudioShareButton shared={sync.rows.find(row => row.item.id === dedication.id)?.scope === 'shared'} title={dedication.title} busy={sync.busy} error={sync.error} onShare={async () => { const ok = await sync.share(dedication); if (ok) setStatus('Dedicatoria compartida. El borrador local se conserva.'); return ok; }} />}</div>
    </article>)}</div>
    {dedications.length === 0 && <div className="studio-empty studio-music-empty"><span className="studio-empty-icon"><Headphones size={30} strokeWidth={1.3} /></span><h2>¿Cuál sería nuestra primera canción?</h2><p>Una melodía, una dedicatoria y un enlace para volver a escucharla.</p><button type="button" className="button-secondary" onClick={() => { startCompose(); }}><Plus size={16} /> Añadir una dedicatoria</button><StudioSprig /></div>}
    <p className="studio-footnote"><Music2 size={13} /> Los enlaces se abren en Spotify. Este apartado no conecta tu cuenta ni reproduce música por sí solo.</p>
    <p className="studio-status" role="status">{status}</p>
    {compose && <StudioDialog title="Esta canción me recuerda a ti." subtitle="Guarda una canción, una playlist o un álbum con unas palabras tuyas." busy={sync.busy} onClose={() => setCompose(false)}>
      <form className="studio-form" onSubmit={saveDedication} aria-busy={sync.busy}>
        <fieldset disabled={sync.busy} style={{ display: 'contents' }}>
        <label className="field">Enlace de Spotify<input className="input" name="url" type="url" required placeholder="https://open.spotify.com/track/…" maxLength={500} data-autofocus aria-describedby="studio-spotify-help" aria-invalid={!!error} onChange={() => setError('')} /><span className="studio-input-help" id="studio-spotify-help">Copia el enlace desde Compartir en Spotify.</span></label>
        <label className="field">Título de la canción, playlist o álbum<input className="input" name="title" placeholder="La que siempre cantamos" required maxLength={140} /></label>
        <div className="studio-form-row"><label className="field">Artista o creador<input className="input" name="artist" placeholder="Nombre del artista" required maxLength={120} /></label><label className="field">Dedicada por<select className="input" name="author" defaultValue="Ale"><option>Ale</option><option>Val</option></select></label></div>
        <label className="field">¿Por qué esta canción?<textarea className="textarea" name="note" placeholder="Porque cada vez que suena…" rows={4} required maxLength={2000} /></label>
        {(error || sync.error) && <p className="studio-form-error" role="alert">{error || sync.error}</p>}
        <p className="studio-form-note"><ShieldCheck size={14} /> {sync.connected ? "Compartir la guarda para ambos. Guardar solo aquí conserva un borrador local. No se publica en Spotify." : "La dedicatoria queda en este navegador. No se publica en Spotify ni se envía a la otra persona."}</p>
        <div className="studio-form-actions"><button type="button" className="button-secondary" disabled={sync.busy} onClick={() => setCompose(false)}>Cancelar</button>{sync.connected && <button type="submit" name="destination" value="local" className="button-secondary" disabled={sync.busy}>Guardar solo aquí</button>}<button type="submit" className="button-primary" disabled={sync.busy}><Heart size={16} /> {sync.busy ? "Confirmando…" : sync.connected ? "Compartir dedicatoria" : "Guardar dedicatoria aquí"}</button></div>
        </fieldset>
      </form>
    </StudioDialog>}
  </section>;
}
