'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ensureCurrentProfile } from '@/lib/auth';
import { StatusMessage } from '@/components/StatusMessage';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Creando cuenta...');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return setMessage(error.message);
    if (data.user && data.session) {
      await ensureCurrentProfile(fullName);
    }
    setMessage('Cuenta creada correctamente. Redirigiendo al login...');
    setTimeout(() => router.push('/login'), 1000);
  };
  return <main className="grid min-h-screen place-items-center px-6 py-10">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 font-bold text-white">M</div>
      <h1 className="mt-6 text-center text-2xl font-bold text-slate-950">Crear cuenta</h1>
      <p className="mt-2 text-center text-sm text-slate-500">Completa tus datos para iniciar tu solicitud.</p>
      <input className="mt-6 w-full rounded-2xl border border-slate-200 p-3 focus:ring-2 focus:ring-blue-100" placeholder="Nombre completo" value={fullName} onChange={e=>setFullName(e.target.value)} required/>
      <input className="mt-3 w-full rounded-2xl border border-slate-200 p-3 focus:ring-2 focus:ring-blue-100" placeholder="Correo" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input className="mt-3 w-full rounded-2xl border border-slate-200 p-3 focus:ring-2 focus:ring-blue-100" placeholder="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
      <button className="mt-4 w-full rounded-2xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700">Registrarme</button>
      <StatusMessage message={message} />
      <p className="mt-5 text-center text-sm text-slate-600">¿Ya tienes cuenta? <Link className="font-semibold text-blue-700" href="/login">Ingresar</Link></p>
    </form>
  </main>;
}