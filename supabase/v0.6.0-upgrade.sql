-- v0.6.0 - Reportes, exportación y auditoría operativa

-- Índices para reportes
create index if not exists idx_loan_applications_status on public.loan_applications(status);
create index if not exists idx_loan_applications_created_at on public.loan_applications(created_at);
create index if not exists idx_loan_payments_status on public.loan_payments(status);
create index if not exists idx_loan_payments_due_date on public.loan_payments(due_date);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- Políticas RLS para auditoría.
-- Nota: Supabase no soporta create policy if not exists en todas las versiones,
-- por eso eliminamos y recreamos de forma segura.
drop policy if exists "Staff can view audit logs" on public.audit_logs;
drop policy if exists "Staff can insert audit logs" on public.audit_logs;

create policy "Staff can view audit logs"
on public.audit_logs
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
  )
);

create policy "Staff can insert audit logs"
on public.audit_logs
for insert
with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
  )
);

-- Políticas de lectura staff para reportes si no existieran en tu base.
-- Si ya tienes políticas equivalentes, puedes omitir esta sección.
drop policy if exists "Staff can view all loan applications" on public.loan_applications;
drop policy if exists "Staff can view all loan payments" on public.loan_payments;

create policy "Staff can view all loan applications"
on public.loan_applications
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
  )
);

create policy "Staff can view all loan payments"
on public.loan_payments
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin','analyst')
  )
);
