"use client";

import Lightbox, { type SlideImage } from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import type { Locale } from "@/i18n/config";
import type { LightboxMessages } from "@/i18n/messages/gallery";
import { formatDate, num } from "@/lib/format";
import { photoAlt, type GalleryPhoto } from "@/lib/gallery/types";

/**
 * Full-screen photo viewer: keyboard (←/→, Esc), swipe, captions, labels in
 * the page's language. Animations follow the visitor's reduced-motion
 * setting. Lazily loaded by PhotoGrid on first use.
 */
export default function PhotoLightbox({
  photos,
  index,
  open,
  onClose,
  onExited,
  lang = "bn",
  labels,
}: {
  photos: GalleryPhoto[];
  index: number;
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  lang?: Locale;
  labels: LightboxMessages;
}) {
  const total = photos.length;
  const categoryName = (p: GalleryPhoto) =>
    p.category ? (lang === "en" ? p.category.nameEn?.trim() || p.category.name : p.category.name) : "";
  const slides: SlideImage[] = photos.map((p, i) => ({
    src: p.src,
    alt: photoAlt(p, i, lang),
    width: p.width,
    height: p.height,
    srcSet: [
      { src: p.thumb, width: p.thumbWidth, height: p.thumbHeight },
      { src: p.src, width: p.width, height: p.height },
    ],
    title: `${num(lang, i + 1)} / ${num(lang, total)}${p.category ? ` · ${categoryName(p)}` : ""}`,
    description: [p.caption, p.eventDate ? formatDate(p.eventDate, lang) : ""].filter(Boolean).join(" — ") || undefined,
  }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={Math.max(0, Math.min(index, total - 1))}
      slides={slides}
      plugins={[Captions]}
      captions={{ descriptionTextAlign: "center", descriptionMaxLines: 4 }}
      carousel={{ finite: total <= 1, preload: 1 }}
      controller={{ closeOnBackdropClick: true }}
      render={total <= 1 ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      on={{ exited: onExited }}
      styles={{
        container: { backgroundColor: "rgba(16, 32, 25, 0.94)" },
        // The plugin hyphenates (hyphens: auto), which breaks Bengali words.
        captionsDescription: { hyphens: "manual" },
      }}
      labels={labels}
    />
  );
}
