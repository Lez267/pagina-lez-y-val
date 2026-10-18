import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Image as ImageIcon, MapPin, Play, Search, SlidersHorizontal, Heart, ExternalLink, Sparkles } from 'lucide-react';
import type { Memory } from '../data/types';
import { dateLabel } from '../lib/dates';
import { useLocalState } from '../lib/storage';
import { Dialog } from './Dialog';

export function MemoryCard({ memory, onOpen, compact = false }: { memory: Memory; onOpen: (memory: Memory) => void; compact?: boolean }) {
  const cover = memory.media.find(item => item.type === 'image');
  return <button className={`memory-card ${compact ? 'memory-card-compact' : ''}`} onClick={() => onOpen(memory)} aria-label={`Abrir recuerdo: ${memory.title}`}><div className="memory-image">{cover ? <img src={cover.url} alt={memory.title} loading="lazy" onError={event => { event.currentTarget.style.opacity = '0'; }}/> : <div className="memory-placeholder"><ImageIcon size={32}/><span>{memory.media.some(item => item.type === 'video') ? 'Un recuerdo en movimiento' : 'Un momento para recordar'}</span></div>}{memory.media.length > 1 && <span className="media-count">{memory.media.length} fotos y videos</span>}{memory.media.some(item => item.type === 'video') && <span className="video-indicator"><Play size={14} fill="currentColor"/></span>}</div><div className="memory-card-body"><span className="memory-date">{dateLabel(memory.date, { day:'numeric', month:'long' })}</span><h3>{memory.title}</h3>{!compact && <p>{memory.description}</p>}<span className="memory-location"><MapPin size={12}/>{memory.location || 'Un lugar en nuestra historia'}</span></div></button>;
}

export function MemoryDialog({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const selected = memory.media[index];
  return <Dialog title={memory.title} onClose={onClose} wide><div className="memory-viewer">{selected?.type === 'image' ? <img src={selected.url} alt={memory.title}/> : selected?.type === 'video' ? <video src={selected.url} controls preload="metadata"/> : <div className="memory-viewer-empty"><Heart size={40}/><p>Este recuerdo está hecho de palabras.</p></div>}{memory.media.length > 1 && <div className="viewer-controls"><button className="icon-button" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Archivo anterior"><ArrowLeft size={18}/></button><span>{index + 1} / {memory.media.length}</span><button className="icon-button" disabled={index === memory.media.length - 1} onClick={() => setIndex(index + 1)} aria-label="Archivo siguiente"><ArrowRight size={18}/></button></div>}</div><div className="viewer-meta"><span><CalendarDays size={15}/>{dateLabel(memory.date)}</span>{memory.location && <span><MapPin size={15}/>{memory.location}</span>}</div><p className="viewer-description">{memory.description}</p><div className="viewer-tags">{[memory.album, ...memory.tags].filter(Boolean).map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div><div className="viewer-bottom"><span className="muted">Guardado por {memory.author || 'ustedes'}</span>{selected && <a className="text-link" href={selected.url} target="_blank" rel="noopener noreferrer">Abrir original <ExternalLink size={13}/></a>}</div></Dialog>;
}

export function MemoriesPage({ memories, namespace }: { memories: Memory[]; namespace: string }) {
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [album, setAlbum] = useState('');
  const [selected, setSelected] = useState<Memory | null>(null);
  const [storedFavorites, setFavorites, saved] = useLocalState<unknown>(`${namespace}:favorite-views`, []);
  const favorites = Array.isArray(storedFavorites) ? storedFavorites.filter((value): value is string => typeof value === 'string') : [];
  const albums = Array.from(new Set(memories.map(memory => memory.album).filter(Boolean))).sort();
  const visible = useMemo(() => memories.filter(memory => (!album || memory.album === album) && (filter !== 'favorites' || favorites.includes(memory.id)) && (filter !== 'videos' || memory.media.some(item => item.type === 'video')) && (filter !== 'photos' || memory.media.some(item => item.type === 'image')) && `${memory.title} ${memory.description} ${memory.location} ${memory.date}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).sort((a,b) => b.date.localeCompare(a.date)), [memories, filter, favorites, search, album]);
  const toggleFavorite = (id: string) => setFavorites(favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites,id]);
  return <><header className="page-header"><h1 className="page-title">Nuestros <em>recuerdos</em></h1><p className="muted">Todas las fotos, videos y momentos que hemos compartido juntos.</p></header><div className="gallery-toolbar"><label className="search-field"><Search size={17}/><input aria-label="Buscar recuerdos" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar un momento, una fecha, un lugar…"/></label><label className="album-select"><SlidersHorizontal size={16}/><select aria-label="Filtrar por colección" value={album} onChange={event => setAlbum(event.target.value)}><option value="">Todas las colecciones</option>{albums.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div><div className="filter-row">{[['all','Todos los recuerdos'],['photos','Fotografías'],['videos','Videos'],['favorites','Mis favoritos']].map(([value,label]) => <button key={value} className={`filter-chip ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} aria-pressed={filter === value}>{filter === value && <Check size={13}/>} {label}</button>)}<span className="result-count">{visible.length} {visible.length === 1 ? 'recuerdo' : 'recuerdos'}</span></div>{!saved && <p className="notice" role="status">El navegador no pudo guardar tus favoritos en este dispositivo.</p>}<div className="memory-grid" key={`${filter}-${album}-${search ? 'search' : 'all'}`}>{visible.map((memory, index) => { const rot = ((index % 5) - 2) * 1.5; return <div className="memory-tile" key={memory.id} style={{ '--card-idx': Math.min(index, 24), '--card-rot': `${rot}deg` } as React.CSSProperties}><MemoryCard memory={memory} onOpen={setSelected}/><button className={`favorite-button ${favorites.includes(memory.id) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(memory.id)} aria-label={`${favorites.includes(memory.id) ? 'Quitar de' : 'Añadir a'} mis favoritos: ${memory.title}`} aria-pressed={favorites.includes(memory.id)}><Heart size={16} fill={favorites.includes(memory.id) ? 'currentColor' : 'none'}/></button></div>; })}</div>{!visible.length && <div className="empty-state"><ImageIcon size={35}/><h2>Aún no hay recuerdos aquí</h2><p>Prueba otra búsqueda o añade fotos a tu galería.</p></div>}<p className="footnote">Los favoritos de esta versión se guardan en este dispositivo.</p>{selected && <MemoryDialog key={selected.id} memory={selected} onClose={() => setSelected(null)}/>}</>;
}

export function TimelinePage({ memories }: { memories: Memory[] }) {
  const [selected, setSelected] = useState<Memory | null>(null);
  const years = Array.from(new Set(memories.map(item => item.date ? item.date.slice(0,4) : 'Sin fecha'))).sort((a,b) => a === 'Sin fecha' ? 1 : b === 'Sin fecha' ? -1 : b.localeCompare(a));
  const [year, setYear] = useState('all');
  const visibleYears = year === 'all' ? years : years.filter(item => item === year);
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Línea del <em>tiempo</em></h1>
        <p className="muted">Nuestra historia ordenada fecha por fecha, desde el día en que empezó todo.</p>
      </header>
      <div className="timeline-intro">
        <CalendarDays size={23}/>
        <p>Momentos organizados cronológicamente por la fecha de cada recuerdo.</p>
        <label>
          <span className="sr-only">Elegir año</span>
          <select className="input" value={year} onChange={event => setYear(event.target.value)}>
            <option value="all">Todos los años</option>
            {years.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="timeline" key={year}>
        {visibleYears.map(yearValue => {
          const yearMemories = memories
            .filter(memory => (memory.date ? memory.date.slice(0,4) : 'Sin fecha') === yearValue)
            .sort((a,b) => b.date.localeCompare(a.date));

          // Agrupamos recuerdos consecutivos que ocurrieron en la misma fecha
          const dayGroups: { date: string; items: Memory[] }[] = [];
          for (const memory of yearMemories) {
            const d = memory.date || '';
            const last = dayGroups[dayGroups.length - 1];
            if (last && last.date === d && d !== '') {
              last.items.push(memory);
            } else {
              dayGroups.push({ date: d, items: [memory] });
            }
          }

          let runningIdx = 0;

          return (
            <section key={yearValue} className="timeline-year">
              <div className="timeline-year-label">{yearValue}</div>
              {dayGroups.map(group => {
                if (group.items.length === 1) {
                  const memory = group.items[0];
                  const itemIdx = runningIdx++;
                  const rot = ((itemIdx % 4) - 1.5) * 0.8;
                  return (
                    <article
                      key={memory.id}
                      className="timeline-entry"
                      style={{
                        '--tl-idx': Math.min(itemIdx, 20),
                        '--tl-rot': `${rot}deg`,
                      } as React.CSSProperties}
                    >
                      <div className="timeline-dot"/>
                      <div className="timeline-date">
                        <span>{memory.date ? dateLabel(memory.date, { day:'2-digit' }) : '—'}</span>
                        <small>{memory.date ? dateLabel(memory.date, { month:'short' }) : 'sin fecha'}</small>
                      </div>
                      <button className="timeline-story" onClick={() => setSelected(memory)}>
                        {memory.media.find(item => item.type === 'image') && (
                          <img src={memory.media.find(item => item.type === 'image')!.url} alt="" loading="lazy"/>
                        )}
                        <div>
                          <span className="eyebrow">{memory.album || 'Un capítulo nuestro'}</span>
                          <h2>{memory.title}</h2>
                          <p>{memory.description}</p>
                          {memory.location && <span className="memory-location"><MapPin size={12}/>{memory.location}</span>}
                        </div>
                        <ArrowRight size={18} className="timeline-arrow"/>
                      </button>
                    </article>
                  );
                }

                // Grupo con múltiples recuerdos del mismo día (Lapso remarcado en la línea de tiempo)
                const groupStartIdx = runningIdx;
                runningIdx += group.items.length;
                const totalInGroup = group.items.length;

                return (
                  <div
                    key={`day-group-${group.date}-${group.items[0].id}`}
                    className="timeline-day-cluster"
                  >
                    {/* Encabezado destacado del día que unifica todos los momentos */}
                    <div className="timeline-day-header">
                      <div className="timeline-day-header-node" title={`Día especial: ${totalInGroup} momentos juntos`}>
                        <Heart size={10} fill="currentColor" />
                      </div>
                      <div className="timeline-day-header-info">
                        <strong className="timeline-day-header-date">
                          {group.date ? dateLabel(group.date, { day: 'numeric', month: 'long' }) : 'Sin fecha'}
                        </strong>
                        <span className="timeline-day-header-badge">
                          <Sparkles size={11} aria-hidden="true" />
                          <span>{totalInGroup} momentos juntos</span>
                        </span>
                      </div>
                    </div>

                    {/* Riel continuo / corchete que abraza todo el lapso de este día */}
                    <div className="timeline-cluster-track" aria-hidden="true">
                      <div className="timeline-cluster-glow-bar" />
                    </div>

                    {group.items.map((memory, subIndex) => {
                      const itemIdx = groupStartIdx + subIndex;
                      const rot = ((itemIdx % 4) - 1.5) * 0.8;
                      const isFirst = subIndex === 0;
                      const isLast = subIndex === totalInGroup - 1;

                      return (
                        <article
                          key={memory.id}
                          className={`timeline-entry timeline-cluster-entry ${isFirst ? 'is-cluster-first' : ''} ${isLast ? 'is-cluster-last' : ''}`}
                          style={{
                            '--tl-idx': Math.min(itemIdx, 20),
                            '--tl-rot': `${rot}deg`,
                          } as React.CSSProperties}
                        >
                          <div
                            className="timeline-dot timeline-cluster-dot is-cluster-branch"
                            title={`Momento ${subIndex + 1} de ${totalInGroup} de este día`}
                          />

                          <div className="timeline-date timeline-cluster-order-col">
                            <span className="timeline-cluster-order-num">#{subIndex + 1}</span>
                          </div>

                          <button className="timeline-story timeline-cluster-story" onClick={() => setSelected(memory)}>
                            {memory.media.find(item => item.type === 'image') && (
                              <img src={memory.media.find(item => item.type === 'image')!.url} alt="" loading="lazy" />
                            )}
                            <div>
                              <span className="eyebrow eyebrow-cluster">
                                <span className="cluster-badge">
                                  <Sparkles size={11} aria-hidden="true" />
                                  {`Momento ${subIndex + 1} de ${totalInGroup}`}
                                </span>
                                <span className="eyebrow-sep">·</span>
                                <span>{memory.album || 'Un capítulo nuestro'}</span>
                              </span>
                              <h2>{memory.title}</h2>
                              <p>{memory.description}</p>
                              {memory.location && <span className="memory-location"><MapPin size={12} />{memory.location}</span>}
                            </div>
                            <ArrowRight size={18} className="timeline-arrow" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      {!memories.length && (
        <div className="empty-state">
          <Heart size={30}/>
          <h2>Aún no hay momentos en la línea de tiempo</h2>
          <p>Sube recuerdos a la galería para verlos aquí organizados por fecha.</p>
        </div>
      )}
      {selected && <MemoryDialog key={selected.id} memory={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}
