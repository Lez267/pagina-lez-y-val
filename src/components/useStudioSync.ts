import { useEffect, useMemo, useRef, useState } from 'react';
import { connectedStudioUid, createStudioRecord, localStudioRecords, mergeStudioRecords, prepareStudioDraft, setSharedPlanDone, sharedDraftId, studioError, updateSharedPlan, watchStudio, type SharedStudio, type StudioAuthor, type StudioCollection, type StudioPlan, type StudioRecords } from '../data/studio-sync';

export function useStudioSync<K extends StudioCollection>(namespace: string, kind: K, rawLocal: unknown) {
  const connected = connectedStudioUid(namespace) !== null;
  const local = useMemo(() => localStudioRecords(kind, rawLocal), [kind, rawLocal]);
  const [remote, setRemote] = useState<SharedStudio<StudioRecords[K]>[]>([]);
  const [acknowledged, setAcknowledged] = useState<SharedStudio<StudioRecords[K]>[]>([]);
  const [ids, setIds] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState('');
  const [state, setState] = useState<'local' | 'loading' | 'cached' | 'ready' | 'error'>(connected ? 'loading' : 'local');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    if (!connected) return;
    Promise.all(local.map(async item => [item.id, await sharedDraftId(namespace, kind, item)] as const)).then(entries => { if (active) setIds(new Map(entries)); }).catch(() => { if (active) setError('No pudimos preparar los identificadores. Los borradores locales se conservan.'); });
    return () => { active = false; };
  }, [connected, kind, local, namespace]);
  useEffect(() => {
    if (!connected) return;
    return watchStudio(namespace, kind, (records, cached) => {
      setRemote(records); setState(cached ? 'cached' : 'ready'); setError('');
      // Acknowledgements bridge the interval between commit and the next snapshot.
      setAcknowledged(previous => previous.filter(item => !records.some(record => record.id === item.id)));
    }, message => { setError(message); setState('error'); setRemote([]); setAcknowledged([]); });
  }, [connected, kind, namespace]);
  const shared = useMemo(() => [...remote.filter(item => !acknowledged.some(ack => ack.id === item.id)), ...acknowledged], [remote, acknowledged]);
  // Wait for legacy ID mapping before merging to avoid showing a draft twice.
  const mapped = local.every(item => ids.has(item.id));
  const rows = mergeStudioRecords(local, connected && !mapped && local.length ? [] : shared, ids);
  async function perform(operation: () => Promise<SharedStudio<StudioRecords[K]>>): Promise<boolean> {
    if (busyRef.current || !connected) return false;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const confirmed = await operation();
      if (!alive.current) return false;
      setAcknowledged(previous => [...previous.filter(item => item.id !== confirmed.id), confirmed]);
      return true;
    } catch (failure) { if (alive.current) setError(studioError(failure)); return false; }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  function share(item: StudioRecords[K], selectedAuthor?: StudioAuthor) {
    return perform(async () => createStudioRecord(namespace, kind, await prepareStudioDraft(namespace, kind, item, selectedAuthor)));
  }
  function togglePlan(item: StudioPlan) {
    if (kind !== 'plans') return Promise.resolve(false);
    return perform(async () => await setSharedPlanDone(namespace, item.id, !item.done) as unknown as SharedStudio<StudioRecords[K]>);
  }
  function updatePlan(item: StudioPlan) {
    if (kind !== 'plans') return Promise.resolve(false);
    return perform(async () => await updateSharedPlan(namespace, item) as unknown as SharedStudio<StudioRecords[K]>);
  }
  return { connected, rows, state, error, busy, share, togglePlan, updatePlan, clearError: () => setError(''), exportData: { version: 2, local: rawLocal, shared, view: rows, synchronization: state } };
}
