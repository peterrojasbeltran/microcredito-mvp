# Microcréditos MVP — v1.0.1

Plataforma MVP de microcréditos con onboarding, KYC manual, contrato digital básico, aprobación operativa, desembolso, cronograma de pagos, reportes, auditoría, controles operativos y flujo RRHH con empresa obligatoria.

## Versión

**v1.0.1 — Empresa obligatoria + flujo RRHH completo**

Esta versión se construyó sobre la v1.0.0. Mantiene el stack gratuito: Supabase + Vercel. No obliga a usar SMS, OCR, liveness ni firma digital legal pagada.

---

## Cambios v1.0.1

### Usuario / Cliente

- En la pantalla **Solicitar crédito** se agrega el campo obligatorio **Empresa donde trabajas**.
- El cliente puede:
  - seleccionar una empresa existente,
  - o elegir **No encuentro mi empresa** y escribir el nombre manualmente.
- La solicitud no se puede enviar si no se indica empresa.
- La simulación muestra también la empresa seleccionada o escrita.
- Se mantiene el flujo de crédito, KYC, firma y cuotas sin cambios de negocio.

### Admin

- En el expediente del crédito ahora se muestra una sección **Empresa y RRHH**.
- Si la solicitud tiene empresa escrita pero no asociada, el admin puede:
  - asociar una empresa existente,
  - o crear una nueva empresa con email RRHH y asociarla automáticamente.
- El botón **Preparar email RRHH** queda bloqueado hasta que exista:
  - empresa asociada,
  - email RRHH registrado.
- El mensaje de error ahora es más claro:
  - “Antes de preparar el email, asocia una empresa a esta solicitud.”
  - “Completa el correo de RRHH de la empresa para preparar el email.”
- La lista de solicitudes muestra la empresa asociada o escrita.
- En **Empresas**, el email RRHH ahora es obligatorio para crear/actualizar empresa.

### Analista

- Puede ver la empresa de la solicitud.
- Puede preparar avisos/email RRHH cuando los datos de empresa están completos.
- No puede administrar la tabla de empresas si no tiene rol `admin`.

### Base de datos / Supabase

- Se agrega `loan_applications.employer_name_text`.
- Se agrega política para que usuarios autenticados puedan leer el catálogo de empresas y seleccionarlas en la solicitud.
- Se agrega trigger de validación para impedir enviar solicitudes sin empresa asociada o escrita.
- Se agregan índices para `employer_id` y `employer_name_text`.

---

## Qué resuelve esta versión

Corrige el gap detectado en v1.0.0:

```text
Cliente solicitaba crédito
→ No quedaba empresa asociada
→ Admin intentaba preparar email RRHH
→ El sistema mostraba error por falta de email RRHH
```

Ahora el flujo queda:

```text
Cliente indica empresa
→ Solicitud queda con employer_id o employer_name_text
→ Admin normaliza/asocia empresa si hace falta
→ Admin completa email RRHH
→ Sistema habilita aviso/email RRHH
```

---

## Pasos para ejecutar localmente

```bash
cd microcredito-mvp-v1.0.1
npm install
cp .env.example .env.local
npm run dev
```

Configura `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

---

## Supabase

Ejecuta en **SQL Editor**:

```text
supabase/v1.0.1-upgrade.sql
```

Si vienes desde una versión anterior, ejecuta primero los upgrades pendientes hasta v1.0.0.

---

## QA Senior v1.0.1

### Cliente

- [x] No permite enviar solicitud sin empresa.
- [x] Permite seleccionar empresa existente.
- [x] Permite escribir empresa manual si no existe.
- [x] Guarda `employer_id` cuando selecciona empresa existente.
- [x] Guarda `employer_name_text` cuando escribe empresa manual.
- [x] No se afecta login, KYC, firma ni cuotas.

### Admin

- [x] Ve empresa asociada o escrita en expediente.
- [x] Puede asociar empresa existente desde expediente.
- [x] Puede crear y asociar empresa desde expediente.
- [x] No habilita email RRHH sin empresa asociada.
- [x] No habilita email RRHH sin email RRHH.
- [x] Muestra mensajes claros y accionables.
- [x] Empresas exige email RRHH.

### Regresión

- [x] Login cliente/admin/analyst.
- [x] Crear solicitud.
- [x] Subir documentación.
- [x] Aprobar KYC.
- [x] Aprobar solicitud.
- [x] Firmar contrato.
- [x] Desembolsar.
- [x] Generar cuotas.
- [x] Registrar pagos.
- [x] Reportes.
- [x] Auditoría.
- [x] Aviso RRHH.

---

## Notas

- Esta versión sigue siendo free stack.
- `mailto` no envía automáticamente; abre el cliente de correo para envío manual.
- Para producción formal se recomienda revisar contrato, autorización y flujo RRHH con asesoría legal.
