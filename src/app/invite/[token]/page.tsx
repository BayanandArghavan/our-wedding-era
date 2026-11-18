import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { SignUpForm } from "@/components/auth-forms";
import { Alert, Button, buttonClass } from "@/components/ui";
import { signOut } from "@/app/(auth)/actions";
import { acceptInvitation } from "./actions";

export const metadata = { title: "You're invited · Our Wedding Era" };

const ERRORS: Record<string, string> = {
  email: "This invitation was sent to a different email address.",
  unconfirmed: "Confirm your email address first, then open this link again.",
  has_workspace: "This account already belongs to a wedding space, so it can't join another.",
  full: "Both partners have already joined.",
  invalid: "This invitation is no longer valid.",
  unknown: "We couldn't accept the invitation. Please try again.",
};

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation_preview", { p_token: token });
  const invite = data?.[0];
  const viewer = await getViewer();
  const next = `/invite/${token}`;

  if (viewer?.member && invite?.reason === "accepted") redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <p className="eyebrow text-center">Our Wedding Era</p>
        {!invite || !invite.is_valid ? (
          <>
            <h1 className="mt-3 text-center text-3xl">This invitation can&apos;t be used</h1>
            <p className="mt-3 text-center text-sm text-muted">
              {invite?.reason === "expired"
                ? "It has expired. Ask your partner to create a new one from Settings."
                : invite?.reason === "accepted"
                  ? "It has already been accepted. Sign in to continue."
                  : invite?.reason === "revoked"
                    ? "It was replaced by a newer invitation. Use the most recent link."
                    : "The link isn't valid. Check that you copied all of it."}
            </p>
            <div className="mt-6 text-center">
              <Link className={buttonClass("secondary")} href="/login">
                Sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-center text-4xl leading-tight">
              {invite.partner1_name} &amp; {invite.partner2_name}
            </h1>
            <p className="mt-2 text-center text-muted">
              {invite.inviter_name ?? "Your partner"} invited you to plan the wedding together.
            </p>
            <div className="hairline mx-auto my-6 w-40" />

            {errorParam ? (
              <div className="mb-4">
                <Alert tone="danger">{ERRORS[String(errorParam)] ?? ERRORS.unknown}</Alert>
              </div>
            ) : null}

            {viewer ? (
              viewer.email.toLowerCase() === invite.invited_email ? (
                <form action={acceptInvitation.bind(null, token)} className="space-y-3 text-center">
                  <p className="text-sm text-muted">
                    You&apos;ll join as <strong className="text-text">{invite.partner_slot === 1 ? invite.partner1_name : invite.partner2_name}</strong>.
                  </p>
                  <Button type="submit" size="lg" className="w-full">
                    Join our wedding space
                  </Button>
                </form>
              ) : (
                <div className="space-y-4 text-center text-sm">
                  <Alert>
                    This invitation is for <strong>{invite.invited_email}</strong>, but you&apos;re signed in as <strong>{viewer.email}</strong>.
                  </Alert>
                  <form action={signOut}>
                    <Button type="submit" variant="secondary">
                      Sign out and switch accounts
                    </Button>
                  </form>
                </div>
              )
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">Create your own login with the invited email address.</p>
                <SignUpForm next={next} defaultEmail={invite.invited_email ?? ""} lockEmail />
                <p className="mt-6 text-center text-sm text-muted">
                  Already have an account?{" "}
                  <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary underline underline-offset-4">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
