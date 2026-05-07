import { supabase } from './supabaseClient';
import { DEFAULT_FINANCIAL_SETTINGS, FinancialSettings } from './loan';

export async function getFinancialSettings(): Promise<FinancialSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'financial_settings')
    .maybeSingle();

  if (error || !data?.value) return DEFAULT_FINANCIAL_SETTINGS;
  return { ...DEFAULT_FINANCIAL_SETTINGS, ...(data.value as Partial<FinancialSettings>) };
}

export async function saveFinancialSettings(settings: FinancialSettings) {
  return supabase
    .from('settings')
    .upsert({ key: 'financial_settings', value: settings }, { onConflict: 'key' });
}
