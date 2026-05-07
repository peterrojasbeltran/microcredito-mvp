import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Microcréditos MVP',
  description: 'MVP de microcréditos con Supabase y Vercel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
