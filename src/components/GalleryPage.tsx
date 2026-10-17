import { useEffect, useState } from 'react';
import type { Memory } from '../data/types';
import { useLocalState } from '../lib/storage';
import { GalleryWorkspace } from './gallery';

export function GalleryPage({ memories, namespace, connected = false }: { memories: Memory[]; namespace: string; connected?: boolean }) {
  const [stored, setStored, saved] = useLocalState<unknown>(`${namespace}:favorite-views`, []);
  const localFavorites = Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [uploadReady, setUploadReady] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState('');
  useEffect(() => {
    if (!connected) return;
    let disposed = false;
    void import('../data/gallery-write').then(api => { if (!disposed) setFavoriteKeys(api.getCurrentFavoriteKeys()); }).catch(() => undefined);
    void fetch('/api/uploads/status', { credentials: 'same-origin', signal: AbortSignal.timeout(15000) })
      .then(async response => response.ok ? response.json() as Promise<{ready?: boolean}> : {} as {ready?: boolean})
      .then(value => { if (!disposed) setUploadReady(value.ready === true); }).catch(() => undefined);
    return () => { disposed = true; };
  }, [connected]);
  const remoteFavorites = memories.filter(memory => memory.favorites.some(key => favoriteKeys.includes(key))).map(memory => memory.id);
  const favorites = connected ? [...new Set([...remoteFavorites, ...localFavorites])] : localFavorites;
  return <>
    <GalleryWorkspace memories={memories} favoriteIds={favorites} publicationStatus={publicationStatus}
      onToggleFavorite={async memory => {
        if (connected) {
          if (!localFavorites.includes(memory.id) || remoteFavorites.includes(memory.id)) { const api = await import('../data/gallery-write'); await api.toggleGalleryFavorite(memory.id); }
          if (localFavorites.includes(memory.id)) setStored(localFavorites.filter(id => id !== memory.id));
        }
        else setStored(localFavorites.includes(memory.id) ? localFavorites.filter(id => id !== memory.id) : [...localFavorites, memory.id]);
      }}
      onEdit={connected ? async (id, changes) => { const api = await import('../data/gallery-write'); await api.updateGalleryMetadata(id, changes); } : undefined}
      onPublish={connected && uploadReady ? async draft => {
        setPublicationStatus(`Preparando ${draft.files.length} archivos…`);
        try {
          const api = await import('../data/gallery-upload');
          await api.publishGalleryMemory(draft, (completed, total) => setPublicationStatus(completed === total ? 'Archivos guardados. Guardando la historia…' : `Guardados ${completed} de ${total} archivos…`));
        } finally { setPublicationStatus(''); }
      } : undefined}
      canPreparePublication={connected} />
    {!connected && !saved && <p className="notice" role="status">El navegador no pudo guardar tus favoritos en este dispositivo.</p>}
    <p className="footnote">{connected ? `Los cambios se guardan en el jardín independiente y se actualizan en sus dispositivos. ${uploadReady ? 'Las fotos nuevas se suben al pulsar Publicar recuerdo.' : 'La activación de las subidas sigue pendiente.'}` : 'Estos favoritos se guardan en este dispositivo. Abre la galería con Google para ver y cuidar sus recuerdos.'}</p>
  </>;
}
