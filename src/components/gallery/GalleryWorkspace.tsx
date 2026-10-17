import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Flower2, FolderHeart, Heart, ImagePlus, Images, Search, Sparkles } from 'lucide-react';
import { galleryAlbums, galleryCover, galleryDateLabel, galleryOnThisDay, galleryStoryAge, galleryToday, recentGalleryStories, upcomingGalleryReminders, type GalleryAlbum, type GalleryCallbacks, type GalleryMemory } from '../../lib/gallery';
import { GalleryEditDialog, GalleryPublicationDialog } from './GalleryEditor';
import { GalleryThumbnail, GalleryViewer } from './GalleryViewer';
import './gallery.css';

export function GalleryStories({ memories, onOpen, now = new Date() }: { memories: GalleryMemory[]; onOpen: (memory: GalleryMemory, stories: GalleryMemory[]) => void; now?: Date }) {
  const stories = recentGalleryStories(memories, now);
  if (!stories.length) return null;
  return <section className="galleryx-stories" aria-label="Historias publicadas en los últimos siete días"><div className="galleryx-small-heading"><div><Sparkles size={16} aria-hidden="true" /><h2>Recién florecidos</h2></div><span>Últimos 7 días de publicaciones</span></div><div className="galleryx-story-row">{stories.map(memory => <button type="button" className="galleryx-story" key={memory.id} onClick={() => onOpen(memory, stories)} aria-label={`Ver historia: ${memory.title}. ${galleryStoryAge(memory, now)}`}><span className="galleryx-story-ring"><GalleryThumbnail media={galleryCover(memory)} /></span><strong>{memory.title}</strong><span>{galleryStoryAge(memory, now)}</span></button>)}</div></section>;
}

export function GalleryOnThisDay({ memories, onOpen, now = new Date(), onEdit }: { memories: GalleryMemory[]; onOpen: (memory: GalleryMemory, matches: GalleryMemory[]) => void; now?: Date; onEdit?: (memory: GalleryMemory) => void }) {
  const today = galleryToday(now);
  const matches = galleryOnThisDay(memories, today);
  const upcoming = upcomingGalleryReminders(memories, today);
  if (!matches.length && !upcoming.length) return null;
  return <section className="galleryx-date-garden" aria-label="Recuerdos y fechas especiales">
    {matches.length > 0 && <div className="galleryx-on-this-day"><div className="galleryx-date-intro"><span className="eyebrow"><CalendarDays size={13} aria-hidden="true" /> EL CALENDARIO NOS DEVUELVE ALGO BONITO</span><h2>Un día como <em>hoy.</em></h2><p>Hay días que merecen vivirse otra vez.</p></div><div className="galleryx-anniversary-row">{matches.map(memory => { const years = Number(today.slice(0, 4)) - Number(memory.date.slice(0, 4)); return <button type="button" key={memory.id} className="galleryx-anniversary" onClick={() => onOpen(memory, matches)}><GalleryThumbnail media={galleryCover(memory)} /><span><small>HACE {years} {years === 1 ? 'AÑO' : 'AÑOS'}</small><strong>{memory.title}</strong><span>{galleryDateLabel(memory.date)}</span></span><ArrowRight size={15} aria-hidden="true" /></button>; })}</div></div>}
    {upcoming.length > 0 && <div className="galleryx-reminders"><div className="galleryx-small-heading"><div><Bell size={15} aria-hidden="true" /><h2>Fechitas para recordar</h2></div><span>Próximos 30 días · dentro de la galería</span></div><div className="galleryx-reminder-list">{upcoming.map(({ memory, reminder, nextDate, daysAway }) => <div className="galleryx-reminder-card" key={`${memory.id}-${nextDate}`}><CalendarDays size={19} aria-hidden="true" /><button type="button" onClick={() => onOpen(memory, [memory])}><strong>{reminder.label}</strong><span>{galleryDateLabel(nextDate)} · {daysAway === 0 ? 'Hoy' : daysAway === 1 ? 'Mañana' : `En ${daysAway} días`}</span></button>{onEdit && <button type="button" className="galleryx-reminder-edit" onClick={() => onEdit(memory)} aria-label={`Editar fecha: ${reminder.label}`}>Editar</button>}</div>)}</div></div>}
  </section>;
}

export function GalleryAlbumGrid({ albums, onOpen }: { albums: GalleryAlbum[]; onOpen: (name: string) => void }) {
  return <div className="galleryx-album-grid">{albums.map(album => <button type="button" className="galleryx-album" key={album.name} onClick={() => onOpen(album.name)}><span className="galleryx-album-photo"><GalleryThumbnail media={album.cover} /><span className="galleryx-album-icon"><FolderHeart size={20} aria-hidden="true" /></span></span><span className="galleryx-album-copy"><strong>{album.name}</strong><span>{album.memories.length} {album.memories.length === 1 ? 'recuerdo' : 'recuerdos'} · {album.fileCount} {album.fileCount === 1 ? 'archivo' : 'archivos'}</span></span><ArrowRight size={17} aria-hidden="true" /></button>)}</div>;
}

export type GalleryWorkspaceProps = GalleryCallbacks & {
  memories: GalleryMemory[];
  /** Persistent favorites, if enabled, remain the responsibility of the caller. */
  favoriteIds?: readonly string[];
  onToggleFavorite?: (memory: GalleryMemory) => Promise<void> | void;
  now?: Date;
  canPreparePublication?: boolean;
  publicationStatus?: string;
};
export function GalleryWorkspace({ memories, onEdit, onPublish, favoriteIds = [], onToggleFavorite, now = new Date(), canPreparePublication = true, publicationStatus = '' }: GalleryWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [album, setAlbum] = useState('');
  const [view, setView] = useState<'memories' | 'albums'>('memories');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerIds, setViewerIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<GalleryMemory | null>(null);
  const [publication, setPublication] = useState(false);
  const [notice, setNotice] = useState('');
  const [favoritePending, setFavoritePending] = useState<string | null>(null);
  const searchId = useId();
  const albums = useMemo(() => galleryAlbums(memories), [memories]);
  const visible = memories.filter(memory => (!album || memory.album.trim() === album) && (filter !== 'photos' || memory.media.some(media => media.type === 'image')) && (filter !== 'videos' || memory.media.some(media => media.type === 'video')) && (filter !== 'juntos' || memory.tags.includes('juntos')) && (filter !== 'dates' || memory.tags.includes('dates')) && (filter !== 'favorites' || favoriteIds.includes(memory.id)) && `${memory.title} ${memory.description} ${memory.location} ${memory.date} ${memory.album} ${memory.tags.join(' ')} ${memory.author}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))).sort((a, b) => b.date.localeCompare(a.date));
  const visibleAlbums = albums.filter(item => item.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const viewerMemories = viewerIds.map(id => memories.find(memory => memory.id === id)).filter((memory): memory is GalleryMemory => !!memory);
  function openMemory(memory: GalleryMemory, list = visible) { setViewerIds(list.map(item => item.id)); setViewerId(memory.id); }
  function editMemory(memory: GalleryMemory) { setViewerId(null); setEditing(memory); }
  async function toggleFavorite(memory: GalleryMemory) {
    if (!onToggleFavorite || favoritePending) return;
    setFavoritePending(memory.id);
    try { await onToggleFavorite(memory); setNotice(favoriteIds.includes(memory.id) ? 'Recuerdo retirado de favoritos.' : 'Recuerdo añadido a favoritos.'); }
    catch { setNotice('No pudimos actualizar el favorito. Inténtalo de nuevo.'); }
    finally { setFavoritePending(null); }
  }
  const filterOptions = [['all', 'Todos'], ['photos', 'Fotografías'], ['videos', 'Videos'], ['juntos', 'Juntos'], ['dates', 'Citas'], ...(onToggleFavorite ? [['favorites', 'Favoritos']] : [])];
  return <section className="galleryx-workspace" aria-labelledby="galleryx-title"><header className="galleryx-page-heading"><div><span className="eyebrow"><Flower2 size={13} aria-hidden="true" /> DONDE VIVEN NUESTROS MOMENTOS</span><h1 className="page-title" id="galleryx-title">Nuestro jardín de <em>recuerdos.</em></h1><p className="muted">Fotos, videos y esos detalles que hacen que un día se quede.</p></div>{canPreparePublication && <button type="button" className="button button-primary" onClick={() => setPublication(true)}><ImagePlus size={16} /> {onPublish ? 'Guardar un recuerdo' : 'Preparar un recuerdo'}</button>}</header>
    <GalleryStories memories={memories} onOpen={openMemory} now={now} />
    {!search.trim() && !album && filter === 'all' && view === 'memories' && <GalleryOnThisDay memories={memories} onOpen={openMemory} now={now} onEdit={onEdit ? editMemory : undefined} />}
    <div className="galleryx-browser-toolbar"><label className="galleryx-search" htmlFor={searchId}><Search size={17} aria-hidden="true" /><input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'albums' ? 'Buscar una colección…' : 'Un momento, un lugar, una fecha…'} aria-label={view === 'albums' ? 'Buscar colecciones' : 'Buscar recuerdos'} /></label><div className="galleryx-view-switch" aria-label="Vista de la galería"><button type="button" aria-pressed={view === 'memories'} onClick={() => setView('memories')}><Images size={15} aria-hidden="true" /> Recuerdos</button><button type="button" aria-pressed={view === 'albums'} onClick={() => { setView('albums'); setAlbum(''); }}><FolderHeart size={15} aria-hidden="true" /> Colecciones</button></div></div>
    {view === 'memories' && <>{album && <div className="galleryx-album-heading"><button type="button" onClick={() => { setAlbum(''); setView('albums'); }}><ArrowLeft size={15} aria-hidden="true" /> Todas las colecciones</button><h2>{album}</h2></div>}<div className="galleryx-filter-row"><div>{filterOptions.map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{filter === value && <Check size={12} aria-hidden="true" />}{label}</button>)}</div><span>{visible.length} {visible.length === 1 ? 'recuerdo' : 'recuerdos'}</span></div><div className="galleryx-memory-grid">{visible.map(memory => <article className="galleryx-memory-card" key={memory.id}><button type="button" className="galleryx-memory-open" onClick={() => openMemory(memory)} aria-label={`Abrir recuerdo: ${memory.title}`}><span className="galleryx-memory-photo"><GalleryThumbnail media={galleryCover(memory)} title={memory.title} />{memory.media.length > 1 && <span className="galleryx-file-count"><Images size={11} aria-hidden="true" /> {memory.media.length}</span>}</span><span className="galleryx-memory-copy"><span className="galleryx-memory-date">{galleryDateLabel(memory.date)}</span><h2>{memory.title}</h2><span className="galleryx-memory-description">{memory.description}</span><span className="galleryx-memory-collection">{memory.album || memory.location || 'Un capítulo de nosotros'}</span></span></button>{onToggleFavorite && <button type="button" className="galleryx-favorite" aria-pressed={favoriteIds.includes(memory.id)} disabled={favoritePending !== null} aria-label={`${favoriteIds.includes(memory.id) ? 'Quitar de' : 'Añadir a'} favoritos: ${memory.title}`} onClick={() => void toggleFavorite(memory)}><Heart size={16} fill={favoriteIds.includes(memory.id) ? 'currentColor' : 'none'} /></button>}</article>)}</div>{!visible.length && <div className="galleryx-empty"><Flower2 size={35} strokeWidth={1.2} /><h2>{memories.length ? 'Busquemos otro rincón del jardín.' : 'Aquí empieza otro capítulo.'}</h2><p>{memories.length ? 'Prueba otra fecha, palabra o filtro para encontrar ese momento.' : 'Sus recuerdos encontrarán aquí un lugar para florecer.'}</p>{memories.length > 0 && <button type="button" className="text-link" onClick={() => { setSearch(''); setFilter('all'); setAlbum(''); }}>Ver todos los recuerdos <ArrowRight size={14} /></button>}</div>}</>}
    {view === 'albums' && <><p className="galleryx-collection-intro">Un lugar para cada pequeña historia. Las colecciones se forman con el álbum de cada recuerdo.</p><GalleryAlbumGrid albums={visibleAlbums} onOpen={name => { setAlbum(name); setView('memories'); setSearch(''); setFilter('all'); }} />{!visibleAlbums.length && <div className="galleryx-empty"><FolderHeart size={35} strokeWidth={1.2} /><h2>{albums.length ? 'No encontramos esa colección.' : 'Cada historia puede tener su álbum.'}</h2><p>{albums.length ? 'Prueba otro nombre.' : 'Añade un nombre de álbum al preparar o editar los detalles de un recuerdo.'}</p></div>}</>}
    <p className="galleryx-notice" role="status">{notice}</p>
    {viewerId && <GalleryViewer memories={viewerMemories} memoryId={viewerId} onNavigate={setViewerId} onClose={() => setViewerId(null)} onEdit={onEdit ? editMemory : undefined} />}
    {editing && onEdit && <GalleryEditDialog key={editing.id} memory={editing} albums={albums.map(item => item.name)} onSave={async (id, changes) => { await onEdit(id, changes); setNotice('Los detalles del recuerdo se guardaron.'); }} onClose={() => setEditing(null)} />}
    {publication && <GalleryPublicationDialog status={publicationStatus} albums={albums.map(item => item.name)} onSubmit={onPublish ? async draft => { await onPublish(draft); setNotice('El recuerdo se guardó.'); } : undefined} onClose={() => setPublication(false)} />}
  </section>;
}
