import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site";

const ALLOWED: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "invite"];

/**
 * Landing point for links in confirmation and password-reset emails.
 *
 * Handles both link styles:
 *  - token_hash (our custom templates in supabase/templates): works even when
 *    the link is opened on a different device than the one used to sign up.
 *  - code (Supabase's default templates): works when opened in the same browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = unwrapNext(searchParams.get("next"), type === "recovery" ? "/reset-password" : "/setup");
  const supabase = await createClient();

  if (tokenHash && type && ALLOWED.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return redirectTo(next);
    console.error("[auth] verifyOtp", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
    console.error("[auth] exchangeCode", error.message);
  }

  return redirectTo("/login?error=link");
}

/** `next` may itself be "/auth/confirm?next=/x" (from emailRedirectTo); use the inner path. */
function unwrapNext(raw: string | null, fallback: string): string {
  let path = safeNextPath(raw, fallback);
  for (let i = 0; i < 3 && path.startsWith("/auth/confirm"); i++) {
    const inner = new URL(path, "http://placeholder.local").searchParams.get("next");
    path = safeNextPath(inner, fallback);
  }
  return path;
}

/**
 * Relative redirect: the browser stays on whatever host it opened the email
 * link on, so the session cookie set above applies to the next page.
 */
function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
}
