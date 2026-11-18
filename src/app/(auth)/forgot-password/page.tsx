import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Reset password · Our Wedding Era" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-3xl">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
