import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Film, Heart, Image as ImageIcon, MapPin, PenLine, Play, ZoomIn, ZoomOut } from 'lucide-react';
import type { MediaItem } from '../../data/types';
import { galleryCover, galleryDateLabel, safeGalleryMediaUrl, type GalleryMemory } from '../../lib/gallery';
import { Dialog } from '../Dialog';
import './gallery.css';

export function GalleryThumbnail({ media, title = '', className = '' }: { media?: MediaItem; title?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = media && safeGalleryMediaUrl(media.url);
  useEffect(() => setFailed(false), [url]);
  return <span className={`galleryx-thumbnail ${className}`}>
    {media?.type === 'image' && url && !failed ? <img src={url} alt={title} loading="lazy" onError={() => setFailed(true)} /> : <span className="galleryx-thumbnail-placeholder" aria-label={media?.type === 'video' ? 'Video' : title || 'Recuerdo sin imagen'}>{media?.type === 'video' ? <Film size={25} strokeWidth={1.4} /> : <ImageIcon size={25} strokeWidth={1.3} />}</span>}
    {media?.type === 'video' && <span className="galleryx-video-label"><Play size={11} fill="currentColor" aria-hidden="true" /> Video</span>}
  </span>;
}

export type GalleryViewerProps = { memories: GalleryMemory[]; memoryId: string; onNavigate: (id: string) => void; onClose: () => void; onEdit?: (memory: GalleryMemory) => void };
export function GalleryViewer(props: GalleryViewerProps) {
  const memory = props.memories.find(item => item.id === props.memoryId);
  return memory ? <GalleryViewerContent {...props} key={memory.id} memory={memory} /> : null;
}
function GalleryViewerContent({ memories, memory, onNavigate, onClose, onEdit }: GalleryViewerProps & { memory: GalleryMemory }) {
  const [fileIndex, setFileIndex] = useState(() => Math.max(0, memory.media.findIndex(item => item.id === galleryCover(memory)?.id)));
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const position = memories.findIndex(item => item.id === memory.id);
  const file = memory.media[fileIndex];
  const url = file && safeGalleryMediaUrl(file.url);
  const fileCount = memory.media.length;
  const previousMemory = memories[position - 1];
  const nextMemory = memories[position + 1];
  function selectFile(index: number) { setFileIndex(index); setZoomed(false); setFailed(false); }
  const navigationRef = useRef({ fileIndex, fileCount, previousMemory, nextMemory, onNavigate });
  navigationRef.current = { fileIndex, fileCount, previousMemory, nextMemory, onNavigate };
  useEffect(() => {
    const active = strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }, [fileIndex]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, video') || target?.isContentEditable) return;
      const state = navigationRef.current;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        if (!event.altKey && state.fileIndex > 0) selectFile(state.fileIndex - 1);
        else if (state.previousMemory) state.onNavigate(state.previousMemory.id);
      } else {
        if (!event.altKey && state.fileIndex < state.fileCount - 1) selectFile(state.fileIndex + 1);
        else if (state.nextMemory) state.onNavigate(state.nextMemory.id);
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, []);
  return <Dialog title={memory.title} onClose={onClose} wide>
    <div className="galleryx-viewer">
      <div className={`galleryx-stage${zoomed ? ' is-zoomed' : ''}`}>
        {file && url && !failed ? file.type === 'video' ? <video key={url} src={url} controls playsInline preload="metadata" onError={() => setFailed(true)} aria-label={`Video ${fileIndex + 1} de ${fileCount}: ${memory.title}`} /> : <img key={url} src={url} alt={`${memory.title}. Fotografía ${fileIndex + 1} de ${fileCount}.`} onError={() => setFailed(true)} /> : <div className="galleryx-stage-empty"><Heart size={36} strokeWidth={1.3} /><p>{file ? 'No pudimos mostrar este archivo.' : 'Un recuerdo hecho de palabras.'}</p>{file && <span>Prueba otro archivo o vuelve a intentarlo más tarde.</span>}</div>}
        {file?.type === 'image' && url && !failed && <button type="button" className="galleryx-zoom" onClick={() => setZoomed(value => !value)} aria-label={zoomed ? 'Ajustar fotografía al visor' : 'Ampliar fotografía'} aria-pressed={zoomed}>{zoomed ? <ZoomOut size={17} /> : <ZoomIn size={17} />}</button>}
      </div>
      {fileCount > 0 && <div className="galleryx-file-navigation"><button type="button" className="galleryx-icon-button" disabled={fileIndex === 0} onClick={() => selectFile(fileIndex - 1)} aria-label="Archivo anterior"><ArrowLeft size={18} /></button><span aria-live="polite">{file?.type === 'video' ? 'Video' : 'Foto'} {fileIndex + 1} de {fileCount}</span><button type="button" className="galleryx-icon-button" disabled={fileIndex >= fileCount - 1} onClick={() => selectFile(fileIndex + 1)} aria-label="Archivo siguiente"><ArrowRight size={18} /></button></div>}
      {fileCount > 1 && <div className="galleryx-file-strip" ref={strip} role="group" aria-label="Fotos y videos de este recuerdo">{memory.media.map((media, index) => <button type="button" key={media.id} aria-pressed={fileIndex === index} aria-label={`Ver ${media.type === 'video' ? 'video' : 'foto'} ${index + 1}`} onClick={() => selectFile(index)}><GalleryThumbnail media={media} /><span>{index + 1}</span></button>)}</div>}
      <div className="galleryx-viewer-meta"><span><CalendarDays size={14} aria-hidden="true" />{galleryDateLabel(memory.date)}</span>{memory.location && <span><MapPin size={14} aria-hidden="true" />{memory.location}</span>}{memory.album && <span>{memory.album}</span>}</div>
      {memory.description && <p className="galleryx-viewer-description">{memory.description}</p>}
      {memory.tags.length > 0 && <div className="galleryx-tags" aria-label="Etiquetas">{memory.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
      <div className="galleryx-viewer-actions"><span>Guardado por {memory.author || 'ustedes'}</span><div>{onEdit && <button type="button" className="text-link" onClick={() => onEdit(memory)}><PenLine size={14} /> Editar detalles</button>}{url && <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">Abrir archivo <ExternalLink size={13} /></a>}</div></div>
      {memories.length > 1 && <><div className="galleryx-memory-navigation"><button type="button" disabled={!previousMemory} onClick={() => previousMemory && onNavigate(previousMemory.id)}><ArrowLeft size={16} /> Recuerdo anterior</button><span>{position + 1} / {memories.length}</span><button type="button" disabled={!nextMemory} onClick={() => nextMemory && onNavigate(nextMemory.id)}>Siguiente recuerdo <ArrowRight size={16} /></button></div><div className="galleryx-memory-strip" role="group" aria-label="Todos los recuerdos del visor">{memories.map(item => <button type="button" key={item.id} aria-pressed={item.id === memory.id} aria-label={`Ver recuerdo: ${item.title}`} onClick={() => onNavigate(item.id)}><GalleryThumbnail media={galleryCover(item)} /><span>{item.title}</span></button>)}</div></>}
      <p className="galleryx-keyboard-hint">← → para recorrer archivos y recuerdos · Alt + ← → para saltar de recuerdo · Esc para cerrar.</p>
    </div>
  </Dialog>;
}
