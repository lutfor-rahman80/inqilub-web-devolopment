import type { Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { localePath } from "@/i18n/paths";
import { formatDate } from "@/lib/format";
import type { GalleryPhoto } from "@/lib/gallery/types";
import { programDateText } from "@/lib/programs/format";

/** A hero photo with the published program it is linked to (null when none, or not published). */
export type HeroPhoto = GalleryPhoto & {
  program: { slug: string; titleBn: string; titleEn: string | null; startsOn: string; endsOn: string | null } | null;
};

/**
 * One slide as the hero slider renders it (serializable: passed to a client
 * component). Every text comes from the database — nothing is invented:
 *   label: the linked program's title, else the photo's activity category,
 *          else the photo's own caption, else the generic `fallbackLabel`;
 *   date:  the photo's event date, else the program's date(s), else none;
 *   href:  the program page, else the category's activity page, else the gallery.
 * `labelLang`/`altLang` are "bn" where an English page shows Bengali text
 * (a missing English title or name, or a caption — captions are Bengali only).
 */
export type HeroSlide = {
  id: string;
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  alt: string;
  altLang?: "bn";
  label: string;
  labelLang?: "bn";
  date: string | null;
  href: string;
  link: "program" | "activity" | "gallery";
};

export function toHeroSlides(photos: HeroPhoto[], lang: Locale, fallbackLabel: string): HeroSlide[] {
  return photos.map((photo) => {
    const caption = photo.caption.trim();
    const { program, category } = photo;
    const picked = program
      ? pickText(lang, program.titleBn, program.titleEn)
      : category
        ? pickText(lang, category.name, category.nameEn)
        : caption
          ? { text: caption, lang: "bn" as const, isFallback: lang === "en" }
          : { text: fallbackLabel, lang, isFallback: false };
    const label = picked.text.trim() || fallbackLabel;
    const labelLang = picked.isFallback ? ("bn" as const) : undefined;
    const date = photo.eventDate
      ? formatDate(photo.eventDate, lang)
      : program
        ? programDateText(program.startsOn, program.endsOn, lang)
        : null;
    const [href, link] = program
      ? [localePath(lang, `/programs/${program.slug}`), "program" as const]
      : category
        ? [localePath(lang, `/activities/${category.slug}`), "activity" as const]
        : [localePath(lang, "/gallery"), "gallery" as const];
    return {
      id: photo.id,
      src: photo.src,
      // The thumbnail (480px) is enough for small screens at 1×; the full photo otherwise.
      srcSet: photo.thumb !== photo.src ? `${photo.thumb} ${photo.thumbWidth}w, ${photo.src} ${photo.width}w` : undefined,
      width: photo.width,
      height: photo.height,
      // The caption describes the photo; without one, the slide's label does.
      alt: caption || label,
      altLang: caption ? (lang === "en" ? "bn" : undefined) : labelLang,
      label,
      labelLang,
      date: date || null,
      href,
      link,
    };
  });
}
