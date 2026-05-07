'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, statusClass, statusLabel } from '@/lib/formatters';
import { getMissingKycDocuments, kycDocLabel } from '@/lib/kyc';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = { id:string; amount:number; term_months:number; monthly_installment:number|null; status:string; created_at:string };
type Contract = { id:string; loan_application_id:string; accepted_terms:boolean; accepted_payroll_deduction:boolean; signed_full_name:string|null; signed_at:string|null };
type KycDoc = { id:string; loan_application_id:string; document_type:string; status:string };

export default function ContractPage(){
 const [userId,setUserId]=useState('');
 const [fullName,setFullName]=useState('');
 const [loans,setLoans]=useState<Loan[]>([]);
 const [contracts,setContracts]=useState<Contract[]>([]);
 const [kycDocs,setKycDocs]=useState<KycDoc[]>([]);
 const [loanId,setLoanId]=useState('');
 const [acceptTerms,setAcceptTerms]=useState(false);
 const [acceptPayroll,setAcceptPayroll]=useState(false);
 const [signedName,setSignedName]=useState('');
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const [loading,setLoading]=useState(true);

 const load=async()=>{
  setLoading(true);
  const { data:{user} }=await supabase.auth.getUser();
  if(!user){ location.href='/login'; return; }
  setUserId(user.id);
  const { data: profile } = await supabase.from('profiles').select('full_name,email').eq('id', user.id).single();
  const name = profile?.full_name || profile?.email || '';
  setFullName(name); setSignedName(name);
  const { data: loanData } = await supabase
    .from('loan_applications')
    .select('id,amount,term_months,monthly_installment,status,created_at')
    .neq('status','CANCELLED')
    .order('created_at',{ascending:false});
  const parsedLoans=(loanData as Loan[])||[];
  setLoans(parsedLoans);
  setLoanId((current) => current || parsedLoans.find(l => l.status === 'APPROVED')?.id || parsedLoans[0]?.id || '');
  const { data: contractData } = await supabase
    .from('loan_contracts')
    .select('id,loan_application_id,accepted_terms,accepted_payroll_deduction,signed_full_name,signed_at')
    .order('created_at',{ascending:false});
  setContracts((contractData as Contract[])||[]);
  const { data: docsData } = await supabase
    .from('kyc_documents')
    .select('id,loan_application_id,document_type,status');
  setKycDocs((docsData as KycDoc[])||[]);
  setLoading(false);
 };
 useEffect(()=>{load();},[]);

 const selectedLoan = useMemo(()=>loans.find(l=>l.id===loanId),[loans,loanId]);
 const selectedDocs = useMemo(()=>kycDocs.filter(d=>d.loan_application_id===loanId),[kycDocs,loanId]);
 const missingKyc = useMemo(()=>getMissingKycDocuments(selectedDocs),[selectedDocs]);
 const kycComplete = selectedLoan ? missingKyc.length === 0 : false;
 const signedContract = useMemo(()=>contracts.find(c=>c.loan_application_id===loanId && c.accepted_terms && c.accepted_payroll_deduction && c.signed_at),[contracts,loanId]);
 const canSign = Boolean(selectedLoan && selectedLoan.status === 'APPROVED' && kycComplete && !signedContract);

 const blockedReason = () => {
  if (!selectedLoan) return 'Selecciona una solicitud para continuar.';
  if (signedContract) return 'Esta solicitud ya tiene contrato firmado.';
  if (selectedLoan.status !== 'APPROVED') return `Tu solicitud debe estar aprobada para firmar. Estado actual: ${statusLabel(selectedLoan.status)}.`;
  if (!kycComplete) return `Aún falta aprobar documentación: ${missingKyc.map(kycDocLabel).join(', ')}.`;
  return '';
 };

 const sign=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!selectedLoan) return setMessage('Selecciona una solicitud.');
  const reason = blockedReason();
  if(reason) return setMessage(reason);
  const ok = window.confirm('¿Confirmas que deseas aceptar el contrato y la autorización de descuento por planilla?');
  if(!ok) return;
  setSaving(true); setMessage('Guardando aceptación digital...');
  const { error }=await supabase.from('loan_contracts').insert({
   loan_application_id:selectedLoan.id,
   client_id:userId,
   accepted_terms:acceptTerms,
   accepted_payroll_deduction:acceptPayroll,
   signed_full_name:signedName,
   signed_at:new Date().toISOString()
  });
  setSaving(false);
  if(error) return setMessage(error.message);
  setMessage('Contrato aceptado correctamente. El crédito ya puede pasar a desembolso cuando el equipo operativo lo valide.');
  setAcceptTerms(false); setAcceptPayroll(false);
  await load();
 };

 return <AppShell area="client" allowedRoles={['client']}>
  <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_0.8fr]">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <p className="text-sm font-medium text-blue-700">Contrato digital básico</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Aceptar contrato</h1>
    <p className="mt-2 text-slate-600">Podrás firmar cuando tu solicitud esté aprobada y tu documentación esté completa.</p>

    <form onSubmit={sign} className="mt-6">
     <label className="block text-sm font-medium text-slate-700">Solicitud</label>
     <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3" value={loanId} onChange={e=>setLoanId(e.target.value)} required>
      {loans.length===0 && <option value="">No tienes solicitudes disponibles</option>}
      {loans.map(l=><option key={l.id} value={l.id}>{formatCurrencyBOB(l.amount)} · {l.term_months} meses · {statusLabel(l.status)}</option>)}
     </select>

     {selectedLoan&&<div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700 ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-950">Resumen del crédito</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
       <div><p className="text-slate-500">Monto</p><strong>{formatCurrencyBOB(selectedLoan.amount)}</strong></div>
       <div><p className="text-slate-500">Plazo</p><strong>{selectedLoan.term_months} meses</strong></div>
       <div><p className="text-slate-500">Estado</p><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(selectedLoan.status)}`}>{statusLabel(selectedLoan.status)}</span></div>
      </div>
      <div className={`mt-4 rounded-2xl p-4 ${kycComplete ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'}`}>
       {kycComplete ? 'Documentación aprobada. Ya puedes firmar si tu solicitud está aprobada.' : `Documentación pendiente: ${missingKyc.map(kycDocLabel).join(', ')}`}
      </div>
     </div>}

     <div className="mt-5 rounded-3xl border border-slate-200 p-5 text-sm leading-6 text-slate-700">
      <h2 className="text-base font-semibold text-slate-950">Texto de aceptación</h2>
      <p className="mt-3">Declaro que la información entregada para mi solicitud de microcrédito es verdadera y autorizo su revisión por parte del equipo operativo.</p>
      <p className="mt-3">Acepto que, en caso de aprobación, el pago del crédito pueda realizarse mediante descuento por planilla, según las condiciones comunicadas y aceptadas en esta solicitud.</p>
      <p className="mt-3">Entiendo que esta aceptación digital no reemplaza una firma digital certificada, pero permite continuar la evaluación del MVP.</p>
     </div>

     <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
      <input className="mt-1" type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} required/>
      <span>Acepto los términos del contrato de microcrédito.</span>
     </label>
     <label className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
      <input className="mt-1" type="checkbox" checked={acceptPayroll} onChange={e=>setAcceptPayroll(e.target.checked)} required/>
      <span>Autorizo el descuento por planilla en caso de aprobación.</span>
     </label>

     <label className="mt-5 block text-sm font-medium text-slate-700">Nombre completo para aceptación</label>
     <input className="mt-2 w-full rounded-2xl border border-slate-200 p-3" value={signedName} onChange={e=>setSignedName(e.target.value)} placeholder="Nombre completo" required/>

     <button disabled={saving || !canSign || !acceptTerms || !acceptPayroll || !signedName} className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving?'Guardando...':signedContract?'Contrato ya firmado':'Aceptar y firmar'}</button>
     {!loading && selectedLoan && !canSign && <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">{blockedReason()}</p>}
     <StatusMessage message={message} />
    </form>
   </section>

   <aside className="h-fit rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
    <p className="text-sm text-slate-300">Aceptaciones registradas</p>
    <h2 className="mt-2 text-2xl font-bold">Historial</h2>
    {contracts.filter(c=>c.signed_at).length===0?<p className="mt-4 text-sm text-slate-300">Aún no tienes contratos firmados.</p>:<div className="mt-5 space-y-3">
     {contracts.filter(c=>c.signed_at).map(c=><div key={c.id} className="rounded-2xl bg-white/10 p-4 text-sm">
      <p className="font-semibold">{c.signed_full_name || fullName || 'Cliente'}</p>
      <p className="text-slate-300">Aceptado: {c.signed_at ? new Date(c.signed_at).toLocaleString('es-BO') : '-'}</p>
     </div>)}
    </div>}
   </aside>
  </main>
 </AppShell>;
}