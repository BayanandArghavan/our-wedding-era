import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { Alert } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { safeNextPath } from "@/lib/site";

export const metadata = { title: "Sign in · Our Wedding Era" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  if (await getViewer()) redirect(next ?? "/");
  return (
    <>
      <h1 className="mb-1 text-3xl">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Sign in to your wedding planning space.</p>
      {params.error === "link" ? (
        <div className="mb-4">
          <Alert tone="danger">That link has expired or was already used. Sign in, or request a new one.</Alert>
        </div>
      ) : null}
      <SignInForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
