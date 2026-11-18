import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="eyebrow">Planning our forever, together</p>
          <p className="font-display mt-2 text-5xl text-primary">Our Wedding Era</p>
          <div className="hairline mx-auto mt-5 w-40" />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_1px_0_rgba(48,40,39,0.04)] sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
