import { useEffect, useRef, useState } from 'react';
import type { GallerySession, Memory } from '../data/types';
import { useLocalState } from '../lib/storage';
import { GalleryWorkspace } from './gallery';
import { identifyGooglePlayer } from '../lib/game-progression';
import { isAleFavoriteMemory, isValFavoriteMemory } from '../lib/gallery';

export function GalleryPage({
  memories,
  namespace,
  connected = false,
  session,
}: {
  memories: Memory[];
  namespace: string;
  connected?: boolean;
  session?: GallerySession | null;
}) {
  const detectedPlayer = identifyGooglePlayer(session, namespace) ?? 'ale';

  // Local favorites per user key
  const [aleStored, setAleStored] = useLocalState<string[]>(`${namespace}:favorite-views:ale`, []);
  const [valStored, setValStored] = useLocalState<string[]>(`${namespace}:favorite-views:val`, []);
  const [legacyStored, setLegacyStored, saved] = useLocalState<unknown>(`${namespace}:favorite-views`, []);

  const legacyFavorites = Array.isArray(legacyStored)
    ? legacyStored.filter((value): value is string => typeof value === 'string')
    : [];

  const aleLocalFavorites = Array.isArray(aleStored) && aleStored.length > 0
    ? aleStored
    : (detectedPlayer === 'ale' ? legacyFavorites : []);

  const valLocalFavorites = Array.isArray(valStored) && valStored.length > 0
    ? valStored
    : (detectedPlayer === 'valeria' ? legacyFavorites : []);

  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [uploadReady, setUploadReady] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const backupAbort = useRef<AbortController | null>(null);
  useEffect(() => () => backupAbort.current?.abort(), []);

  useEffect(() => {
    if (!connected) return;
    let disposed = false;
    void import('../data/gallery-write').then(api => {
      if (!disposed) setFavoriteKeys(api.getCurrentFavoriteKeys());
    }).catch(() => undefined);
    void fetch('/api/uploads/status', { credentials: 'same-origin', signal: AbortSignal.timeout(15000) })
      .then(async response => response.ok ? response.json() as Promise<{ ready?: boolean }> : {} as { ready?: boolean })
      .then(value => { if (!disposed) setUploadReady(value.ready === true); }).catch(() => undefined);
    return () => { disposed = true; };
  }, [connected]);

  // Compute remote favorites for Alejandro and Valeria
  const aleUid = (detectedPlayer === 'ale' && session?.uid) ? session.uid : undefined;
  const valUid = (detectedPlayer === 'valeria' && session?.uid) ? session.uid : undefined;

  const aleRemoteFavorites = memories.filter(memory => isAleFavoriteMemory(memory, aleUid)).map(m => m.id);
  const valRemoteFavorites = memories.filter(memory => isValFavoriteMemory(memory, valUid)).map(m => m.id);

  // Combine remote with local
  const aleFavoriteIds = connected
    ? [...new Set([...aleRemoteFavorites, ...aleLocalFavorites])]
    : aleLocalFavorites;
  const valFavoriteIds = connected
    ? [...new Set([...valRemoteFavorites, ...valLocalFavorites])]
    : valLocalFavorites;

  // Active player favorites (determines heart button filled state for the current user)
  const activeFavoriteIds = detectedPlayer === 'valeria' ? valFavoriteIds : aleFavoriteIds;

  return <>
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
      <button type="button" className="button button-secondary" disabled={backingUp || !memories.length} onClick={async () => {
        if (backingUp) return;
        const controller = new AbortController(); backupAbort.current = controller; setBackingUp(true);
        setBackupStatus('Preparando respaldo. Permite varias descargas si el navegador lo solicita.');
        try { const api = await import('../lib/gallery-backup'); const rawRecords = connected ? await (await import('../data/firebase')).readGalleryBackupRecords(controller.signal) : undefined; const result = await api.downloadGalleryBackup(memories,{signal:controller.signal,onProgress:setBackupStatus,rawRecords});setBackupStatus(result.complete ? 'Respaldo completo: '+result.downloaded+' archivos en '+result.parts+' partes ZIP.' : 'Respaldo parcial: '+result.downloaded+' de '+result.total+' archivos. Consulta el manifiesto de la última parte; los originales se conservan.'); }
        catch(error){setBackupStatus(error instanceof Error ? error.message : 'No se completó el respaldo. Tus recuerdos se conservan.');}
        finally { setBackingUp(false); backupAbort.current = null; }
      }}>Descargar recuerdos y archivos ZIP</button>
      {backingUp && <button type="button" className="text-link" onClick={() => backupAbort.current?.abort()}>Detener descarga</button>}
      {backupStatus && <span role="status">{backupStatus}</span>}
    </div>
    <GalleryWorkspace
      memories={memories}
      favoriteIds={activeFavoriteIds}
      aleFavoriteIds={aleFavoriteIds}
      valFavoriteIds={valFavoriteIds}
      activePlayer={detectedPlayer}
      publicationStatus={publicationStatus}
      onToggleFavorite={async memory => {
        const isAle = detectedPlayer === 'ale';
        const currentLocal = isAle ? aleLocalFavorites : valLocalFavorites;
        const setLocal = isAle ? setAleStored : setValStored;
        const currentRemote = isAle ? aleRemoteFavorites : valRemoteFavorites;

        if (connected) {
          if (!currentLocal.includes(memory.id) || currentRemote.includes(memory.id)) {
            const api = await import('../data/gallery-write');
            await api.toggleGalleryFavorite(memory.id);
          }
          if (currentLocal.includes(memory.id)) {
            setLocal(currentLocal.filter(id => id !== memory.id));
          }
          if (legacyFavorites.includes(memory.id)) {
            setLegacyStored(legacyFavorites.filter(id => id !== memory.id));
          }
        } else {
          const next = currentLocal.includes(memory.id)
            ? currentLocal.filter(id => id !== memory.id)
            : [...currentLocal, memory.id];
          setLocal(next);
        }
      }}
      onEdit={connected ? async (id, changes) => {
        const api = await import('../data/gallery-write');
        await api.updateGalleryMetadata(id, changes);
      } : undefined}
      onPublish={connected && uploadReady ? async draft => {
        setPublicationStatus(`Preparando ${draft.files.length} archivos…`);
        try {
          const api = await import('../data/gallery-upload');
          await api.publishGalleryMemory(draft, (completed, total) =>
            setPublicationStatus(completed === total ? 'Archivos guardados. Guardando la historia…' : `Guardados ${completed} de ${total} archivos…`)
          );
        } finally { setPublicationStatus(''); }
      } : undefined}
      canPreparePublication={connected}
    />
    {!connected && !saved && <p className="notice" role="status">El navegador no pudo guardar tus favoritos en este dispositivo.</p>}
    {!connected && (
      <p className="footnote">
        Estos favoritos se guardan en este dispositivo. Conecta tu galería para ver y guardar nuevos recuerdos.
      </p>
    )}
  </>;
}
