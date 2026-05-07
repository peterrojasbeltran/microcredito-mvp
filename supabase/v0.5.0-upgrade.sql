-- Microcredito MVP v0.5.0
-- Ejecutar en Supabase SQL Editor si vienes de v0.4.0.

-- 1) Campos para desembolso en solicitudes.
alter table public.loan_applications
add column if not exists disbursed_amount numeric(12,2),
add column if not exists disbursement_notes text;

-- 2) Campos para cronograma de pagos.
alter table public.loan_payments
add column if not exists installment_number int,
add column if not exists is_late boolean default false;

create index if not exists idx_loan_payments_loan_application_id
on public.loan_payments (loan_application_id);

create index if not exists idx_loan_payments_status
on public.loan_payments (status);

-- 3) RLS para pagos: cliente ve sus cuotas.
drop policy if exists "Clients can view own loan payments" on public.loan_payments;
create policy "Clients can view own loan payments"
on public.loan_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.loan_applications la
    where la.id = loan_payments.loan_application_id
    and la.client_id = auth.uid()
  )
);

-- 4) RLS para staff: ve, crea y actualiza cuotas.
drop policy if exists "Staff can view all loan payments" on public.loan_payments;
create policy "Staff can view all loan payments"
on public.loan_payments
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can create loan payments" on public.loan_payments;
create policy "Staff can create loan payments"
on public.loan_payments
for insert
to authenticated
with check (public.is_staff());

drop policy if exists "Staff can update loan payments" on public.loan_payments;
create policy "Staff can update loan payments"
on public.loan_payments
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- 5) Staff puede actualizar estado/desembolso de solicitudes.
drop policy if exists "Staff can update loan applications" on public.loan_applications;
create policy "Staff can update loan applications"
on public.loan_applications
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- 6) Recomendación operativa:
-- El desembolso solo debe ejecutarse desde UI cuando status = APPROVED.
-- Las cuotas se generan con estado PENDING y se actualizan manualmente a PAID o LATE.
