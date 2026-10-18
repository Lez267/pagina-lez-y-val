import { useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Flower2, FolderHeart, Heart, ImagePlus, Images, Search, Sparkles } from 'lucide-react';
import { galleryAlbums, galleryCover, galleryDateLabel, galleryOnThisDay, galleryStoryAge, galleryToday, recentGalleryStories, upcomingGalleryReminders, type GalleryAlbum, type GalleryCallbacks, type GalleryMemory } from '../../lib/gallery';
import { GalleryEditDialog, GalleryPublicationDialog } from './GalleryEditor';
import { GalleryThumbnail, GalleryViewer } from './GalleryViewer';
import './gallery.css';

export function GalleryStories({ memories, onOpen, now = new Date() }: { memories: GalleryMemory[]; onOpen: (memory: GalleryMemory, stories: GalleryMemory[]) => void; now?: Date }) {
  const stories = recentGalleryStories(memories, now);
  if (!stories.length) return null;
  return <section className="galleryx-stories" aria-label="Historias publicadas en los últimos siete días"><div className="galleryx-small-heading"><div><Sparkles size={16} aria-hidden="true" /><h2>Recuerdos recientes</h2></div><span>Últimos 7 días</span></div><div className="galleryx-story-row">{stories.map((memory, index) => <button type="button" className="galleryx-story" key={memory.id} style={{ '--story-idx': Math.min(index, 12) } as React.CSSProperties} onClick={() => onOpen(memory, stories)} aria-label={`Ver historia: ${memory.title}. ${galleryStoryAge(memory, now)}`}><span className="galleryx-story-ring"><GalleryThumbnail media={galleryCover(memory)} /></span><strong>{memory.title}</strong><span>{galleryStoryAge(memory, now)}</span></button>)}</div></section>;
}

export function GalleryOnThisDay({ memories, onOpen, now = new Date(), onEdit }: { memories: GalleryMemory[]; onOpen: (memory: GalleryMemory, matches: GalleryMemory[]) => void; now?: Date; onEdit?: (memory: GalleryMemory) => void }) {
  const today = galleryToday(now);
  const matches = galleryOnThisDay(memories, today);
  const upcoming = upcomingGalleryReminders(memories, today);
  if (!matches.length && !upcoming.length) return null;
  return <section className="galleryx-date-garden" aria-label="Recuerdos y fechas especiales">
    {matches.length > 0 && <div className="galleryx-on-this-day"><div className="galleryx-date-intro"><h2>Un día como <em>hoy</em></h2><p>Recuerdos que ocurrieron en esta misma fecha.</p></div><div className="galleryx-anniversary-row">{matches.map(memory => { const years = Number(today.slice(0, 4)) - Number(memory.date.slice(0, 4)); return <button type="button" key={memory.id} className="galleryx-anniversary" onClick={() => onOpen(memory, matches)}><GalleryThumbnail media={galleryCover(memory)} /><span><small>Hace {years} {years === 1 ? 'año' : 'años'}</small><strong>{memory.title}</strong><span>{galleryDateLabel(memory.date)}</span></span><ArrowRight size={15} aria-hidden="true" /></button>; })}</div></div>}
    {upcoming.length > 0 && <div className="galleryx-reminders"><div className="galleryx-small-heading"><div><Bell size={15} aria-hidden="true" /><h2>Fechas especiales</h2></div><span>Próximos 30 días</span></div><div className="galleryx-reminder-list">{upcoming.map(({ memory, reminder, nextDate, daysAway }) => <div className="galleryx-reminder-card" key={`${memory.id}-${nextDate}`}><CalendarDays size={19} aria-hidden="true" /><button type="button" onClick={() => onOpen(memory, [memory])}><strong>{reminder.label}</strong><span>{galleryDateLabel(nextDate)} · {daysAway === 0 ? 'Hoy' : daysAway === 1 ? 'Mañana' : `En ${daysAway} días`}</span></button>{onEdit && <button type="button" className="galleryx-reminder-edit" onClick={() => onEdit(memory)} aria-label={`Editar fecha: ${reminder.label}`}>Editar</button>}</div>)}</div></div>}
  </section>;
}

export function GalleryAlbumGrid({ albums, onOpen }: { albums: GalleryAlbum[]; onOpen: (name: string) => void }) {
  return <div className="galleryx-album-grid">{albums.map((album, index) => <button type="button" className="galleryx-album" key={album.name} style={{ '--album-idx': Math.min(index, 12), '--album-rot': `${((index % 4) - 1.5) * 1.2}deg` } as React.CSSProperties} onClick={() => onOpen(album.name)}><span className="galleryx-album-photo"><GalleryThumbnail media={album.cover} /><span className="galleryx-album-icon"><FolderHeart size={20} aria-hidden="true" /></span></span><span className="galleryx-album-copy"><strong>{album.name}</strong><span>{album.memories.length} {album.memories.length === 1 ? 'recuerdo' : 'recuerdos'} · {album.fileCount} {album.fileCount === 1 ? 'archivo' : 'archivos'}</span></span><ArrowRight size={17} aria-hidden="true" /></button>)}</div>;
}

export type GalleryWorkspaceProps = GalleryCallbacks & {
  memories: GalleryMemory[];
  /** Persistent favorites, if enabled, remain the responsibility of the caller. */
  favoriteIds?: readonly string[];
  aleFavoriteIds?: readonly string[];
  valFavoriteIds?: readonly string[];
  activePlayer?: 'ale' | 'valeria';
  onToggleFavorite?: (memory: GalleryMemory) => Promise<void> | void;
  now?: Date;
  canPreparePublication?: boolean;
  publicationStatus?: string;
};
export function GalleryWorkspace({
  memories,
  onEdit,
  onPublish,
  favoriteIds = [],
  aleFavoriteIds = [],
  valFavoriteIds = [],
  activePlayer = 'ale',
  onToggleFavorite,
  now = new Date(),
  canPreparePublication = true,
  publicationStatus = ''
}: GalleryWorkspaceProps) {
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

  const isAle = activePlayer === 'ale';
  const allFavoriteIds = useMemo(
    () => Array.from(new Set([...aleFavoriteIds, ...valFavoriteIds, ...favoriteIds])),
    [aleFavoriteIds, valFavoriteIds, favoriteIds]
  );

  const aleMemories = useMemo(
    () => memories.filter(m => aleFavoriteIds.includes(m.id)).sort((a, b) => b.date.localeCompare(a.date)),
    [memories, aleFavoriteIds]
  );
  const valMemories = useMemo(
    () => memories.filter(m => valFavoriteIds.includes(m.id)).sort((a, b) => b.date.localeCompare(a.date)),
    [memories, valFavoriteIds]
  );

  const aleAlbum: GalleryAlbum = useMemo(() => {
    const memoryWithMedia = aleMemories.find(m => m.media && m.media.length > 0) ?? aleMemories[0];
    return {
      name: 'Favoritos de Alejandro',
      memories: aleMemories,
      cover: memoryWithMedia ? galleryCover(memoryWithMedia) : undefined,
      fileCount: aleMemories.reduce((count, item) => count + (item.media?.length || 0), 0),
    };
  }, [aleMemories]);

  const valAlbum: GalleryAlbum = useMemo(() => {
    const memoryWithMedia = valMemories.find(m => m.media && m.media.length > 0) ?? valMemories[0];
    return {
      name: 'Favoritos de Valeria',
      memories: valMemories,
      cover: memoryWithMedia ? galleryCover(memoryWithMedia) : undefined,
      fileCount: valMemories.reduce((count, item) => count + (item.media?.length || 0), 0),
    };
  }, [valMemories]);

  const albums = useMemo(() => galleryAlbums(memories), [memories]);

  const isFavoritesFilter = filter.startsWith('favorites');

  const visible = memories.filter(memory => {
    if (album && memory.album.trim() !== album) return false;
    if (filter === 'photos' && !memory.media.some(media => media.type === 'image')) return false;
    if (filter === 'videos' && !memory.media.some(media => media.type === 'video')) return false;
    if (filter === 'juntos' && !memory.tags.includes('juntos')) return false;
    if (filter === 'dates' && !memory.tags.includes('dates')) return false;
    if (filter === 'favorites' && !allFavoriteIds.includes(memory.id)) return false;
    if (filter === 'favorites-ale' && !aleFavoriteIds.includes(memory.id)) return false;
    if (filter === 'favorites-val' && !valFavoriteIds.includes(memory.id)) return false;

    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return true;
    const searchable = `${memory.title} ${memory.description} ${memory.location} ${memory.date} ${memory.album} ${memory.tags.join(' ')} ${memory.author}`.toLocaleLowerCase('es');
    return searchable.includes(query);
  }).sort((a, b) => b.date.localeCompare(a.date));

  const visibleAlbums = albums.filter(item => item.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const viewerMemories = viewerIds.map(id => memories.find(memory => memory.id === id)).filter((memory): memory is GalleryMemory => !!memory);
  function openMemory(memory: GalleryMemory, list = visible) { setViewerIds(list.map(item => item.id)); setViewerId(memory.id); }
  function editMemory(memory: GalleryMemory) { setViewerId(null); setEditing(memory); }

  async function toggleFavorite(memory: GalleryMemory) {
    if (!onToggleFavorite || favoritePending) return;
    setFavoritePending(memory.id);
    try {
      await onToggleFavorite(memory);
      setNotice('');
    } catch {
      setNotice('No pudimos actualizar el favorito. Inténtalo de nuevo.');
    } finally {
      setFavoritePending(null);
    }
  }

  const filterOptions = [
    ['all', 'Todos'],
    ['photos', 'Fotografías'],
    ['videos', 'Videos'],
    ['juntos', 'Juntos'],
    ['dates', 'Citas'],
    ...(onToggleFavorite ? [['favorites', 'Favoritos']] : [])
  ];

  return <section className="galleryx-workspace" aria-labelledby="galleryx-title">
    <header className="galleryx-page-heading">
      <div>
        <h1 className="page-title" id="galleryx-title">Nuestra galería de <em>fotos y momentos</em></h1>
        <p className="muted">Cada foto, video y detalle de todo lo que hemos vivido juntos.</p>
      </div>
      {canPreparePublication && <button type="button" className="button button-primary" onClick={() => setPublication(true)}><ImagePlus size={16} /> {onPublish ? 'Guardar un recuerdo' : 'Preparar un recuerdo'}</button>}
    </header>

    <GalleryStories memories={memories} onOpen={openMemory} now={now} />
    {!search.trim() && !album && filter === 'all' && view === 'memories' && <GalleryOnThisDay memories={memories} onOpen={openMemory} now={now} onEdit={onEdit ? editMemory : undefined} />}

    <div className="galleryx-browser-toolbar">
      <label className="galleryx-search" htmlFor={searchId}>
        <Search size={17} aria-hidden="true" />
        <input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'albums' ? 'Buscar una colección…' : 'Un momento, un lugar, una fecha…'} aria-label={view === 'albums' ? 'Buscar colecciones' : 'Buscar recuerdos'} />
      </label>
      <div className="galleryx-view-switch" aria-label="Vista de la galería">
        <button type="button" aria-pressed={view === 'memories'} onClick={() => setView('memories')}><Images size={15} aria-hidden="true" /> Recuerdos</button>
        <button type="button" aria-pressed={view === 'albums'} onClick={() => { setView('albums'); setAlbum(''); }}><FolderHeart size={15} aria-hidden="true" /> Colecciones</button>
      </div>
    </div>

    {view === 'memories' && <>
      {album && (
        <div className="galleryx-album-heading">
          <button type="button" onClick={() => { setAlbum(''); setView('albums'); }}><ArrowLeft size={15} aria-hidden="true" /> Todas las colecciones</button>
          <h2>{album}</h2>
        </div>
      )}

      <div className="galleryx-filter-row">
        <div>
          {filterOptions.map(([value, label]) => {
            const isActive = filter === value || (value === 'favorites' && isFavoritesFilter);
            return (
              <button
                type="button"
                key={value}
                aria-pressed={isActive}
                onClick={() => setFilter(value)}
              >
                {isActive && <Check size={12} aria-hidden="true" />}
                {label}
              </button>
            );
          })}
        </div>
        <span>{visible.length} {visible.length === 1 ? 'recuerdo' : 'recuerdos'}</span>
      </div>

      {/* Showcase de Álbumes de Favoritos cuando está activo el filtro de Favoritos */}
      {isFavoritesFilter && !album && (
        <div className="galleryx-favorites-showcase">
          <div className="galleryx-favorites-header">
            <div className="galleryx-favorites-title-wrap">
              <span className="galleryx-fav-sparkle-icon">
                <Heart size={18} fill="currentColor" />
              </span>
              <div>
                <h2 className="galleryx-fav-heading">Nuestros Recuerdos Favoritos</h2>
                <p className="galleryx-fav-sub">Cada quien tiene su propio álbum de fotos favoritas guardadas con amor.</p>
              </div>
            </div>
            <span className="galleryx-fav-session-pill">
              Sesión activa: <strong>{isAle ? 'Alejandro' : 'Valeria'}</strong>
            </span>
          </div>

          <div className="galleryx-favorite-albums-duo">
            {/* Álbum Favoritos de Alejandro */}
            <button
              type="button"
              className={`galleryx-fav-album-card ale-card ${filter === 'favorites-ale' ? 'is-active' : ''}`}
              onClick={() => setFilter(filter === 'favorites-ale' ? 'favorites' : 'favorites-ale')}
              aria-pressed={filter === 'favorites-ale'}
            >
              <div className="galleryx-fav-album-cover">
                <GalleryThumbnail media={aleAlbum.cover} title="Favoritos de Alejandro" />
                <span className="galleryx-fav-album-tag ale-tag">
                  <Heart size={12} fill="currentColor" /> Alejandro
                </span>
              </div>
              <div className="galleryx-fav-album-info">
                <div className="galleryx-fav-album-title-row">
                  <h3>Favoritos de Alejandro</h3>
                  <span className="galleryx-fav-album-count">{aleFavoriteIds.length}</span>
                </div>
                <p>{aleFavoriteIds.length === 1 ? '1 recuerdo favorito' : `${aleFavoriteIds.length} recuerdos favoritos`}</p>
                <span className="galleryx-fav-album-action">
                  {filter === 'favorites-ale' ? '✓ Viendo este álbum' : 'Abrir álbum de Alejandro →'}
                </span>
              </div>
            </button>

            {/* Álbum Favoritos de Valeria */}
            <button
              type="button"
              className={`galleryx-fav-album-card val-card ${filter === 'favorites-val' ? 'is-active' : ''}`}
              onClick={() => setFilter(filter === 'favorites-val' ? 'favorites' : 'favorites-val')}
              aria-pressed={filter === 'favorites-val'}
            >
              <div className="galleryx-fav-album-cover">
                <GalleryThumbnail media={valAlbum.cover} title="Favoritos de Valeria" />
                <span className="galleryx-fav-album-tag val-tag">
                  <Heart size={12} fill="currentColor" /> Valeria
                </span>
              </div>
              <div className="galleryx-fav-album-info">
                <div className="galleryx-fav-album-title-row">
                  <h3>Favoritos de Valeria</h3>
                  <span className="galleryx-fav-album-count">{valFavoriteIds.length}</span>
                </div>
                <p>{valFavoriteIds.length === 1 ? '1 recuerdo favorito' : `${valFavoriteIds.length} recuerdos favoritos`}</p>
                <span className="galleryx-fav-album-action">
                  {filter === 'favorites-val' ? '✓ Viendo este álbum' : 'Abrir álbum de Valeria →'}
                </span>
              </div>
            </button>
          </div>

          <div className="galleryx-fav-subtabs" role="tablist" aria-label="Filtro de álbumes favoritos">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'favorites'}
              className={`fav-subtab ${filter === 'favorites' ? 'active' : ''}`}
              onClick={() => setFilter('favorites')}
            >
              Todos los favoritos ({allFavoriteIds.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'favorites-ale'}
              className={`fav-subtab ${filter === 'favorites-ale' ? 'active' : ''}`}
              onClick={() => setFilter('favorites-ale')}
            >
              Favoritos de Alejandro ({aleFavoriteIds.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'favorites-val'}
              className={`fav-subtab ${filter === 'favorites-val' ? 'active' : ''}`}
              onClick={() => setFilter('favorites-val')}
            >
              Favoritos de Valeria ({valFavoriteIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="galleryx-memory-grid" key={`${filter}-${album}-${search ? 'search' : 'all'}`}>
        {visible.map((memory, index) => {
          const rot = ((index % 5) - 2) * 1.5;
          const isAleFav = aleFavoriteIds.includes(memory.id);
          const isValFav = valFavoriteIds.includes(memory.id);
          const isCurrentFav = favoriteIds.includes(memory.id);

          return (
            <article className="galleryx-memory-card" key={memory.id} style={{ '--card-idx': Math.min(index, 24), '--card-rot': `${rot}deg` } as React.CSSProperties}>
              <button type="button" className="galleryx-memory-open" onClick={() => openMemory(memory)} aria-label={`Abrir recuerdo: ${memory.title}`}>
                <span className="galleryx-memory-photo">
                  <GalleryThumbnail media={galleryCover(memory)} title={memory.title} />
                  {memory.media.length > 1 && <span className="galleryx-file-count"><Images size={11} aria-hidden="true" /> {memory.media.length}</span>}
                  
                  {/* Badge de atribución de favoritos */}
                  {(isAleFav || isValFav) && (
                    <span className={`galleryx-fav-badge ${isAleFav && isValFav ? 'fav-both' : isAleFav ? 'fav-ale' : 'fav-val'}`} title={isAleFav && isValFav ? 'Favorito de Alejandro y Valeria' : isAleFav ? 'Favorito de Alejandro' : 'Favorito de Valeria'}>
                      <Heart size={10} fill="currentColor" aria-hidden="true" />
                      {isAleFav && isValFav ? 'Ale & Val ♡' : isAleFav ? 'Ale ♡' : 'Val ♡'}
                    </span>
                  )}
                </span>
                <span className="galleryx-memory-copy">
                  <span className="galleryx-memory-date">{galleryDateLabel(memory.date)}</span>
                  <h2>{memory.title}</h2>
                  <span className="galleryx-memory-description">{memory.description}</span>
                  <span className="galleryx-memory-collection">{memory.album || memory.location || 'Un capítulo de nosotros'}</span>
                </span>
              </button>
              {onToggleFavorite && (
                <button
                  type="button"
                  className={`galleryx-favorite ${isCurrentFav ? 'is-active' : ''}`}
                  aria-pressed={isCurrentFav}
                  disabled={favoritePending !== null}
                  aria-label={`${isCurrentFav ? 'Quitar de' : 'Añadir a'} mis favoritos (${isAle ? 'Alejandro' : 'Valeria'}): ${memory.title}`}
                  onClick={() => void toggleFavorite(memory)}
                >
                  <Heart size={16} fill={isCurrentFav ? 'currentColor' : 'none'} />
                </button>
              )}
            </article>
          );
        })}
      </div>

      {!visible.length && (
        <div className="galleryx-empty">
          {isFavoritesFilter ? <Heart size={35} strokeWidth={1.2} /> : <Flower2 size={35} strokeWidth={1.2} />}
          <h2>
            {filter === 'favorites-ale'
              ? 'Alejandro aún no ha marcado fotos en este álbum.'
              : filter === 'favorites-val'
              ? 'Valeria aún no ha marcado fotos en este álbum.'
              : filter === 'favorites'
              ? 'Aún no hay fotos en favoritos.'
              : memories.length
              ? 'No encontramos ese recuerdo.'
              : 'Aún no hay fotos guardadas.'}
          </h2>
          <p>
            {isFavoritesFilter
              ? 'Pulsa el corazón en cualquier recuerdo para guardarlo en tu álbum de favoritos.'
              : memories.length
              ? 'Prueba otra fecha, palabra o filtro para encontrar ese momento.'
              : 'Comienza a subir fotos y videos para verlos aquí.'}
          </p>
          {memories.length > 0 && (
            <button type="button" className="text-link" onClick={() => { setSearch(''); setFilter('all'); setAlbum(''); }}>
              Ver todos los recuerdos <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </>}

    {view === 'albums' && <>
      <p className="galleryx-collection-intro">Colecciones y álbumes organizados por viajes, citas y momentos especiales.</p>
      
      {/* Sección destacada de Álbumes de Favoritos en la vista de Colecciones */}
      <div className="galleryx-featured-fav-section">
        <div className="galleryx-featured-heading">
          <Heart size={16} fill="currentColor" />
          <span>Álbumes especiales de favoritos</span>
        </div>
        <div className="galleryx-album-grid fav-albums-grid">
          {/* Álbum Favoritos de Alejandro */}
          <button
            type="button"
            className="galleryx-album galleryx-fav-featured-album ale-featured"
            onClick={() => {
              setAlbum('');
              setView('memories');
              setSearch('');
              setFilter('favorites-ale');
            }}
          >
            <span className="galleryx-album-photo">
              <GalleryThumbnail media={aleAlbum.cover} title="Favoritos de Alejandro" />
              <span className="galleryx-album-icon ale-icon">
                <Heart size={18} fill="currentColor" aria-hidden="true" />
              </span>
            </span>
            <span className="galleryx-album-copy">
              <strong>Favoritos de Alejandro</strong>
              <span>{aleFavoriteIds.length} {aleFavoriteIds.length === 1 ? 'recuerdo' : 'recuerdos'} · {aleAlbum.fileCount} {aleAlbum.fileCount === 1 ? 'archivo' : 'archivos'}</span>
              <span className="fav-album-subbadge ale-badge">Álbum de Alejandro ♡</span>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>

          {/* Álbum Favoritos de Valeria */}
          <button
            type="button"
            className="galleryx-album galleryx-fav-featured-album val-featured"
            onClick={() => {
              setAlbum('');
              setView('memories');
              setSearch('');
              setFilter('favorites-val');
            }}
          >
            <span className="galleryx-album-photo">
              <GalleryThumbnail media={valAlbum.cover} title="Favoritos de Valeria" />
              <span className="galleryx-album-icon val-icon">
                <Heart size={18} fill="currentColor" aria-hidden="true" />
              </span>
            </span>
            <span className="galleryx-album-copy">
              <strong>Favoritos de Valeria</strong>
              <span>{valFavoriteIds.length} {valFavoriteIds.length === 1 ? 'recuerdo' : 'recuerdos'} · {valAlbum.fileCount} {valAlbum.fileCount === 1 ? 'archivo' : 'archivos'}</span>
              <span className="fav-album-subbadge val-badge">Álbum de Valeria ♡</span>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="galleryx-featured-heading" style={{ marginTop: '28px' }}>
        <FolderHeart size={16} aria-hidden="true" />
        <span>Nuestras colecciones</span>
      </div>
      <GalleryAlbumGrid albums={visibleAlbums} onOpen={name => { setAlbum(name); setView('memories'); setSearch(''); setFilter('all'); }} />
      {!visibleAlbums.length && <div className="galleryx-empty"><FolderHeart size={35} strokeWidth={1.2} /><h2>{albums.length ? 'No encontramos esa colección.' : 'Cada historia puede tener su álbum.'}</h2><p>{albums.length ? 'Prueba otro nombre.' : 'Añade un nombre de álbum al preparar o editar los detalles de un recuerdo.'}</p></div>}
    </>}

    <p className="galleryx-notice" role="status">{notice}</p>
    {viewerId && <GalleryViewer memories={viewerMemories} memoryId={viewerId} onNavigate={setViewerId} onClose={() => setViewerId(null)} onEdit={onEdit ? editMemory : undefined} />}
    {editing && onEdit && <GalleryEditDialog key={editing.id} memory={editing} albums={albums.map(item => item.name)} onSave={async (id, changes) => { await onEdit(id, changes); setNotice('Los detalles del recuerdo se guardaron.'); }} onClose={() => setEditing(null)} />}
    {publication && <GalleryPublicationDialog status={publicationStatus} albums={albums.map(item => item.name)} onSubmit={onPublish ? async draft => { await onPublish(draft); setNotice('El recuerdo se guardó.'); } : undefined} onClose={() => setPublication(false)} />}
  </section>;
}
