import { createClient } from '@/lib/supabase/server';

/**
 * Server-side helper: returns the current session user + their creator profile.
 * Returns { user: null, profile: null } if not authenticated.
 */
export async function getSafeProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return { user, profile };
}
