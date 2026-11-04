import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/i18n/config";

/**
 * 1. Public pages: Bengali lives at the root (/about → internally /bn/about),
 *    English at /en/…; /bn/… URLs redirect to their canonical root form.
 *    No session work happens here, so public pages stay static/cacheable.
 *    Language memory (plan §5.4): only a browser visit to the bare "/" with
 *    the ijs_lang=en cookie (set by the BN/EN switch) is sent to /en (307).
 *    Every other URL decides its own language; crawlers have no cookie.
 * 2. Admin pages: refreshes the Supabase session cookie and sends signed-out
 *    visitors to the login page. This is a convenience redirect only — every
 *    admin page and server action re-checks the session and permissions.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminProxy(request);
  }

  if (pathname === "/bn" || pathname.startsWith("/bn/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return NextResponse.next();
  }
  if (pathname === "/" && request.cookies.get(LANG_COOKIE)?.value === "en" && isPageVisit(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/en";
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/bn${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

/**
 * A real page load (typed URL, bookmark, link from another site) — not a
 * client-side navigation or prefetch of the router (RSC fetch), so a "হোম"
 * link on a Bengali page still shows the Bengali home page.
 * Next.js removes the router's own markers (rsc / next-router-* headers and
 * the _rsc parameter) before the proxy runs, so a document request is
 * recognised positively: Sec-Fetch-Dest "document", or — in browsers that do
 * not send Sec-Fetch-* headers — an Accept header asking for HTML (the
 * router's fetch() asks for any type).
 */
function isPageVisit(request: NextRequest): boolean {
  const h = request.headers;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const dest = h.get("sec-fetch-dest");
  if (dest !== null) return dest === "document";
  return (h.get("accept") ?? "").includes("text/html");
}

async function adminProxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && isLogin && request.nextUrl.searchParams.get("error") === "no-access") {
    // Signed in, but without an active staff profile (e.g. deactivated):
    // end the session here so the login page renders instead of looping
    // between /admin (requireStaff) and /admin/login.
    await supabase.auth.signOut({ scope: "local" });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Everything except Next internals, API/QR route handlers, metadata files
  // and static files (anything with a file extension).
  matcher: ["/((?!_next/|api/|qr/|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z0-9]+$).*)"],
};
