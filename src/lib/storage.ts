import { useCallback, useState } from 'react';
export function readLocal<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; } }
export function writeLocal<T>(key: string, value: T): boolean { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function useLocalState<T>(key: string, initial: T): [T, (value: T | ((previous: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(() => readLocal(key, initial));
  const [saved, setSaved] = useState(true);
  const set = useCallback((value: T | ((previous: T) => T)) => { setState(previous => { const next = typeof value === 'function' ? (value as (previous: T) => T)(previous) : value; setSaved(writeLocal(key, next)); return next; }); }, [key]);
  return [state, set, saved];
}
export function downloadJson(filename: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
