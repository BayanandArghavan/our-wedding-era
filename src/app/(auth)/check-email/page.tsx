import Link from "next/link";

export const metadata = { title: "Check your email · Our Wedding Era" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="mb-2 text-3xl">Check your email</h1>
      <p className="text-sm text-muted">
        We sent a confirmation link to <strong className="text-text">{typeof email === "string" ? email : "your inbox"}</strong>. Open it on
        any device to finish creating your account.
      </p>
      <p className="mt-6 text-sm text-muted">
        Already confirmed?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
