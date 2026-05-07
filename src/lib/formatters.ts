export const LOAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviada',
  KYC_REVIEW: 'Revisión KYC',
  UNDER_REVIEW: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  INFO_REQUESTED: 'Información requerida',
  DISBURSED: 'Desembolsada',
  ACTIVE: 'Activa',
  LATE: 'En mora',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  LATE: 'En mora',
};

export const LOAN_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-100',
  KYC_REVIEW: 'bg-amber-50 text-amber-700 border-amber-100',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  REJECTED: 'bg-red-50 text-red-700 border-red-100',
  INFO_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-100',
  DISBURSED: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  LATE: 'bg-red-50 text-red-700 border-red-100',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  LATE: 'bg-red-50 text-red-700 border-red-100',
};

export const BOLIVIAN_BANKS = [
  'Banco Ganadero',
  'Banco Mercantil Santa Cruz',
  'Banco Unión',
  'Banco Nacional de Bolivia',
  'Banco Bisa',
  'Banco Económico',
  'BancoSol',
  'Banco FIE',
  'Banco Fortaleza',
  'Banco Prodem',
  'Banco PYME Ecofuturo',
  'Otro',
];

export function statusLabel(status?: string | null) {
  if (!status) return 'Sin estado';
  return LOAN_STATUS_LABELS[status] ?? status;
}

export function statusClass(status?: string | null) {
  if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
  return LOAN_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

export function formatCurrencyBOB(value?: number | string | null) {
  const numberValue = Number(value ?? 0);
  return `Bs ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue)}`;
}

export function formatDateBO(date?: string | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function paymentStatusLabel(status?: string | null) {
  if (!status) return 'Sin estado';
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentStatusClass(status?: string | null) {
  if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
  return PAYMENT_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}
