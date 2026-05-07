import { supabase } from './supabaseClient';
import { registerAudit } from './audit';

export type NotificationEvent =
  | 'LOAN_APPROVED'
  | 'SIGNATURE_PENDING'
  | 'LOAN_DISBURSED'
  | 'PAYMENT_LATE'
  | 'HR_NOTICE_PREPARED';

export async function registerNotification(params: {
  userId?: string | null;
  loanApplicationId?: string | null;
  channel: 'email' | 'manual' | 'system';
  eventType: NotificationEvent;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
}) {
  const { error } = await supabase.from('notification_logs').insert({
    user_id: params.userId ?? null,
    loan_application_id: params.loanApplicationId ?? null,
    channel: params.channel,
    event_type: params.eventType,
    recipient: params.recipient ?? null,
    subject: params.subject ?? null,
    body: params.body ?? null,
    status: params.channel === 'manual' ? 'PREPARED' : 'LOGGED',
    sent_at: params.channel === 'manual' ? null : new Date().toISOString(),
  });
  await registerAudit('REGISTER_NOTIFICATION', 'notification_logs', params.loanApplicationId ?? null, {
    channel: params.channel,
    eventType: params.eventType,
    recipient: params.recipient ?? null,
    status: error ? 'ERROR' : 'OK',
    error: error?.message,
  });
  return { error };
}
