'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatDateBO } from '@/lib/formatters';
import { StatusMessage } from '@/components/StatusMessage';

type Audit = { id:string; action:string; entity_name:string; entity_id:string|null; metadata:Record<string,unknown>|null; created_at:string; profiles?:{full_name:string|null;email:string|null}|null };

export default function AuditPage(){
 const [logs,setLogs]=useState<Audit[]>([]);
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 const [action,setAction]=useState('');
 const load=async()=>{
  setLoading(true);
  let query=supabase.from('audit_logs').select('id,action,entity_name,entity_id,metadata,created_at,profiles(full_name,email)').order('created_at',{ascending:false}).limit(100);
  if(action.trim()) query=query.eq('action',action.trim());
  const { data,error }=await query;
  if(error) setMsg(error.message); else setLogs((data as unknown as Audit[])||[]);
  setLoading(false);
 };
 useEffect(()=>{load();},[]);
 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-medium text-blue-700">Trazabilidad</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Auditoría</h1><p className="mt-2 text-slate-600">Últimas acciones administrativas sobre solicitudes, desembolsos, pagos y cierre de créditos.</p></div><button onClick={load} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Actualizar</button></div>
    <StatusMessage message={msg} />
   </section>
   <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row"><input value={action} onChange={e=>setAction(e.target.value)} placeholder="Filtrar por acción, ej: DISBURSE_LOAN" className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"/><button onClick={load} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Filtrar</button></div></section>
   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">{loading?<p className="text-slate-600">Cargando auditoría...</p>:logs.length===0?<p className="rounded-2xl bg-slate-50 p-5 text-slate-600">No hay registros de auditoría.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Fecha</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>Metadata</th></tr></thead><tbody>{logs.map(l=><tr key={l.id} className="border-t border-slate-100 align-top"><td className="py-4">{formatDateBO(l.created_at)}</td><td><p className="font-semibold text-slate-950">{l.profiles?.full_name||'Sin nombre'}</p><p className="text-xs text-slate-500">{l.profiles?.email||'-'}</p></td><td className="font-semibold text-slate-950">{l.action}</td><td><p>{l.entity_name}</p><p className="text-xs text-slate-500">{l.entity_id||'-'}</p></td><td><pre className="max-w-md whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(l.metadata||{},null,2)}</pre></td></tr>)}</tbody></table></div>}</section>
  </main>
 </AppShell>;
}