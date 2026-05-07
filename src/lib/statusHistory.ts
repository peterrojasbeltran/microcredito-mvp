import { supabase } from './supabaseClient';

export async function registerStatusHistory(loanApplicationId: string, previousStatus: string | null, newStatus: string, notes?: string) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('loan_status_history').insert({
    loan_application_id: loanApplicationId,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: userData.user?.id ?? null,
    notes: notes ?? null,
  });
}
