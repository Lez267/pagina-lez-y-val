import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Circle, Coffee, Compass, Download, Heart, Home, MapPin, Plus, Sparkles, Sprout } from 'lucide-react';
import { downloadJson, useLocalState } from '../lib/storage';
import { StudioDialog, StudioLocalNote, StudioSprig, StudioStorageNotice, studioIsDemo } from './LettersPage';
import './studio.css';

const categories = ['Una cita', 'Una aventura', 'En casita', 'Por descubrir'] as const;
type PlanCategory = typeof categories[number];
type Plan = { id: string; title: string; note: string; category: PlanCategory; date: string; done: boolean; createdAt: string };
const demoPlans: Plan[] = [
  { id: 'plan-demo-1', title: 'Un picnic sin mirar el reloj', note: 'Algo rico, una mantita y una tarde para nosotros.', category: 'Una cita', date: '', done: false, createdAt: '2026-01-14T12:00:00Z' },
  { id: 'plan-demo-2', title: 'Perdernos en un lugar bonito', note: 'Elegir un pueblito y descubrirlo caminando.', category: 'Una aventura', date: '', done: false, createdAt: '2026-01-13T12:00:00Z' },
  { id: 'plan-demo-3', title: 'Cocinar algo por primera vez', note: 'La receta puede salir como sea. La compañía ya es perfecta.', category: 'En casita', date: '', done: false, createdAt: '2026-01-12T12:00:00Z' },
  { id: 'plan-demo-4', title: 'Noche de películas y palomitas', note: 'Un plan de ejemplo que ya podemos marcar como vivido.', category: 'En casita', date: '', done: true, createdAt: '2026-01-11T12:00:00Z' },
];
function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['id', 'title', 'note', 'date', 'createdAt'].every(key => typeof item[key] === 'string') && typeof item.done === 'boolean' && categories.includes(item.category as PlanCategory) && (!item.date || /^\d{4}-\d{2}-\d{2}$/.test(String(item.date)));
}
const safePlans = (value: unknown): Plan[] => Array.isArray(value) ? value.filter(isPlan) : [];
function planDate(date: string) {
  if (!date) return 'Cuando se nos antoje';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Fecha por elegir' : parsed.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
const categoryIcons = { 'Una cita': Coffee, 'Una aventura': Compass, 'En casita': Home, 'Por descubrir': MapPin };

export default function PlansPage({ namespace }: { namespace: string }) { return <PlansContent key={namespace} namespace={namespace} />; }
function PlansContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<Plan[]>(`${namespace}:plans:v1`, demo ? demoPlans : []);
  const plans = safePlans(stored);
  const [compose, setCompose] = useState(false);
  const [filter, setFilter] = useState<'Todos' | 'Por vivir' | 'Vividos'>('Todos');
  const [status, setStatus] = useState('');
  const completed = plans.filter(plan => plan.done).length;
  const visible = plans.filter(plan => filter === 'Todos' || (filter === 'Vividos' ? plan.done : !plan.done));
  const exportPlans = () => downloadJson('nuestra-historia-planes.json', { version: 1, plans });
  function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    if (!title) { form.querySelector<HTMLInputElement>('[name="title"]')?.focus(); return; }
    const category = String(data.get('category')) as PlanCategory;
    if (!categories.includes(category)) return;
    const plan: Plan = { id: crypto.randomUUID(), title, note: String(data.get('note') ?? '').trim(), category, date: String(data.get('date') ?? ''), done: false, createdAt: new Date().toISOString() };
    setStored(previous => [plan, ...safePlans(previous)]);
    setCompose(false);
    setFilter('Todos');
    setStatus('Plan añadido a este navegador.');
  }
  function togglePlan(plan: Plan) {
    setStored(previous => safePlans(previous).map(item => item.id === plan.id ? { ...item, done: !item.done } : item));
    setStatus(plan.done ? `${plan.title}: vuelve a estar por vivir.` : `${plan.title}: marcado como vivido.`);
  }
  return <section className="studio-page studio-plans-page" aria-labelledby="plans-title">
    <div className="studio-page-heading"><div><p className="eyebrow"><Compass size={14} /> TODAVÍA NOS QUEDA TANTO</p><h1 className="page-title" id="plans-title">Lo bonito que<br />nos queda por <em>vivir.</em></h1><p className="muted studio-intro">Planes pequeños, sueños enormes y mil excusas<br className="studio-desktop-break" /> para seguir sumando momentos.</p></div><button type="button" className="button-primary studio-add-button" onClick={() => setCompose(true)}><Plus size={17} /> Imaginar un plan</button></div>
    <StudioLocalNote demo={demo} />
    <StudioStorageNotice saved={saved} onExport={exportPlans} />
    <div className="studio-plans-banner"><div><span className="studio-banner-heart"><Sprout size={24} strokeWidth={1.4} /></span><h2>Una lista de <em>algún día.</em><br />Y las ganas de hacerlo juntos.</h2><p>No todos los planes necesitan fecha. A veces, basta con las ganas.</p></div><div className="studio-plan-counts"><div><strong>{plans.length - completed}</strong><span>por vivir</span></div><span className="studio-count-divider" /><div><strong>{completed}</strong><span>ya vividos</span></div></div><StudioSprig /></div>
    <div className="studio-toolbar"><div className="studio-filter-group" aria-label="Filtrar planes">{(['Todos', 'Por vivir', 'Vividos'] as const).map(value => <button type="button" key={value} className={filter === value ? 'studio-filter is-active' : 'studio-filter'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{value === 'Todos' && <span>{plans.length}</span>}</button>)}</div>{plans.length > 0 && <button type="button" className="studio-export" onClick={exportPlans}><Download size={14} /> Exportar</button>}</div>
    <div className="studio-plan-list">{visible.map(plan => {
      const Icon = categoryIcons[plan.category];
      return <article className={`card studio-plan-card${plan.done ? ' is-done' : ''}`} key={plan.id}>
        <span className={`studio-plan-category-icon studio-category-${categories.indexOf(plan.category)}`} aria-hidden="true"><Icon size={24} strokeWidth={1.4} /></span><div className="studio-plan-copy"><div className="studio-plan-meta"><span className="studio-tag">{plan.category}</span>{plan.done && <span className="studio-done-tag"><Check size={12} /> Vivido</span>}</div><h2>{plan.title}</h2>{plan.note && <p>{plan.note}</p>}<span className="studio-plan-date"><CalendarDays size={13} aria-hidden="true" />{planDate(plan.date)}</span></div><button type="button" className={`studio-plan-toggle${plan.done ? ' is-checked' : ''}`} onClick={() => togglePlan(plan)} aria-pressed={plan.done} aria-label={plan.done ? `Marcar ${plan.title} como pendiente` : `Marcar ${plan.title} como vivido`}>{plan.done ? <Check size={19} /> : <Circle size={21} strokeWidth={1.2} />}</button>
      </article>;
    })}</div>
    {visible.length === 0 && <div className="studio-empty"><span className="studio-empty-icon"><Compass size={30} strokeWidth={1.3} /></span><h2>{filter === 'Vividos' ? 'Los recuerdos empiezan con un plan.' : filter === 'Por vivir' && plans.length ? 'Todos los planes ya tienen su historia.' : 'Hagamos espacio para lo que viene.'}</h2><p>{filter === 'Vividos' ? 'Marca un plan como vivido cuando se convierta en recuerdo.' : 'Una cita sencilla, un viaje soñado o algo que siempre quisieron intentar.'}</p><button type="button" className="button-secondary" onClick={() => setCompose(true)}><Plus size={16} /> Añadir un plan</button><StudioSprig /></div>}
    <p className="studio-footnote"><Sparkles size={13} /> Lo mejor de hacer planes es saber con quién quieres vivirlos.</p>
    <p className="studio-status" role="status">{status}</p>
    {compose && <StudioDialog title="¿Y si un día…?" subtitle="Guarda esa idea antes de que se escape. El calendario puede esperar." onClose={() => setCompose(false)}>
      <form className="studio-form" onSubmit={savePlan}>
        <label className="field">Nuestro plan<input className="input" name="title" placeholder="Ver el amanecer juntos" required maxLength={140} data-autofocus /></label>
        <div className="studio-form-row"><label className="field">Tipo de plan<select className="input" name="category" defaultValue="Una cita">{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="field">Fecha <span className="studio-optional">(opcional)</span><input className="input" name="date" type="date" min="1900-01-01" max="2200-12-31" /></label></div>
        <label className="field">Los pequeños detalles <span className="studio-optional">(opcional)</span><textarea className="textarea" name="note" placeholder="Dónde, qué llevar o por qué te hace ilusión…" rows={4} maxLength={2000} /></label>
        <p className="studio-form-note"><Heart size={14} /> Se guarda en este navegador. La lista no se comparte ni crea recordatorios automáticos.</p>
        <div className="studio-form-actions"><button type="button" className="button-secondary" onClick={() => setCompose(false)}>Cancelar</button><button type="submit" className="button-primary"><Plus size={16} /> Guardar plan aquí</button></div>
      </form>
    </StudioDialog>}
  </section>;
}
