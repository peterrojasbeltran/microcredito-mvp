'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrencyBOB, formatDateBO, paymentStatusClass, paymentStatusLabel, statusClass, statusLabel } from '@/lib/formatters';
import { kycDocLabel } from '@/lib/kyc';
import { StatusMessage } from '@/components/StatusMessage';
import { buildHrEmailBody, buildHrEmailSubject, buildHrNoticeHtml } from '@/lib/hrNotice';
import { registerNotification } from '@/lib/notifications';
import { registerAudit } from '@/lib/audit';

type Loan = { id:string; employer_id:string|null; employer_name_text:string|null; amount:number; term_months:number; monthly_salary:number|null; monthly_installment:number|null; installment_amount:number|null; total_amount:number|null; total_interest:number|null; interest_rate:number|null; bank_name:string|null; bank_account_number:string|null; status:string; created_at:string; submitted_at:string|null; approved_at:string|null; disbursed_at:string|null; profiles?:{full_name:string|null,email:string|null,phone:string|null}|null; employers?:{id:string|null;name:string|null;hr_contact_name:string|null;hr_contact_email:string|null;hr_contact_phone:string|null}|null };
type Doc = { id:string; document_type:string; file_path:string; status:string; review_notes:string|null; created_at:string };
type Contract = { id:string; accepted_terms:boolean; accepted_payroll_deduction:boolean; signed_full_name:string|null; signed_at:string|null; created_at:string };
type Payment = { id:string; installment_number:number|null; due_date:string; amount:number; capital_amount:number|null; interest_amount:number|null; paid_amount:number|null; status:string; paid_at:string|null };
type Log = { id:string; action:string; entity_name:string; metadata:any; created_at:string; profiles?:{full_name:string|null,email:string|null}|null };
type History = { id:string; previous_status:string|null; new_status:string; notes:string|null; created_at:string; profiles?:{full_name:string|null,email:string|null}|null };
type EmployerOption = { id:string; name:string; hr_contact_email:string|null; hr_contact_name:string|null; hr_contact_phone:string|null };

export default function ApplicationDetailPage(){
 const params=useParams<{id:string}>();
 const id=params.id;
 const [loan,setLoan]=useState<Loan|null>(null);
 const [docs,setDocs]=useState<Doc[]>([]);
 const [contracts,setContracts]=useState<Contract[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [logs,setLogs]=useState<Log[]>([]);
 const [history,setHistory]=useState<History[]>([]);
 const [employers,setEmployers]=useState<EmployerOption[]>([]);
 const [selectedEmployerId,setSelectedEmployerId]=useState('');
 const [newEmployerName,setNewEmployerName]=useState('');
 const [newEmployerEmail,setNewEmployerEmail]=useState('');
 const [newEmployerContact,setNewEmployerContact]=useState('');
 const [newEmployerPhone,setNewEmployerPhone]=useState('');
 const [msg,setMsg]=useState('');
 const [loading,setLoading]=useState(true);

 const load=async()=>{
  setLoading(true);
  const loanRes=await supabase.from('loan_applications').select('id,employer_id,employer_name_text,amount,term_months,monthly_salary,monthly_installment,installment_amount,total_amount,total_interest,interest_rate,bank_name,bank_account_number,status,created_at,submitted_at,approved_at,disbursed_at,profiles(full_name,email,phone),employers(id,name,hr_contact_name,hr_contact_email,hr_contact_phone)').eq('id',id).single();
  if(loanRes.error){ setMsg(loanRes.error.message); setLoading(false); return; }
  const loanData = loanRes.data as unknown as Loan;
  setLoan(loanData);
  if (loanData.employer_id) setSelectedEmployerId(loanData.employer_id);
  else setSelectedEmployerId('');
  if (loanData.employer_name_text) setNewEmployerName(loanData.employer_name_text);
  const [docsRes, contractsRes, paymentsRes, logsRes, historyRes, employersRes]=await Promise.all([
   supabase.from('kyc_documents').select('id,document_type,file_path,status,review_notes,created_at').eq('loan_application_id',id).order('created_at',{ascending:true}),
   supabase.from('loan_contracts').select('id,accepted_terms,accepted_payroll_deduction,signed_full_name,signed_at,created_at').eq('loan_application_id',id).order('created_at',{ascending:false}),
   supabase.from('loan_payments').select('id,installment_number,due_date,amount,capital_amount,interest_amount,paid_amount,status,paid_at').eq('loan_application_id',id).order('installment_number',{ascending:true}),
   supabase.from('audit_logs').select('id,action,entity_name,metadata,created_at,profiles(full_name,email)').eq('entity_id',id).order('created_at',{ascending:false}),
   supabase.from('loan_status_history').select('id,previous_status,new_status,notes,created_at,profiles(full_name,email)').eq('loan_application_id',id).order('created_at',{ascending:true}),
   supabase.from('employers').select('id,name,hr_contact_email,hr_contact_name,hr_contact_phone').order('name',{ascending:true}),
  ]);
  if(docsRes.data) setDocs(docsRes.data as Doc[]);
  if(contractsRes.data) setContracts(contractsRes.data as Contract[]);
  if(paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
  if(logsRes.data) setLogs(logsRes.data as unknown as Log[]);
  if(historyRes.data) setHistory(historyRes.data as unknown as History[]);
  if(employersRes.data) setEmployers(employersRes.data as EmployerOption[]);
  setLoading(false);
 };
 useEffect(()=>{ if(id) load(); },[id]);

 const openFile=async(filePath:string)=>{
  const [bucket,...rest]=filePath.split('/');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(rest.join('/'), 60);
  if(error || !data?.signedUrl) { setMsg(error?.message || 'No se pudo abrir el archivo.'); return; }
  window.open(data.signedUrl,'_blank');
 };

 const exportJson=()=>{
  const expediente={ loan, docs, contracts, payments, history, logs };
  const blob=new Blob([JSON.stringify(expediente,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`expediente-${loan?.id}.json`; a.click(); URL.revokeObjectURL(url);
 };

 const generateHrNotice=async()=>{
  if(!loan) return;
  if(!contractSigned){ setMsg('No puedes generar el aviso RRHH hasta que el contrato esté firmado.'); return; }
  const html=buildHrNoticeHtml(loan);
  const win=window.open('', '_blank');
  if(!win){ setMsg('No se pudo abrir el aviso. Revisa si el navegador bloqueó la ventana emergente.'); return; }
  win.document.write(html);
  win.document.close();
  const { error }=await supabase.from('hr_notices').insert({
   loan_application_id: loan.id,
   employer_id: loan.employer_id || null,
   recipient_email: loan.employers?.hr_contact_email || null,
   status: 'GENERATED',
   html_content: html,
   generated_at: new Date().toISOString(),
  });
  await registerNotification({
   userId: null,
   loanApplicationId: loan.id,
   channel: 'manual',
   eventType: 'HR_NOTICE_PREPARED',
   recipient: loan.employers?.hr_contact_email || null,
   subject: buildHrEmailSubject(loan),
   body: 'Aviso RRHH generado para impresión, PDF o envío manual.',
  });
  await registerAudit('GENERATE_HR_NOTICE','loan_applications',loan.id,{ recipient: loan.employers?.hr_contact_email || null, error: error?.message });
  setMsg(error ? error.message : 'Aviso RRHH generado correctamente. Puedes imprimirlo o guardarlo como PDF.');
 };

 const prepareHrEmail=async()=>{
  if(!loan) return;
  if(!loan.employer_id){ setMsg('Antes de preparar el email, asocia una empresa a esta solicitud.'); return; }
  if(!loan.employers?.hr_contact_email){ setMsg('Completa el correo de RRHH de la empresa para preparar el email.'); return; }
  const subject=buildHrEmailSubject(loan);
  const body=buildHrEmailBody(loan);
  await registerNotification({ loanApplicationId: loan.id, channel: 'manual', eventType: 'HR_NOTICE_PREPARED', recipient: loan.employers.hr_contact_email, subject, body });
  window.location.href=`mailto:${loan.employers.hr_contact_email}?subject=${encodeURIComponent(subject)}&body=${body}`;
  setMsg('Email RRHH preparado. Confirma el envío desde tu cliente de correo.');
 };

 const prepareClientEmail=async(eventType:'LOAN_APPROVED'|'SIGNATURE_PENDING'|'LOAN_DISBURSED')=>{
  if(!loan) return;
  const email=loan.profiles?.email;
  if(!email){ setMsg('El cliente no tiene email registrado.'); return; }
  const subject= eventType==='SIGNATURE_PENDING' ? 'Tu crédito fue aprobado: firma tu contrato' : eventType==='LOAN_DISBURSED' ? 'Tu crédito fue desembolsado' : 'Tu solicitud de crédito fue aprobada';
  const body=`Hola ${loan.profiles?.full_name || ''},%0D%0A%0D%0A${eventType==='SIGNATURE_PENDING'?'Tu solicitud fue aprobada. Ya puedes ingresar a la plataforma y firmar tu contrato.':eventType==='LOAN_DISBURSED'?'Tu crédito fue desembolsado. Puedes revisar tus cuotas desde la plataforma.':'Tu solicitud de crédito fue aprobada.'}%0D%0A%0D%0AID solicitud: ${loan.id}%0D%0A%0D%0AGracias.`;
  await registerNotification({ loanApplicationId: loan.id, channel: 'manual', eventType, recipient: email, subject, body });
  window.location.href=`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
  setMsg('Email del cliente preparado. Confirma el envío desde tu cliente de correo.');
 };

 const associateExistingEmployer=async()=>{
  if(!loan) return;
  if(!selectedEmployerId){ setMsg('Selecciona una empresa para asociarla a la solicitud.'); return; }
  const { error } = await supabase.from('loan_applications').update({ employer_id: selectedEmployerId, employer_name_text: null }).eq('id', loan.id);
  if(error){ setMsg(error.message); return; }
  await registerAudit('ASSOCIATE_EMPLOYER','loan_applications',loan.id,{ employerId: selectedEmployerId, previousEmployerText: loan.employer_name_text || null });
  setMsg('Empresa asociada correctamente. Ya puedes preparar el aviso o email RRHH si el correo está registrado.');
  load();
 };

 const createAndAssociateEmployer=async()=>{
  if(!loan) return;
  const name = newEmployerName.trim();
  const email = newEmployerEmail.trim();
  if(!name){ setMsg('Ingresa el nombre de la empresa para crearla.'); return; }
  if(!email){ setMsg('Ingresa el correo de RRHH para poder usar el flujo de aviso.'); return; }
  const { data, error } = await supabase.from('employers').insert({
   name,
   hr_contact_email: email,
   hr_contact_name: newEmployerContact.trim() || null,
   hr_contact_phone: newEmployerPhone.trim() || null,
  }).select('id').single();
  if(error){ setMsg(error.message); return; }
  const employerId = data?.id;
  const update = await supabase.from('loan_applications').update({ employer_id: employerId, employer_name_text: null }).eq('id', loan.id);
  if(update.error){ setMsg(update.error.message); return; }
  await registerAudit('CREATE_AND_ASSOCIATE_EMPLOYER','loan_applications',loan.id,{ employerId, employerName: name, hrEmail: email });
  setNewEmployerEmail(''); setNewEmployerContact(''); setNewEmployerPhone('');
  setMsg('Empresa creada y asociada correctamente.');
  load();
 };


 const allPaid=payments.length>0 && payments.every(p=>p.status==='PAID');
 const contractSigned=contracts.some(c=>c.accepted_terms&&c.accepted_payroll_deduction&&c.signed_at);
 const approvedDocs=docs.filter(d=>d.status==='APPROVED').length;
 const employerDisplayName = loan?.employers?.name || loan?.employer_name_text || 'Sin empresa registrada';
 const hasEmployerEmail = Boolean(loan?.employers?.hr_contact_email);

 return <AppShell area="admin" allowedRoles={['admin','analyst']}>
  <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
   <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
     <div><p className="text-sm font-medium text-blue-700">Expediente operativo</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Detalle del crédito</h1><p className="mt-2 text-slate-600">Vista completa para revisión, auditoría y operación.</p></div>
     <div className="flex flex-wrap gap-2"><Link href="/admin/applications" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Volver</Link><button onClick={exportJson} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Exportar expediente JSON</button></div>
    </div>
    <StatusMessage message={msg} />
   </section>

   {loading ? <p className="mt-6 rounded-3xl bg-white p-6 text-slate-600 ring-1 ring-slate-200">Cargando expediente...</p> : loan && <>
    <section className="mt-6 grid gap-4 md:grid-cols-4">
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Estado</p><span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm ${statusClass(loan.status)}`}>{statusLabel(loan.status)}</span></div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Monto</p><p className="mt-2 text-xl font-bold text-slate-950">{formatCurrencyBOB(loan.amount)}</p></div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Cuota</p><p className="mt-2 text-xl font-bold text-slate-950">{formatCurrencyBOB(loan.installment_amount || loan.monthly_installment || 0)}</p></div>
     <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">Total</p><p className="mt-2 text-xl font-bold text-slate-950">{formatCurrencyBOB(loan.total_amount || loan.amount)}</p></div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-3">
     <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Cliente y datos del crédito</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Cliente</dt><dd className="font-semibold">{loan.profiles?.full_name||'Sin nombre'}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{loan.profiles?.email||'-'}</dd></div><div><dt className="text-slate-500">Teléfono</dt><dd>{loan.profiles?.phone||'-'}</dd></div><div><dt className="text-slate-500">Salario</dt><dd>{loan.monthly_salary?formatCurrencyBOB(loan.monthly_salary):'-'}</dd></div><div><dt className="text-slate-500">Banco</dt><dd>{loan.bank_name||'-'}</dd></div><div><dt className="text-slate-500">Cuenta</dt><dd>{loan.bank_account_number||'-'}</dd></div><div><dt className="text-slate-500">Interés</dt><dd>{loan.interest_rate ?? 0}% mensual</dd></div><div><dt className="text-slate-500">Plazo</dt><dd>{loan.term_months} meses</dd></div></dl></article>
     <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Empresa y RRHH</h2><div className="mt-4 space-y-3 text-sm"><p className={`rounded-2xl p-3 ${loan.employer_id?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}><strong>Empresa:</strong> {employerDisplayName}</p><p className={`rounded-2xl p-3 ${hasEmployerEmail?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}><strong>Email RRHH:</strong> {loan.employers?.hr_contact_email || 'Pendiente de registrar'}</p>{!loan.employer_id && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Esta solicitud aún no tiene empresa asociada.</p><p className="mt-1 text-amber-800">Puedes asociar una empresa existente o crearla con el correo de RRHH.</p><select value={selectedEmployerId} onChange={e=>setSelectedEmployerId(e.target.value)} className="mt-3 w-full rounded-2xl border border-amber-200 bg-white p-3"><option value="">Seleccionar empresa existente</option>{employers.map(emp=><option key={emp.id} value={emp.id}>{emp.name}{emp.hr_contact_email ? ` · ${emp.hr_contact_email}` : ' · sin email RRHH'}</option>)}</select><button onClick={associateExistingEmployer} className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Asociar empresa existente</button><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={newEmployerName} onChange={e=>setNewEmployerName(e.target.value)} placeholder="Nombre de empresa" className="rounded-2xl border border-amber-200 bg-white p-3"/><input value={newEmployerEmail} onChange={e=>setNewEmployerEmail(e.target.value)} placeholder="Email RRHH" type="email" className="rounded-2xl border border-amber-200 bg-white p-3"/><input value={newEmployerContact} onChange={e=>setNewEmployerContact(e.target.value)} placeholder="Contacto RRHH" className="rounded-2xl border border-amber-200 bg-white p-3"/><input value={newEmployerPhone} onChange={e=>setNewEmployerPhone(e.target.value)} placeholder="Teléfono RRHH" className="rounded-2xl border border-amber-200 bg-white p-3"/></div><button onClick={createAndAssociateEmployer} className="mt-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Crear y asociar empresa</button></div>}<Link href="/admin/employers" className="inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Administrar empresas</Link></div></article>
     <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Controles operativos</h2><div className="mt-4 space-y-3 text-sm"><p className={`rounded-2xl p-3 ${approvedDocs>=4?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>Documentos KYC aprobados: {approvedDocs}/4</p><p className={`rounded-2xl p-3 ${contractSigned?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>Contrato firmado: {contractSigned?'Sí':'No'}</p><p className={`rounded-2xl p-3 ${allPaid?'bg-emerald-50 text-emerald-700':'bg-slate-50 text-slate-700'}`}>Cuotas pagadas: {payments.filter(p=>p.status==='PAID').length}/{payments.length}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button disabled={!loan.employer_id || !contractSigned} onClick={generateHrNotice} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Generar aviso RRHH</button>
        <button disabled={!loan.employer_id || !hasEmployerEmail} onClick={prepareHrEmail} className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Preparar email RRHH</button>
        <button onClick={()=>prepareClientEmail('SIGNATURE_PENDING')} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-2">Avisar al cliente</button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Modo free: se registra la notificación y se abre tu cliente de correo para envío manual.</p>
     </div></article>
    </section>

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Timeline de estados</h2>{history.length===0?<p className="mt-4 text-slate-600">Aún no hay historial de estados.</p>:<ol className="mt-4 space-y-3">{history.map(h=><li key={h.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold text-slate-950">{h.previous_status?statusLabel(h.previous_status):'Inicio'} → {statusLabel(h.new_status)}</p><p className="text-sm text-slate-500">{formatDateBO(h.created_at)} · {h.profiles?.full_name||h.profiles?.email||'Sistema'}</p>{h.notes&&<p className="mt-1 text-sm text-slate-600">{h.notes}</p>}</li>)}</ol>}</section>

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Documentos KYC</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{docs.map(d=><div key={d.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{kycDocLabel(d.document_type)}</p><span className={`rounded-full border px-3 py-1 text-xs ${statusClass(d.status)}`}>{statusLabel(d.status)}</span></div>{d.review_notes&&<p className="mt-2 text-sm text-slate-600">{d.review_notes}</p>}<button onClick={()=>openFile(d.file_path)} className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Ver archivo</button></div>)}</div></section>

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Contrato</h2>{contracts.length===0?<p className="mt-4 text-slate-600">No hay contrato firmado.</p>:contracts.map(c=><div key={c.id} className="mt-4 rounded-2xl border border-slate-200 p-4"><p className="font-semibold">Firmado por: {c.signed_full_name||'-'}</p><p className="text-sm text-slate-500">Fecha: {formatDateBO(c.signed_at||c.created_at)}</p><p className="text-sm text-slate-600">Términos: {c.accepted_terms?'Aceptados':'Pendientes'} · Descuento por planilla: {c.accepted_payroll_deduction?'Aceptado':'Pendiente'}</p></div>)}</section>

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Cronograma de pagos</h2>{payments.length===0?<p className="mt-4 text-slate-600">Sin cuotas generadas.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500"><th className="py-3">Cuota</th><th>Vence</th><th>Capital</th><th>Interés</th><th>Total</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>{payments.map(p=><tr key={p.id} className="border-t border-slate-100"><td className="py-4 font-semibold">#{p.installment_number}</td><td>{formatDateBO(p.due_date)}</td><td>{formatCurrencyBOB(p.capital_amount||0)}</td><td>{formatCurrencyBOB(p.interest_amount||0)}</td><td>{formatCurrencyBOB(p.amount)}</td><td>{formatCurrencyBOB(p.paid_amount||0)}</td><td><span className={`rounded-full border px-3 py-1 text-xs ${paymentStatusClass(p.status)}`}>{paymentStatusLabel(p.status)}</span></td></tr>)}</tbody></table></div>}</section>

    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-semibold text-slate-950">Auditoría del expediente</h2>{logs.length===0?<p className="mt-4 text-slate-600">Sin logs directos para esta solicitud.</p>:<div className="mt-4 space-y-3">{logs.map(l=><details key={l.id} className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold text-slate-950">{l.action} · {formatDateBO(l.created_at)}</summary><p className="mt-2 text-sm text-slate-500">Actor: {l.profiles?.full_name||l.profiles?.email||'Sistema'}</p><pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-50">{JSON.stringify(l.metadata||{},null,2)}</pre></details>)}</div>}</section>
   </>}
  </main>
 </AppShell>;
}