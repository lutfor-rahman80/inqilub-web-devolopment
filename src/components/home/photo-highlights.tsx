import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { home } from "@/i18n/messages/home";
import { photoAlt, type GalleryPhoto } from "@/lib/gallery/types";
import { container } from "@/components/ui/card";
import { HomeHeading } from "./section-heading";
import { outlineButton } from "./styles";

/**
 * Latest published photos (4:3 tiles, lazy, space reserved) → the gallery,
 * filtered to each photo's category. Hidden when there are no photos.
 */
export function PhotoHighlights({ lang, photos }: { lang: Locale; photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null;
  const t = home[lang].photos;
  const gallery = localePath(lang, "/gallery");
  return (
    <section aria-labelledby="gallery-title" data-home-section="photos" className="border-y border-sage-200 bg-sage-50 py-16 sm:py-20">
      <div className={container}>
        <HomeHeading id="gallery-title" eyebrow={t.eyebrow} title={t.title} className="mb-8" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3" aria-label={t.listLabel} data-testid="home-photos">
          {photos.map((photo, i) => {
            const alt = photoAlt(photo, i, lang);
            const nameEn = photo.category?.nameEn?.trim();
            const categoryName = lang === "en" ? nameEn || photo.category?.name : photo.category?.name;
            const caption = photo.caption?.trim();
            const displayText = caption || categoryName;
            const altIsBengali = lang === "en" && (Boolean(caption) || !nameEn);
            return (
              <li key={photo.id} className="reveal min-w-0">
                <Link
                  href={photo.category ? `${gallery}?category=${photo.category.slug}` : gallery}
                  className="zoom-on-hover group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-sage-100 shadow-[var(--shadow-card)] ring-1 ring-forest-900/5 focus-visible:outline-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumb}
                    alt={alt}
                    lang={altIsBengali ? "bn" : undefined}
                    width={photo.thumbWidth}
                    height={photo.thumbHeight}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  <span className="sr-only"> — {t.viewInGallery}</span>
                  {displayText && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/85 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold text-white"
                    >
                      <span className="line-clamp-2 leading-snug" lang={lang === "en" && (caption || !nameEn) ? "bn" : undefined}>
                        {displayText}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 text-center">
          <Link href={gallery} className={outlineButton("md")}>
            {t.all}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
