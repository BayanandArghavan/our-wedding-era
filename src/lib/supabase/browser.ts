"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser client, used only for realtime change notifications. */
export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
    );
  }
  return client;
}
