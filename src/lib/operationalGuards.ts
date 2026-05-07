import { supabase } from './supabaseClient';
import { friendlyMissingKycMessage, getMissingKycDocuments } from './kyc';

export async function validateKycComplete(loanApplicationId: string) {
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('document_type,status')
    .eq('loan_application_id', loanApplicationId);
  if (error) return { ok: false, message: error.message, missing: [] as string[] };
  const missing = getMissingKycDocuments(data || []);
  if (missing.length > 0) return { ok: false, message: friendlyMissingKycMessage(missing), missing };
  return { ok: true, message: 'Documentación KYC completa.', missing };
}

export async function validateContractSigned(loanApplicationId: string) {
  const { data, error } = await supabase
    .from('loan_contracts')
    .select('id,accepted_terms,accepted_payroll_deduction,signed_at')
    .eq('loan_application_id', loanApplicationId)
    .eq('accepted_terms', true)
    .eq('accepted_payroll_deduction', true)
    .not('signed_at', 'is', null)
    .limit(1);
  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: 'No se puede desembolsar: el contrato y autorización de descuento aún no están firmados.' };
  return { ok: true, message: 'Contrato firmado.' };
}
