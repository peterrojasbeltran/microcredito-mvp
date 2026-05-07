'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, statusClass } from '@/lib/formatters';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = { id:string; amount:number; status:string; created_at:string };
type Doc = { id:string; document_type:string; file_path:string; status:string; review_notes:string|null; created_at:string };

const DOC_TYPES = [
  { key: 'ID_FRONT', label: 'Documento de identidad - lado frontal', helper: 'Sube una foto clara del anverso de tu CI.' },
  { key: 'ID_BACK', label: 'Documento de identidad - lado posterior', helper: 'Sube una foto clara del reverso de tu CI.' },
  { key: 'SELFIE', label: 'Foto selfie de verificación', helper: 'Sube una selfie reciente y bien iluminada.' },
  { key: 'SALARY_SLIP', label: 'Boleta de pago', helper: 'Sube tu última boleta de pago en imagen o PDF.' },
];

export default function ClientKycPage(){
 const [loans,setLoans]=useState<Loan[]>([]);
 const [selectedLoan,setSelectedLoan]=useState('');
 const [docs,setDocs]=useState<Doc[]>([]);
 const [files,setFiles]=useState<Record<string, File | null>>({});
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 const [uploading,setUploading]=useState<string | null>(null);

 const load = async()=>{
  setLoading(true);
  const { data:{user} } = await supabase.auth.getUser();
  if(!user){ location.href='/login'; return; }
  const { data: loanData } = await supabase.from('loan_applications').select('id,amount,status,created_at').order('created_at',{ascending:false});
  const list=(loanData as Loan[])||[];
  setLoans(list);
  const loanId = selectedLoan || list[0]?.id || '';
  setSelectedLoan(loanId);
  if(loanId){
    const { data: docData } = await supabase.from('kyc_documents').select('id,document_type,file_path,status,review_notes,created_at').eq('loan_application_id', loanId).order('created_at',{ascending:false});
    setDocs((docData as Doc[])||[]);
  }
  setLoading(false);
 };

 useEffect(()=>{load();},[]);
 useEffect(()=>{ if(selectedLoan) load(); },[selectedLoan]);

 const uploadDoc = async (documentType:string) => {
  const file = files[documentType];
  if(!file || !selectedLoan) return setMsg('Selecciona una solicitud y un archivo para continuar.');
  setUploading(documentType);
  setMsg('Subiendo documento...');
  const { data:{user} } = await supabase.auth.getUser();
  if(!user) { setUploading(null); return setMsg('Sesión expirada.'); }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/${selectedLoan}/${documentType}-${Date.now()}-${safeName}`;
  const bucket = documentType === 'SALARY_SLIP' ? 'salary-documents' : 'kyc-documents';
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert:false });
  if(uploadError) { setUploading(null); return setMsg(uploadError.message); }
  const { error: insertError } = await supabase.from('kyc_documents').insert({
    client_id: user.id,
    loan_application_id: selectedLoan,
    document_type: documentType,
    file_path: `${bucket}/${path}`,
    status: 'PENDING'
  });
  if(insertError) { setUploading(null); return setMsg(insertError.message); }
  await supabase.from('loan_applications').update({ status: 'KYC_REVIEW' }).eq('id', selectedLoan);
  setFiles({...files, [documentType]: null});
  setUploading(null);
  setMsg('Documento subido correctamente. Nuestro equipo lo revisará pronto.');
  load();
 };

 return <AppShell area="client" allowedRoles={['client']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <p className="text-sm font-medium text-blue-700">Documentación</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sube tu documentación</h1>
    <p className="mt-2 max-w-2xl text-slate-600">Para revisar tu solicitud necesitamos algunos documentos básicos. Sube fotos claras o archivos PDF; nuestro equipo hará la validación manual.</p>
    <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
      Consejo: verifica que los datos se lean bien antes de subirlos. Esto evita que te pidamos corregir información.
    </div>
    {loans.length>0 && <label className="mt-5 block max-w-md text-sm font-medium text-slate-700">Solicitud asociada
      <select className="mt-2 w-full rounded-2xl border border-slate-200 p-3" value={selectedLoan} onChange={e=>setSelectedLoan(e.target.value)}>
        {loans.map(l=><option key={l.id} value={l.id}>Solicitud {formatDateBO(l.created_at)} · {formatCurrencyBOB(l.amount)}</option>)}
      </select>
    </label>}
    <StatusMessage message={msg} />
   </section>

   {loading ? <p className="mt-6 text-slate-600">Cargando...</p> : loans.length===0 ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 shadow-sm ring-1 ring-slate-200">Primero crea una solicitud de crédito para subir documentos.</p> : <section className="mt-6 grid gap-4 md:grid-cols-2">
    {DOC_TYPES.map(d=>{
      const existing = docs.find(x=>x.document_type===d.key);
      const selectedFile = files[d.key];
      const disabled = !selectedFile || uploading === d.key;
      return <div key={d.key} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="font-semibold text-slate-950">{d.label}</h2><p className="mt-1 text-sm text-slate-500">{d.helper}</p></div>
          {existing && <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusClass(existing.status)}`}>{existing.status === 'APPROVED' ? 'Aprobado' : existing.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}</span>}
        </div>
        <input className="mt-5 w-full rounded-2xl border border-slate-200 p-3 text-sm" type="file" accept="image/*,.pdf" onChange={e=>setFiles({...files,[d.key]:e.target.files?.[0]||null})}/>
        <button disabled={disabled} onClick={()=>uploadDoc(d.key)} className="mt-4 w-full rounded-2xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
          {uploading === d.key ? 'Subiendo...' : selectedFile ? `Subir ${d.label}` : 'Selecciona un archivo para subir'}
        </button>
        {existing?.review_notes && <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm text-orange-700">Observación: {existing.review_notes}</p>}
      </div>})}
   </section>}
  </main>
 </AppShell>;
}