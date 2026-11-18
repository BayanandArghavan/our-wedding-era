import type { ReactNode } from "react";
import { requireWorkspace } from "@/lib/data/viewer";
import { listCategories } from "@/lib/data/queries";
import { MobileNav, Sidebar } from "@/components/shell/nav";
import { RealtimeRefresher } from "@/components/shell/realtime";
import { CelebrationProvider } from "@/components/shell/celebration";
import { AppProvider } from "@/components/app-context";
import { QuickAddButton } from "@/components/quick-add";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireWorkspace();
  const categories = await listCategories(ctx.workspaceId);

  return (
    <CelebrationProvider>
      <AppProvider
        data={{
          names: ctx.names,
          mySlot: ctx.member.partner_slot as 1 | 2,
          categories: categories.map((c) => ({ id: c.id, name: c.name })),
          today: ctx.today,
        }}
      >
        <div className="flex min-h-dvh">
          <Sidebar coupleLabel={`${ctx.names.partner1} & ${ctx.names.partner2}`} />
          <div className="min-w-0 flex-1">
            <header className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
              <span className="font-display text-2xl text-primary">Our Wedding Era</span>
              <span className="text-xs text-muted">
                {ctx.names.partner1} &amp; {ctx.names.partner2}
              </span>
            </header>
            <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
          </div>
        </div>
        <QuickAddButton />
        <MobileNav />
        <RealtimeRefresher workspaceId={ctx.workspaceId} />
      </AppProvider>
    </CelebrationProvider>
  );
}
