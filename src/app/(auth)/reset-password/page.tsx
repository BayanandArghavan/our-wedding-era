import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/data/viewer";

export const metadata = { title: "Choose a new password · Our Wedding Era" };

export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <>
        <h1 className="mb-2 text-3xl">Link expired</h1>
        <p className="mb-6 text-sm text-muted">This reset link is no longer valid. Request a new one and use it within an hour.</p>
        <Link href="/forgot-password" className="font-medium text-primary underline underline-offset-4">
          Request a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-3xl">Choose a new password</h1>
      <p className="mb-6 text-sm text-muted">For {viewer.email}</p>
      <ResetPasswordForm />
    </>
  );
}
