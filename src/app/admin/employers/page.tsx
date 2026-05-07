'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/components/StatusMessage';
import { registerAudit } from '@/lib/audit';

type Employer = {
  id: string;
  name: string;
  tax_id: string | null;
  hr_contact_name: string | null;
  hr_contact_email: string | null;
  hr_contact_phone: string | null;
  created_at: string;
};

const emptyForm = { name: '', tax_id: '', hr_contact_name: '', hr_contact_email: '', hr_contact_phone: '' };

export default function EmployersPage() {
  const [items, setItems] = useState<Employer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employers').select('*').order('name', { ascending: true });
    if (error) setMsg(error.message);
    else setItems((data || []) as Employer[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMsg('Falta registrar el nombre de la empresa.'); return; }
    if (!form.hr_contact_email.trim()) { setMsg('Falta registrar el email de RRHH. Es obligatorio para preparar avisos.'); return; }
    setMsg('Guardando empresa...');
    const payload = {
      name: form.name.trim(),
      tax_id: form.tax_id.trim() || null,
      hr_contact_name: form.hr_contact_name.trim() || null,
      hr_contact_email: form.hr_contact_email.trim() || null,
      hr_contact_phone: form.hr_contact_phone.trim() || null,
    };
    const res = editingId
      ? await supabase.from('employers').update(payload).eq('id', editingId)
      : await supabase.from('employers').insert(payload);
    if (res.error) { setMsg(res.error.message); return; }
    await registerAudit(editingId ? 'UPDATE_EMPLOYER' : 'CREATE_EMPLOYER', 'employers', editingId, payload);
    setForm(emptyForm); setEditingId(null); setMsg('Empresa guardada correctamente.'); load();
  };

  const edit = (employer: Employer) => {
    setEditingId(employer.id);
    setForm({
      name: employer.name || '',
      tax_id: employer.tax_id || '',
      hr_contact_name: employer.hr_contact_name || '',
      hr_contact_email: employer.hr_contact_email || '',
      hr_contact_phone: employer.hr_contact_phone || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clear = () => { setEditingId(null); setForm(emptyForm); setMsg(''); };

  return <AppShell area="admin" allowedRoles={['admin']}>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <p className="text-sm font-medium text-blue-700">Operación con empresas</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Empresas y contactos RRHH</h1>
        <p className="mt-2 text-slate-600">Administra los empleadores y sus contactos para generar avisos de descuento por planilla. El email de RRHH es obligatorio para usar el flujo de aviso.</p>
        <StatusMessage message={msg} />
        <form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-slate-700">Empresa *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">NIT / Identificador</span><input value={form.tax_id} onChange={e=>setForm({...form,tax_id:e.target.value})} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Contacto RRHH</span><input value={form.hr_contact_name} onChange={e=>setForm({...form,hr_contact_name:e.target.value})} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Email RRHH *</span><input required type="email" value={form.hr_contact_email} onChange={e=>setForm({...form,hr_contact_email:e.target.value})} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-slate-700">Teléfono RRHH</span><input value={form.hr_contact_phone} onChange={e=>setForm({...form,hr_contact_phone:e.target.value})} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
          <div className="flex items-end gap-3"><button className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">{editingId ? 'Actualizar empresa' : 'Crear empresa'}</button>{editingId && <button type="button" onClick={clear} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancelar edición</button>}</div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Empresas registradas</h2>
        {loading ? <p className="mt-4 text-slate-600">Cargando empresas...</p> : items.length === 0 ? <p className="mt-4 text-slate-600">Aún no hay empresas registradas.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map(emp => <article key={emp.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{emp.name}</h3><p className="text-sm text-slate-500">NIT: {emp.tax_id || '-'}</p></div><button onClick={()=>edit(emp)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Editar</button></div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600"><p><strong>RRHH:</strong> {emp.hr_contact_name || '-'}</p><p><strong>Email:</strong> {emp.hr_contact_email || '-'}</p><p><strong>Teléfono:</strong> {emp.hr_contact_phone || '-'}</p></div>
          </article>)}
        </div>}
      </section>
    </main>
  </AppShell>;
}
