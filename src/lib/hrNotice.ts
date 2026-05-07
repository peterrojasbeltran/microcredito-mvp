import { formatCurrencyBOB, formatDateBO } from './formatters';

type LoanForNotice = {
  id: string;
  amount: number;
  term_months: number;
  installment_amount?: number | null;
  monthly_installment?: number | null;
  total_amount?: number | null;
  disbursed_at?: string | null;
  profiles?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  employer_name_text?: string | null;
  employers?: { name?: string | null; hr_contact_name?: string | null; hr_contact_email?: string | null; hr_contact_phone?: string | null } | null;
};

export function buildHrNoticeHtml(loan: LoanForNotice) {
  const clientName = loan.profiles?.full_name || 'Cliente sin nombre';
  const employerName = loan.employers?.name || loan.employer_name_text || 'Empresa no registrada';
  const installment = loan.installment_amount || loan.monthly_installment || 0;
  const total = loan.total_amount || loan.amount;
  const startDate = loan.disbursed_at ? formatDateBO(loan.disbursed_at) : 'Pendiente de confirmar';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>Aviso RRHH - ${clientName}</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;margin:40px;line-height:1.5}.box{border:1px solid #cbd5e1;border-radius:16px;padding:24px}.muted{color:#64748b}.row{margin:8px 0}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #e2e8f0;padding:10px}.footer{margin-top:32px;font-size:12px;color:#64748b}@media print{button{display:none}body{margin:20px}}</style></head>
<body>
<button onclick="window.print()" style="padding:10px 14px;border-radius:12px;border:0;background:#2563eb;color:white;font-weight:bold;cursor:pointer">Imprimir / Guardar PDF</button>
<h1>Aviso de autorización de descuento por planilla</h1>
<p class="muted">Documento generado desde la plataforma Microcréditos MVP para gestión operativa con RRHH.</p>
<div class="box">
  <p>Señores RRHH de <strong>${employerName}</strong>,</p>
  <p>Por medio del presente se informa que el colaborador <strong>${clientName}</strong> cuenta con una solicitud de microcrédito aprobada y contrato/autorización de descuento aceptados digitalmente en la plataforma.</p>
  <table>
    <tr><td>Cliente</td><td><strong>${clientName}</strong></td></tr>
    <tr><td>Email</td><td>${loan.profiles?.email || '-'}</td></tr>
    <tr><td>Teléfono</td><td>${loan.profiles?.phone || '-'}</td></tr>
    <tr><td>Monto desembolsado/aprobado</td><td><strong>${formatCurrencyBOB(loan.amount)}</strong></td></tr>
    <tr><td>Plazo</td><td>${loan.term_months} meses</td></tr>
    <tr><td>Cuota mensual estimada</td><td><strong>${formatCurrencyBOB(installment)}</strong></td></tr>
    <tr><td>Total programado</td><td>${formatCurrencyBOB(total)}</td></tr>
    <tr><td>Inicio sugerido de descuento</td><td>${startDate}</td></tr>
    <tr><td>ID solicitud</td><td>${loan.id}</td></tr>
  </table>
  <p>Solicitamos tomar contacto con el área operativa para confirmar el inicio del descuento por planilla según el acuerdo vigente con el colaborador.</p>
</div>
<p class="footer">Este documento es operativo para MVP. Para uso legal definitivo debe ser revisado por asesoría jurídica y ajustado a normativa aplicable.</p>
</body></html>`;
}

export function buildHrEmailSubject(loan: LoanForNotice) {
  return `Aviso RRHH - Descuento por planilla - ${loan.profiles?.full_name || 'Cliente'}`;
}

export function buildHrEmailBody(loan: LoanForNotice) {
  const clientName = loan.profiles?.full_name || 'Cliente sin nombre';
  const installment = loan.installment_amount || loan.monthly_installment || 0;
  return `Hola ${loan.employers?.hr_contact_name || 'equipo de RRHH'},%0D%0A%0D%0ASe generó un aviso de descuento por planilla para ${clientName}.%0D%0A%0D%0AMonto: ${formatCurrencyBOB(loan.amount)}%0D%0APlazo: ${loan.term_months} meses%0D%0ACuota mensual estimada: ${formatCurrencyBOB(installment)}%0D%0AID solicitud: ${loan.id}%0D%0A%0D%0APor favor confirmar recepción y fecha de inicio del descuento.%0D%0A%0D%0AGracias.`;
}
