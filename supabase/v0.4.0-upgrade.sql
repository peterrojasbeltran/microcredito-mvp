-- Microcredito MVP v0.4.0
-- Ejecutar en Supabase SQL Editor si vienes de v0.3.1.

-- 1) Asegura helpers de rol para RLS.
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('admin','analyst'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- 2) Permitir que el cliente cancele solicitudes solo en estados iniciales.
drop policy if exists "Clients can cancel own initial loan applications" on public.loan_applications;
create policy "Clients can cancel own initial loan applications"
on public.loan_applications
for update
to authenticated
using (
  auth.uid() = client_id
  and status in ('DRAFT','SUBMITTED','INFO_REQUESTED')
)
with check (
  auth.uid() = client_id
  and status = 'CANCELLED'
);

-- 3) Contratos: el cliente ve y acepta sus contratos.
drop policy if exists "Clients can view own contracts" on public.loan_contracts;
create policy "Clients can view own contracts"
on public.loan_contracts
for select
to authenticated
using (auth.uid() = client_id);

drop policy if exists "Clients can sign own contracts" on public.loan_contracts;
create policy "Clients can sign own contracts"
on public.loan_contracts
for insert
to authenticated
with check (auth.uid() = client_id);

-- 4) Staff ve contratos para revisión operativa.
drop policy if exists "Staff can view all contracts" on public.loan_contracts;
create policy "Staff can view all contracts"
on public.loan_contracts
for select
to authenticated
using (public.is_staff());

-- 5) Staff mantiene permisos sobre solicitudes y documentos.
drop policy if exists "Staff can view all profiles" on public.profiles;
create policy "Staff can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can view all loan applications" on public.loan_applications;
create policy "Staff can view all loan applications"
on public.loan_applications
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can update loan applications" on public.loan_applications;
create policy "Staff can update loan applications"
on public.loan_applications
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can view all kyc documents" on public.kyc_documents;
create policy "Staff can view all kyc documents"
on public.kyc_documents
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can update kyc documents" on public.kyc_documents;
create policy "Staff can update kyc documents"
on public.kyc_documents
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());
