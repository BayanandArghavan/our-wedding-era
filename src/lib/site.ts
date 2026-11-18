import "server-only";
import { headers } from "next/headers";

/** Public base URL for links in emails and invitations. */
export async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only allow redirects to paths on this site. */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  try {
    // Accept absolute URLs only if they point back at a path; keep just the path.
    const parsed = new URL(next, "http://placeholder.local");
    if (parsed.origin !== "http://placeholder.local" && !next.startsWith("http")) return fallback;
    const path = parsed.pathname + parsed.search;
    if (!path.startsWith("/") || path.startsWith("//")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
