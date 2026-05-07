-- v0.8.1 - Fix crítico de Auth/Profile
-- Objetivo:
-- 1) El trigger crea profiles con full_name desde metadata.
-- 2) El cliente autenticado puede insertar/actualizar su propio profile si el trigger no lo creó.
-- 3) Se reparan profiles existentes con email/full_name cuando sea posible.

-- Reemplazar trigger de creación de profile
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
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'client',
    'active'
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    role = coalesce(public.profiles.role, excluded.role),
    status = coalesce(public.profiles.status, excluded.status);

  return new;
end;
$$ language plpgsql;

-- Asegurar trigger activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Política faltante: permitir que un usuario autenticado cree su propio profile
-- Esto cubre casos donde el trigger falló por una migración previa.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Política robusta para que el usuario actualice su propio profile.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Reparar email/full_name de usuarios existentes cuando auth.users tenga metadata.
update public.profiles p
set
  email = coalesce(p.email, u.email),
  full_name = coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  role = coalesce(p.role, 'client'),
  status = coalesce(p.status, 'active')
from auth.users u
where p.id = u.id;

-- Crear profiles faltantes para usuarios ya existentes en auth.users.
insert into public.profiles (id, email, full_name, role, status)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  'client',
  'active'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
