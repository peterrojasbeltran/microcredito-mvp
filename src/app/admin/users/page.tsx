'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatDateBO } from '@/lib/formatters';
import { registerAudit } from '@/lib/audit';
import { StatusMessage } from '@/components/StatusMessage';

type Profile = { id:string; full_name:string|null; email:string|null; phone:string|null; role:string; status:string; created_at:string };

export default function AdminUsersPage(){
 const [users,setUsers]=useState<Profile[]>([]);
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState('');

 const load=async()=>{
  setLoading(true);
  const { data, error } = await supabase.from('profiles').select('id,full_name,email,phone,role,status,created_at').order('created_at',{ascending:false});
  if(error) setMsg(error.message); else setUsers((data as Profile[])||[]);
  setLoading(false);
 };
 useEffect(()=>{load();},[]);

 const updateProfile=async(user:Profile, patch:Partial<Profile>)=>{
  const label = patch.role ? `cambiar el rol a ${patch.role}` : patch.status ? `cambiar estado a ${patch.status}` : 'actualizar usuario';
  if(!window.confirm(`¿Confirmas ${label} para ${user.email || user.full_name || 'este usuario'}?`)) return;
  setMsg('Actualizando usuario...');
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if(error) { setMsg(error.message); return; }
  await registerAudit('UPDATE_USER_PROFILE','profiles',user.id,{ previousRole:user.role, previousStatus:user.status, ...patch });
  setMsg('Usuario actualizado correctamente.');
  load();
 };

 const filtered=users.filter(u=>`${u.full_name||''} ${u.email||''} ${u.role} ${u.status}`.toLowerCase().includes(filter.toLowerCase()));

 return <AppShell area="admin" allowedRoles={['admin']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <p className="text-sm font-medium text-blue-700">Seguridad y accesos</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Usuarios y roles</h1>
    <p className="mt-2 text-slate-600">Administra roles y estado de acceso. La creación inicial del usuario se hace por registro/login y aquí se asigna su rol operativo.</p>
    <StatusMessage message={msg} />
   </section>

   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
     <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar por nombre, email, rol o estado" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 md:max-w-md" />
     <button onClick={load} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Actualizar</button>
    </div>
    {loading ? <p className="mt-4 text-slate-600">Cargando usuarios...</p> : <div className="mt-4 overflow-x-auto">
     <table className="w-full text-left text-sm">
      <thead><tr className="text-slate-500"><th className="py-3">Usuario</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
      <tbody>{filtered.map(u=><tr key={u.id} className="border-t border-slate-100 align-middle">
       <td className="py-4"><p className="font-semibold text-slate-950">{u.full_name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{u.email || '-'}</p></td>
       <td>{u.phone || '-'}</td>
       <td><select value={u.role} onChange={e=>updateProfile(u,{role:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2"><option value="client">client</option><option value="analyst">analyst</option><option value="admin">admin</option></select></td>
       <td><select value={u.status} onChange={e=>updateProfile(u,{status:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2"><option value="active">active</option><option value="inactive">inactive</option></select></td>
       <td>{formatDateBO(u.created_at)}</td>
       <td><button onClick={()=>updateProfile(u,{status:u.status==='active'?'inactive':'active'})} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{u.status==='active'?'Desactivar':'Activar'}</button></td>
      </tr>)}</tbody>
     </table>
    </div>}
   </section>
  </main>
 </AppShell>;
}