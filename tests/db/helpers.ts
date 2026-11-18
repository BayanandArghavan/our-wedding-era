import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * These tests run against a local Supabase stack (`npx supabase start`).
 * The secret key is used ONLY to create and confirm throwaway test users.
 * Every assertion about access runs through a normal signed-in client, so
 * row level security is what's being tested.
 */
export const url = process.env.SUPABASE_URL ?? "";
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

export const hasLocalStack = Boolean(url && publishableKey && secretKey && /127\.0\.0\.1|localhost/.test(url));

export type Client = SupabaseClient<Database>;

export function anonClient(): Client {
  return createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function adminClient() {
  return createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createUser(
  label: string,
  opts: { confirmed?: boolean; displayName?: string } = {},
): Promise<{ client: Client; email: string; id: string }> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@test.local`;
  const password = `pw-${crypto.randomUUID()}`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: opts.confirmed ?? true,
    user_metadata: { display_name: opts.displayName ?? label },
  });
  if (error) throw error;
  const client = anonClient();
  if (opts.confirmed ?? true) {
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  }
  return { client, email, id: data.user.id };
}

/** Signs in a user created unconfirmed, after confirming them. */
export async function confirmAndSignIn(id: string, email: string): Promise<Client> {
  const admin = adminClient();
  const password = `pw-${crypto.randomUUID()}`;
  const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true, password });
  if (error) throw error;
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return client;
}
