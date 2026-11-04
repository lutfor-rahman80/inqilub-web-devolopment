import { getPublicSettings } from "@/lib/site/settings";
import { qrPng } from "@/lib/site/qr";
import { safeFacebookUrl } from "@/lib/site/urls";

/**
 * GET /qr/facebook — print-quality PNG (1024×1024, error correction Q,
 * 4-module quiet zone) of a QR code for the configured Facebook page.
 * Generated from site settings on each request; cached briefly so a changed
 * URL shows up within minutes.
 */
export async function GET() {
  const { contact } = await getPublicSettings();
  const url = safeFacebookUrl(contact.facebook_url);
  if (!url) {
    return new Response("ফেসবুক পেজের লিংক নির্ধারণ করা নেই।", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const png = await qrPng(url, 1024);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Content-Disposition": 'inline; filename="inqilab-jubo-sangathan-facebook-qr.png"',
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
