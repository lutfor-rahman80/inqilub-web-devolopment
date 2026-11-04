import { fmt } from "@/i18n/config";
import { FmtText } from "@/i18n/localized";
import { memberPhotoUrl } from "@/lib/storage";
import { initials } from "@/lib/membership/display";

/** Bengali defaults (admin panel); public pages pass their language's labels. */
const BN_LABELS = { photoAlt: "{name}-এর ছবি", noPhoto: "{name} (ছবি যুক্ত করা হয়নি)" };

/**
 * Member photo, or a calm initials placeholder when no photo has been added.
 * `nameLang`: the name's language when it differs from the page (a Bengali
 * name on an English page) — the photo's alt is then the name alone, marked
 * lang="bn" (an alt cannot mark part of "Photo of …"), and the placeholder's
 * visually hidden label marks just the name.
 */
export function MemberAvatar({
  name,
  photoPath,
  size = 64,
  rounded = "full",
  className = "",
  eager = false,
  labels = BN_LABELS,
  tone = "brand",
  nameLang,
}: {
  name: string;
  photoPath: string | null;
  size?: number;
  rounded?: "full" | "xl";
  className?: string;
  eager?: boolean;
  /** "{name}" templates for the photo's alt text and the placeholder's label. */
  labels?: { photoAlt: string; noPhoto: string };
  /** Placeholder colours: brand (admin) or the softer public v2 palette. */
  tone?: "brand" | "v2";
  nameLang?: "bn" | "en";
}) {
  const url = memberPhotoUrl(photoPath);
  const shape = rounded === "full" ? "rounded-full" : "rounded-2xl";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nameLang ? name : fmt(labels.photoAlt, { name })}
        lang={nameLang}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`${shape} shrink-0 bg-stone-100 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const text = initials(name);
  const scale = /[ঀ-৿]/.test(text) ? 0.44 : 0.36;
  const colours =
    tone === "v2" ? "bg-sage-100 text-forest-800 ring-sage-200" : "bg-brand-100 text-brand-800 ring-brand-200";
  return (
    <span
      className={`${shape} inline-flex shrink-0 select-none items-center justify-center font-serif font-bold ring-1 ring-inset ${colours} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * scale) }}
      data-avatar="placeholder"
    >
      <span aria-hidden="true" lang={nameLang}>
        {text}
      </span>
      <span className="sr-only">
        <FmtText template={labels.noPhoto} name="name" value={name} valueLang={nameLang} />
      </span>
    </span>
  );
}
