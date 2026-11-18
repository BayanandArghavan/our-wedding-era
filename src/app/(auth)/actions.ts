"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site";
import { zodFailure, type ActionResult } from "@/lib/actions";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const password = z.string().min(10, "Use at least 10 characters").max(128, "That password is too long");

const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password"), next: z.string().optional() });

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      return { ok: false, error: "Please confirm your email first. Check your inbox for the link we sent." };
    }
    return { ok: false, error: "That email and password don't match an account." };
  }
  redirect(safeNextPath(parsed.data.next, "/"));
}

const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your first name").max(60),
  email,
  password,
  next: z.string().optional(),
});

export async function signUp(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const base = await siteUrl();
  const next = safeNextPath(parsed.data.next, "/setup");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${base}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error("[auth] signUp", error.message);
    if (/already registered/i.test(error.message)) return { ok: false, error: "An account with that email already exists. Try signing in." };
    if (/rate limit/i.test(error.message)) return { ok: false, error: "Too many emails were sent recently. Please wait a bit and try again." };
    if (/not authorized/i.test(error.message)) {
      return { ok: false, error: "Our email service can't send to that address yet. See the README section on email delivery." };
    }
    return { ok: false, error: "We couldn't create your account. Please try again." };
  }
  // When confirmations are on, Supabase returns a user with no session.
  if (data.session) redirect(next);
  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function requestPasswordReset(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFailure(parsed.error);
  const supabase = await createClient();
  const base = await siteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${base}/auth/confirm?type=recovery&next=%2Freset-password` });
  if (error) console.error("[auth] reset", error.message);
  // Same answer whether or not the account exists.
  return { ok: true, message: "If that email has an account, a reset link is on its way. It expires in one hour." };
}

const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match", path: ["confirm"] });

export async function updatePassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFailure(parsed.error);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[auth] updatePassword", error.message);
    if (/different from the old/i.test(error.message)) return { ok: false, error: "Choose a password you haven't used before." };
    return { ok: false, error: "We couldn't update your password. Please try again." };
  }
  redirect("/?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
