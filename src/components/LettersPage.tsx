import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Download, Flower2, Heart, Mail, PenLine, ShieldCheck, Sparkles, X } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import './studio.css';

type Letter = { id: string; title: string; body: string; author: 'Ale' | 'Val'; tag: 'Para hoy' | 'Abre cuando'; occasion: string; createdAt: string };
const exampleLetters: Letter[] = [
  { id: 'letter-demo-1', title: 'Qué bonito coincidir contigo', body: 'Entre tantas cosas que pasan en un día, siempre hay un pequeño momento en el que pienso en nosotros y sonrío.\n\nEsta carta de ejemplo es un lugar para guardar esas palabras que a veces cuesta decir en voz alta. Las nuestras pueden empezar aquí.', author: 'Ale', tag: 'Para hoy', occasion: '', createdAt: '2026-01-14T12:00:00Z' },
  { id: 'letter-demo-2', title: 'Un abrazo hecho de palabras', body: 'Si hoy el mundo se siente un poquito más pesado, respira. No hace falta resolverlo todo de una vez.\n\nImagina un abrazo largo, una taza calentita y nuestro plan favorito: estar juntos.\n\nCarta de ejemplo; escribe aquí lo que te gustaría que la otra persona encontrara en un día así.', author: 'Val', tag: 'Abre cuando', occasion: 'necesites un abrazo', createdAt: '2026-01-12T12:00:00Z' },
  { id: 'letter-demo-3', title: 'Por todas las pequeñas cosas', body: 'Por las conversaciones sin prisa, las canciones que se quedan y las ganas de inventar más recuerdos.\n\nQué lindo que lo cotidiano también pueda ser especial.\n\nEsta es una carta de ejemplo para inspirar la siguiente.', author: 'Ale', tag: 'Para hoy', occasion: '', createdAt: '2026-01-10T12:00:00Z' },
];

export function studioIsDemo(namespace: string) { return namespace.startsWith('demo') || namespace === 'nh:demo' || namespace.startsWith('nh:demo:'); }
function isLetter(value: unknown): value is Letter {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['id', 'title', 'body', 'occasion', 'createdAt'].every(key => typeof item[key] === 'string') && (item.author === 'Ale' || item.author === 'Val') && (item.tag === 'Para hoy' || item.tag === 'Abre cuando');
}
const safeLetters = (value: unknown): Letter[] => Array.isArray(value) ? value.filter(isLetter) : [];

export function StudioSprig({ className = '' }: { className?: string }) {
  return <svg className={`studio-sprig ${className}`} viewBox="0 0 100 140" fill="none" aria-hidden="true">
    <path d="M49 133C48 104 66 72 54 29M48 116C28 109 20 94 19 79M51 100C74 92 81 74 80 61M54 76C34 66 29 53 32 40" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M20 81C7 78 7 62 9 58C22 62 28 73 20 81ZM33 43C20 38 21 23 26 19C37 26 41 37 33 43ZM78 64C73 50 86 41 92 42C94 55 88 64 78 64ZM49 119C33 125 20 119 17 111C32 103 44 108 49 119ZM53 99C67 102 81 95 83 86C68 82 56 87 53 99Z" fill="currentColor" opacity=".38" />
    <g transform="translate(52 24)"><ellipse cy="-10" rx="7" ry="11" fill="#e7b6ca" /><ellipse cy="-10" rx="7" ry="11" fill="#ecc4d5" transform="rotate(72)" /><ellipse cy="-10" rx="7" ry="11" fill="#f3d7e2" transform="rotate(144)" /><ellipse cy="-10" rx="7" ry="11" fill="#ecc4d5" transform="rotate(216)" /><ellipse cy="-10" rx="7" ry="11" fill="#e7b6ca" transform="rotate(288)" /><circle r="4" fill="#c9a36e" /></g>
  </svg>;
}

export function StudioLocalNote({ demo }: { demo: boolean }) {
  return <p className="studio-local-note"><ShieldCheck size={15} aria-hidden="true" /><span>{demo ? 'Las tarjetas iniciales son ejemplos. ' : ''}Este apartado se guarda solo en este navegador. No se sincroniza ni se envía a la otra persona.</span></p>;
}

export function StudioStorageNotice({ saved, onExport }: { saved: boolean; onExport: () => void }) {
  if (saved) return null;
  return <div className="studio-storage-warning" role="alert"><span>No pudimos guardar el último cambio en este navegador. Sigue en esta sesión; descarga una copia antes de salir.</span><button type="button" onClick={onExport}><Download size={15} /> Descargar copia</button></div>;
}

export function StudioDialog({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
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
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      if (!firstElement) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === firstElement || !panel.contains(document.activeElement))) { event.preventDefault(); lastElement.focus(); }
      else if (!event.shiftKey && (document.activeElement === lastElement || !panel.contains(document.activeElement))) { event.preventDefault(); firstElement.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return createPortal(<div className="modal-backdrop studio-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} className={`modal studio-dialog${wide ? ' studio-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined} tabIndex={-1}>
      <button type="button" className="studio-dialog-close" aria-label="Cerrar ventana" onClick={onClose}><X size={20} /></button>
      <p className="eyebrow studio-dialog-eyebrow"><Flower2 size={14} aria-hidden="true" /> UN RINCONCITO NUESTRO</p>
      <h2 id={titleId}>{title}</h2>
      {subtitle && <p id={descriptionId} className="muted studio-dialog-subtitle">{subtitle}</p>}
      {children}
    </div>
  </div>, document.body);
}

export default function LettersPage({ namespace }: { namespace: string }) { return <LettersContent key={namespace} namespace={namespace} />; }
function LettersContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<Letter[]>(`${namespace}:letters:v1`, demo ? exampleLetters : []);
  const letters = safeLetters(stored);
  const [compose, setCompose] = useState(false);
  const [opened, setOpened] = useState<Letter | null>(null);
  const [tag, setTag] = useState<Letter['tag']>('Para hoy');
  const [filter, setFilter] = useState<'Todas' | Letter['tag']>('Todas');
  const [status, setStatus] = useState('');
  const exportLetters = () => downloadJson('nuestra-historia-cartas.json', { version: 1, letters });
  const visible = filter === 'Todas' ? letters : letters.filter(letter => letter.tag === filter);
  function saveLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get('title') ?? '').trim();
    const body = String(values.get('body') ?? '').trim();
    const occasion = String(values.get('occasion') ?? '').trim();
    if (!title || !body || (tag === 'Abre cuando' && !occasion)) { form.querySelector<HTMLInputElement>(!title ? '[name="title"]' : !body ? '[name="body"]' : '[name="occasion"]')?.focus(); return; }
    const letter: Letter = { id: crypto.randomUUID(), title, body, author: values.get('author') === 'Val' ? 'Val' : 'Ale', tag, occasion: tag === 'Abre cuando' ? occasion : '', createdAt: new Date().toISOString() };
    setStored(previous => [letter, ...safeLetters(previous)]);
    setCompose(false);
    setFilter('Todas');
    setStatus('Carta añadida a este navegador.');
  }
  return <section className="studio-page studio-letters-page" aria-labelledby="letters-title">
    <div className="studio-page-heading"><div><p className="eyebrow"><Mail size={14} /> PALABRAS QUE SE QUEDAN</p><h1 className="page-title" id="letters-title">Cartas para <em>nosotros.</em></h1><p className="muted studio-intro">Hay cosas que merecen escribirse despacito.<br />Un sobre, unas palabras, un poquito de nosotros.</p></div><button type="button" className="button-primary studio-add-button" onClick={() => { setTag('Para hoy'); setCompose(true); }}><PenLine size={17} /> Escribir una carta</button></div>
    <StudioLocalNote demo={demo} />
    <StudioStorageNotice saved={saved} onExport={exportLetters} />
    <div className="studio-toolbar"><div className="studio-filter-group" aria-label="Filtrar cartas">{(['Todas', 'Para hoy', 'Abre cuando'] as const).map(value => <button type="button" key={value} className={filter === value ? 'studio-filter is-active' : 'studio-filter'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{value === 'Todas' && <span>{letters.length}</span>}</button>)}</div>{letters.length > 0 && <button type="button" className="studio-export" onClick={exportLetters}><Download size={14} /> Exportar</button>}</div>
    <div className="studio-letter-grid">{visible.map((letter, index) => <button type="button" className={`studio-envelope-card studio-tone-${index % 3}`} key={letter.id} onClick={() => setOpened(letter)} aria-label={`Leer ${letter.title}, de ${letter.author}`}>
      <div className="studio-envelope-art" aria-hidden="true"><div className="studio-envelope-outline" /><span className="studio-envelope-seal"><Heart size={16} strokeWidth={1.5} /></span><StudioSprig /></div>
      <div className="studio-letter-details"><span className="studio-tag">{letter.tag === 'Abre cuando' ? 'ABRE CUANDO…' : 'PARA HOY'}</span><h2>{letter.title}</h2><p>{letter.tag === 'Abre cuando' ? letter.occasion : letter.body.replace(/\s+/g, ' ')}</p><div className="studio-card-bottom"><span className="studio-author"><span>{letter.author.charAt(0)}</span> De {letter.author}</span><span className="studio-text-action">Abrir carta <ArrowUpRight size={15} /></span></div></div>
    </button>)}</div>
    {visible.length === 0 && <div className="studio-empty"><span className="studio-empty-icon"><Mail size={30} strokeWidth={1.3} /></span><h2>{letters.length ? 'Todavía no hay cartas aquí.' : 'La primera carta empieza contigo.'}</h2><p>{letters.length ? 'Elige otro filtro o escribe unas palabras para este momento.' : 'Escribe algo para hoy o prepara un abrazo para cuando haga falta.'}</p><button type="button" className="button-secondary" onClick={() => { setTag(filter === 'Abre cuando' ? 'Abre cuando' : 'Para hoy'); setCompose(true); }}><PenLine size={16} /> Escribir una carta</button><StudioSprig /></div>}
    <p className="studio-footnote"><Sparkles size={13} /> A veces, el mejor regalo cabe en unas cuantas palabras.</p>
    <p className="studio-status" role="status">{status}</p>
    {compose && <StudioDialog title="Querido amor…" subtitle="Escribe sin prisa. Esta carta se guardará solo en este navegador." onClose={() => setCompose(false)}>
      <form onSubmit={saveLetter} className="studio-form">
        <div className="studio-form-row"><label className="field">De parte de<select className="input" name="author" defaultValue="Ale"><option>Ale</option><option>Val</option></select></label><label className="field">Cuándo abrirla<select className="input" value={tag} onChange={event => setTag(event.target.value as Letter['tag'])}><option>Para hoy</option><option>Abre cuando</option></select></label></div>
        {tag === 'Abre cuando' && <label className="field">Abre cuando…<input className="input" name="occasion" placeholder="necesites recordar cuánto te quiero" maxLength={120} required /></label>}
        <label className="field">Título<input className="input" name="title" placeholder="Una pequeña razón para sonreír" maxLength={100} required data-autofocus /></label>
        <label className="field">Tu carta<textarea className="textarea studio-letter-textarea" name="body" placeholder="Hoy quería decirte…" rows={7} maxLength={12000} required /></label>
        <p className="studio-form-note"><ShieldCheck size={14} /> Guardarla aquí no se la envía a la otra persona. Puedes exportar tus cartas para conservar una copia.</p>
        <div className="studio-form-actions"><button type="button" className="button-secondary" onClick={() => setCompose(false)}>Cancelar</button><button type="submit" className="button-primary"><Heart size={16} /> Guardar carta aquí</button></div>
      </form>
    </StudioDialog>}
    {opened && <StudioDialog title={opened.title} subtitle={opened.tag === 'Abre cuando' ? `Abre cuando ${opened.occasion}` : 'Unas palabras para este momento.'} onClose={() => setOpened(null)}>
      <div className="studio-reading"><Heart size={22} strokeWidth={1.2} aria-hidden="true" /><div className="studio-reading-body">{opened.body}</div><p className="studio-reading-signature">Con cariño, {opened.author}</p><StudioSprig /></div><div className="studio-form-actions"><button type="button" className="button-secondary" onClick={() => setOpened(null)}>Cerrar el sobre</button></div>
    </StudioDialog>}
  </section>;
}
