import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string; celebrate?: string[] }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodFailure(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

/**
 * Turns a database error into something a person can act on. Messages raised
 * by our own database functions are already written for people, so they pass
 * through; anything else becomes a generic message (details go to the log).
 */
export function dbFailure(error: PostgrestError | Error | null, fallback = "Something went wrong. Please try again."): ActionResult<never> {
  if (!error) return { ok: false, error: fallback };
  const code = "code" in error ? error.code : undefined;
  console.error("[db]", code, error.message);
  if (code === "P0001" || code === "22023" || code === "42501" || code === "23505" || code === "23514" || code === "P0002") {
    if (/violates row-level security|permission denied/i.test(error.message)) {
      return { ok: false, error: "You don't have access to that." };
    }
    if (/violates check constraint "wedding_date_matches_month"/.test(error.message)) {
      return { ok: false, error: "The wedding date must fall in the wedding month." };
    }
    if (/violates (check|unique) constraint/.test(error.message)) {
      return { ok: false, error: "That change conflicts with existing data." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}
