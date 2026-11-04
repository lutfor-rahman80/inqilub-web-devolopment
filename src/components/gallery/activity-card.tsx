import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { activities } from "@/i18n/messages/activities";
import { num } from "@/lib/format";
import { photoAlt } from "@/lib/gallery/types";
import type { ActivityCategory } from "@/lib/gallery/queries";
import { CategoryIcon } from "@/components/ui/category-icon";

/**
 * Card for one activity category: cover photo (or a calm icon tile), name,
 * summary, photo count — in the page's language (Bengali fallback marked).
 */
export function ActivityCard({ category, lang = "bn" }: { category: ActivityCategory; lang?: Locale }) {
  const t = activities[lang].card;
  const { cover } = category;
  const name = pickText(lang, category.name_bn, category.name_en);
  const summary = pickText(lang, category.summary, category.summary_en);
  const count = category.photoCount;
  return (
    <Link
      href={localePath(lang, `/activities/${category.slug}`)}
      className="lift group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]"
    >
      <div className="zoom-on-hover relative aspect-[16/10] overflow-hidden bg-sage-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.thumb}
            srcSet={`${cover.thumb} ${cover.thumbWidth}w, ${cover.src} ${cover.width}w`}
            sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
            alt={photoAlt(cover, 0, lang)}
            lang={lang === "en" && cover.caption ? "bn" : undefined}
            width={cover.thumbWidth}
            height={cover.thumbHeight}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <div className="relative flex size-full items-center justify-center">
            <div aria-hidden="true" className="pattern-islamic absolute inset-0 opacity-60" />
            <span className="relative inline-flex size-20 items-center justify-center rounded-full border border-sage-300 bg-white text-forest-600 shadow-sm">
              <CategoryIcon name={category.icon} className="size-10" />
            </span>
          </div>
        )}
        {cover && (
          <span className="absolute start-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-white/95 text-forest-700 shadow">
            <CategoryIcon name={category.icon} className="size-6" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold text-forest-800 group-hover:text-forest-600">
          <Localized value={name} />
        </h3>
        {summary.text && <Localized as="p" className="mt-2 flex-1 text-muted" value={summary} />}
        <p className="mt-4 flex items-center justify-between gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5 text-forest-700">
            <Images className="size-4" aria-hidden="true" />
            {count === 1 ? t.photoOne : count > 0 ? fmt(t.photos, { count: num(lang, count) }) : t.noPhotos}
          </span>
          <span className="inline-flex items-center gap-1 text-gold-800">
            {t.details}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180" aria-hidden="true" />
          </span>
        </p>
      </div>
    </Link>
  );
}
