"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

type IconName = "home" | "checklist" | "people" | "flag" | "settings" | "plus";

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...common}>
      {name === "home" && <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
      {name === "checklist" && (
        <>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" />
        </>
      )}
      {name === "people" && (
        <>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16.5" cy="9" r="2.5" />
          <path d="M2.5 20c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5M13.5 15.5c.9-.4 1.9-.6 3-.6 2.3 0 4 1.4 4.5 4.6" />
        </>
      )}
      {name === "flag" && <path d="M5 21V4m0 0h11l-2 4 2 4H5" />}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

export const NAV = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/checklist", label: "Checklist", icon: "checklist" as const },
  { href: "/responsibilities", label: "Who's Doing What?", short: "Who", icon: "people" as const },
  { href: "/milestones", label: "Milestones", icon: "flag" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

const LATER = [
  "Monthly Check-Ins",
  "Calendar & Timeline",
  "Budget & Payments",
  "Vendors",
  "Guest List & RSVPs",
  "Design & Inspiration",
  "Ceremony & Reception",
  "Documents & Contracts",
  "Decisions & Discussions",
  "Notes & Ideas",
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ coupleLabel }: { coupleLabel: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
      <Link href="/" className="px-3">
        <span className="font-display block text-3xl leading-none text-primary">Our Wedding Era</span>
        <span className="mt-1 block text-xs text-muted">{coupleLabel}</span>
      </Link>
      <div className="hairline my-6" />
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "bg-primary/10 font-medium text-primary" : "text-text hover:bg-surface-2",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
        <div className="pt-6">
          <p className="px-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Coming in later phases</p>
          <ul className="mt-2 space-y-1 px-3 text-sm text-muted">
            {LATER.map((l) => (
              <li key={l} className="py-0.5">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-primary" : "text-muted")}
              >
                <Icon name={item.icon} />
                {item.short ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
