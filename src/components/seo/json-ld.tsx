import { jsonLdString } from "@/lib/programs/jsonld";
import { breadcrumbJsonLd, faqPageJsonLd, type Crumb, type FaqEntry } from "@/lib/site/jsonld";

/**
 * <script type="application/ld+json">. The JSON is produced by the pure
 * builders in src/lib/site/jsonld.ts; jsonLdString escapes "<" so database
 * text can never close the script element (Next.js JSON-LD guide).
 */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}

/** BreadcrumbList for detail pages (absolute URLs, home first). */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  return crumbs.length > 1 ? <JsonLd data={breadcrumbJsonLd(crumbs)} /> : null;
}

/** FAQPage for /faq (nothing when there are no published entries). */
export function FaqJsonLd({ entries, url, lang }: { entries: FaqEntry[]; url: string; lang: string }) {
  return <JsonLd data={faqPageJsonLd(entries, url, lang)} />;
}
