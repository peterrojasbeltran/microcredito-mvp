'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, statusClass, statusLabel } from '@/lib/formatters';
import { clientSteps, getClientHeadline, getClientStepIndex, getPrimaryClientAction } from '@/lib/ux';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = { id:string; amount:number; term_months:number; status:string; created_at:string; monthly_salary?:number|null; interest_rate?:number|null; total_interest?:number|null; total_amount?:number|null; installment_amount?:number|null };

const CANCELLABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'INFO_REQUESTED'];

export default function DashboardPage(){
 const [loans,setLoans]=useState<Loan[]>([]);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');

 const load = async()=>{
  setLoading(true);
  const { data:{user} }= await supabase.auth.getUser();
  if(!user){ location.href='/login'; return; }
  const { data } = await supabase.from('loan_applications').select('id,amount,term_months,status,created_at,monthly_salary,interest_rate,total_interest,total_amount,installment_amount').order('created_at',{ascending:false});
  setLoans((data as Loan[])||[]);
  setLoading(false);
 };

 useEffect(()=>{ load(); },[]);

 const cancelLoan = async (loan: Loan) => {
  if (!CANCELLABLE_STATUSES.includes(loan.status)) {
   setMessage('Esta solicitud ya no puede ser cancelada desde el portal.');
   return;
  }
  const ok = window.confirm(`¿Seguro que deseas cancelar la solicitud por ${formatCurrencyBOB(loan.amount)}? Esta acción no se puede deshacer.`);
  if (!ok) return;
  setMessage('Cancelando solicitud...');
  const { error } = await supabase
   .from('loan_applications')
   .update({ status: 'CANCELLED', decision_notes: 'Cancelada por el cliente desde el portal.' })
   .eq('id', loan.id)
   .in('status', CANCELLABLE_STATUSES);
  if (error) setMessage(error.message); else setMessage('Solicitud cancelada correctamente.');
  await load();
 };

 const activeLoan = loans.find(l => !['CANCELLED','REJECTED','CLOSED'].includes(l.status)) || loans[0];
 const stepIndex = getClientStepIndex(activeLoan?.status);
 const mainAction = getPrimaryClientAction(activeLoan?.status);

 return <AppShell area="client" allowedRoles={['client']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="grid gap-5 md:grid-cols-[1.35fr_0.85fr]">
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
     <p className="text-sm font-medium text-blue-700">Crédito simple, rápido y transparente</p>
     <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Hola, sigue tu crédito paso a paso</h1>
     <p className="mt-3 max-w-2xl text-slate-600">{getClientHeadline(activeLoan?.status)}</p>
     <div className="mt-6 grid gap-3 sm:grid-cols-4">
      {clientSteps.map((step, index)=><div key={step.key} className={`rounded-2xl border p-3 ${index <= stepIndex ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
       <p className="text-xs font-semibold">Paso {index + 1}</p><p className="mt-1 text-sm font-bold">{step.label}</p>
      </div>)}
     </div>
     <div className="mt-6 flex flex-wrap gap-3">
      <Link className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700" href={mainAction.href}>{mainAction.label}</Link>
     </div>
    </div>
    <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
     <div className="flex items-start justify-between gap-3"><p className="text-sm text-slate-300">Última solicitud activa</p>{activeLoan&&<span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(activeLoan.status)}`}>{statusLabel(activeLoan.status)}</span>}</div>
     {activeLoan ? <>
      <p className="mt-4 text-3xl font-bold">{formatCurrencyBOB(activeLoan.amount)}</p>
      <div className="mt-5 grid gap-3 text-sm text-slate-300">
       <p>Plazo: <b className="text-white">{activeLoan.term_months} meses</b></p>
       <p>Salario declarado: <b className="text-white">{activeLoan.monthly_salary ? formatCurrencyBOB(activeLoan.monthly_salary) : '-'}</b></p>
       <p>Cuota estimada: <b className="text-white">{formatCurrencyBOB(activeLoan.installment_amount || 0)}</b></p>
       <p>Total a pagar: <b className="text-white">{formatCurrencyBOB(activeLoan.total_amount || activeLoan.amount)}</b></p>
      </div>
     </> : <p className="mt-4 text-slate-300">Aún no tienes solicitudes registradas.</p>}
    </div>
   </section>

   <StatusMessage message={message} />

   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
    <h2 className="text-lg font-semibold text-slate-950">Mis solicitudes</h2>
    <p className="text-sm text-slate-500">Puedes cancelar solicitudes solo antes de que sean aprobadas, rechazadas o desembolsadas.</p>
    {loading?<p className="mt-4 text-slate-600">Cargando...</p>:loans.length===0?<p className="mt-4 rounded-2xl bg-slate-50 p-5 text-slate-600">Aún no tienes solicitudes. Empieza creando tu primera solicitud.</p>:<div className="mt-4 grid gap-3">
     {loans.map(l=><article key={l.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-2 sm:grid-cols-5 sm:items-center sm:gap-6">
       <div><p className="text-xs text-slate-500">Monto</p><p className="font-semibold text-slate-950">{formatCurrencyBOB(l.amount)}</p></div>
       <div><p className="text-xs text-slate-500">Salario</p><p>{l.monthly_salary ? formatCurrencyBOB(l.monthly_salary) : '-'}</p></div>
       <div><p className="text-xs text-slate-500">Plazo</p><p>{l.term_months} meses</p></div>
       <div><p className="text-xs text-slate-500">Estado</p><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(l.status)}`}>{statusLabel(l.status)}</span></div>
       <div><p className="text-xs text-slate-500">Fecha</p><p>{formatDateBO(l.created_at)}</p></div>
      </div>
      <button disabled={!CANCELLABLE_STATUSES.includes(l.status)} onClick={()=>cancelLoan(l)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Cancelar</button>
     </article>)}
    </div>}
   </section>
  </main>
 </AppShell>;
}