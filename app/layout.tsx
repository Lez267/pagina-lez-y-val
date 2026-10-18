import type { Metadata, Viewport } from 'next';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'Nuestro pequeño universo · Ale & Val',
  description: 'Un jardín para nuestros recuerdos, nuestras palabras y todo lo bonito que viene.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}

