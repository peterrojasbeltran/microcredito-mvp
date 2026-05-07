'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, paymentStatusClass, paymentStatusLabel, statusClass, statusLabel } from '@/lib/formatters';
import { nextPendingPayment, pendingBalance } from '@/lib/loan';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = { id:string; amount:number; term_months:number; status:string; created_at:string; interest_rate?:number|null; total_interest?:number|null; total_amount?:number|null; installment_amount?:number|null; disbursed_amount?:number|null; disbursed_at?:string|null };
type Payment = { id:string; loan_application_id:string; installment_number:number|null; due_date:string; amount:number; capital_amount?:number|null; interest_amount?:number|null; paid_amount:number|null; status:string; paid_at:string|null; is_late:boolean|null };

export default function ClientPaymentsPage(){
 const [loans,setLoans]=useState<Loan[]>([]);
 const [selectedLoanId,setSelectedLoanId]=useState('');
 const [payments,setPayments]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(true);
 const [msg,setMsg]=useState('');

 const load=async()=>{
  setLoading(true);
  const { data:{user} }=await supabase.auth.getUser();
  if(!user){ location.href='/login'; return; }
  const { data: loanData, error: loanError }=await supabase
   .from('loan_applications')
   .select('id,amount,term_months,status,created_at,interest_rate,total_interest,total_amount,installment_amount,disbursed_amount,disbursed_at')
   .in('status',['DISBURSED','ACTIVE','LATE','CLOSED'])
   .order('created_at',{ascending:false});
  if(loanError){ setMsg(loanError.message); setLoading(false); return; }
  const loadedLoans=(loanData as Loan[])||[];
  setLoans(loadedLoans);
  const initialId=selectedLoanId || loadedLoans[0]?.id || '';
  setSelectedLoanId(initialId);
  if(initialId) await loadPayments(initialId);
  setLoading(false);
 };

 const loadPayments=async(loanId:string)=>{
  const { data, error }=await supabase
   .from('loan_payments')
   .select('id,loan_application_id,installment_number,due_date,amount,capital_amount,interest_amount,paid_amount,status,paid_at,is_late')
   .eq('loan_application_id',loanId)
   .order('installment_number',{ascending:true});
  if(error) setMsg(error.message); else setPayments((data as Payment[])||[]);
 };

 useEffect(()=>{load();},[]);
 useEffect(()=>{ if(selectedLoanId) loadPayments(selectedLoanId); },[selectedLoanId]);

 const selectedLoan=loans.find(l=>l.id===selectedLoanId);
 const balance=useMemo(()=>pendingBalance(payments),[payments]);
 const next=useMemo(()=>nextPendingPayment(payments),[payments]);
 const paidCount=payments.filter(p=>p.status==='PAID').length;

 return <AppShell area="client" allowedRoles={['client']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <p className="text-sm font-medium text-blue-700">Seguimiento de pagos</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Mis cuotas</h1>
    <p className="mt-2 text-slate-600">Aquí puedes revisar tu cronograma, saldo pendiente y próxima cuota.</p>
    <StatusMessage message={msg} />
   </section>

   {loading ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">Cargando cuotas...</p> : loans.length===0 ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">Aún no tienes créditos desembolsados o activos.</p> : <>
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <label className="text-sm font-semibold text-slate-700">Crédito</label>
      <select value={selectedLoanId} onChange={(e)=>setSelectedLoanId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">
       {loans.map(l=><option key={l.id} value={l.id}>{formatCurrencyBOB(l.disbursed_amount || l.amount)} - {statusLabel(l.status)}</option>)}
      </select>
     </div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Saldo pendiente</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrencyBOB(balance)}</p></div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Próxima cuota</p><p className="mt-2 text-2xl font-bold text-slate-950">{next ? formatCurrencyBOB(next.amount) : 'Sin pendientes'}</p><p className="text-sm text-slate-500">{next ? `Vence: ${formatDateBO(next.due_date)}` : `${paidCount}/${payments.length} cuotas pagadas`}</p></div>
    </section>

    {selectedLoan&&<section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
     <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-300">Crédito activo</p><p className="text-3xl font-bold">{formatCurrencyBOB(selectedLoan.disbursed_amount || selectedLoan.amount)}</p><p className="text-sm text-slate-300">Total a pagar: {formatCurrencyBOB(selectedLoan.total_amount || selectedLoan.amount)} · Interés: {selectedLoan.interest_rate || 0}% mensual</p></div><span className={`w-fit rounded-full border px-3 py-1 text-sm ${statusClass(selectedLoan.status)}`}>{statusLabel(selectedLoan.status)}</span></div>
    </section>}

    <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
     <h2 className="text-lg font-semibold text-slate-950">Cronograma</h2>
     <div className="mt-4 grid gap-3 md:hidden">
      {payments.map(p=><article key={p.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-950">Cuota #{p.installment_number}</p><span className={`rounded-full border px-3 py-1 text-xs ${paymentStatusClass(p.status)}`}>{paymentStatusLabel(p.status)}</span></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Vence</dt><dd>{formatDateBO(p.due_date)}</dd></div><div><dt className="text-slate-500">Capital</dt><dd>{formatCurrencyBOB(p.capital_amount || 0)}</dd></div><div><dt className="text-slate-500">Interés</dt><dd>{formatCurrencyBOB(p.interest_amount || 0)}</dd></div><div><dt className="text-slate-500">Total</dt><dd className="font-semibold">{formatCurrencyBOB(p.amount)}</dd></div><div><dt className="text-slate-500">Pagado</dt><dd>{formatCurrencyBOB(p.paid_amount || 0)}</dd></div><div><dt className="text-slate-500">Fecha pago</dt><dd>{formatDateBO(p.paid_at)}</dd></div></dl></article>)}
     </div>
     <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Cuota</th><th>Vencimiento</th><th>Capital</th><th>Interés</th><th>Total</th><th>Pagado</th><th>Estado</th><th>Fecha pago</th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-t border-slate-100"><td className="py-4 font-semibold">#{p.installment_number}</td><td>{formatDateBO(p.due_date)}</td><td>{formatCurrencyBOB(p.capital_amount || 0)}</td><td>{formatCurrencyBOB(p.interest_amount || 0)}</td><td>{formatCurrencyBOB(p.amount)}</td><td>{formatCurrencyBOB(p.paid_amount || 0)}</td><td><span className={`rounded-full border px-3 py-1 text-xs ${paymentStatusClass(p.status)}`}>{paymentStatusLabel(p.status)}</span></td><td>{formatDateBO(p.paid_at)}</td></tr>)}</tbody></table></div>
    </section>
   </>}
  </main>
 </AppShell>;
}