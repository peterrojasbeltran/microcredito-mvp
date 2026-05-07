-- v1.0.0 - Cierre operativo free stack
-- Agrega historial de notificaciones y avisos RRHH sin servicios pagos obligatorios.

-- 1) Empresas / RRHH: asegurar columnas base
alter table public.employers
add column if not exists tax_id text,
add column if not exists hr_contact_name text,
add column if not exists hr_contact_email text,
add column if not exists hr_contact_phone text;

-- 2) Avisos RRHH generados desde expediente
create table if not exists public.hr_notices (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid references public.loan_applications(id) on delete cascade,
  employer_id uuid references public.employers(id),
  recipient_email text,
  status text not null default 'GENERATED',
  html_content text,
  generated_at timestamp with time zone default now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3) Logs de notificaciones (modo free: prepared/manual)
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  loan_application_id uuid references public.loan_applications(id) on delete cascade,
  channel text not null default 'manual',
  event_type text not null,
  recipient text,
  subject text,
  body text,
  status text not null default 'PREPARED',
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.hr_notices enable row level security;
alter table public.notification_logs enable row level security;

-- 4) Políticas seguras usando funciones existentes is_staff_user/is_admin_user
DROP POLICY IF EXISTS "Staff can view hr notices" ON public.hr_notices;
CREATE POLICY "Staff can view hr notices"
ON public.hr_notices
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert hr notices" ON public.hr_notices;
CREATE POLICY "Staff can insert hr notices"
ON public.hr_notices
FOR INSERT
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can update hr notices" ON public.hr_notices;
CREATE POLICY "Staff can update hr notices"
ON public.hr_notices
FOR UPDATE
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can view notification logs" ON public.notification_logs;
CREATE POLICY "Staff can view notification logs"
ON public.notification_logs
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert notification logs" ON public.notification_logs;
CREATE POLICY "Staff can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (public.is_staff_user(auth.uid()));

-- Admin puede gestionar empresas; staff puede leer empresas para expediente.
DROP POLICY IF EXISTS "Staff can view employers" ON public.employers;
CREATE POLICY "Staff can view employers"
ON public.employers
FOR SELECT
USING (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert employers" ON public.employers;
CREATE POLICY "Admins can insert employers"
ON public.employers
FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update employers" ON public.employers;
CREATE POLICY "Admins can update employers"
ON public.employers
FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

select 'v1.0.0 upgrade aplicado - avisos RRHH y notification_logs listos' as result;
