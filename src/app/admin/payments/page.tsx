'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, paymentStatusClass, paymentStatusLabel, statusClass, statusLabel } from '@/lib/formatters';
import { DEFAULT_FINANCIAL_SETTINGS, generateSchedule, pendingBalance } from '@/lib/loan';
import { getFinancialSettings } from '@/lib/settings';
import { registerAudit } from '@/lib/audit';
import { validateContractSigned } from '@/lib/operationalGuards';
import { registerStatusHistory } from '@/lib/statusHistory';
import { StatusMessage } from '@/components/StatusMessage';

type Loan = { id:string; amount:number; term_months:number; status:string; created_at:string; interest_rate?:number|null; total_interest?:number|null; total_amount?:number|null; installment_amount?:number|null; disbursed_amount?:number|null; disbursed_at?:string|null; profiles?:{full_name:string|null,email:string|null}|null };
type Payment = { id:string; loan_application_id:string; installment_number:number|null; due_date:string; amount:number; capital_amount?:number|null; interest_amount?:number|null; paid_amount:number|null; status:string; paid_at:string|null; is_late:boolean|null };

export default function AdminPaymentsPage(){
 const [loans,setLoans]=useState<Loan[]>([]);
 const [selectedLoanId,setSelectedLoanId]=useState('');
 const [payments,setPayments]=useState<Payment[]>([]);
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 const [financialSettings,setFinancialSettings]=useState(DEFAULT_FINANCIAL_SETTINGS);

 const loadLoans=async()=>{
  setLoading(true);
  const { data, error }=await supabase
   .from('loan_applications')
   .select('id,amount,term_months,status,created_at,interest_rate,total_interest,total_amount,installment_amount,disbursed_amount,disbursed_at,profiles(full_name,email)')
   .in('status',['APPROVED','DISBURSED','ACTIVE','LATE','CLOSED'])
   .order('created_at',{ascending:false});
  if(error){ setMsg(error.message); setLoading(false); return; }
  const list=(data as unknown as Loan[])||[];
  setLoans(list);
  const id=selectedLoanId || list[0]?.id || '';
  setSelectedLoanId(id);
  if(id) await loadPayments(id);
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

 const refreshPayments = async (loanId:string) => {
  const { data, error }=await supabase
   .from('loan_payments')
   .select('id,loan_application_id,installment_number,due_date,amount,capital_amount,interest_amount,paid_amount,status,paid_at,is_late')
   .eq('loan_application_id',loanId)
   .order('installment_number',{ascending:true});
  if(error) throw new Error(error.message);
  const rows=(data as Payment[])||[];
  setPayments(rows);
  return rows;
 };

 const syncLoanLateStatus = async (loanId:string, rows:Payment[]) => {
  const hasLate = rows.some(p => String(p.status).toUpperCase()==='LATE' || p.is_late === true);
  const targetStatus = hasLate ? 'LATE' : 'ACTIVE';
  const { error } = await supabase
   .from('loan_applications')
   .update({ status: targetStatus })
   .eq('id', loanId)
   .in('status', ['ACTIVE','LATE']);
  if(error) throw new Error(error.message);
 };

 useEffect(()=>{ getFinancialSettings().then(setFinancialSettings); loadLoans();},[]);
 useEffect(()=>{ if(selectedLoanId) loadPayments(selectedLoanId); },[selectedLoanId]);

 const selectedLoan=loans.find(l=>l.id===selectedLoanId);
 const balance=useMemo(()=>pendingBalance(payments),[payments]);

 const disburseLoan=async(loan:Loan)=>{
  if(loan.status!=='APPROVED') { setMsg('Solo se pueden desembolsar solicitudes aprobadas.'); return; }
  const contract = await validateContractSigned(loan.id);
  if(!contract.ok) { setMsg(contract.message); return; }
  const rate = Number(loan.interest_rate ?? financialSettings.interest_rate_monthly);
  const totalToPay = Number(loan.total_amount || loan.amount);
  const ok=window.confirm(`¿Confirmas el desembolso de ${formatCurrencyBOB(loan.amount)} y la generación del cronograma de ${loan.term_months} cuotas con interés mensual de ${rate}%? Total a cobrar: ${formatCurrencyBOB(totalToPay)}`);
  if(!ok) return;
  setMsg('Registrando desembolso...');
  const { error:updateError }=await supabase
   .from('loan_applications')
   .update({ status:'ACTIVE', disbursed_at:new Date().toISOString(), disbursed_amount:loan.amount, disbursement_notes:'Desembolso registrado desde panel admin.' })
   .eq('id',loan.id)
   .eq('status','APPROVED');
  if(updateError){ setMsg(updateError.message); return; }

  const schedule=generateSchedule(loan.amount, loan.term_months, rate).map(row=>({ ...row, loan_application_id:loan.id }));
  const { error:paymentError }=await supabase.from('loan_payments').insert(schedule);
  if(paymentError){ setMsg(paymentError.message); return; }
  await registerStatusHistory(loan.id, loan.status, 'ACTIVE', 'Desembolso registrado y crédito activado.');
  await registerAudit('DISBURSE_LOAN', 'loan_applications', loan.id, { amount: loan.amount, term_months: loan.term_months });
  setMsg('Desembolso registrado y cronograma generado correctamente.');
  await loadLoans();
 };

 const markPaid=async(payment:Payment)=>{
  if(payment.status==='PAID') { setMsg('Esta cuota ya fue pagada.'); return; }
  const ok=window.confirm(`¿Confirmas registrar el pago de la cuota #${payment.installment_number} por ${formatCurrencyBOB(payment.amount)}?`);
  if(!ok) return;
  setMsg('Registrando pago...');
  const { data, error }=await supabase
   .from('loan_payments')
   .update({ status:'PAID', paid_amount:payment.amount, paid_at:new Date().toISOString(), is_late:false })
   .eq('id',payment.id)
   .neq('status','PAID')
   .select('id,loan_application_id,installment_number,amount,status')
   .single();
  if(error){ setMsg(error.message); return; }
  if(!data){ setMsg('No se pudo registrar el pago. Actualiza la pantalla e inténtalo nuevamente.'); return; }
  await registerAudit('MARK_PAYMENT_PAID', 'loan_payments', payment.id, {
   loan_application_id: payment.loan_application_id,
   installment_number: payment.installment_number,
   amount: payment.amount,
   previousStatus: payment.status,
   targetStatus: 'PAID',
  });
  const rows = selectedLoanId ? await refreshPayments(selectedLoanId) : [];
  if(selectedLoanId) await syncLoanLateStatus(selectedLoanId, rows);
  setMsg('Pago registrado correctamente.');
  await loadLoans();
 };

 const markLate=async(payment:Payment)=>{
  if(payment.status==='PAID') { setMsg('No se puede marcar en mora una cuota pagada.'); return; }
  const ok=window.confirm(`¿Confirmas marcar la cuota #${payment.installment_number} como mora?`);
  if(!ok) return;
  setMsg('Marcando cuota en mora...');
  const { data, error }=await supabase
   .from('loan_payments')
   .update({ status:'LATE', is_late:true })
   .eq('id',payment.id)
   .neq('status','PAID')
   .select('id,loan_application_id,installment_number,status')
   .single();
  if(error){ setMsg(error.message); return; }
  if(!data){ setMsg('No se pudo marcar la cuota en mora. Actualiza la pantalla e inténtalo nuevamente.'); return; }
  const { error: loanError } = await supabase
   .from('loan_applications')
   .update({ status:'LATE' })
   .eq('id', payment.loan_application_id)
   .in('status', ['ACTIVE','DISBURSED']);
  if(loanError){ setMsg(loanError.message); return; }
  await registerAudit('MARK_PAYMENT_LATE', 'loan_payments', payment.id, {
   loan_application_id: payment.loan_application_id,
   installment_number: payment.installment_number,
   previousStatus: payment.status,
   targetStatus: 'LATE',
  });
  setMsg('Cuota marcada en mora.');
  if(selectedLoanId) await refreshPayments(selectedLoanId);
  await loadLoans();
 };

 const closeLoan=async()=>{
  if(!selectedLoan) return;
  setMsg('Validando crédito antes de cerrar...');
  let currentPayments: Payment[] = [];
  try {
   currentPayments = await refreshPayments(selectedLoan.id);
  } catch (err) {
   setMsg(err instanceof Error ? err.message : 'No se pudieron validar las cuotas.');
   return;
  }
  if(currentPayments.length===0){ setMsg('No puedes cerrar un crédito sin cronograma de pagos.'); return; }
  const pending=currentPayments.some(p=>String(p.status).toUpperCase()!=='PAID');
  if(pending){ setMsg('No puedes cerrar el crédito mientras existan cuotas pendientes o en mora.'); return; }
  const totalPaid=currentPayments.reduce((sum,p)=>sum+Number(p.paid_amount||p.amount||0),0);
  const ok=window.confirm(`¿Confirmas cerrar este crédito? Todas las cuotas están pagadas. Total pagado: ${formatCurrencyBOB(totalPaid)}.`);
  if(!ok) return;
  setMsg('Cerrando crédito...');
  const { data, error }=await supabase
   .from('loan_applications')
   .update({ status:'CLOSED' })
   .eq('id',selectedLoan.id)
   .in('status',['ACTIVE','LATE','DISBURSED'])
   .select('id,status')
   .single();
  if(error){ setMsg(error.message); return; }
  if(!data){ setMsg('No se pudo cerrar el crédito. Verifica que siga activo y vuelve a intentar.'); return; }
  await registerStatusHistory(selectedLoan.id, selectedLoan.status, 'CLOSED', 'Crédito cerrado con todas las cuotas pagadas.');
  await registerAudit('CLOSE_LOAN', 'loan_applications', selectedLoan.id, {
   previousStatus: selectedLoan.status,
   targetStatus: 'CLOSED',
   totalPayments: currentPayments.length,
   totalPaid,
   pendingPayments: 0,
  });
  setMsg('Crédito cerrado correctamente.');
  await loadLoans();
 };

 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
     <div><p className="text-sm font-medium text-blue-700">Operación crediticia</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Desembolsos y pagos</h1><p className="mt-2 text-slate-600">Registra desembolsos, genera cuotas y controla pagos manuales.</p></div>
     <button onClick={loadLoans} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:w-auto">Actualizar</button>
    </div>
    <StatusMessage message={msg} />
   </section>

   {loading ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">Cargando créditos...</p> : loans.length===0 ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">No hay créditos aprobados, activos o cerrados.</p> : <>
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
      <label className="text-sm font-semibold text-slate-700">Selecciona crédito</label>
      <select value={selectedLoanId} onChange={(e)=>setSelectedLoanId(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500">
       {loans.map(l=><option key={l.id} value={l.id}>{l.profiles?.full_name || 'Sin nombre'} - {formatCurrencyBOB(l.disbursed_amount || l.amount)} - {statusLabel(l.status)}</option>)}
      </select>
     </div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Saldo pendiente</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrencyBOB(balance)}</p></div>
    </section>

    {selectedLoan&&<section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
     <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="font-semibold text-slate-950">{selectedLoan.profiles?.full_name || 'Sin nombre'}</p><p className="text-sm text-slate-500">{selectedLoan.profiles?.email || '-'} · Plazo {selectedLoan.term_months} meses · Interés {selectedLoan.interest_rate ?? financialSettings.interest_rate_monthly}% mensual</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrencyBOB(selectedLoan.disbursed_amount || selectedLoan.amount)}</p><p className="text-sm text-slate-500">Total a cobrar: {formatCurrencyBOB(selectedLoan.total_amount || selectedLoan.amount)}</p></div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-sm ${statusClass(selectedLoan.status)}`}>{statusLabel(selectedLoan.status)}</span>{selectedLoan.status==='APPROVED'&&<button onClick={()=>disburseLoan(selectedLoan)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Registrar desembolso</button>}{payments.length>0&&<button onClick={closeLoan} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cerrar crédito</button>}</div></div>
    </section>}

    <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
     <h2 className="text-lg font-semibold text-slate-950">Cronograma de pagos</h2>
     {payments.length===0 ? <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-slate-600">Este crédito aún no tiene cronograma. Registra el desembolso para generarlo.</p> : <>
      <div className="mt-4 grid gap-3 md:hidden">{payments.map(p=><article key={p.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-950">Cuota #{p.installment_number}</p><span className={`rounded-full border px-3 py-1 text-xs ${paymentStatusClass(p.status)}`}>{paymentStatusLabel(p.status)}</span></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Vence</dt><dd>{formatDateBO(p.due_date)}</dd></div><div><dt className="text-slate-500">Capital</dt><dd>{formatCurrencyBOB(p.capital_amount || 0)}</dd></div><div><dt className="text-slate-500">Interés</dt><dd>{formatCurrencyBOB(p.interest_amount || 0)}</dd></div><div><dt className="text-slate-500">Monto</dt><dd className="font-semibold">{formatCurrencyBOB(p.amount)}</dd></div><div><dt className="text-slate-500">Pagado</dt><dd>{formatCurrencyBOB(p.paid_amount || 0)}</dd></div><div><dt className="text-slate-500">Fecha pago</dt><dd>{formatDateBO(p.paid_at)}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><button disabled={p.status==='PAID'} onClick={()=>markPaid(p)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Marcar pagada</button><button disabled={p.status==='PAID'} onClick={()=>markLate(p)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Marcar mora</button></div></article>)}</div>
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Cuota</th><th>Vencimiento</th><th>Capital</th><th>Interés</th><th>Total</th><th>Pagado</th><th>Estado</th><th>Fecha pago</th><th>Acciones</th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-t border-slate-100"><td className="py-4 font-semibold">#{p.installment_number}</td><td>{formatDateBO(p.due_date)}</td><td>{formatCurrencyBOB(p.capital_amount || 0)}</td><td>{formatCurrencyBOB(p.interest_amount || 0)}</td><td>{formatCurrencyBOB(p.amount)}</td><td>{formatCurrencyBOB(p.paid_amount || 0)}</td><td><span className={`rounded-full border px-3 py-1 text-xs ${paymentStatusClass(p.status)}`}>{paymentStatusLabel(p.status)}</span></td><td>{formatDateBO(p.paid_at)}</td><td><div className="flex flex-wrap gap-2"><button disabled={p.status==='PAID'} onClick={()=>markPaid(p)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Pagar</button><button disabled={p.status==='PAID'} onClick={()=>markLate(p)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Mora</button></div></td></tr>)}</tbody></table></div>
     </>}
    </section>
   </>}
  </main>
 </AppShell>;
}