'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { DEFAULT_FINANCIAL_SETTINGS, FinancialSettings } from '@/lib/loan';
import { getFinancialSettings, saveFinancialSettings } from '@/lib/settings';
import { registerAudit } from '@/lib/audit';
import { StatusMessage } from '@/components/StatusMessage';

export default function AdminSettingsPage(){
 const [settings,setSettings]=useState<FinancialSettings>(DEFAULT_FINANCIAL_SETTINGS);
 const [msg,setMsg]=useState('');
 const [saving,setSaving]=useState(false);

 useEffect(()=>{ getFinancialSettings().then(setSettings); },[]);
 const update=(key:keyof FinancialSettings,value:string)=>setSettings(prev=>({...prev,[key]:Number(value)}));
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();
  const ok=window.confirm('¿Confirmas actualizar la configuración financiera? Esto afectará nuevas solicitudes y nuevos desembolsos.');
  if(!ok) return;
  setSaving(true); setMsg('Guardando configuración...');
  const { error }=await saveFinancialSettings(settings);
  setSaving(false);
  if(error){ setMsg(error.message); return; }
  await registerAudit('UPDATE_FINANCIAL_SETTINGS','settings',null,{ settings });
  setMsg('Configuración financiera actualizada correctamente.');
 };
 return <AppShell area="admin" allowedRoles={['admin']}>
  <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
    <p className="text-sm font-medium text-blue-700">Parámetros del producto</p>
    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Configuración financiera</h1>
    <p className="mt-2 text-slate-600">Define las reglas base para nuevas solicitudes: interés, capacidad de pago, montos y plazo máximo.</p>
    <StatusMessage message={msg} />
    <form onSubmit={save} className="mt-6 grid gap-5 sm:grid-cols-2">
     <label className="block"><span className="text-sm font-semibold text-slate-700">Interés mensual (%)</span><input type="number" step="0.01" min="0" value={settings.interest_rate_monthly} onChange={e=>update('interest_rate_monthly',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required/></label>
     <label className="block"><span className="text-sm font-semibold text-slate-700">Cuota máxima sobre salario (%)</span><input type="number" step="0.01" min="1" max="100" value={settings.max_installment_salary_percentage} onChange={e=>update('max_installment_salary_percentage',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required/></label>
     <label className="block"><span className="text-sm font-semibold text-slate-700">Monto mínimo (Bs)</span><input type="number" min="1" value={settings.min_loan_amount} onChange={e=>update('min_loan_amount',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required/></label>
     <label className="block"><span className="text-sm font-semibold text-slate-700">Monto máximo (Bs)</span><input type="number" min="1" value={settings.max_loan_amount} onChange={e=>update('max_loan_amount',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required/></label>
     <label className="block"><span className="text-sm font-semibold text-slate-700">Plazo máximo (meses)</span><input type="number" min="1" value={settings.max_term_months} onChange={e=>update('max_term_months',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required/></label>
     <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><strong>Nota:</strong> los créditos ya creados conservan su tasa guardada. Estos cambios aplican a nuevas solicitudes y nuevos cronogramas.</div>
     <button disabled={saving} className="sm:col-span-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Guardar configuración'}</button>
    </form>
   </section>
  </main>
 </AppShell>;
}