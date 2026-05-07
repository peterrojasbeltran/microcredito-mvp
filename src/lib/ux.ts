export type LoanLike = {
  status?: string | null;
  amount?: number | null;
  total_amount?: number | null;
  installment_amount?: number | null;
};

export const clientSteps = [
  { key: 'request', label: 'Solicitud' },
  { key: 'documents', label: 'Documentos' },
  { key: 'signature', label: 'Firma' },
  { key: 'active', label: 'Activo' },
];

export function getClientStepIndex(status?: string | null) {
  if (!status || ['DRAFT', 'SUBMITTED', 'INFO_REQUESTED', 'KYC_REVIEW', 'UNDER_REVIEW', 'REJECTED', 'CANCELLED'].includes(status)) return 0;
  if (status === 'APPROVED') return 2;
  if (['DISBURSED', 'ACTIVE', 'LATE', 'CLOSED'].includes(status)) return 3;
  return 0;
}

export function getClientHeadline(status?: string | null) {
  switch (status) {
    case 'DRAFT': return 'Completa tu solicitud para enviarla a revisión.';
    case 'SUBMITTED': return 'Recibimos tu solicitud. Ahora revisaremos tu información.';
    case 'KYC_REVIEW': return 'Tu documentación está en revisión.';
    case 'UNDER_REVIEW': return 'Tu solicitud está siendo evaluada por un analista.';
    case 'INFO_REQUESTED': return 'Necesitamos información adicional para continuar.';
    case 'APPROVED': return 'Tu solicitud fue aprobada. Ya puedes firmar tu contrato.';
    case 'DISBURSED': return 'Tu crédito fue desembolsado. Revisa tus cuotas.';
    case 'ACTIVE': return 'Tu crédito está activo. Mantén tus pagos al día.';
    case 'LATE': return 'Tienes cuotas en mora. Regulariza tu pago cuanto antes.';
    case 'CLOSED': return 'Tu crédito fue cerrado correctamente.';
    case 'REJECTED': return 'Tu solicitud fue rechazada. Puedes revisar la información y volver a intentar.';
    case 'CANCELLED': return 'Esta solicitud fue cancelada.';
    default: return 'Crea tu solicitud de crédito para comenzar.';
  }
}

export function getPrimaryClientAction(status?: string | null) {
  if (!status || status === 'DRAFT' || status === 'REJECTED' || status === 'CANCELLED') {
    return { href: '/app/loan-request', label: 'Solicitar crédito' };
  }

  if (['SUBMITTED', 'KYC_REVIEW', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(status)) {
    return { href: '/app/kyc', label: 'Subir documentación' };
  }

  if (status === 'APPROVED') {
    return { href: '/app/contract', label: 'Firmar contrato' };
  }

  if (['DISBURSED', 'ACTIVE', 'LATE'].includes(status)) {
    return { href: '/app/payments', label: 'Ver cuotas' };
  }

  if (status === 'CLOSED') {
    return { href: '/app/payments', label: 'Ver historial' };
  }

  return { href: '/app/dashboard', label: 'Ver estado' };
}

export function getAdminActionHint(status?: string | null) {
  switch (status) {
    case 'SUBMITTED': return 'Revisar documentación y aprobar/rechazar.';
    case 'KYC_REVIEW': return 'Validar documentos del cliente.';
    case 'UNDER_REVIEW': return 'Tomar decisión crediticia.';
    case 'APPROVED': return 'Esperar firma o preparar desembolso.';
    case 'DISBURSED': return 'Activar y revisar cronograma.';
    case 'ACTIVE': return 'Registrar pagos y monitorear mora.';
    case 'LATE': return 'Priorizar gestión de mora.';
    case 'CLOSED': return 'Expediente cerrado.';
    default: return 'Ver expediente.';
  }
}
