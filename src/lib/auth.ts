import { supabase } from './supabaseClient';

export type UserRole = 'client' | 'analyst' | 'admin';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
};

export async function ensureCurrentProfile(fullNameFromForm?: string): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const fallbackName =
    fullNameFromForm?.trim() ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
    null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    const needsUpdate = (!existing.full_name && fallbackName) || !existing.email || !existing.status || !existing.role;
    if (needsUpdate) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          full_name: existing.full_name || fallbackName,
          email: existing.email || user.email,
          role: existing.role || 'client',
          status: existing.status || 'active',
        })
        .eq('id', user.id)
        .select('id, full_name, email, phone, role, status')
        .maybeSingle();
      return (updated || existing) as Profile;
    }
    return existing as Profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fallbackName,
      email: user.email,
      role: 'client',
      status: 'active',
    })
    .select('id, full_name, email, phone, role, status')
    .maybeSingle();

  if (insertError || !inserted) return null;
  return inserted as Profile;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, status')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export function isStaff(role?: string | null) {
  return role === 'admin' || role === 'analyst';
}
