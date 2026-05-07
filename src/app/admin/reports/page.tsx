'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { downloadCsv } from '@/lib/csv';
import { formatCurrencyBOB, formatDateBO, paymentStatusLabel, statusClass, statusLabel } from '@/lib/formatters';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = {
  id: string;
  amount: number;
  term_months: number;
  status: string;
  created_at: string;
  disbursed_amount?: number | null;
  disbursed_at?: string | null;
  interest_rate?: number | null;
  total_interest?: number | null;
  total_amount?: number | null;
  installment_amount?: number | null;
  profiles?: { full_name: string | null; email: string | null } | null;
};

type Payment = {
  id: string;
  loan_application_id: string;
  installment_number: number | null;
  due_date: string;
  amount: number;
  paid_amount: number | null;
  capital_amount?: number | null;
  interest_amount?: number | null;
  status: string;
  paid_at: string | null;
  is_late: boolean | null;
  loan_applications?: { profiles?: { full_name: string | null; email: string | null } | null } | null;
};

const statusOptions = ['ALL','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','INFO_REQUESTED','ACTIVE','LATE','CLOSED','CANCELLED'];

const isPaymentLate = (payment: Payment) => {
 const status = String(payment.status || '').toUpperCase();
 const openBalance = Number(payment.amount || 0) - Number(payment.paid_amount || 0);
 const today = new Date().toISOString().slice(0, 10);
 return status === 'LATE' || payment.is_late === true || (status !== 'PAID' && openBalance > 0 && String(payment.due_date) < today);
};

export default function ReportsPage(){
 const [loans,setLoans]=useState<Loan[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [status,setStatus]=useState('ALL');
 const [search,setSearch]=useState('');
 const [dateFrom,setDateFrom]=useState('');
 const [dateTo,setDateTo]=useState('');
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);

 const load=async()=>{
  setLoading(true);
  setMsg('');
  const { data:loanData, error:loanError } = await supabase
   .from('loan_applications')
   .select('id,amount,term_months,status,created_at,disbursed_amount,disbursed_at,interest_rate,total_interest,total_amount,installment_amount,profiles(full_name,email)')
   .order('created_at',{ascending:false});
  if(loanError){ setMsg(loanError.message); setLoading(false); return; }

  const { data:paymentData, error:paymentError } = await supabase
   .from('loan_payments')
   .select('id,loan_application_id,installment_number,due_date,amount,capital_amount,interest_amount,paid_amount,status,paid_at,is_late,loan_applications(profiles(full_name,email))')
   .order('due_date',{ascending:true});
  if(paymentError){ setMsg(paymentError.message); }
  setLoans((loanData as unknown as Loan[])||[]);
  setPayments((paymentData as unknown as Payment[])||[]);
  setLoading(false);
 };
 useEffect(()=>{load();},[]);

 const filteredLoans=useMemo(()=>loans.filter(l=>{
  const q=search.toLowerCase().trim();
  const client=`${l.profiles?.full_name||''} ${l.profiles?.email||''}`.toLowerCase();
  const created=l.created_at?.slice(0,10);
  return (status==='ALL'||l.status===status) && (!q || client.includes(q) || l.id.toLowerCase().includes(q)) && (!dateFrom || created>=dateFrom) && (!dateTo || created<=dateTo);
 }),[loans,status,search,dateFrom,dateTo]);

 const metrics=useMemo(()=>{
  const count=(s:string)=>filteredLoans.filter(l=>l.status===s).length;
  const filteredLoanIds=new Set(filteredLoans.map(l=>l.id));
  const relevantPayments=payments.filter(p=>filteredLoanIds.has(p.loan_application_id));
  const disbursed=filteredLoans.reduce((sum,l)=>sum+Number(l.disbursed_amount||(['ACTIVE','LATE','CLOSED'].includes(l.status)?l.amount:0)),0);
  const pending=relevantPayments.filter(p=>p.status!=='PAID').reduce((sum,p)=>sum+Number(p.amount||0)-Number(p.paid_amount||0),0);
  const latePayments=relevantPayments.filter(isPaymentLate);
  const late=latePayments.reduce((sum,p)=>sum+Number(p.amount||0)-Number(p.paid_amount||0),0);
  const lateLoanIds=new Set(latePayments.map(p=>p.loan_application_id));
  const expectedInterest=filteredLoans.reduce((sum,l)=>sum+Number(l.total_interest||0),0);
  const totalToCollect=filteredLoans.reduce((sum,l)=>sum+Number(l.total_amount||l.amount||0),0);
  return { total:filteredLoans.length, approved:count('APPROVED'), rejected:count('REJECTED'), active:count('ACTIVE'), lateLoans:lateLoanIds.size, latePayments:latePayments.length, closed:count('CLOSED'), disbursed, pending, late, expectedInterest, totalToCollect };
 },[filteredLoans,payments]);

 const exportLoans=()=>downloadCsv('solicitudes-microcredito.csv', filteredLoans.map(l=>({
  id:l.id, cliente:l.profiles?.full_name||'', email:l.profiles?.email||'', monto:l.amount, plazo_meses:l.term_months, estado:statusLabel(l.status), fecha:formatDateBO(l.created_at), desembolsado:l.disbursed_amount||0, tasa_interes:l.interest_rate||0, interes_total:l.total_interest||0, total_a_cobrar:l.total_amount||l.amount, cuota:l.installment_amount||0
 })));
 const exportPayments=()=>downloadCsv('pagos-microcredito.csv', payments.map(p=>({
  id:p.id, solicitud:p.loan_application_id, cliente:p.loan_applications?.profiles?.full_name||'', email:p.loan_applications?.profiles?.email||'', cuota:p.installment_number, vencimiento:formatDateBO(p.due_date), capital:p.capital_amount||0, interes:p.interest_amount||0, monto:p.amount, pagado:p.paid_amount||0, estado:paymentStatusLabel(p.status), fecha_pago:formatDateBO(p.paid_at)
 })));
 const exportLate=()=>downloadCsv('mora-microcredito.csv', payments.filter(isPaymentLate).map(p=>({
  id:p.id, solicitud:p.loan_application_id, cliente:p.loan_applications?.profiles?.full_name||'', cuota:p.installment_number, vencimiento:formatDateBO(p.due_date), saldo:Number(p.amount||0)-Number(p.paid_amount||0), estado:paymentStatusLabel(p.status)
 })));

 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
     <div><p className="text-sm font-medium text-blue-700">Control operativo</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Reportes y métricas</h1><p className="mt-2 text-slate-600">Resumen de solicitudes, cartera, pagos y mora para seguimiento operativo.</p></div>
     <div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Actualizar</button><button onClick={exportLoans} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Exportar solicitudes</button><button onClick={exportPayments} className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">Exportar pagos</button><button onClick={exportLate} className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50">Exportar mora</button></div>
    </div>
    <StatusMessage message={msg} />
   </section>

   <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {[['Solicitudes',metrics.total],['Aprobadas',metrics.approved],['Rechazadas',metrics.rejected],['Activas',metrics.active],['Créditos en mora',metrics.lateLoans],['Cuotas en mora',metrics.latePayments],['Cerradas',metrics.closed],['Monto desembolsado',formatCurrencyBOB(metrics.disbursed)],['Interés esperado',formatCurrencyBOB(metrics.expectedInterest)],['Total a cobrar',formatCurrencyBOB(metrics.totalToCollect)],['Saldo pendiente',formatCurrencyBOB(metrics.pending)]].map(([label,value])=><div key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div>)}
   </section>
   <section className="mt-4 rounded-3xl bg-red-50 p-5 ring-1 ring-red-100"><p className="text-sm text-red-700">Mora estimada</p><p className="mt-1 text-2xl font-bold text-red-800">{formatCurrencyBOB(metrics.late)}</p></section>

   <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
    <h2 className="text-lg font-semibold text-slate-950">Filtros</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente o ID" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
     <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">{statusOptions.map(s=><option key={s} value={s}>{s==='ALL'?'Todos los estados':statusLabel(s)}</option>)}</select>
     <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
     <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
    </div>
   </section>

   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
    {loading ? <p className="text-slate-600">Cargando reportes...</p> : filteredLoans.length===0 ? <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">No hay solicitudes con esos filtros.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Cliente</th><th>Monto</th><th>Plazo</th><th>Estado</th><th>Interés</th><th>Total a cobrar</th><th>Desembolsado</th><th>Fecha</th></tr></thead><tbody>{filteredLoans.map(l=><tr key={l.id} className="border-t border-slate-100"><td className="py-4"><p className="font-semibold text-slate-950">{l.profiles?.full_name||'Sin nombre'}</p><p className="text-xs text-slate-500">{l.profiles?.email||'-'}</p></td><td>{formatCurrencyBOB(l.amount)}</td><td>{l.term_months} meses</td><td><span className={`rounded-full border px-3 py-1 text-xs ${statusClass(l.status)}`}>{statusLabel(l.status)}</span></td><td>{l.interest_rate || 0}%</td><td>{formatCurrencyBOB(l.total_amount || l.amount)}</td><td>{formatCurrencyBOB(l.disbursed_amount||0)}</td><td>{formatDateBO(l.created_at)}</td></tr>)}</tbody></table></div>}
   </section>
  </main>
 </AppShell>;
}