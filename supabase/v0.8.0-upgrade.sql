-- v0.8.0 - Seguridad operativa + expediente del crédito

-- Historial de estados por solicitud
create table if not exists public.loan_status_history (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid references public.loan_applications(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id),
  notes text,
  created_at timestamp with time zone default now()
);

alter table public.loan_status_history enable row level security;

-- Políticas simples para MVP: staff puede ver/crear historial.
drop policy if exists "Staff can view loan status history" on public.loan_status_history;
create policy "Staff can view loan status history"
on public.loan_status_history
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
    and p.status = 'active'
  )
);

drop policy if exists "Staff can create loan status history" on public.loan_status_history;
create policy "Staff can create loan status history"
on public.loan_status_history
for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
    and p.status = 'active'
  )
);

-- Reglas RLS operativas para staff sobre perfiles, solicitudes, documentos, contratos, pagos, settings y auditoría.
-- Si ya existían políticas equivalentes, se reemplazan de forma segura.
drop policy if exists "Staff can view profiles" on public.profiles;
create policy "Staff can view profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active')
);

drop policy if exists "Staff can view loan applications" on public.loan_applications;
create policy "Staff can view loan applications" on public.loan_applications for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can update loan applications" on public.loan_applications;
create policy "Staff can update loan applications" on public.loan_applications for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can view kyc documents" on public.kyc_documents;
create policy "Staff can view kyc documents" on public.kyc_documents for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can update kyc documents" on public.kyc_documents;
create policy "Staff can update kyc documents" on public.kyc_documents for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can view contracts" on public.loan_contracts;
create policy "Staff can view contracts" on public.loan_contracts for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can view payments" on public.loan_payments;
create policy "Staff can view payments" on public.loan_payments for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can update payments" on public.loan_payments;
create policy "Staff can update payments" on public.loan_payments for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can insert payments" on public.loan_payments;
create policy "Staff can insert payments" on public.loan_payments for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Staff can view audit logs" on public.audit_logs;
create policy "Staff can view audit logs" on public.audit_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','analyst') and p.status = 'active')
);

drop policy if exists "Authenticated can create audit logs" on public.audit_logs;
create policy "Authenticated can create audit logs" on public.audit_logs for insert with check (auth.uid() is not null);

-- Índices de soporte
create index if not exists idx_loan_status_history_loan_id on public.loan_status_history(loan_application_id);
create index if not exists idx_audit_logs_entity_id on public.audit_logs(entity_id);
