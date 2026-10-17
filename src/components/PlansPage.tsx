import { useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Circle, Coffee, Compass, Download, Heart, Home, MapPin, Plus, Sparkles, Sprout } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { StudioDialog, StudioLocalNote, StudioSprig, StudioStorageNotice, StudioSyncNotice, StudioShareButton, studioIsDemo } from './LettersPage';
import { planCategories, prependStudioLocal, toggleStudioLocalPlan, validPlanDate, type StudioPlan } from '../data/studio-sync';
import { useStudioSync } from './useStudioSync';
import './studio.css';

const categories = planCategories;
type PlanCategory = typeof categories[number];
type Plan = StudioPlan;
const demoPlans: Plan[] = [
  { id: 'plan-demo-1', title: 'Un picnic sin mirar el reloj', note: 'Algo rico, una mantita y una tarde para nosotros.', category: 'Una cita', date: '', done: false, createdAt: '2026-01-14T12:00:00Z' },
  { id: 'plan-demo-2', title: 'Perdernos en un lugar bonito', note: 'Elegir un pueblito y descubrirlo caminando.', category: 'Una aventura', date: '', done: false, createdAt: '2026-01-13T12:00:00Z' },
  { id: 'plan-demo-3', title: 'Cocinar algo por primera vez', note: 'La receta puede salir como sea. La compañía ya es perfecta.', category: 'En casita', date: '', done: false, createdAt: '2026-01-12T12:00:00Z' },
  { id: 'plan-demo-4', title: 'Noche de películas y palomitas', note: 'Un plan de ejemplo que ya podemos marcar como vivido.', category: 'En casita', date: '', done: true, createdAt: '2026-01-11T12:00:00Z' },
];
function planDate(date: string) {
  if (!date) return 'Cuando se nos antoje';
  if (!validPlanDate(date)) return 'Fecha por revisar';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Fecha por elegir' : parsed.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
const categoryIcons = { 'Una cita': Coffee, 'Una aventura': Compass, 'En casita': Home, 'Por descubrir': MapPin };

export default function PlansPage({ namespace }: { namespace: string }) { return <PlansContent key={namespace} namespace={namespace} />; }
function PlansContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:plans:v1`, demo ? demoPlans : []);
  const sync = useStudioSync(namespace, 'plans', stored);
  const plans = sync.rows.map(row => row.item);
  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [error, setError] = useState('');
  const startCompose = () => { identity.current = null; setError(''); sync.clearError(); setCompose(true); };
  const [compose, setCompose] = useState(false);
  const [filter, setFilter] = useState<'Todos' | 'Por vivir' | 'Vividos'>('Todos');
  const [status, setStatus] = useState('');
  const completed = plans.filter(plan => plan.done).length;
  const visible = plans.filter(plan => filter === 'Todos' || (filter === 'Vividos' ? plan.done : !plan.done));
  const exportPlans = () => downloadJson('nuestra-historia-planes.json', { ...sync.exportData, plans });
  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    if (!title) { form.querySelector<HTMLInputElement>('[name="title"]')?.focus(); return; }
    const category = String(data.get('category')) as PlanCategory;
    if (!categories.includes(category)) return;
    const date = String(data.get('date') ?? '');
    if (!validPlanDate(date)) { setError('Elige una fecha válida entre 1900 y 2200, o déjala vacía.'); return; }
    identity.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const plan: Plan = { ...identity.current, author: data.get('author') === 'Val' ? 'Val' : 'Ale', title, note: String(data.get('note') ?? '').trim(), category, date, done: false };
    const localOnly = !sync.connected || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'local';
    if (!localOnly) { if (!await sync.share(plan)) return; }
    else { try { setStored(prependStudioLocal(stored, plan)); } catch (failure) { setError((failure as Error).message); return; } }
    setCompose(false);
    setFilter('Todos');
    setStatus(localOnly ? 'Plan añadido a este navegador.' : 'Plan compartido y confirmado.');
    identity.current = null;
  }
  async function togglePlan(plan: Plan) {
    const row = sync.rows.find(item => item.item.id === plan.id);
    if (row?.scope === 'shared') { if (!await sync.togglePlan(plan)) return; }
    else { try { setStored(toggleStudioLocalPlan(stored, plan.id, !plan.done)); } catch (failure) { setError((failure as Error).message); return; } }
    setStatus(plan.done ? `${plan.title}: vuelve a estar por vivir.` : `${plan.title}: marcado como vivido.`);
  }
  return <section className="studio-page studio-plans-page" aria-labelledby="plans-title">
    <div className="studio-page-heading"><div><p className="eyebrow"><Compass size={14} /> TODAVÍA NOS QUEDA TANTO</p><h1 className="page-title" id="plans-title">Lo bonito que<br />nos queda por <em>vivir.</em></h1><p className="muted studio-intro">Planes pequeños, sueños enormes y mil excusas<br className="studio-desktop-break" /> para seguir sumando momentos.</p></div><button type="button" className="button-primary studio-add-button" onClick={startCompose}><Plus size={17} /> Imaginar un plan</button></div>
    <StudioLocalNote demo={demo} connected={sync.connected} />
    <StudioSyncNotice state={sync.state} error={sync.error || error} />
    <StudioStorageNotice saved={saved} onExport={exportPlans} />
    <div className="studio-plans-banner"><div><span className="studio-banner-heart"><Sprout size={24} strokeWidth={1.4} /></span><h2>Una lista de <em>algún día.</em><br />Y las ganas de hacerlo juntos.</h2><p>No todos los planes necesitan fecha. A veces, basta con las ganas.</p></div><div className="studio-plan-counts"><div><strong>{plans.length - completed}</strong><span>por vivir</span></div><span className="studio-count-divider" /><div><strong>{completed}</strong><span>ya vividos</span></div></div><StudioSprig /></div>
    <div className="studio-toolbar"><div className="studio-filter-group" aria-label="Filtrar planes">{(['Todos', 'Por vivir', 'Vividos'] as const).map(value => <button type="button" key={value} className={filter === value ? 'studio-filter is-active' : 'studio-filter'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{value === 'Todos' && <span>{plans.length}</span>}</button>)}</div>{<button type="button" className="studio-export" onClick={exportPlans}><Download size={14} /> Exportar</button>}</div>
    <div className="studio-plan-list">{visible.map(plan => {
      const Icon = categoryIcons[plan.category];
      const row = sync.rows.find(item => item.item.id === plan.id);
      return <article className={`card studio-plan-card${plan.done ? ' is-done' : ''}`} key={row?.localId ?? plan.id}>
        <span className={`studio-plan-category-icon studio-category-${categories.indexOf(plan.category)}`} aria-hidden="true"><Icon size={24} strokeWidth={1.4} /></span><div className="studio-plan-copy"><div className="studio-plan-meta"><span className="studio-tag">{plan.category} · {row?.scope === 'shared' ? 'Compartido' : demo && plan.id.startsWith('plan-demo-') ? 'Ejemplo · solo aquí' : 'Solo aquí'}{plan.author ? ` · De ${plan.author}` : ''}</span>{plan.done && <span className="studio-done-tag"><Check size={12} /> Vivido</span>}</div><h2>{plan.title}</h2>{plan.note && <p>{plan.note}</p>}<span className="studio-plan-date"><CalendarDays size={13} aria-hidden="true" />{planDate(plan.date)}</span>{sync.connected && row?.hasLocalCopy && <StudioShareButton shared={row.scope === 'shared'} title={plan.title} busy={sync.busy} error={sync.error} requireAuthor={!plan.author} onShare={async selectedAuthor => { const ok = await sync.share(plan, selectedAuthor); if (ok) setStatus('Plan compartido. El borrador local se conserva.'); return ok; }} />}</div><button type="button" className={`studio-plan-toggle${plan.done ? ' is-checked' : ''}`} onClick={() => togglePlan(plan)} disabled={sync.busy} aria-pressed={plan.done} aria-label={plan.done ? `Marcar ${plan.title} como pendiente` : `Marcar ${plan.title} como vivido`}>{plan.done ? <Check size={19} /> : <Circle size={21} strokeWidth={1.2} />}</button>
      </article>;
    })}</div>
    {visible.length === 0 && <div className="studio-empty"><span className="studio-empty-icon"><Compass size={30} strokeWidth={1.3} /></span><h2>{filter === 'Vividos' ? 'Los recuerdos empiezan con un plan.' : filter === 'Por vivir' && plans.length ? 'Todos los planes ya tienen su historia.' : 'Hagamos espacio para lo que viene.'}</h2><p>{filter === 'Vividos' ? 'Marca un plan como vivido cuando se convierta en recuerdo.' : 'Una cita sencilla, un viaje soñado o algo que siempre quisieron intentar.'}</p><button type="button" className="button-secondary" onClick={startCompose}><Plus size={16} /> Añadir un plan</button><StudioSprig /></div>}
    <p className="studio-footnote"><Sparkles size={13} /> Lo mejor de hacer planes es saber con quién quieres vivirlos.</p>
    <p className="studio-status" role="status">{status}</p>
    {compose && <StudioDialog title="¿Y si un día…?" subtitle="Guarda esa idea antes de que se escape. El calendario puede esperar." busy={sync.busy} onClose={() => setCompose(false)}>
      <form className="studio-form" onSubmit={savePlan} aria-busy={sync.busy}>
        <fieldset disabled={sync.busy} style={{ display: 'contents' }}>
        <label className="field">Idea de<select className="input" name="author" defaultValue="Ale"><option>Ale</option><option>Val</option></select></label>
        <label className="field">Nuestro plan<input className="input" name="title" placeholder="Ver el amanecer juntos" required maxLength={140} data-autofocus /></label>
        <div className="studio-form-row"><label className="field">Tipo de plan<select className="input" name="category" defaultValue="Una cita">{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="field">Fecha <span className="studio-optional">(opcional)</span><input className="input" name="date" type="date" min="1900-01-01" max="2200-12-31" /></label></div>
        <label className="field">Los pequeños detalles <span className="studio-optional">(opcional)</span><textarea className="textarea" name="note" placeholder="Dónde, qué llevar o por qué te hace ilusión…" rows={4} maxLength={2000} /></label>
        <p className="studio-form-note"><Heart size={14} /> {sync.connected ? "Compartir lo guarda para ambos. Guardar solo aquí conserva un borrador local." : "Se guarda en este navegador. La lista no se comparte ni crea recordatorios automáticos."}</p>
        {(error || sync.error) && <p className="studio-form-error" role="alert">{error || sync.error}</p>}
        <div className="studio-form-actions"><button type="button" className="button-secondary" disabled={sync.busy} onClick={() => setCompose(false)}>Cancelar</button>{sync.connected && <button type="submit" name="destination" value="local" className="button-secondary" disabled={sync.busy}>Guardar solo aquí</button>}<button type="submit" className="button-primary" disabled={sync.busy}><Plus size={16} /> {sync.busy ? "Confirmando…" : sync.connected ? "Compartir plan" : "Guardar plan aquí"}</button></div>
        </fieldset>
      </form>
    </StudioDialog>}
  </section>;
}
