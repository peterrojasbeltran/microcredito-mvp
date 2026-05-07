'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { BOLIVIAN_BANKS, formatCurrencyBOB } from '@/lib/formatters';
import { calculateLoanSimulation, DEFAULT_FINANCIAL_SETTINGS, FinancialSettings, isInstallmentWithinCapacity } from '@/lib/loan';
import { getFinancialSettings } from '@/lib/settings';
import { StatusMessage } from '@/components/StatusMessage';

type EmployerOption = { id: string; name: string };

export default function LoanRequestPage(){
 const [userId,setUserId]=useState<string>('');
 const [amount,setAmount]=useState('');
 const [term,setTerm]=useState('3');
 const [salary,setSalary]=useState('');
 const [bank,setBank]=useState('Banco Ganadero');
 const [otherBank,setOtherBank]=useState('');
 const [account,setAccount]=useState('');
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);
 const [settings,setSettings]=useState<FinancialSettings>(DEFAULT_FINANCIAL_SETTINGS);
 const [employers,setEmployers]=useState<EmployerOption[]>([]);
 const [employerMode,setEmployerMode]=useState<'existing'|'manual'>('existing');
 const [selectedEmployerId,setSelectedEmployerId]=useState('');
 const [employerNameText,setEmployerNameText]=useState('');

 useEffect(()=>{ 
  supabase.auth.getUser().then(({data})=>{ if(!data.user) location.href='/login'; else setUserId(data.user.id); });
  getFinancialSettings().then(setSettings);
  supabase.from('employers').select('id,name').order('name',{ascending:true}).then(({data,error})=>{
   if(!error) setEmployers((data||[]) as EmployerOption[]);
  });
 },[]);

 const simulation = useMemo(()=>calculateLoanSimulation(Number(amount || 0), Number(term || 1), settings.interest_rate_monthly), [amount, term, settings.interest_rate_monthly]);
 const withinCapacity = useMemo(()=>isInstallmentWithinCapacity(simulation.installmentAmount, Number(salary || 0), settings.max_installment_salary_percentage), [simulation.installmentAmount, salary, settings.max_installment_salary_percentage]);
 const amountOutOfRange = Number(amount || 0) > 0 && (Number(amount) < settings.min_loan_amount || Number(amount) > settings.max_loan_amount);
 const termOutOfRange = Number(term || 0) > settings.max_term_months;
 const hasEmployer = employerMode === 'existing' ? Boolean(selectedEmployerId) : employerNameText.trim().length > 2;
 const canSubmit = !saving && Number(amount) > 0 && Number(salary) > 0 && hasEmployer && !amountOutOfRange && !termOutOfRange && withinCapacity;

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!hasEmployer){ setMessage('Indica la empresa donde trabajas para continuar.'); return; }
  if(!canSubmit){ setMessage('Revisa la simulación: el monto, plazo, empresa o capacidad de pago no cumple las reglas configuradas.'); return; }
  setSaving(true);
  setMessage('Guardando solicitud...');
  const selectedBank = bank === 'Otro' ? otherBank : bank;
  const payload = {
   client_id:userId,
   employer_id: employerMode === 'existing' ? selectedEmployerId : null,
   employer_name_text: employerMode === 'manual' ? employerNameText.trim() : null,
   amount:Number(amount),
   term_months:Number(term),
   monthly_salary:Number(salary),
   monthly_installment: simulation.installmentAmount,
   bank_name:selectedBank,
   bank_account_number:account,
   interest_rate: settings.interest_rate_monthly,
   total_interest: simulation.totalInterest,
   total_amount: simulation.totalAmount,
   installment_amount: simulation.installmentAmount,
   status:'SUBMITTED',
   submitted_at:new Date().toISOString()
  };
  const { error }=await supabase.from('loan_applications').insert(payload);
  setSaving(false);
  if(error) return setMessage(error.message);
  setMessage('Solicitud enviada correctamente. Puedes revisar el estado en tu dashboard.');
  setAmount(''); setSalary(''); setAccount(''); setOtherBank(''); setBank('Banco Ganadero'); setTerm('3'); setSelectedEmployerId(''); setEmployerNameText(''); setEmployerMode('existing');
 };

 return <AppShell area="client" allowedRoles={['client']}>
  <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_0.75fr]">
   <form onSubmit={submit} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-medium text-blue-700">Nueva solicitud</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Solicitar crédito</h1>
    <p className="mt-2 text-slate-600">Simula tu cuota antes de enviar. La revisión final será realizada por un analista.</p>

    <div className="mt-6 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100">
     <label className="block text-sm font-semibold text-slate-800">Empresa donde trabajas *</label>
     <p className="mt-1 text-sm text-slate-600">Este dato permite preparar el aviso de descuento por planilla para RRHH si tu crédito es aprobado.</p>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={()=>setEmployerMode('existing')} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${employerMode==='existing'?'border-blue-500 bg-white text-blue-700':'border-slate-200 bg-white text-slate-600'}`}>Seleccionar empresa</button>
      <button type="button" onClick={()=>setEmployerMode('manual')} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${employerMode==='manual'?'border-blue-500 bg-white text-blue-700':'border-slate-200 bg-white text-slate-600'}`}>No encuentro mi empresa</button>
     </div>
     {employerMode === 'existing' ? <select className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 focus:ring-2 focus:ring-blue-100" value={selectedEmployerId} onChange={e=>setSelectedEmployerId(e.target.value)} required>
      <option value="">Selecciona tu empresa</option>
      {employers.map(emp=><option key={emp.id} value={emp.id}>{emp.name}</option>)}
     </select> : <input className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 focus:ring-2 focus:ring-blue-100" placeholder="Escribe el nombre de tu empresa" value={employerNameText} onChange={e=>setEmployerNameText(e.target.value)} required />}
     {!hasEmployer && <p className="mt-2 text-sm font-medium text-amber-700">Debes indicar tu empresa para enviar la solicitud.</p>}
    </div>

    <label className="mt-6 block text-sm font-medium text-slate-700">Monto solicitado</label>
    <div className="mt-2 flex rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100">
     <span className="grid place-items-center border-r border-slate-200 px-4 text-slate-500">Bs</span>
     <input className="w-full rounded-2xl p-3" placeholder="1500" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required/>
    </div>
    {amountOutOfRange&&<p className="mt-2 text-sm text-red-600">El monto permitido está entre {formatCurrencyBOB(settings.min_loan_amount)} y {formatCurrencyBOB(settings.max_loan_amount)}.</p>}

    <label className="mt-4 block text-sm font-medium text-slate-700">Plazo</label>
    <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 focus:ring-2 focus:ring-blue-100" value={term} onChange={e=>setTerm(e.target.value)}>
     <option value="1">1 mes</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
    </select>
    {termOutOfRange&&<p className="mt-2 text-sm text-red-600">El plazo máximo configurado es de {settings.max_term_months} meses.</p>}

    <label className="mt-4 block text-sm font-medium text-slate-700">Salario mensual</label>
    <div className="mt-2 flex rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100">
     <span className="grid place-items-center border-r border-slate-200 px-4 text-slate-500">Bs</span>
     <input className="w-full rounded-2xl p-3" placeholder="5000" type="number" min="1" value={salary} onChange={e=>setSalary(e.target.value)} required/>
    </div>
    {Number(salary)>0 && !withinCapacity&&<p className="mt-2 text-sm text-red-600">La cuota estimada supera el {settings.max_installment_salary_percentage}% de tu salario.</p>}

    <label className="mt-4 block text-sm font-medium text-slate-700">Banco para desembolso</label>
    <select className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 focus:ring-2 focus:ring-blue-100" value={bank} onChange={e=>setBank(e.target.value)}>
     {BOLIVIAN_BANKS.map(bankName => <option key={bankName} value={bankName}>{bankName}</option>)}
    </select>

    {bank === 'Otro' && <input className="mt-3 w-full rounded-2xl border border-slate-200 p-3 focus:ring-2 focus:ring-blue-100" placeholder="Nombre del banco" value={otherBank} onChange={e=>setOtherBank(e.target.value)} required/>}

    <label className="mt-4 block text-sm font-medium text-slate-700">Número de cuenta</label>
    <input className="mt-2 w-full rounded-2xl border border-slate-200 p-3 focus:ring-2 focus:ring-blue-100" placeholder="Ingresa tu número de cuenta" value={account} onChange={e=>setAccount(e.target.value)} required/>

    <label className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
     <input className="mt-1" type="checkbox" required/>
     <span>Acepto la autorización de descuento por planilla y la revisión manual de mis documentos para continuar con la evaluación.</span>
    </label>

    <button disabled={!canSubmit} className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Enviando...' : 'Enviar solicitud'}</button>
    <StatusMessage message={message} />
   </form>

   <aside className="h-fit rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
    <p className="text-sm text-slate-300">Simulación financiera</p>
    <h2 className="mt-2 text-2xl font-bold">Tu crédito estimado</h2>
    <div className="mt-6 space-y-4 text-sm">
     <div className="flex justify-between gap-4"><span className="text-slate-300">Empresa</span><strong className="text-right">{employerMode==='existing' ? (employers.find(e=>e.id===selectedEmployerId)?.name || 'Pendiente') : (employerNameText || 'Pendiente')}</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Monto solicitado</span><strong>{formatCurrencyBOB(simulation.principal)}</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Interés mensual</span><strong>{settings.interest_rate_monthly}%</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Plazo</span><strong>{term} meses</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Interés total</span><strong>{formatCurrencyBOB(simulation.totalInterest)}</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Total a pagar</span><strong>{formatCurrencyBOB(simulation.totalAmount)}</strong></div>
     <div className="flex justify-between gap-4 border-t border-white/10 pt-4"><span className="text-slate-300">Cuota mensual</span><strong>{formatCurrencyBOB(simulation.installmentAmount)}</strong></div>
     <div className="flex justify-between gap-4"><span className="text-slate-300">Banco</span><strong className="text-right">{bank === 'Otro' ? otherBank || 'Otro' : bank}</strong></div>
    </div>
    <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-slate-300">La cuota máxima permitida es el {settings.max_installment_salary_percentage}% del salario declarado. La aprobación final depende de la revisión del analista.</p>
   </aside>
  </main>
 </AppShell>;
}
