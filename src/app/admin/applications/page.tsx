'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, statusClass, statusLabel } from '@/lib/formatters';
import { registerAudit } from '@/lib/audit';
import { getFinancialSettings } from '@/lib/settings';
import { calculateLoanSimulation } from '@/lib/loan';
import { validateKycComplete } from '@/lib/operationalGuards';
import { registerStatusHistory } from '@/lib/statusHistory';
import { getAdminActionHint } from '@/lib/ux';
import { StatusMessage } from '@/components/StatusMessage';

type App = {
  id:string;
  amount:number;
  term_months:number;
  monthly_salary:number | null;
  monthly_installment:number | null;
  installment_amount:number | null;
  total_amount:number | null;
  interest_rate:number | null;
  bank_name:string | null;
  employer_name_text:string | null;
  employers?:{name:string|null;hr_contact_email:string|null}|null;
  status:string;
  created_at:string;
  profiles?:{full_name:string|null,email:string|null} | null;
};

export default function AdminApplications(){
 const [apps,setApps]=useState<App[]>([]);
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);
 const [maxInstallmentPercentage,setMaxInstallmentPercentage]=useState(30);

 const load=async()=>{
  setLoading(true);
  const { data, error }=await supabase
   .from('loan_applications')
   .select('id,amount,term_months,monthly_salary,monthly_installment,installment_amount,total_amount,interest_rate,bank_name,employer_name_text,status,created_at,profiles(full_name,email),employers(name,hr_contact_email)')
   .order('created_at',{ascending:false});
  if(error) setMsg(error.message); else setApps((data as unknown as App[])||[]);
  setLoading(false);
 };
 useEffect(()=>{
  load();
  getFinancialSettings().then(settings => setMaxInstallmentPercentage(settings.max_installment_salary_percentage));
 },[]);

 const getEstimatedInstallment = (application: App) => {
  const storedInstallment = Number(application.installment_amount || application.monthly_installment || 0);
  if (storedInstallment > 0) return storedInstallment;
  const simulated = calculateLoanSimulation(
   Number(application.amount || 0),
   Number(application.term_months || 1),
   Number(application.interest_rate || 0)
  );
  return simulated.installmentAmount;
 };

 const getMaxAllowedInstallment = (application: App) => {
  const salary = Number(application.monthly_salary || 0);
  if (!salary) return 0;
  return salary * (maxInstallmentPercentage / 100);
 };

 const getCapacityAssessment = (application: App) => {
  const salary = Number(application.monthly_salary || 0);
  const installment = getEstimatedInstallment(application);
  const maxAllowed = getMaxAllowedInstallment(application);
  const hasSalary = salary > 0;
  const hasInstallment = installment > 0;
  const withinCapacity = hasSalary && hasInstallment && installment <= maxAllowed;
  const capacityWarning = !withinCapacity;

  let message = '';
  if (!hasSalary) {
   message = 'Advertencia: esta solicitud no tiene salario declarado. No debería aprobarse sin revisar la información laboral.';
  } else if (!hasInstallment) {
   message = 'Advertencia: no se pudo calcular la cuota estimada. Revisa monto, plazo e interés antes de aprobar.';
  } else if (capacityWarning) {
   message = `Advertencia: la cuota estimada ${formatCurrencyBOB(installment)} supera el ${maxInstallmentPercentage}% del salario declarado (${formatCurrencyBOB(maxAllowed)}). Revisa bien antes de aprobar.`;
  }

  return {
   salary,
   installment,
   maxAllowed,
   maxInstallmentPercentage,
   withinCapacity,
   capacityWarning,
   message,
  };
 };

 const getCapacityWarning = (application: App) => getCapacityAssessment(application).message;

 const updateStatus=async(application:App,targetStatus:string)=>{
  const labels: Record<string,string> = { UNDER_REVIEW: 'marcar en revisión', APPROVED: 'aprobar', REJECTED: 'rechazar', INFO_REQUESTED: 'pedir información adicional' };
  const assessment = getCapacityAssessment(application);

  if (targetStatus === 'APPROVED') {
   if (!assessment.salary) { setMsg('No puedes aprobar una solicitud sin salario declarado.'); return; }
   const kyc = await validateKycComplete(application.id);
   if (!kyc.ok) { setMsg(kyc.message); return; }
  }

  const message = targetStatus === 'APPROVED' && assessment.capacityWarning
   ? `${assessment.message}

¿Confirmas que deseas aprobar esta solicitud de todos modos?`
   : `¿Confirmas que deseas ${labels[targetStatus] || 'actualizar'} esta solicitud?`;
  const ok = window.confirm(message);
  if (!ok) return;
  setMsg('Actualizando estado...');
  const { error } = await supabase.from('loan_applications').update({ status: targetStatus }).eq('id',application.id);
  if (error) setMsg(error.message); else {
   await registerStatusHistory(application.id, application.status, targetStatus, labels[targetStatus] || 'Cambio de estado');
   await registerAudit('UPDATE_LOAN_STATUS', 'loan_applications', application.id, {
    previousStatus: application.status,
    targetStatus,
    status: targetStatus,
    capacityWarning: Boolean(assessment.capacityWarning),
    withinCapacity: Boolean(assessment.withinCapacity),
    salary: assessment.salary,
    installment: assessment.installment,
    maxAllowedInstallment: assessment.maxAllowed,
    maxInstallmentPercentage: assessment.maxInstallmentPercentage,
    capacityMessage: assessment.message || 'Dentro de capacidad',
   });
   setMsg(`Estado actualizado a ${statusLabel(targetStatus)} correctamente.`);
  }
  load();
 };

 const CapacityWarning = ({ application }: { application: App }) => {
  const warning = getCapacityWarning(application);
  if (!warning) return null;
  return <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-800 ring-1 ring-amber-100">{warning}</p>;
 };

 const ActionButtons = ({ application }: { application: App }) => {
  const canReview = ['SUBMITTED','KYC_REVIEW','INFO_REQUESTED'].includes(application.status);
  const canDecide = ['SUBMITTED','KYC_REVIEW','UNDER_REVIEW','INFO_REQUESTED'].includes(application.status);
  const canPay = ['DISBURSED','ACTIVE','LATE'].includes(application.status);
  return <div className="flex flex-wrap gap-2">
   <Link className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50" href={`/admin/applications/${application.id}`}>Ver expediente</Link>
   {canReview && <button className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50" onClick={()=>updateStatus(application,'UNDER_REVIEW')}>Pasar a revisión</button>}
   {canDecide && <button className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={()=>updateStatus(application,'APPROVED')}>Aprobar</button>}
   {canDecide && <button className="rounded-xl border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50" onClick={()=>updateStatus(application,'INFO_REQUESTED')}>Pedir info</button>}
   {canDecide && <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={()=>updateStatus(application,'REJECTED')}>Rechazar</button>}
   {canPay && <Link className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50" href="/admin/payments">Gestionar pagos</Link>}
  </div>;
 };

 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
     <div>
      <p className="text-sm font-medium text-blue-700">Panel administrativo</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Solicitudes de crédito</h1>
      <p className="mt-2 text-slate-600">Prioriza solicitudes, revisa alertas y ejecuta solo las acciones disponibles según el estado del crédito.</p>
     </div>
     <button onClick={load} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:w-auto">Actualizar</button>
    </div>
    <StatusMessage message={msg} />
   </section>

   <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
    {loading ? <p className="text-slate-600">Cargando solicitudes...</p> : apps.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">No hay solicitudes registradas.</p> : <>
     <div className="grid gap-4 md:hidden">
      {apps.map(a=><article key={a.id} className="rounded-3xl border border-slate-200 p-4">
       <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-slate-950">{a.profiles?.full_name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{a.profiles?.email || '-'}</p></div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(a.status)}`}>{statusLabel(a.status)}</span>
       </div>
       <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">Monto</dt><dd className="font-semibold text-slate-950">{formatCurrencyBOB(a.amount)}</dd></div>
        <div><dt className="text-slate-500">Plazo</dt><dd>{a.term_months} meses</dd></div>
        <div><dt className="text-slate-500">Salario</dt><dd>{a.monthly_salary ? formatCurrencyBOB(a.monthly_salary) : '-'}</dd></div>
        <div><dt className="text-slate-500">Cuota est.</dt><dd>{formatCurrencyBOB(getEstimatedInstallment(a))}</dd></div>
        <div><dt className="text-slate-500">Máx. permitido</dt><dd>{a.monthly_salary ? formatCurrencyBOB(getMaxAllowedInstallment(a)) : '-'}</dd></div>
        <div><dt className="text-slate-500">Banco</dt><dd>{a.bank_name || '-'}</dd></div><div className="col-span-2"><dt className="text-slate-500">Empresa</dt><dd>{a.employers?.name || a.employer_name_text || '-'}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Fecha</dt><dd>{formatDateBO(a.created_at)}</dd></div>
       </dl>
       <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-600">{getAdminActionHint(a.status)}</p><CapacityWarning application={a}/><div className="mt-4"><ActionButtons application={a}/></div>
      </article>)}
     </div>
     <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
       <thead>
        <tr className="text-slate-500">
         <th className="py-3">Cliente</th><th>Monto</th><th>Salario</th><th>Máx. cuota</th><th>Plazo</th><th>Cuota est.</th><th>Banco</th><th>Empresa</th><th>Estado</th><th>Próximo paso</th><th>Riesgo</th><th>Fecha</th><th>Acciones</th>
        </tr>
       </thead>
       <tbody>{apps.map(a=><tr className="border-t border-slate-100 align-middle" key={a.id}>
        <td className="py-4"><p className="font-semibold text-slate-950">{a.profiles?.full_name || 'Sin nombre'}</p><p className="text-xs text-slate-500">{a.profiles?.email || '-'}</p></td>
        <td className="font-semibold text-slate-950">{formatCurrencyBOB(a.amount)}</td>
        <td>{a.monthly_salary ? formatCurrencyBOB(a.monthly_salary) : '-'}</td>
        <td>{a.monthly_salary ? formatCurrencyBOB(getMaxAllowedInstallment(a)) : '-'}</td>
        <td>{a.term_months} meses</td>
        <td className="font-semibold text-slate-950">{formatCurrencyBOB(getEstimatedInstallment(a))}</td>
        <td>{a.bank_name || '-'}</td>
        <td>{a.employers?.name || a.employer_name_text || '-'}</td>
        <td><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(a.status)}`}>{statusLabel(a.status)}</span></td>
        <td className="max-w-40 text-xs text-slate-600">{getAdminActionHint(a.status)}</td>
        <td>{getCapacityWarning(a) ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">Revisar capacidad</span> : <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Dentro de capacidad</span>}</td>
        <td>{formatDateBO(a.created_at)}</td>
        <td className="min-w-44 py-3"><ActionButtons application={a}/></td>
       </tr>)}</tbody>
      </table>
     </div>
    </>}
   </section>
  </main>
 </AppShell>;
}