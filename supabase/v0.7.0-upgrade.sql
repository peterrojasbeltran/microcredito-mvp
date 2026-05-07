-- v0.7.0 - Motor financiero básico con interés simple mensual

-- Configuración financiera centralizada
insert into public.settings (key, value)
values (
  'financial_settings',
  '{"interest_rate_monthly": 3, "max_installment_salary_percentage": 30, "min_loan_amount": 100, "max_loan_amount": 5000, "max_term_months": 12}'::jsonb
)
on conflict (key) do nothing;

-- Campos financieros del crédito
alter table public.loan_applications
add column if not exists interest_rate numeric(5,2),
add column if not exists total_interest numeric(12,2),
add column if not exists total_amount numeric(12,2),
add column if not exists installment_amount numeric(12,2);

-- Campos financieros por cuota
alter table public.loan_payments
add column if not exists capital_amount numeric(12,2),
add column if not exists interest_amount numeric(12,2);

-- Backfill básico para solicitudes anteriores sin interés configurado
update public.loan_applications
set
  interest_rate = coalesce(interest_rate, 0),
  total_interest = coalesce(total_interest, 0),
  total_amount = coalesce(total_amount, amount),
  installment_amount = coalesce(installment_amount, monthly_installment, case when term_months > 0 then round(amount / term_months, 2) else amount end)
where interest_rate is null or total_interest is null or total_amount is null or installment_amount is null;

-- Backfill básico para cuotas anteriores
update public.loan_payments
set
  capital_amount = coalesce(capital_amount, amount),
  interest_amount = coalesce(interest_amount, 0)
where capital_amount is null or interest_amount is null;

-- Políticas RLS para settings: clientes y staff pueden leer, solo admin modifica.
do $$ begin
  create policy "Authenticated users can read settings"
  on public.settings for select
  using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can manage settings"
  on public.settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
exception when duplicate_object then null; end $$;

create index if not exists idx_loan_applications_interest_rate on public.loan_applications (interest_rate);
create index if not exists idx_loan_payments_capital_interest on public.loan_payments (capital_amount, interest_amount);
