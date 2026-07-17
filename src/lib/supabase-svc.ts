import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS policies
 * Uses base64-encoded key to avoid env var corruption issues
 */
export function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const b64Key = process.env.SUPABASE_KEY_B64;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!b64Key) throw new Error("SUPABASE_KEY_B64 is missing");

  let key: string;
  try {
    key = Buffer.from(b64Key, 'base64').toString('utf-8');
  } catch (e) {
    throw new Error("Failed to decode SUPABASE_KEY_B64: " + (e instanceof Error ? e.message : "unknown"));
  }

  if (!key.trim()) throw new Error("Decoded key is empty");
  return createSbClient(url, key);
}
