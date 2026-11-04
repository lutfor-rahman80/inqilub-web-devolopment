import type { Locale } from "@/i18n/config";
import { currentLocale } from "@/i18n/server";
import { contact } from "@/i18n/messages/contact";
import { safeFacebookUrl } from "@/lib/site/urls";
import { qrSvg } from "@/lib/site/qr";

/**
 * Server-rendered QR code for the configured Facebook page. Renders nothing
 * unless the URL is a valid https://(www.|m.)facebook.com address. The
 * accessible name is `label`, or the localized default of `lang` (else the
 * current route's language).
 */
export async function FacebookQr({
  url,
  size = 176,
  className = "",
  label,
  lang,
}: {
  url: string | null | undefined;
  size?: number;
  className?: string;
  label?: string;
  lang?: Locale;
}) {
  const safe = safeFacebookUrl(url);
  if (!safe) return null;
  const name = label ?? contact[lang ?? (await currentLocale())].facebook.qrLabel;
  const svg = await qrSvg(safe);
  return (
    <div
      role="img"
      aria-label={name}
      data-qr-url={safe}
      className={`shrink-0 rounded-xl bg-white p-2 ring-1 ring-line [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size }}
      // The SVG markup is produced by the qrcode library from a validated URL.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
