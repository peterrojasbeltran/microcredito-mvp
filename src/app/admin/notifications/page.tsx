'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/components/StatusMessage';
import { formatDateBO } from '@/lib/formatters';

type NotificationLog = { id:string; event_type:string; channel:string; recipient:string|null; subject:string|null; status:string|null; sent_at:string|null; created_at:string; loan_application_id:string|null };

export default function NotificationsPage(){
 const [items,setItems]=useState<NotificationLog[]>([]);
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{
  const { data, error }=await supabase.from('notification_logs').select('*').order('created_at',{ascending:false}).limit(100);
  if(error) setMsg(error.message); else setItems((data||[]) as NotificationLog[]);
  setLoading(false);
 })();},[]);
 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
    <p className="text-sm font-medium text-blue-700">Comunicación operativa</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Historial de notificaciones</h1>
    <p className="mt-2 text-slate-600">Registro de avisos preparados o enviados. En modo free, se registra la acción y se puede usar mailto/manual.</p>
    <StatusMessage message={msg} />
   </section>
   <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
    {loading ? <p className="text-slate-600">Cargando notificaciones...</p> : items.length===0 ? <p className="text-slate-600">Aún no hay notificaciones registradas.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Fecha</th><th>Evento</th><th>Canal</th><th>Destinatario</th><th>Estado</th><th>Solicitud</th></tr></thead><tbody>{items.map(n=><tr key={n.id} className="border-t border-slate-100"><td className="py-4">{formatDateBO(n.created_at)}</td><td className="font-semibold">{n.event_type}</td><td>{n.channel}</td><td>{n.recipient||'-'}</td><td>{n.status||'-'}</td><td>{n.loan_application_id||'-'}</td></tr>)}</tbody></table></div>}
   </section>
  </main>
 </AppShell>;
}
