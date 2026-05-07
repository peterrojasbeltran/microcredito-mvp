-- v0.8.2 - Fix crítico RLS profiles/login
-- Causa: políticas RLS sobre public.profiles consultaban public.profiles dentro de la misma política,
-- generando recursión/inconsistencia al cargar perfil después del login.

-- 1) Función segura para validar staff sin romper RLS
create or replace function public.is_staff_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role in ('admin','analyst')
      and p.status = 'active'
  );
$$;

grant execute on function public.is_staff_user(uuid) to authenticated;

create or replace function public.is_admin_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;

-- 2) Limpiar políticas problemáticas en profiles
DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3) Políticas robustas para profiles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Staff can view profiles"
ON public.profiles
FOR SELECT
USING (public.is_staff_user(auth.uid()));

CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 4) Reemplazar políticas staff autorreferenciales en otras tablas para usar función segura
DROP POLICY IF EXISTS "Staff can view loan status history" ON public.loan_status_history;
CREATE POLICY "Staff can view loan status history"
ON public.loan_status_history
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can create loan status history" ON public.loan_status_history;
CREATE POLICY "Staff can create loan status history"
ON public.loan_status_history
FOR INSERT
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view loan applications" ON public.loan_applications;
CREATE POLICY "Staff can view loan applications"
ON public.loan_applications
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can update loan applications" ON public.loan_applications;
CREATE POLICY "Staff can update loan applications"
ON public.loan_applications
FOR UPDATE
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view kyc documents" ON public.kyc_documents;
CREATE POLICY "Staff can view kyc documents"
ON public.kyc_documents
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can update kyc documents" ON public.kyc_documents;
CREATE POLICY "Staff can update kyc documents"
ON public.kyc_documents
FOR UPDATE
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view contracts" ON public.loan_contracts;
CREATE POLICY "Staff can view contracts"
ON public.loan_contracts
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view payments" ON public.loan_payments;
CREATE POLICY "Staff can view payments"
ON public.loan_payments
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can update payments" ON public.loan_payments;
CREATE POLICY "Staff can update payments"
ON public.loan_payments
FOR UPDATE
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert payments" ON public.loan_payments;
CREATE POLICY "Staff can insert payments"
ON public.loan_payments
FOR INSERT
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view audit logs" ON public.audit_logs;
CREATE POLICY "Staff can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- 5) Asegurar trigger estable de nuevos usuarios
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'client',
    'active'
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name, ''),
    role = coalesce(public.profiles.role, excluded.role),
    status = coalesce(public.profiles.status, excluded.status);

  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Reparar usuarios existentes mínimos
update public.profiles p
set
  role = coalesce(p.role, 'client'),
  status = coalesce(p.status, 'active'),
  full_name = coalesce(p.full_name, '')
where p.role is null or p.status is null or p.full_name is null;
