import { useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Circle, Coffee, Compass, Download, Heart, Home, MapPin, Pencil, Plus, Sparkles, Sprout, Trash2 } from 'lucide-react';
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
  { id: 'plan-demo-4', title: 'Noche de películas y palomitas', note: 'Un plan hermoso para una tarde de películas juntos.', category: 'En casita', date: '', done: true, createdAt: '2026-01-11T12:00:00Z' },
];

function planDate(date: string) {
  if (!date) return 'Cuando se nos antoje';
  if (!validPlanDate(date)) return 'Fecha por revisar';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Fecha por elegir' : parsed.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

const categoryIcons = {
  'Una cita': Coffee,
  'Una aventura': Compass,
  'En casita': Home,
  'Por descubrir': MapPin,
};

export default function PlansPage({ namespace }: { namespace: string }) {
  return <PlansContent key={namespace} namespace={namespace} />;
}

function PlansContent({ namespace }: { namespace: string }) {
  const demo = studioIsDemo(namespace);
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:plans:v1`, demo ? demoPlans : []);
  const [deletedIds, setDeletedIds] = useLocalState<string[]>(`${namespace}:plans:deleted:v1`, []);
  const [planOverrides, setPlanOverrides] = useLocalState<Record<string, Partial<Plan>>>(`${namespace}:plans:overrides:v1`, {});

  const sync = useStudioSync(namespace, 'plans', stored);
  const rawPlans = sync.rows.map(row => row.item);

  // Aplicar eliminaciones y sobreescrituras locales
  const activePlans = rawPlans
    .filter(plan => !deletedIds.includes(plan.id))
    .map(plan => ({ ...plan, ...(planOverrides[plan.id] || {}) }));

  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [error, setError] = useState('');
  const [compose, setCompose] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  // Campos de formulario para agregar/editar
  const [formAuthor, setFormAuthor] = useState<'Ale' | 'Val'>('Ale');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<PlanCategory>('Una cita');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');

  const [filter, setFilter] = useState<'Todos' | 'Por vivir' | 'Vividos'>('Todos');
  const [status, setStatus] = useState('');

  const completed = activePlans.filter(plan => plan.done).length;
  const visible = activePlans.filter(plan => filter === 'Todos' || (filter === 'Vividos' ? plan.done : !plan.done));

  const exportPlans = () => downloadJson('nuestra-historia-planes.json', { ...sync.exportData, plans: activePlans });

  const startCompose = () => {
    identity.current = null;
    setError('');
    sync.clearError();
    setEditingPlan(null);
    setFormAuthor('Ale');
    setFormTitle('');
    setFormCategory('Una cita');
    setFormDate('');
    setFormNote('');
    setCompose(true);
  };

  const startEdit = (plan: Plan) => {
    setError('');
    sync.clearError();
    setEditingPlan(plan);
    setFormAuthor(plan.author === 'Val' ? 'Val' : 'Ale');
    setFormTitle(plan.title);
    setFormCategory(plan.category);
    setFormDate(plan.date || '');
    setFormNote(plan.note || '');
    setCompose(true);
  };

  function handleDeletePlan(plan: Plan) {
    setDeletedIds(prev => [...(Array.isArray(prev) ? prev : []), plan.id]);
    setStored((prev: unknown) => Array.isArray(prev) ? prev.filter((item: any) => item?.id !== plan.id) : prev);
    setStatus(`Plan «${plan.title}» eliminado.`);
    setPlanToDelete(null);
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formTitle.trim();
    if (!title) {
      setError('Por favor escribe el nombre de nuestro plan.');
      return;
    }
    if (!categories.includes(formCategory)) return;

    if (!validPlanDate(formDate)) {
      setError('Elige una fecha válida entre 1900 y 2200, o déjala vacía.');
      return;
    }

    if (editingPlan) {
      const updatedPlan: Plan = {
        ...editingPlan,
        title,
        category: formCategory,
        date: formDate,
        note: formNote.trim(),
        author: formAuthor,
      };

      setPlanOverrides(prev => ({
        ...prev,
        [editingPlan.id]: updatedPlan,
      }));

      setStored((prev: unknown) =>
        Array.isArray(prev) ? prev.map((item: any) => item?.id === editingPlan.id ? updatedPlan : item) : prev
      );

      const row = sync.rows.find(item => item.item.id === editingPlan.id);
      if (row?.scope === 'shared' && sync.connected) {
        await sync.updatePlan(updatedPlan);
      }

      setCompose(false);
      setEditingPlan(null);
      setStatus(`Plan «${title}» actualizado.`);
      return;
    }

    identity.current ??= { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const plan: Plan = {
      ...identity.current,
      author: formAuthor,
      title,
      note: formNote.trim(),
      category: formCategory,
      date: formDate,
      done: false,
    };

    const localOnly = !sync.connected || (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'local';
    if (!localOnly) {
      if (!await sync.share(plan)) return;
    } else {
      try {
        setStored(prependStudioLocal(stored, plan));
      } catch (failure) {
        setError((failure as Error).message);
        return;
      }
    }

    setCompose(false);
    setFilter('Todos');
    setStatus(localOnly ? 'Plan añadido a este navegador.' : 'Plan compartido y confirmado.');
    identity.current = null;
  }

  async function togglePlan(plan: Plan) {
    const row = sync.rows.find(item => item.item.id === plan.id);
    const newDoneState = !plan.done;

    setPlanOverrides(prev => ({
      ...prev,
      [plan.id]: {
        ...(prev[plan.id] || {}),
        done: newDoneState,
      },
    }));

    if (row?.scope === 'shared') {
      if (!await sync.togglePlan(plan)) return;
    } else {
      try {
        setStored(toggleStudioLocalPlan(stored, plan.id, newDoneState));
      } catch (failure) {
        setError((failure as Error).message);
        return;
      }
    }

    setStatus(newDoneState ? `${plan.title}: marcado como vivido.` : `${plan.title}: vuelve a estar por vivir.`);
  }

  return (
    <section className="studio-page studio-plans-page" aria-labelledby="plans-title">
      <div className="studio-page-heading">
        <div>
          <h1 className="page-title" id="plans-title">Planes <em>pendientes.</em></h1>
          <p className="muted studio-intro">Todas las cosas que queremos hacer juntos, citas pendientes y lugares por descubrir.</p>
        </div>
        <button type="button" className="button-primary studio-add-button" onClick={startCompose}>
          <Plus size={17} /> Agregar un plan
        </button>
      </div>

      <StudioSyncNotice state={sync.state} error={sync.error || error} />
      <StudioStorageNotice saved={saved} onExport={exportPlans} />

      <div className="studio-plans-banner">
        <div>
          <span className="studio-banner-heart"><Sprout size={24} strokeWidth={1.4} /></span>
          <h2>Nuestra lista de deseos</h2>
          <p>Ideas para nuestras próximas salidas y aventuras juntos.</p>
        </div>
        <div className="studio-plan-counts">
          <div>
            <strong>{activePlans.length - completed}</strong>
            <span>por vivir</span>
          </div>
          <span className="studio-count-divider" />
          <div>
            <strong>{completed}</strong>
            <span>ya vividos</span>
          </div>
        </div>
        <StudioSprig />
      </div>

      <div className="studio-toolbar">
        <div className="studio-filter-group" aria-label="Filtrar planes">
          {(['Todos', 'Por vivir', 'Vividos'] as const).map(value => (
            <button
              type="button"
              key={value}
              className={filter === value ? 'studio-filter is-active' : 'studio-filter'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}{value === 'Todos' && <span>{activePlans.length}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="studio-export" onClick={exportPlans}>
          <Download size={14} /> Exportar
        </button>
      </div>

      <div className="studio-plan-list">
        {visible.map(plan => {
          const Icon = categoryIcons[plan.category];
          const row = sync.rows.find(item => item.item.id === plan.id);
          return (
            <article className={`card studio-plan-card${plan.done ? ' is-done' : ''}`} key={row?.localId ?? plan.id}>
              <span className={`studio-plan-category-icon studio-category-${categories.indexOf(plan.category)}`} aria-hidden="true">
                <Icon size={24} strokeWidth={1.4} />
              </span>
              <div className="studio-plan-copy">
                <div className="studio-plan-meta">
                  <span className="studio-tag">
                    {plan.category} · {row?.scope === 'shared' ? 'Compartido' : 'Solo aquí'}{plan.author ? ` · De ${plan.author}` : ''}
                  </span>
                  {plan.done && <span className="studio-done-tag"><Check size={12} /> Vivido</span>}
                </div>

                <h2>{plan.title}</h2>
                {plan.note && <p>{plan.note}</p>}
                <span className="studio-plan-date">
                  <CalendarDays size={13} aria-hidden="true" />{planDate(plan.date)}
                </span>

                <div className="studio-plan-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  {sync.connected && row?.hasLocalCopy && (
                    <StudioShareButton
                      shared={row.scope === 'shared'}
                      title={plan.title}
                      busy={sync.busy}
                      error={sync.error}
                      requireAuthor={!plan.author}
                      onShare={async selectedAuthor => {
                        const ok = await sync.share(plan, selectedAuthor);
                        if (ok) setStatus('Plan compartido. El borrador local se conserva.');
                        return ok;
                      }}
                    />
                  )}

                  <button
                    type="button"
                    className="studio-letter-delete-btn"
                    onClick={() => startEdit(plan)}
                    title="Editar plan"
                    style={{ color: 'var(--studio-rose-deep)' }}
                  >
                    <Pencil size={13} /> Editar
                  </button>

                  <button
                    type="button"
                    className="studio-letter-delete-btn"
                    onClick={() => setPlanToDelete(plan)}
                    title="Eliminar plan"
                  >
                    <Trash2 size={13} /> Borrar
                  </button>
                </div>
              </div>

              <button
                type="button"
                className={`studio-plan-toggle${plan.done ? ' is-checked' : ''}`}
                onClick={() => togglePlan(plan)}
                disabled={sync.busy}
                aria-pressed={plan.done}
                aria-label={plan.done ? `Marcar ${plan.title} como pendiente` : `Marcar ${plan.title} como vivido`}
              >
                {plan.done ? <Check size={19} /> : <Circle size={21} strokeWidth={1.2} />}
              </button>
            </article>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="studio-empty">
          <span className="studio-empty-icon"><Compass size={30} strokeWidth={1.3} /></span>
          <h2>{filter === 'Vividos' ? 'Aún no hay planes marcados como vividos.' : 'Aún no hay planes en esta lista.'}</h2>
          <p>{filter === 'Vividos' ? 'Marca un plan cuando ya lo hayan realizado juntos.' : 'Añade una cita pendiente, un viaje o algo especial que quieran hacer.'}</p>
          <button type="button" className="button-secondary" onClick={startCompose}>
            <Plus size={16} /> Añadir un plan
          </button>
          <StudioSprig />
        </div>
      )}

      <p className="studio-footnote"><Sparkles size={13} /> Lo mejor de hacer planes es tener con quién vivirlos.</p>
      <p className="studio-status" role="status">{status}</p>

      {/* Modal Agregar o Editar Plan */}
      {compose && (
        <StudioDialog
          title={editingPlan ? "Editar plan" : "Nuevo plan juntos"}
          subtitle={editingPlan ? `Modifica los detalles de «${editingPlan.title}»` : "Escribe la idea de la cita, viaje o momento especial."}
          busy={sync.busy}
          onClose={() => { setCompose(false); setEditingPlan(null); }}
        >
          <form className="studio-form" onSubmit={savePlan} aria-busy={sync.busy}>
            <fieldset disabled={sync.busy} style={{ display: 'contents' }}>
              <label className="field">
                Idea de
                <select
                  className="input"
                  name="author"
                  value={formAuthor}
                  onChange={e => setFormAuthor(e.target.value as 'Ale' | 'Val')}
                >
                  <option value="Ale">Ale</option>
                  <option value="Val">Val</option>
                </select>
              </label>

              <label className="field">
                Nuestro plan
                <input
                  className="input"
                  name="title"
                  placeholder="Ver el amanecer juntos"
                  required
                  maxLength={140}
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  data-autofocus
                />
              </label>

              <div className="studio-form-row">
                <label className="field">
                  Tipo de plan
                  <select
                    className="input"
                    name="category"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as PlanCategory)}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Fecha <span className="studio-optional">(opcional)</span>
                  <input
                    className="input"
                    name="date"
                    type="date"
                    min="1900-01-01"
                    max="2200-12-31"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                Los pequeños detalles <span className="studio-optional">(opcional)</span>
                <textarea
                  className="textarea"
                  name="note"
                  placeholder="Dónde, qué llevar o por qué te hace ilusión…"
                  rows={4}
                  maxLength={2000}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                />
              </label>

              <p className="studio-form-note">
                <Heart size={14} /> {sync.connected ? "Compartir lo guarda para ambos. Guardar solo aquí conserva un borrador local." : "Se guarda en este navegador. Puedes exportar una copia cuando quieras."}
              </p>

              {(error || sync.error) && <p className="studio-form-error" role="alert">{error || sync.error}</p>}

              <div className="studio-form-actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={sync.busy}
                  onClick={() => { setCompose(false); setEditingPlan(null); }}
                >
                  Cancelar
                </button>
                {!editingPlan && sync.connected && (
                  <button type="submit" name="destination" value="local" className="button-secondary" disabled={sync.busy}>
                    Guardar solo aquí
                  </button>
                )}
                <button type="submit" className="button-primary" disabled={sync.busy}>
                  {editingPlan ? (
                    <><Pencil size={15} /> Guardar cambios</>
                  ) : (
                    <><Plus size={16} /> {sync.busy ? "Confirmando…" : sync.connected ? "Compartir plan" : "Guardar plan aquí"}</>
                  )}
                </button>
              </div>
            </fieldset>
          </form>
        </StudioDialog>
      )}

      {/* Modal Confirmar Eliminar Plan */}
      {planToDelete && (
        <StudioDialog
          title="¿Eliminar este plan?"
          subtitle={`«${planToDelete.title}» se borrará de la lista de deseos. Esta acción no se puede deshacer.`}
          onClose={() => setPlanToDelete(null)}
        >
          <div className="studio-form-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="button-secondary" onClick={() => setPlanToDelete(null)}>
              Cancelar
            </button>
            <button type="button" className="button-destructive" onClick={() => handleDeletePlan(planToDelete)}>
              <Trash2 size={15} /> Eliminar plan
            </button>
          </div>
        </StudioDialog>
      )}
    </section>
  );
}
