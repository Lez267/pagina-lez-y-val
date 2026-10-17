import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Bell, Check, ImagePlus, Save, ShieldCheck, Star } from 'lucide-react';
import { galleryCover, galleryWithCoverFirst, validateGalleryFiles, validateGalleryMetadata, type GalleryEdit, type GalleryMemory, type GalleryMetadata, type GalleryPublication } from '../../lib/gallery';
import { Dialog } from '../Dialog';
import { GalleryThumbnail } from './GalleryViewer';
import './gallery.css';

function metadataFromForm(form: HTMLFormElement, previous?: GalleryMetadata): GalleryMetadata {
  const values = new FormData(form);
  const text = (key: string) => String(values.get(key) ?? '').trim();
  const tags = [...new Set(text('tags').split(',').map(tag => tag.trim()).filter(Boolean))];
  return { title: text('title'), description: text('description'), date: text('date'), location: text('location'), album: text('album'), author: text('author'), tags,
    reminder: { enabled: values.get('reminderEnabled') === 'on', date: values.has('reminderDate') ? text('reminderDate') : previous?.reminder?.date ?? '', label: values.has('reminderLabel') ? text('reminderLabel') : previous?.reminder?.label ?? '', repeat: values.has('reminderRepeat') ? values.get('reminderRepeat') === 'once' ? 'once' : 'yearly' : previous?.reminder?.repeat ?? 'yearly' } };
}
function GalleryMetadataFields({ initial, albums = [], readOnlyAuthor = false }: { initial?: GalleryMetadata; albums?: string[]; readOnlyAuthor?: boolean }) {
  const albumId = useId();
  const [reminderEnabled, setReminderEnabled] = useState(initial?.reminder?.enabled ?? false);
  return <>
    <label className="field">Título del recuerdo<input className="input" name="title" defaultValue={initial?.title ?? ''} placeholder="Un día que quiero guardar" maxLength={160} required /></label>
    <label className="field">Lo que pasó<textarea className="textarea" name="description" defaultValue={initial?.description ?? ''} placeholder="La historia detrás de este momento…" maxLength={12000} rows={4} /></label>
    <div className="galleryx-form-row"><label className="field">Fecha del recuerdo<input className="input" type="date" name="date" defaultValue={initial?.date ?? ''} min="1000-01-01" max="9999-12-31" /><span className="galleryx-field-hint">La fecha de la foto, no la de publicación.</span></label><label className="field">Lugar <span className="galleryx-optional">(opcional)</span><input className="input" name="location" defaultValue={initial?.location ?? ''} placeholder="Nuestro rincón favorito" maxLength={200} /></label></div>
    <div className="galleryx-form-row"><label className="field">Álbum <span className="galleryx-optional">(opcional)</span><input className="input" name="album" list={albumId} defaultValue={initial?.album ?? ''} placeholder="Elige o escribe una colección" maxLength={100} /><datalist id={albumId}>{albums.map(album => <option key={album} value={album} />)}</datalist></label><label className="field">Guardado por<input className="input" name="author" readOnly={readOnlyAuthor} defaultValue={initial?.author || 'Ale'} maxLength={100} placeholder="Ale o Val" /></label></div>
    <label className="field">Etiquetas <span className="galleryx-optional">(opcional)</span><input className="input" name="tags" defaultValue={initial?.tags.join(', ') ?? ''} placeholder="juntos, dates, viaje" maxLength={500} /><span className="galleryx-field-hint">Separadas por comas. Hasta 12 etiquetas.</span></label>
    <div className="galleryx-reminder-fields"><label className="galleryx-checkbox"><input type="checkbox" name="reminderEnabled" checked={reminderEnabled} onChange={event => setReminderEnabled(event.target.checked)} /><Bell size={16} aria-hidden="true" /><span>Recordar una fecha especial</span></label>
      {reminderEnabled && <div className="galleryx-reminder-details"><label className="field">Nombre del recordatorio<input className="input" name="reminderLabel" defaultValue={initial?.reminder?.label ?? ''} placeholder="Volver a celebrar ese día" maxLength={120} required /></label><div className="galleryx-form-row"><label className="field">Fecha<input className="input" type="date" name="reminderDate" defaultValue={initial?.reminder?.date || initial?.date || ''} min="1000-01-01" max="9999-12-31" required /></label><label className="field">Repetición<select className="input" name="reminderRepeat" defaultValue={initial?.reminder?.repeat ?? 'yearly'}><option value="yearly">Cada año</option><option value="once">Solo esta vez</option></select></label></div><p className="galleryx-field-hint">Se mostrará en la galería. No envía notificaciones ni crea eventos fuera de esta página.</p></div>}
    </div>
  </>;
}

function FormErrors({ errors, summaryRef }: { errors: string[]; summaryRef: RefObject<HTMLDivElement | null> }) {
  return errors.length ? <div className="galleryx-errors" role="alert" tabIndex={-1} ref={summaryRef}><strong>Revisa estos detalles:</strong><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div> : null;
}
export function GalleryEditDialog({ memory, albums, onSave, onClose }: { memory: GalleryMemory; albums?: string[]; onSave: (id: string, changes: GalleryEdit) => Promise<void> | void; onClose: () => void }) {
  const [coverId, setCoverId] = useState(galleryCover(memory)?.id);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const errorsRef = useRef<HTMLDivElement>(null);
  function showErrors(next: string[]) { setErrors(next); requestAnimationFrame(() => errorsRef.current?.focus()); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const metadata = metadataFromForm(event.currentTarget, memory);
    const problems = validateGalleryMetadata(metadata);
    if (problems.length) { showErrors(problems); return; }
    setErrors([]); setPending(true);
    try { await onSave(memory.id, { ...metadata, coverMediaId: coverId, media: galleryWithCoverFirst(memory.media, coverId) }); onClose(); }
    catch { showErrors(['No pudimos guardar los cambios. Tus detalles siguen en este formulario para volver a intentarlo.']); }
    finally { setPending(false); }
  }
  return <Dialog title="Cuidar los detalles de este recuerdo" onClose={pending ? () => undefined : onClose} wide><form className="galleryx-form" onSubmit={save}>
    <p className="galleryx-form-intro">Puedes cambiar las palabras, el álbum y la portada. Los archivos del recuerdo se conservan.</p>
    <FormErrors errors={errors} summaryRef={errorsRef} />
    <fieldset disabled={pending}><GalleryMetadataFields initial={memory} albums={albums} readOnlyAuthor />
      {memory.media.length > 0 && <div className="galleryx-cover-picker"><p className="galleryx-field-title"><Star size={15} aria-hidden="true" /> Portada del recuerdo</p><div className="galleryx-cover-options" role="group" aria-label="Elegir portada">{memory.media.map((media, index) => <button type="button" key={media.id} onClick={() => setCoverId(media.id)} aria-pressed={coverId === media.id} aria-label={`Usar ${media.type === 'video' ? 'video' : 'foto'} ${index + 1} como portada`}><GalleryThumbnail media={media} /><span>{coverId === media.id ? <><Check size={12} /> Portada</> : `Archivo ${index + 1}`}</span></button>)}</div></div>}
    </fieldset>
    <div className="galleryx-form-actions"><button type="button" className="button button-secondary" disabled={pending} onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={pending}><Save size={15} /> {pending ? 'Guardando…' : 'Guardar cambios'}</button></div><p className="galleryx-save-status" role="status">{pending ? 'Guardando los cambios del recuerdo. Espera un momento.' : ''}</p>
  </form></Dialog>;
}

type PreviewFile = { file: File; url: string };
export function GalleryPublicationDialog({ albums, onSubmit, onClose, status }: { albums?: string[]; onSubmit?: (publication: GalleryPublication) => Promise<void> | void; onClose: () => void; status?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const errorsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const next = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(preview => URL.revokeObjectURL(preview.url));
  }, [files]);
  function showErrors(next: string[]) { setErrors(next); requestAnimationFrame(() => errorsRef.current?.focus()); }
  function chooseFiles(next: File[]) {
    const problems = validateGalleryFiles(next);
    if (problems.length) { showErrors(problems); return; }
    setErrors([]); setFiles(next); setCoverIndex(0);
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !onSubmit) return;
    const metadata = metadataFromForm(event.currentTarget);
    const problems = [...validateGalleryMetadata(metadata), ...validateGalleryFiles(files)];
    if (problems.length) { showErrors(problems); return; }
    setErrors([]); setPending(true);
    try { await onSubmit({ ...metadata, files: [...files], coverIndex }); onClose(); }
    catch { showErrors(['No se pudo completar la publicación. Los archivos siguen seleccionados; vuelve a intentarlo.']); }
    finally { setPending(false); }
  }
  return <Dialog title="Un momento más para nuestro álbum" onClose={pending ? () => undefined : onClose} wide><form className="galleryx-form" onSubmit={publish}>
    <p className="galleryx-form-intro">Prepara las fotos, los videos y su historia. Seleccionarlos muestra una vista previa en este dispositivo.</p>
    {!onSubmit && <div className="galleryx-service-notice"><ShieldCheck size={20} aria-hidden="true" /><p>La publicación todavía necesita un servicio de subida seguro. Puedes preparar y revisar el recuerdo; esta ventana no sube archivos ni guarda un borrador al cerrarla.</p></div>}
    <FormErrors errors={errors} summaryRef={errorsRef} />
    <fieldset disabled={pending}><label className="galleryx-file-input"><ImagePlus size={27} strokeWidth={1.3} aria-hidden="true" /><span>{files.length ? 'Cambiar selección de archivos' : 'Elegir fotos y videos'}</span><small>Hasta 20 archivos · 20 MB por foto · 100 MB por video · 250 MB en total</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime" onChange={event => { if (event.target.files?.length) chooseFiles(Array.from(event.target.files)); event.currentTarget.value = ''; }} /></label>
      {previews.length > 0 && <div className="galleryx-cover-picker"><p className="galleryx-field-title">{files.length} archivos preparados <span>Elige la portada</span></p><div className="galleryx-cover-options" role="group" aria-label="Elegir portada de la publicación">{previews.map(({ file, url }, index) => <button type="button" key={url} aria-pressed={coverIndex === index} aria-label={`Usar ${file.name} como portada`} onClick={() => setCoverIndex(index)}><span className="galleryx-local-preview">{file.type.startsWith('video/') ? <video src={url} preload="metadata" muted playsInline aria-hidden="true" /> : <img src={url} alt={file.name} />}</span><span>{coverIndex === index ? <><Check size={12} /> Portada</> : file.name}</span></button>)}</div><p className="galleryx-field-hint">Vista previa local. Cambiar la selección sustituye el conjunto de archivos preparado.</p></div>}
      <GalleryMetadataFields albums={albums} />
    </fieldset>
    <div className="galleryx-form-actions"><button type="button" className="button button-secondary" disabled={pending} onClick={onClose}>Cerrar</button><button type="submit" className="button button-primary" disabled={!onSubmit || pending}><ImagePlus size={16} /> {pending ? 'Publicando…' : 'Publicar recuerdo'}</button></div><p className="galleryx-save-status" role="status">{pending ? status || 'El servicio está procesando la publicación. Espera un momento.' : !onSubmit ? 'Publicación desactivada hasta conectar el servicio seguro.' : 'La publicación se realizará únicamente al pulsar Publicar recuerdo.'}</p>
  </form></Dialog>;
}
