'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, CalendarHeart, Check, ChevronRight, Film, Flower2, Heart, House, Image as ImageIcon, LoaderCircle, LockKeyhole, LogOut, Mail, Menu, Music2, Puzzle, ShieldCheck, Sparkles, Sprout, Upload, X } from 'lucide-react';
import type { GallerySession, Memory, Page } from './data/types';
import { RELATIONSHIP_START } from './data/demo';
import { normalizeImport } from './data/normalizer';
import { daysSince, dateLabel } from './lib/dates';
import { downloadJson } from './lib/storage';
import { importIdentity } from './lib/import-identity';
import { Botanical, FlowerMark } from './components/Botanical';
import { Dialog } from './components/Dialog';
import { MemoryCard, MemoryDialog, TimelinePage } from './components/MemoryViews';
import { GalleryPage } from './components/GalleryPage';
import LettersPage from './components/LettersPage';
import MusicPage from './components/MusicPage';
import MoviesPage from './components/MoviesPage';
import PlansPage from './components/PlansPage';
import GamesPage from './components/GamesPage';
import HeroPhotoScrapbook from './components/HeroPhotoScrapbook';
import LoginPage from './components/LoginPage';
import './components/studio.css';

const navigation: { id: Page; label: string; icon: typeof Heart }[] = [
  { id: 'home', label: 'Nuestro rincón', icon: House },
  { id: 'memories', label: 'Recuerdos', icon: ImageIcon },
  { id: 'timeline', label: 'Línea del tiempo', icon: Sprout },
  { id: 'letters', label: 'Cartitas ♡', icon: Mail },
  { id: 'music', label: 'Canciones', icon: Music2 },
  { id: 'movies', label: 'Cartelera', icon: Film },
  { id: 'games', label: 'Minijuegos', icon: Puzzle },
  { id: 'plans', label: 'Planes pendientes', icon: CalendarHeart },
  { id: 'gifts', label: 'Sorpresitas', icon: Sparkles },
];

const ROMANTIC_PARTICLES = [
  { symbol: '❤', size: 14, left: '6%', delay: '0s', duration: '14s' },
  { symbol: '✧', size: 12, left: '16%', delay: '3s', duration: '11s' },
  { symbol: '❀', size: 15, left: '26%', delay: '7s', duration: '16s' },
  { symbol: '♡', size: 16, left: '36%', delay: '1.5s', duration: '13s' },
  { symbol: '✦', size: 11, left: '46%', delay: '8s', duration: '12s' },
  { symbol: '❤', size: 13, left: '56%', delay: '4s', duration: '15s' },
  { symbol: '✿', size: 14, left: '66%', delay: '9s', duration: '17s' },
  { symbol: '✧', size: 12, left: '76%', delay: '5.5s', duration: '12s' },
  { symbol: '♡', size: 15, left: '86%', delay: '2s', duration: '14s' },
  { symbol: '❤', size: 13, left: '94%', delay: '6.5s', duration: '15s' },
];

const isPage = (page: string): page is Page => navigation.some(item => item.id === page);
const pageFromHash = (): Page => {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.slice(1);
  return isPage(hash) ? hash : 'home';
};


function HomePage({ memories, navigate, example }: { memories: Memory[]; navigate: (page: Page) => void; example: boolean }) {
  const [selected, setSelected] = useState<Memory | null>(null);
  const recent = [...memories].sort((a,b) => b.date.localeCompare(a.date)).slice(0,3);
  const cover = memories.find(item => item.media.some(media => media.type === 'image'))?.media.find(media => media.type === 'image')?.url;
  const photos = memories.reduce((sum,memory) => sum + memory.media.filter(media => media.type === 'image').length, 0);

  return (
    <>
      <section className="home-hero">
        <div className="hero-text">
          <div className="hero-sweet-badge">
            <span className="sweet-badge-icon">🌸</span>
            <span>Una pagina hecha con mucho amor para ti, Valeria ♡</span>
          </div>
          <h1 className="hero-sweet-heading">
            <span className="sweet-names">Ale & Val</span>
            <span className="sweet-script-sub">cada momento a tu lado es lo mejor ♡</span>
          </h1>
          <p className="hero-sweet-p">
            Este es nuestro lugar: para guardar cada fotografía que nos hace recordar cada momento lindo que pasamos juntos, recordar los momentos más bonitos que hemos compartido y planear juntos todo lo que aún nos queda por vivir.
          </p>
          <div className="hero-sweet-actions">
            <button className="sweet-btn sweet-btn-primary" onClick={() => navigate('memories')}>
              <Heart size={18} fill="currentColor"/>
              <span>Ver nuestros recuerdos</span>
            </button>
            <button className="sweet-btn sweet-btn-secondary" onClick={() => navigate('letters')}>
              <Mail size={18}/>
              <span>Abrir cartitas</span>
            </button>
          </div>
          <div className="hero-sweet-date">
            <span className="heart-beat">❤</span>
            <strong>Novios desde el {dateLabel(RELATIONSHIP_START)}</strong>
            <span className="date-dot">·</span>
            <span>{daysSince(RELATIONSHIP_START)} días haciéndome la persona más feliz</span>
          </div>
        </div>

        <HeroPhotoScrapbook cover={cover} example={example} memories={memories} />
      </section>

      {/* Romantic Milestone Ribbon */}
      <section className="love-milestones" aria-label="Nuestra historia en números">
        <div className="milestone-card milestone-days">
          <span className="milestone-icon"><CalendarHeart size={22}/></span>
          <div className="milestone-text">
            <strong>{daysSince(RELATIONSHIP_START)} días</strong>
            <span>de novios y contando cada segundo</span>
          </div>
        </div>
        <div className="milestone-card milestone-memories">
          <span className="milestone-icon"><ImageIcon size={22}/></span>
          <div className="milestone-text">
            <strong>{memories.length} recuerdos</strong>
            <span>momentos guardados con amor</span>
          </div>
        </div>
        <div className="milestone-card milestone-photos">
          <span className="milestone-icon"><Flower2 size={22}/></span>
          <div className="milestone-text">
            <strong>{photos} fotografías</strong>
            <span>sonrisas que atesoro siempre</span>
          </div>
        </div>
        <div className="milestone-card milestone-forever">
          <span className="milestone-icon"><Heart size={22} fill="currentColor"/></span>
          <div className="milestone-text">
            <strong>Toda una vida</strong>
            <span>de momentos bonitos por vivir juntos</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Nuestros rincones especiales</h2>
            <p className="section-sub-romantic">Lugares para escribir cartas, escuchar nuestras canciones y jugar pequenos minijuegos.</p>
          </div>
          <FlowerMark size={28}/>
        </div>
        <div className="chapter-grid">
          {[
            { id: 'letters' as Page, icon: Mail, title: 'Cartitas ♡', description: 'Cartitas para leer :3', color: 'rose' },
            { id: 'music' as Page, icon: Music2, title: 'Canciones', description: 'Canciones dedicadas y que forman nuestra playlist.', color: 'sage' },
            { id: 'movies' as Page, icon: Film, title: 'Cartelera', description: 'Películas pendientes por ver juntos y nuestras favoritas.', color: 'gold' },
            { id: 'games' as Page, icon: Puzzle, title: 'Minijuegos', description: 'Minijuegos para pasar el rato.', color: 'lilac' }
          ].map(item => (
            <button key={item.id} className={`chapter-card chapter-${item.color}`} onClick={() => navigate(item.id)}>
              <span className="chapter-icon"><item.icon size={23}/></span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="chapter-arrow"><ArrowRight size={17}/></span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Nuestros recuerdos favoritos</h2>
            <p className="section-sub-romantic">Fotografías de nuestros momentos..</p>
          </div>
          <button className="text-link" onClick={() => navigate('memories')}>Ver todos <ArrowRight size={15}/></button>
        </div>
        <div className="recent-grid">
          {recent.map(memory => <MemoryCard key={memory.id} memory={memory} compact onOpen={setSelected}/>)}
        </div>
        {!recent.length && <div className="empty-state"><Flower2 size={35}/><p>Sus recuerdos encontrarán aquí un lugar.</p></div>}
      </section>

      <section className="home-quote">
        <Botanical className="quote-botanical"/>
        <p>“Mi lugar favorito en el mundo siempre será <em>a tu lado.</em>”</p>
        <span className="quote-heart">❤</span>
      </section>

      {selected && <MemoryDialog key={selected.id} memory={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}

function GiftsPage() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Sorpresitas</h1>
        <p className="muted">Sorpresas y cosas hechas con amor para ti.</p>
      </header>
      <a className="gift-card" href="https://val-my-girl.vercel.app/" target="_blank" rel="noopener noreferrer">
        <div className="gift-art">
          <Botanical className="gift-botanical"/>
          <FlowerMark size={100}/>
          <span>para Valeria</span>
        </div>
        <div className="gift-copy">
          <h2>Feliz día de la novia ❤</h2>
          <p>Nuestra página especial, tus flores y cada palabra dedicada para ti.</p>
          <span className="button button-primary">Abrir regalo <ArrowRight size={16}/></span>
          <small>Se abre en una pestaña nueva.</small>
        </div>
      </a>
      <div className="future-gift">
        <Sparkles size={24}/>
        <div>
          <h3>Y todavía falta mucho más…</h3>
          <p>Muchos más momentos, viajes y sorpresas que iremos sumando juntos.</p>
        </div>
        <Heart size={18} fill="currentColor"/>
      </div>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [menu, setMenu] = useState(false);
  const [magic, setMagic] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<GallerySession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [imported, setImported] = useState<Memory[] | null>(null);
  const [importName, setImportName] = useState('');
  const [importNamespace, setImportNamespace] = useState('');
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const operationKind = useRef<'google' | 'import' | null>(null);
  const isFirstMount = useRef(true);


  const memories = imported ?? session?.memories ?? [];
  const example = false;
  const namespace = imported ? importNamespace : session ? `nh:user:${session.uid}` : 'nh:locked';

  // Verificar y sincronizar sesión en segundo plano desde Firebase
  useEffect(() => {
    let disposed = false;
    const attempt = operation.current;
    void import('./data/firebase').then(api => {
      if (disposed) return;
      return api.restoreSavedSession().then(restored => {
        if (!disposed && attempt === operation.current) setSession(restored);
      });
    }).catch(() => { if (!disposed && attempt === operation.current) setSession(null); })
      .finally(() => { if (!disposed) setRestoring(false); });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    const update = () => setPage(pageFromHash());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      document.title = `${navigation.find(item => item.id === page)?.label} · Ale & Val`;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${navigation.find(item => item.id === page)?.label} · Ale & Val`;
  }, [page]);


  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session?.uid) return;
    const uid = session.uid;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import('./data/firebase').then(api => {
      if (disposed) return;
      try {
        stop = api.watchCurrentMemories(
          next => { if (!disposed) setSession(current => current?.uid === uid ? { ...current, memories: next } : current); },
          () => {
            if (disposed) return;
            ++operation.current;
            setSession(null);
            setImported(null);
            setError('Tu sesión necesita verificarse de nuevo. Entra con Google para continuar.');
          },
          uid
        );
      } catch {
        if (!disposed) { setSession(null); setImported(null); }
      }
    }).catch(() => undefined);
    return () => { disposed = true; stop?.(); };
  }, [session?.uid]);

  const navigate = (target: Page) => {
    setPage(target);
    window.location.hash = target;
    setMenu(false);
  };

  const connect = async () => {
    if (loading) return;
    const attempt = ++operation.current;
    operationKind.current = 'google';
    setLoading(true);
    setError('');
    try {
      const { connectGallery } = await import('./data/firebase');
      if (attempt !== operation.current) return;
      const result = await connectGallery();
      if (attempt !== operation.current) return;
      setSession(result);
      setImported(null);
      setConnectOpen(false);
      setToast(`Bienvenido mi amor ♡ Galería cargada con ${result.memories.length} recuerdos.`);
    } catch (caught) {
      if (attempt === operation.current) setError(caught instanceof Error ? caught.message : 'No se pudo abrir la galería.');
    } finally {
      if (attempt === operation.current) { setLoading(false); operationKind.current = null; }
    }
  };

  const closeConnection = () => {
    const kind = operationKind.current;
    ++operation.current;
    operationKind.current = null;
    setLoading(false);
    setConnectOpen(false);
    if (kind === 'google') void import('./data/firebase').then(api => api.disconnectGallery()).catch(() => undefined);
  };

  const disconnect = async () => {
    ++operation.current;
    operationKind.current = null;
    setSession(null);
    setImported(null);
    setLoading(false);
    setRestoring(false);
    try {
      const { disconnectGallery } = await import('./data/firebase');
      await disconnectGallery();
    } catch {
      // Ignorar errores al desconectar
    } finally {
      setSession(null);
      setImported(null);
      setConnectOpen(false);
      try { localStorage.removeItem('nh:auth:session:v1'); } catch {}
      setToast('Sesión cerrada. Hasta pronto mi amor ♡');
    }
  };

  const importFile = async (file?: File) => {
    if (!file || loading || !session) return;
    const attempt = ++operation.current;
    operationKind.current = 'import';
    setLoading(true);
    setError('');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('El archivo es demasiado grande. Abre un JSON de hasta 20 MB.');
      const records = normalizeImport(JSON.parse(await file.text()));
      if (attempt !== operation.current) return;
      if (!records.length) throw new Error('No encontramos recuerdos en ese archivo. Elige el JSON de tu galería.');
      const fingerprint = await importIdentity(records);
      if (attempt !== operation.current) return;
      setImported(records);
      setImportNamespace(fingerprint);
      setImportName(file.name);
      setConnectOpen(false);
      setToast(`Abierto: ${records.length} recuerdos. El archivo se leyó sólo en este navegador.`);
    } catch (caught) {
      if (attempt === operation.current) setError(caught instanceof Error ? caught.message : 'No pudimos leer ese JSON.');
    } finally {
      if (attempt === operation.current) { setLoading(false); operationKind.current = null; }
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (!session) {
    return (
      <LoginPage
        onLogin={connect}
        loading={loading || restoring}
        error={error}
        magic={magic}
        setMagic={setMagic}
      />
    );
  }

  return (
    <div className={`app-shell ${magic ? '' : 'magic-off'}`}>
      <a className="skip-link" href="#main-content" onClick={event => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
        document.getElementById('main-content')?.scrollIntoView();
      }}>Ir al contenido</a>

      {/* Romantic Ambient Garden, Floating Dream Clouds & Particles */}
      <div className="ambient-garden" aria-hidden="true">
        <div className="ambient-cloud ambient-cloud-1"/>
        <div className="ambient-cloud ambient-cloud-2"/>
        <div className="ambient-cloud ambient-cloud-3"/>
        <Botanical className="ambient-branch"/>
        {ROMANTIC_PARTICLES.map((particle, i) => (
          <span
            key={i}
            className="romantic-particle"
            style={{
              left: particle.left,
              fontSize: `${particle.size}px`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          >
            {particle.symbol}
          </span>
        ))}
      </div>

      {/* Floating Modern Header */}
      <header className="site-header">
        <div className="nav-container">
          <button
            className="icon-button mobile-menu-toggle"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menu}
          >
            {menu ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <button className="brand" onClick={() => navigate('home')} aria-label="Nuestro rincón, inicio">
            <span className="brand-title">Ale & Valeria <span className="brand-heart">❤</span></span>
          </button>

          <nav className="desktop-nav" aria-label="Navegación principal">
            {navigation.map(item => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'is-active' : ''}`}
                onClick={() => navigate(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <item.icon size={15} strokeWidth={1.7}/>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <div className="header-user-badge" title={`Conectado como ${session?.displayName || 'Ale & Val'}`}>
              <span className="user-dot">🌸</span>
              <span className="user-name">{session?.displayName || 'Ale & Val'}</span>
            </div>

            <button
              className="button-header-logout"
              onClick={disconnect}
              title="Cerrar sesión de Google"
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>

            <button
              className="icon-button magic-toggle"
              onClick={() => setMagic(!magic)}
              aria-label={magic ? 'Pausar animaciones románticas' : 'Activar animaciones románticas'}
              aria-pressed={magic}
              title={magic ? 'Pausar animaciones' : 'Activar animaciones'}
            >
              <Sparkles size={17}/>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {menu && (
        <div className="mobile-drawer-backdrop" onClick={() => setMenu(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="drawer-brand">Ale & Valeria ❤</span>
              <button className="icon-button" onClick={() => setMenu(false)} aria-label="Cerrar"><X size={20}/></button>
            </div>
            <nav className="mobile-nav">
              {navigation.map(item => (
                <button
                  key={item.id}
                  className={`mobile-nav-item ${page === item.id ? 'is-active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={18} strokeWidth={1.6}/>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="drawer-footer">
              <button className="gallery-connection gallery-logout-action" onClick={disconnect}>
                <span className="connection-icon"><LogOut size={16}/></span>
                <span>
                  <strong>Cerrar sesión</strong>
                  <small>Cerrar la sesión de Google</small>
                </span>
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="app-body">
        <main id="main-content" tabIndex={-1} className={`main-content page-${page}`} key={namespace}>
          {page === 'home' && <HomePage memories={memories} navigate={navigate} example={example}/>}
          {page === 'memories' && <GalleryPage memories={memories} namespace={namespace} connected={!!session && !imported} session={session}/>}
          {page === 'timeline' && <TimelinePage memories={memories}/>}
          {page === 'letters' && <LettersPage namespace={namespace} session={session}/>}
          {page === 'music' && <MusicPage namespace={namespace} session={session}/>}
          {page === 'movies' && <MoviesPage namespace={namespace} session={session}/>}
          {page === 'games' && <GamesPage memories={memories} namespace={namespace} session={session} onOpenConnect={() => setConnectOpen(true)}/>}
          {page === 'plans' && <PlansPage namespace={namespace}/>}
          {page === 'gifts' && <GiftsPage/>}
        </main>

        <footer className="site-footer">
          <span>hecho con todo el amor</span>
          <FlowerMark size={19}/>
          <span>para Valeria.</span>
        </footer>
      </div>

      {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}

      {connectOpen && (
        <Dialog title={session ? 'Nuestra galería conectada' : 'Conectar nuestra galería'} onClose={closeConnection}>
          <div className="connection-intro">
            <span className="connection-flower"><FlowerMark size={54}/></span>
            <p>Accede a todos nuestros recuerdos compartidos. Esta galería utiliza la base de datos sincronizada para nosotros.</p>
          </div>
          <div className="preservation-note">
            <ShieldCheck size={19}/>
            <p>Tus recuerdos y fotos originales están protegidos. Esta versión sincronizada conserva todos los enlaces originales de fotos y videos.</p>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {session ? (
            <div className="connected-details">
              <p><strong>{session.memories.length} recuerdos disponibles</strong><br/><span className="muted">Sesión de {session.displayName}</span></p>
              <button className="button button-secondary" onClick={disconnect}><LogOut size={16}/> Cerrar esta sesión</button>
            </div>
          ) : (
            <button className="button button-google" onClick={connect} disabled={loading}>
              {loading ? <LoaderCircle size={17} className="spinning"/> : <span className="google-g">G</span>}
              {loading ? operationKind.current === 'import' ? 'Leyendo tu archivo…' : 'Abriendo la galería…' : 'Entrar con Google'}
            </button>
          )}
          {loading && <button className="text-link connection-cancel" onClick={closeConnection}>Cancelar conexión</button>}
          <div className="connection-or"><span/>o abre un respaldo<span/></div>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={event => void importFile(event.target.files?.[0])}/>
          <button className="button button-secondary import-button" onClick={() => fileInput.current?.click()} disabled={loading}>
            <Upload size={16}/> Abrir archivo JSON
          </button>
          <button type="button" className="button button-secondary" onClick={() => {
            const entries: Record<string, string> = {};
            try {
              for (let index = 0; index < localStorage.length; index++) {
                const key = localStorage.key(index);
                if (key?.startsWith(namespace + ':')) entries[key] = localStorage.getItem(key) ?? '';
              }
              downloadJson('respaldo-privado-este-dispositivo.json', { format: 'local-device-backup/v1', exportedAt: new Date().toISOString(), entries });
            } catch { setError('No se pudo leer el almacenamiento de este dispositivo. Los datos se conservan.'); }
          }}>Descargar borradores y partidas de este dispositivo</button>
          <p className="footnote">El archivo se lee en este navegador. No se envía ni se restaura en Firebase. Las publicaciones que añadan después en la galería anterior no se copian automáticamente aquí.</p>
          {imported && (
            <div className="imported-details">
              <span>{importName} · {imported.length} recuerdos</span>
              <button className="text-link" onClick={() => downloadJson('vista-recuerdos.json', imported)}><ArrowDownToLine size={14}/> Exportar esta vista</button>
              <button className="text-link" onClick={() => { setImported(null); setConnectOpen(false); }}>Volver a la galería compartida</button>
            </div>
          )}
          <a className="original-gallery-link" href="https://galeria-lezz-y-val.vercel.app/" target="_blank" rel="noopener noreferrer">
            Abrir la galería original <ArrowRight size={13}/>
          </a>
        </Dialog>
      )}
    </div>
  );
}
