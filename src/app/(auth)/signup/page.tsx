import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { getViewer } from "@/lib/data/viewer";
import { safeNextPath } from "@/lib/site";

export const metadata = { title: "Create account · Our Wedding Era" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  if (await getViewer()) redirect(next ?? "/");
  return (
    <>
      <h1 className="mb-1 text-3xl">Create your account</h1>
      <p className="mb-6 text-sm text-muted">
        Each of you gets your own login. Whoever signs up first creates your shared wedding space and invites the other.
      </p>
      <SignUpForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
