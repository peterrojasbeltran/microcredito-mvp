export const REQUIRED_KYC_DOCS = ['ID_FRONT', 'ID_BACK', 'SELFIE', 'SALARY_SLIP'];

export const KYC_DOC_LABELS: Record<string, string> = {
  ID_FRONT: 'Carnet de identidad anverso',
  ID_BACK: 'Carnet de identidad reverso',
  SELFIE: 'Selfie del cliente',
  SALARY_SLIP: 'Boleta de pago',
};

export function kycDocLabel(documentType: string) {
  return KYC_DOC_LABELS[documentType] ?? documentType;
}

export function getMissingKycDocuments(docs: Array<{ document_type: string; status: string }>) {
  const approved = new Set(
    docs
      .filter((doc) => doc.status === 'APPROVED')
      .map((doc) => doc.document_type)
  );

  return REQUIRED_KYC_DOCS.filter((doc) => !approved.has(doc));
}

export function isKycComplete(docs: Array<{ document_type: string; status: string }>) {
  return getMissingKycDocuments(docs).length === 0;
}

export function friendlyMissingKycMessage(missing: string[]) {
  if (missing.length === 0) return 'Documentación completa.';
  return `No puedes aprobar todavía. Falta aprobar la documentación del cliente: ${missing.map(kycDocLabel).join(', ')}.`;
}
