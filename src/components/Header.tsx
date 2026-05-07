'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function Header() {
  const router = useRouter();
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  return (
    <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/app/dashboard" className="flex items-center gap-3 font-bold text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-white">M</span>
          <span>Microcréditos MVP</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="text-slate-600 hover:text-slate-950" href="/app/dashboard">Cliente</Link>
          <Link className="text-slate-600 hover:text-slate-950" href="/admin/applications">Admin</Link>
          <button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">Salir</button>
        </nav>
      </div>
    </header>
  );
}
