"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Expand } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { photoViewerMessages, type GalleryGridMessages, type LightboxMessages } from "@/i18n/messages/gallery";
import { splitTemplate } from "@/i18n/localized";
import { formatDate } from "@/lib/format";
import { photoAlt as alt, type GalleryPhoto } from "@/lib/gallery/types";
import { preloadLightbox, useLightbox } from "./use-lightbox";

const PhotoLightbox = dynamic(() => import("./photo-lightbox"), { ssr: false });

/**
 * Responsive thumbnail grid (fixed 4:3 boxes, lazy-loaded) that opens a
 * full-size lightbox. Each thumbnail is a real link to the full image, so it
 * still works without JavaScript.
 *
 * Alt text = caption, or the category name (+ position) when there is none.
 * Captions are written in Bengali, so on English pages they are marked
 * lang="bn". The thumbnail link is named by its content — visually hidden
 * "View larger:" around the image, whose alt keeps its own language — not by
 * an aria-label that would put the Bengali caption into an English string.
 * Labels come from `labels` (preferred) or the gallery messages of
 * `lang`; without either, the current route's language is used.
 */
export function PhotoGrid({
  photos,
  showCategory = true,
  label,
  lang: langProp,
  labels,
}: {
  photos: GalleryPhoto[];
  showCategory?: boolean;
  label?: string;
  lang?: Locale;
  labels?: { grid: GalleryGridMessages; lightbox: LightboxMessages };
}) {
  const params = useParams<{ lang?: string }>();
  const lang: Locale = langProp ?? (isLocale(params?.lang) ? params.lang : "bn");
  const t = labels ?? photoViewerMessages[lang];
  const lb = useLightbox();
  const captionLang = lang === "en" ? "bn" : undefined;
  const categoryName = (p: GalleryPhoto) =>
    p.category ? (lang === "en" ? p.category.nameEn?.trim() || p.category.name : p.category.name) : "";
  const categoryLang = (p: GalleryPhoto) => (lang === "en" && !p.category?.nameEn?.trim() ? "bn" : undefined);
  const [enlargeBefore, enlargeAfter] = splitTemplate(t.grid.enlarge, "alt");

  return (
    <>
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        aria-label={label ?? t.grid.listLabel}
        onPointerEnter={preloadLightbox}
        onFocus={preloadLightbox}
      >
        {photos.map((photo, i) => {
          const text = alt(photo, i, lang);
          const altLang = photo.caption ? captionLang : categoryLang(photo);
          return (
            <li key={photo.id}>
              <figure className="h-full overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
                <a
                  href={photo.src}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    lb.open(i, e.currentTarget);
                  }}
                  className="zoom-on-hover group relative block aspect-[4/3] overflow-hidden bg-sage-100 focus-visible:outline-offset-[-3px]"
                  data-photo-id={photo.id}
                >
                  {enlargeBefore && <span className="sr-only">{enlargeBefore}</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumb}
                    alt={text}
                    lang={altLang}
                    width={photo.thumbWidth}
                    height={photo.thumbHeight}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  {enlargeAfter && <span className="sr-only">{enlargeAfter}</span>}
                  <span className="pointer-events-none absolute end-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand className="size-4" aria-hidden="true" />
                  </span>
                </a>
                {(photo.caption || photo.eventDate || (showCategory && photo.category)) && (
                  <figcaption className="space-y-1 px-3 py-2.5">
                    {photo.caption && (
                      <p className="line-clamp-2 leading-snug text-ink" lang={captionLang}>
                        {photo.caption}
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                      {showCategory && photo.category && (
                        <Link
                          href={localePath(lang, `/activities/${photo.category.slug}`)}
                          className="inline-flex min-h-11 items-center font-medium text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
                          lang={categoryLang(photo)}
                        >
                          {categoryName(photo)}
                        </Link>
                      )}
                      {photo.eventDate && <time dateTime={photo.eventDate}>{formatDate(photo.eventDate, lang)}</time>}
                    </p>
                  </figcaption>
                )}
              </figure>
            </li>
          );
        })}
      </ul>
      {lb.mounted && (
        <PhotoLightbox
          photos={photos}
          index={lb.index}
          open={lb.isOpen}
          onClose={lb.close}
          onExited={lb.exited}
          lang={lang}
          labels={t.lightbox}
        />
      )}
    </>
  );
}
