/**
 * schema.org structured data for the pages module (pure; unit tested).
 * Only text that is visible on the page is used.
 */

export type Crumb = { name: string; url: string };

/** BreadcrumbList for a detail page: absolute URLs, in order (home first). */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs
      .filter((c) => c.name.trim() && c.url)
      .map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name.trim(), item: c.url })),
  };
}

export type FaqEntry = { question: string; answer: string };

/**
 * FAQPage with the published questions in the page's language (Bengali
 * fallbacks included as shown on the page). Returns null when there is
 * nothing to describe, so no empty markup is emitted.
 */
export function faqPageJsonLd(entries: FaqEntry[], url: string, inLanguage: string) {
  const items = entries
    .map((e) => ({ question: e.question.trim(), answer: e.answer.replace(/\r\n?/g, "\n").trim() }))
    .filter((e) => e.question && e.answer);
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    inLanguage,
    mainEntity: items.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: { "@type": "Answer", text: e.answer },
    })),
  };
}
