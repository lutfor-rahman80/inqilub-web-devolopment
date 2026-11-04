import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { programs } from "@/i18n/messages/programs";
import { fitWithin } from "@/lib/gallery/paths";
import { programDateText } from "@/lib/programs/format";
import { galleryUrl } from "@/lib/storage";
import { programStatus } from "@/lib/programs/status";
import type { ProgramCardRow } from "@/lib/programs/queries";
import { CategoryIcon } from "@/components/ui/category-icon";
import { StatusBadge } from "./status-badge";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * Shared program (কর্মসূচি) card for the homepage, /programs and category pages.
 * Owned by the programs module — keep the props stable.
 *
 * layout="vertical" (default): image on top, text below — the card used in
 * grids and in the homepage's scrolling rows.
 * layout="horizontal": the wide card for a homepage section with a single
 * program — from 640px the image takes the start side (46%) and the text the
 * rest, with a larger title and one more summary line; on phones it stacks
 * like the vertical card.
 */
export function ProgramCard({
  program,
  lang,
  headingLevel = "h3",
  layout = "vertical",
}: {
  program: ProgramCardRow;
  lang: Locale;
  headingLevel?: "h2" | "h3";
  layout?: "vertical" | "horizontal";
}) {
  const t = programs[lang];
  const status = programStatus(program);
  const title = pickText(lang, program.title_bn, program.title_en);
  const summary = pickText(lang, program.summary_bn, program.summary_en);
  const location = program.location_bn || program.location_en ? pickText(lang, program.location_bn, program.location_en) : null;
  const category = one(program.category);
  const cover = one(program.cover);
  const img = galleryUrl(cover?.thumb_path ?? cover?.storage_path);
  const size = cover?.thumb_path
    ? fitWithin(cover.width ?? 1600, cover.height ?? 1200, 480)
    : { width: cover?.width ?? 1600, height: cover?.height ?? 1200 };
  const dateText = programDateText(program.starts_on, program.ends_on, lang);
  const Heading = headingLevel;
  const wide = layout === "horizontal";

  return (
    <article
      data-layout={layout}
      className={`lift group relative flex h-full flex-col ${wide ? "sm:flex-row" : ""} overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-gold-500`}
    >
      <div
        data-card-media
        className={`zoom-on-hover relative aspect-[16/9] overflow-hidden bg-sage-100 ${wide ? "sm:aspect-auto sm:min-h-66 sm:w-[46%] sm:shrink-0" : ""}`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            width={size.width}
            height={size.height}
            loading="lazy"
            decoding="async"
            className={`size-full object-cover ${wide ? "absolute inset-0" : ""}`}
          />
        ) : (
          <div className={`pattern-islamic flex size-full items-center justify-center text-forest-600 ${wide ? "absolute inset-0" : ""}`}>
            {category && <CategoryIcon name={category.icon} className={`size-12 ${wide ? "sm:size-18" : ""}`} />}
          </div>
        )}
        <StatusBadge status={status} label={t.status[status]} className="absolute start-3 top-3 shadow-sm" />
      </div>
      <div data-card-body className={`flex flex-1 flex-col p-5 ${wide ? "min-w-0 sm:px-7 sm:pt-7 sm:pb-6" : ""}`}>
        {category && (
          <p className="text-sm font-semibold text-forest-600">
            <Localized value={pickText(lang, category.name_bn, category.name_en)} />
          </p>
        )}
        <Heading className={`mt-1 text-xl font-bold leading-snug ${wide ? "sm:text-2xl sm:leading-[1.4]" : ""}`}>
          <Link href={localePath(lang, `/programs/${program.slug}`)} className="after:absolute after:inset-0 focus-visible:outline-none">
            <Localized value={title} />
          </Link>
        </Heading>
        {summary.text && <Localized as="p" className={`mt-2 line-clamp-3 text-muted ${wide ? "sm:line-clamp-4" : ""}`} value={summary} />}
        <dl className="mt-auto space-y-1 pt-4 text-sm text-ink">
          <div className="flex items-center gap-2">
            <dt className="sr-only">{t.card.date}</dt>
            <CalendarDays className="size-4 shrink-0 text-forest-600" aria-hidden="true" />
            <dd>{dateText}</dd>
          </div>
          {location && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t.card.location}</dt>
              <MapPin className="size-4 shrink-0 text-forest-600" aria-hidden="true" />
              <dd><Localized value={location} /></dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}
