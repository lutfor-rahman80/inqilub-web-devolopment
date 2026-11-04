import Link from "next/link";
import { ArrowRight, CalendarDays, Pin } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { home } from "@/i18n/messages/home";
import { formatDate } from "@/lib/format";
import { excerpt } from "@/lib/site/text";
import { container } from "@/components/ui/card";
import type { HomeAnnouncement } from "./data";
import { HomeHeading } from "./section-heading";
import { ghostButton } from "./styles";

/** Latest three announcements (English title/body when given, otherwise the Bengali text marked lang="bn"). */
export function HomeAnnouncements({ lang, items }: { lang: Locale; items: HomeAnnouncement[] }) {
  if (items.length === 0) return null;
  const t = home[lang].announcements;
  return (
    <section aria-labelledby="announcements-title" data-home-section="announcements" className="bg-cream py-16 sm:py-20">
      <div className={container}>
        <HomeHeading
          id="announcements-title"
          eyebrow={t.eyebrow}
          title={t.title}
          align="start"
          className="mb-8"
          action={
            <Link href={localePath(lang, "/announcements")} className={ghostButton("md", "-ms-2.5 px-2.5 sm:ms-0 sm:px-5")}>
              {t.all}
              <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-5 md:grid-cols-3" data-testid="home-announcements">
          {items.map((a) => {
            const title = pickText(lang, a.title, a.title_en);
            // Body follows the title's language so a card never mixes languages; on an English page a
            // Bengali body comes back as a fallback, so <Localized> marks it lang="bn".
            const body = title.isFallback ? pickText(lang, a.body, null) : pickText(lang, a.body, a.body_en);
            const summary = { ...body, text: excerpt(body.text, 140) };
            return (
              <li key={a.id} className="reveal min-w-0">
                <article
                  className={`lift group relative flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border bg-surface p-5 shadow-[var(--shadow-card)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-gold-500 sm:p-6 ${
                    a.is_pinned ? "border-gold-400" : "border-line"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    {a.is_pinned && (
                      <span className="inline-flex items-center rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800 ring-1 ring-inset ring-gold-400/40">
                        <Pin className="me-1 size-3.5" aria-hidden="true" />
                        {t.pinned}
                      </span>
                    )}
                    {a.published_at && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        <time dateTime={a.published_at}>{formatDate(a.published_at, lang)}</time>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold leading-snug text-forest-800 wrap-anywhere">
                    <Link
                      href={localePath(lang, `/announcements/${a.id}`)}
                      className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:text-forest-600 focus-visible:outline-none"
                    >
                      <Localized value={title} />
                    </Link>
                  </h3>
                  {summary.text && <Localized as="p" value={summary} className="mt-2 flex-1 text-muted wrap-anywhere" />}
                  <span aria-hidden="true" className="mt-4 inline-flex items-center gap-1 font-semibold text-forest-700 group-hover:gap-2 motion-safe:transition-all">
                    {t.readMore} <ArrowRight className="size-4 rtl:rotate-180" />
                  </span>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
