'use client';
import { useEffect, useState } from 'react';
import App from '../src/App';

export default function OurUniverse() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      const register = () => { void navigator.serviceWorker.register('/sw.js').catch(() => undefined); };
      if (document.readyState === 'complete') register();
      else { window.addEventListener('load', register, { once: true }); return () => window.removeEventListener('load', register); }
    }
  }, []);
  return ready ? <App/> : <main className="app-starting" aria-busy="true"><span aria-hidden="true">✳</span><p>Abriendo nuestro pequeño universo…</p></main>;
}
