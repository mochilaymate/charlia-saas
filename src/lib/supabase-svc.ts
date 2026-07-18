import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS policies
 */
export function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");

  if (!key.trim()) throw new Error("Service role key is empty");
  return createSbClient(url, key);
}
