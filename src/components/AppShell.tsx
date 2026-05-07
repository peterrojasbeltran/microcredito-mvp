'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentProfile, isStaff, Profile, UserRole } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { APP_VERSION } from '@/lib/version';

const clientLinks = [
  { href: '/app/dashboard', label: 'Inicio', short: 'Inicio', icon: '🏠' },
  { href: '/app/loan-request', label: 'Nuevo crédito', short: 'Crédito', icon: '💰' },
  { href: '/app/kyc', label: 'Documentación', short: 'Docs', icon: '📎' },
  { href: '/app/contract', label: 'Contrato', short: 'Firma', icon: '✍️' },
  { href: '/app/payments', label: 'Cuotas', short: 'Cuotas', icon: '📅' },
];

const adminLinks = [
  { href: '/admin/applications', label: 'Solicitudes', short: 'Solic.', icon: '📋', roles: ['admin', 'analyst'] },
  { href: '/admin/kyc', label: 'Documentos', short: 'Docs', icon: '📎', roles: ['admin', 'analyst'] },
  { href: '/admin/payments', label: 'Pagos', short: 'Pagos', icon: '💳', roles: ['admin', 'analyst'] },
  { href: '/admin/reports', label: 'Reportes', short: 'Rep.', icon: '📊', roles: ['admin', 'analyst'] },
  { href: '/admin/notifications', label: 'Avisos', short: 'Avisos', icon: '✉️', roles: ['admin', 'analyst'] },
  { href: '/admin/audit', label: 'Auditoría', short: 'Audit.', icon: '🧾', roles: ['admin', 'analyst'] },
  { href: '/admin/employers', label: 'Empresas', short: 'Emp.', icon: '🏢', roles: ['admin'] },
  { href: '/admin/users', label: 'Usuarios', short: 'Usuarios', icon: '👥', roles: ['admin'] },
  { href: '/admin/settings', label: 'Config.', short: 'Config.', icon: '⚙️', roles: ['admin'] },
];

type Props = {
  children: React.ReactNode;
  area: 'client' | 'admin';
  allowedRoles: UserRole[];
};

export function AppShell({ children, area, allowedRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getCurrentProfile();
      if (!p) {
        router.replace('/login');
        return;
      }
      if (p.status !== 'active') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }
      if (!allowedRoles.includes(p.role)) {
        router.replace(isStaff(p.role) ? '/admin/applications' : '/app/dashboard');
        return;
      }
      setProfile(p);
      setLoading(false);
    })();
  }, [router, area]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-6"><p className="rounded-2xl bg-white p-5 text-slate-600 shadow-sm ring-1 ring-slate-200">Validando acceso...</p></main>;
  }

  const links = area === 'admin'
    ? adminLinks.filter((link) => profile?.role && link.roles.includes(profile.role))
    : clientLinks;
  const home = area === 'admin' ? '/admin/applications' : '/app/dashboard';

  return <>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={home} className="flex min-w-0 items-center gap-3 font-bold text-slate-950">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">M</span>
          <span className="hidden truncate sm:inline">Microcréditos MVP</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{APP_VERSION}</span>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline">{area === 'admin' ? (profile?.role === 'analyst' ? 'Analista' : 'Admin') : 'Cliente'}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${pathname === link.href ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className="mr-1">{link.icon}</span>{link.label}</Link>)}
          <button onClick={logout} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Salir</button>
        </nav>

        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:hidden">
          {menuOpen ? 'Cerrar' : 'Menú'}
        </button>
      </div>

      {menuOpen && <div className="border-t border-slate-100 bg-white px-4 py-3 shadow-sm lg:hidden">
        <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-4">
          {links.map((link) => <Link onClick={() => setMenuOpen(false)} key={link.href} href={link.href} className={`rounded-2xl px-3 py-3 text-sm font-semibold ${pathname === link.href ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-700'}`}><span className="mr-2">{link.icon}</span>{link.label}</Link>)}
          <button onClick={logout} className="rounded-2xl bg-slate-950 px-3 py-3 text-left text-sm font-semibold text-white">Salir</button>
        </nav>
      </div>}
    </header>

    <div className="mx-auto hidden max-w-7xl px-6 pt-4 text-right text-xs text-slate-500 sm:block">Sesión: {profile?.full_name || profile?.email} · Rol: {profile?.role === 'analyst' ? 'Analista' : profile?.role === 'admin' ? 'Admin' : 'Cliente'} · Versión: {APP_VERSION}</div>
    {children}

    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {links.slice(0,5).map((link) => <Link key={link.href} href={link.href} className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold ${pathname === link.href ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}><span className="block text-base leading-none">{link.icon}</span>{link.short}</Link>)}
      </div>
    </nav>
  </>;
}
