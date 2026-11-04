import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { SITE_URL } from "@/lib/env";
import type { SiteSettings } from "@/lib/settings";
import { jsonLdString } from "@/lib/programs/jsonld";
import type { SocialItem } from "@/components/site/nav";

/**
 * schema.org Organization for the homepage. Facts only from site settings:
 * names (Bengali + English), the site URL, the official logo, the saved and
 * validated social links (sameAs) and the general location (Narayanganj, BD).
 * Pure so it can be unit tested.
 */
export function organizationJsonLd(settings: SiteSettings, social: SocialItem[], lang: Locale) {
  const org = settings.organization;
  const nameBn = org.name_bn.trim();
  const nameEn = org.en.name.trim();
  const name = lang === "en" && nameEn ? nameEn : nameBn;
  const alternateName = [nameBn, nameEn].filter((n) => n && n !== name);
  const description = (lang === "en" && org.en.tagline.trim()) || org.tagline.trim();
  const locality = (lang === "en" && org.en.location.trim()) || org.location.trim();
  const sameAs = [...new Set(social.map((s) => s.url))];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name,
    ...(alternateName.length > 0 ? { alternateName } : {}),
    url: `${SITE_URL}${localePath(lang, "/")}`,
    logo: `${SITE_URL}/brand/logo.png`,
    ...(description ? { description } : {}),
    ...(org.slogan.trim() ? { slogan: org.slogan.trim() } : {}),
    address: {
      "@type": "PostalAddress",
      ...(locality ? { addressLocality: locality } : {}),
      addressCountry: "BD",
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** <script type="application/ld+json"> with the Organization (text escaped so it cannot close the tag). */
export function OrganizationJsonLd({ settings, social, lang }: { settings: SiteSettings; social: SocialItem[]; lang: Locale }) {
  return (
    <script
      type="application/ld+json"
      // JSON of validated settings; "<" is escaped by jsonLdString (Next.js JSON-LD guide).
      dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd(settings, social, lang)) }}
    />
  );
}
