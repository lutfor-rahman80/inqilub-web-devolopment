import Link from "next/link";
import { ArrowRight, CalendarDays, Pin } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { announcements } from "@/i18n/messages/announcements";
import { formatDate } from "@/lib/format";
import { excerpt } from "@/lib/site/text";
import type { PublicAnnouncement } from "@/lib/site/queries";

/**
 * Announcement summary card (the title links to the detail page; the whole
 * card is clickable). English pages show title_en/body_en when present and
 * fall back to the Bengali text marked lang="bn".
 */
export function AnnouncementCard({
  item,
  lang,
  headingLevel = "h3",
  excerptLength = 200,
}: {
  item: PublicAnnouncement;
  lang: Locale;
  headingLevel?: "h2" | "h3";
  excerptLength?: number;
}) {
  const t = announcements[lang];
  const Heading = headingLevel;
  const title = pickText(lang, item.title, item.title_en);
  const body = pickText(lang, item.body, item.body_en);
  const summary = { ...body, text: excerpt(body.text, excerptLength) };
  return (
    <article
      className={`lift group relative flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${
        item.is_pinned ? "border-gold-400" : "border-line"
      } has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-gold-500`}
      data-announcement-id={item.id}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {item.is_pinned && (
          <span className="inline-flex items-center rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800 ring-1 ring-gold-400/40 ring-inset">
            <Pin className="me-1 size-3.5" aria-hidden="true" />
            {t.pinned}
          </span>
        )}
        {item.published_at && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-forest-600" aria-hidden="true" />
            <time dateTime={item.published_at}>{formatDate(item.published_at, lang)}</time>
          </span>
        )}
      </div>
      {/* Admin text may hold long URLs or unbroken words: wrap anywhere so the card never widens the page. */}
      <Heading className="text-xl font-bold leading-snug text-forest-800 wrap-anywhere">
        <Link
          href={localePath(lang, `/announcements/${item.id}`)}
          className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:text-forest-600 focus-visible:outline-none"
        >
          <Localized value={title} />
        </Link>
      </Heading>
      {summary.text && <Localized as="p" className="mt-2 flex-1 text-muted wrap-anywhere" value={summary} />}
      <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1 font-semibold text-forest-700 group-hover:gap-2 motion-safe:transition-all">
        {t.readMore} <ArrowRight className="size-4 rtl:rotate-180" />
      </span>
    </article>
  );
}
