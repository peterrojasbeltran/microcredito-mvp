-- v1.0.1 - Empresa obligatoria + flujo RRHH completo
-- Ejecutar después de v1.0.0.

-- 1) Permitir guardar empresa escrita por el cliente cuando no existe en catálogo.
alter table public.loan_applications
add column if not exists employer_name_text text;

-- 2) Clientes autenticados pueden leer empresas para seleccionarlas al solicitar crédito.
-- Nota MVP: esto expone el catálogo de empresas a usuarios autenticados.
DROP POLICY IF EXISTS "Authenticated users can view employer catalog" ON public.employers;
CREATE POLICY "Authenticated users can view employer catalog"
ON public.employers
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3) Asegurar que solicitudes enviadas tengan empresa asociada o nombre de empresa escrito.
create or replace function public.validate_loan_employer_required()
returns trigger
security definer
set search_path = public
as $$
begin
  if new.status in ('SUBMITTED','KYC_REVIEW','UNDER_REVIEW','APPROVED','DISBURSED','ACTIVE','LATE','CLOSED') then
    if new.employer_id is null and (new.employer_name_text is null or length(trim(new.employer_name_text)) < 3) then
      raise exception 'Indica la empresa donde trabaja el cliente antes de enviar la solicitud.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_validate_loan_employer_required ON public.loan_applications;
CREATE TRIGGER trg_validate_loan_employer_required
before insert or update on public.loan_applications
for each row execute function public.validate_loan_employer_required();

-- 4) Índices útiles para búsqueda/normalización.
create index if not exists idx_loan_applications_employer_id on public.loan_applications(employer_id);
create index if not exists idx_loan_applications_employer_name_text on public.loan_applications(employer_name_text);

select 'v1.0.1 upgrade aplicado - empresa obligatoria y flujo RRHH completo' as result;
