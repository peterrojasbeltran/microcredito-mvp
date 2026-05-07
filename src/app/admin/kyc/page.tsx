'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, statusClass } from '@/lib/formatters';
import { StatusMessage } from '@/components/StatusMessage';

type Doc = {
  id:string;
  document_type:string;
  file_path:string;
  status:string;
  review_notes:string|null;
  created_at:string;
  profiles?:{full_name:string|null,email:string|null}|null;
  loan_applications?:{id:string, amount:number, status:string}|null;
};

const DOC_LABELS: Record<string,string> = {
  ID_FRONT: 'CI anverso',
  ID_BACK: 'CI reverso',
  SELFIE: 'Selfie',
  SALARY_SLIP: 'Boleta de pago',
};

const docStatusLabel = (status:string) => status === 'APPROVED' ? 'Aprobado' : status === 'REJECTED' ? 'Rechazado' : 'Pendiente';

export default function AdminKycPage(){
 const [docs,setDocs]=useState<Doc[]>([]);
 const [msg,setMsg]=useState('');
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);

 const load=async()=>{
  setLoading(true);
  const { data, error } = await supabase
   .from('kyc_documents')
   .select('id,document_type,file_path,status,review_notes,created_at,profiles(full_name,email),loan_applications(id,amount,status)')
   .order('created_at',{ascending:false});
  if(error) setMsg(error.message); else setDocs((data as unknown as Doc[])||[]);
  setLoading(false);
 };
 useEffect(()=>{load();},[]);

 const updateDoc=async(id:string,status:string)=>{
  const ok = window.confirm(`¿Confirmas que deseas marcar este documento como ${status === 'APPROVED' ? 'aprobado' : status === 'REJECTED' ? 'rechazado' : 'pendiente'}?`);
  if (!ok) return;
  setMsg('Actualizando documento...');
  const { error } = await supabase.from('kyc_documents').update({ status, review_notes: notes[id] || null }).eq('id',id);
  if(error) setMsg(error.message); else setMsg('Documento actualizado.');
  load();
 };

 const openFile=async(filePath:string)=>{
  const [bucket,...rest]=filePath.split('/');
  const path=rest.join('/');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if(error || !data?.signedUrl) return setMsg(error?.message || 'No se pudo abrir el archivo.');
  window.open(data.signedUrl, '_blank');
 };

 const Actions = ({ d }: { d:Doc }) => <div className="flex flex-wrap gap-2">
  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={()=>openFile(d.file_path)}>Ver archivo</button>
  <button className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={()=>updateDoc(d.id,'APPROVED')}>Aprobar</button>
  <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={()=>updateDoc(d.id,'REJECTED')}>Rechazar</button>
 </div>;

 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <p className="text-sm font-medium text-blue-700">Panel administrativo</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Revisión de documentación</h1>
    <p className="mt-2 text-slate-600">Revisa los documentos cargados por los clientes, aprueba, rechaza o registra una observación.</p>
    <StatusMessage message={msg} />
   </section>

   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
    {loading ? <p className="text-slate-600">Cargando documentos...</p> : docs.length===0 ? <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">No hay documentos cargados.</p> : <>
     <div className="grid gap-4 md:hidden">
      {docs.map(d=><article className="rounded-3xl border border-slate-200 p-4" key={d.id}>
       <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-slate-950">{d.profiles?.full_name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{d.profiles?.email || '-'}</p></div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(d.status)}`}>{docStatusLabel(d.status)}</span>
       </div>
       <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Documento</dt><dd className="font-semibold text-slate-950">{DOC_LABELS[d.document_type] || d.document_type}</dd></div>
        <div><dt className="text-slate-500">Solicitud</dt><dd>{formatCurrencyBOB(d.loan_applications?.amount || 0)}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Fecha</dt><dd>{formatDateBO(d.created_at)}</dd></div>
       </dl>
       <textarea className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm" placeholder="Observación opcional" defaultValue={d.review_notes || ''} onChange={e=>setNotes({...notes,[d.id]:e.target.value})}/>
       <div className="mt-4"><Actions d={d}/></div>
      </article>)}
     </div>
     <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
       <thead><tr className="text-slate-500"><th className="py-3">Cliente</th><th>Documento</th><th>Solicitud</th><th>Estado</th><th>Fecha</th><th>Observación</th><th>Acciones</th></tr></thead>
       <tbody>{docs.map(d=><tr className="border-t border-slate-100 align-top" key={d.id}>
        <td className="py-4"><p className="font-semibold text-slate-950">{d.profiles?.full_name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{d.profiles?.email || '-'}</p></td>
        <td className="py-4"><p className="font-semibold text-slate-950">{DOC_LABELS[d.document_type] || d.document_type}</p><button onClick={()=>openFile(d.file_path)} className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Ver archivo</button></td>
        <td className="py-4">{formatCurrencyBOB(d.loan_applications?.amount || 0)}</td>
        <td className="py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(d.status)}`}>{docStatusLabel(d.status)}</span></td>
        <td className="py-4">{formatDateBO(d.created_at)}</td>
        <td className="py-4"><textarea className="min-w-48 rounded-2xl border border-slate-200 p-3" placeholder="Observación opcional" defaultValue={d.review_notes || ''} onChange={e=>setNotes({...notes,[d.id]:e.target.value})}/></td>
        <td className="py-4"><Actions d={d}/></td>
       </tr>)}</tbody>
      </table>
     </div>
    </>}
   </section>
  </main>
 </AppShell>;
}