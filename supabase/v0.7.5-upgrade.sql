-- v0.7.5 - Regresión QA Senior: cierre de crédito, mora y auditoría
-- No agrega columnas obligatorias. Refuerza índices y políticas para operación de pagos/cierre.

create index if not exists idx_loan_payments_late_flags
on public.loan_payments (loan_application_id, status, is_late, due_date);

-- Asegura que staff pueda actualizar solicitudes y pagos.
drop policy if exists "Staff can update loan applications" on public.loan_applications;
create policy "Staff can update loan applications"
on public.loan_applications
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can update loan payments" on public.loan_payments;
create policy "Staff can update loan payments"
on public.loan_payments
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());
