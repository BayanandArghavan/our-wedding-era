import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out
 * visitors to the login page. Pages still verify the user themselves; this is
 * a convenience redirect, not the security boundary (row level security is).
 */
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/check-email", "/auth/", "/invite/"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const problem = setupProblem(url, key);
  if (problem) return setupPage(problem);

  const supabase = createServerClient(url!, key!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims() validates the JWT; don't run other code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));

  if (!signedIn && !isPublic && path !== "/reset-password") {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

/**
 * If the deployment is missing its Supabase settings, every page would crash
 * with a generic error. Say what's wrong instead. Only setting names are shown,
 * never values.
 */
function setupProblem(url: string | undefined, key: string | undefined): string | null {
  const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
  if (missing.length) return `Missing setting${missing.length > 1 ? "s" : ""}: ${missing.join(" and ")}.`;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url!) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url!)) {
    return "NEXT_PUBLIC_SUPABASE_URL isn't a Supabase project address. It should look like https://xxxx.supabase.co with nothing after it.";
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key!) && !/^eyJ[A-Za-z0-9._-]+$/.test(key!)) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY doesn't look like a publishable key. It should start with sb_publishable_.";
  }
  return null;
}

function setupPage(problem: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Setup not finished · Our Wedding Era</title></head>
<body style="font-family:system-ui,sans-serif;background:#FAF7F2;color:#302827;max-width:36rem;margin:15vh auto;padding:0 1.5rem;line-height:1.6">
<h1 style="font-family:Georgia,serif;font-weight:normal;color:#682D42">Setup isn't finished yet</h1>
<p><strong>${problem}</strong></p>
<p>In Vercel, open this project, go to <strong>Settings → Environment Variables</strong>, fix the setting, then go to <strong>Deployments</strong>, open the <strong>⋯</strong> menu on the top deployment and choose <strong>Redeploy</strong>.</p>
<p style="font-size:.85rem;color:#6B5A58">Code: setup-check</p></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
