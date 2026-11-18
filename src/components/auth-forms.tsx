"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/(auth)/actions";
import type { ActionResult } from "@/lib/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

function fieldError(state: ActionResult | null, key: string) {
  return state && !state.ok ? state.fieldErrors?.[key] : undefined;
}

function FormError({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (!state.ok && !state.fieldErrors) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function SignInForm({ next, defaultEmail }: { next?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-primary">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next, defaultEmail, lockEmail }: { next?: string; defaultEmail?: string; lockEmail?: boolean }) {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <Field label="Your first name" htmlFor="displayName" error={fieldError(state, "displayName")}>
        <Input id="displayName" name="displayName" autoComplete="given-name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          readOnly={lockEmail}
          required
        />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters." error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters." error={fieldError(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={fieldError(state, "confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
