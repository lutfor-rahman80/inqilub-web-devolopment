import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origin of the Supabase project (API, Auth, Storage images), read once when the config loads. */
function supabaseOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    console.warn("[next.config] NEXT_PUBLIC_SUPABASE_URL is missing or invalid; the CSP will not allow Supabase.");
    return null;
  }
}
const supabase = supabaseOrigin();

/**
 * Content-Security-Policy for every route.
 *
 * script-src needs 'unsafe-inline': the public pages are statically generated
 * (ISR), and Next.js writes small inline bootstrap/data scripts into them. A
 * nonce-based policy would need a fresh nonce per request, i.e. dynamic
 * rendering of every page (no static caching). Mitigation: no user or
 * database content is ever rendered as HTML (React escapes it; see
 * docs/04 §6.2), and no third-party scripts are loaded at all.
 * 'unsafe-eval' is added only in development (React's dev tooling uses eval).
 *
 * img-src: Supabase Storage (gallery / member photos), YouTube thumbnails
 * (press page), data:/blob: (QR codes, upload previews).
 * connect-src: Supabase (browser uploads in the admin panel); ws: only for
 * the development server's hot reload.
 * frame-src: Google Maps embed (contact page) and the privacy-friendly
 * YouTube player (press page, loads only after a click).
 * upgrade-insecure-requests only in production with an https Supabase URL
 * (a local production build against http://127.0.0.1 Supabase must still load images).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob:", supabase, "https://i.ytimg.com"].filter(Boolean).join(" "),
  "font-src 'self' data:",
  ["connect-src 'self'", supabase, isDev ? "ws: wss:" : null].filter(Boolean).join(" "),
  "frame-src https://www.google.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  !isDev && supabase?.startsWith("https://") ? "upgrade-insecure-requests" : null,
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Images are pre-compressed (WebP + thumbnails) at upload time and served
  // straight from Supabase Storage, so Next's image optimizer is not used.
  images: { unoptimized: true },
  // Two root layouts (public [lang] and admin) → a global 404 for unmatched URLs.
  experimental: { globalNotFound: true },
  // Tailwind CSS v4 via the Turbopack loader (from create-next-app).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
