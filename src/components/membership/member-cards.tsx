import { Phone } from "lucide-react";
import { num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import type { MembersMessages } from "@/i18n/messages/members";
import type { DirectoryMember } from "@/lib/membership/directory";
import { MemberAvatar } from "./member-avatar";
import { scriptLang } from "./styles";

type CardLabels = MembersMessages["card"];

function PhoneLink({ phone, lang, t }: { phone: string; lang: Locale; t: CardLabels }) {
  const shown = num(lang, phone);
  return (
    <a
      href={`tel:${phone}`}
      aria-label={fmt(t.call, { phone: shown })}
      className="inline-flex min-h-11 items-center gap-1.5 font-medium text-forest-700 underline-offset-4 hover:underline"
    >
      <Phone className="size-4" aria-hidden="true" />
      {shown}
    </a>
  );
}

/** Office bearers: designation in the page's language (English falls back to Bengali, marked lang="bn"). */
function designationOf(m: DirectoryMember, lang: Locale) {
  return pickText(lang, m.designation, m.designation_en);
}

/** Prominent card for office bearers. */
export function LeaderCard({ m, lang, t, eager = false }: { m: DirectoryMember; lang: Locale; t: CardLabels; eager?: boolean }) {
  return (
    <article className="lift flex h-full flex-col items-center rounded-[var(--radius-card)] border border-gold-400/50 bg-white px-5 pb-5 pt-6 text-center shadow-[var(--shadow-card)]">
      {/* Gold ring, then a white gap, then the photo or initials (same look for both). */}
      <div className="flex rounded-full bg-gradient-to-b from-gold-400 to-gold-600 p-1">
        <div className="flex rounded-full bg-white p-1">
          <MemberAvatar name={m.full_name} photoPath={m.photo_path} size={112} eager={eager} labels={t} tone="v2" nameLang={scriptLang(lang, m.full_name)} />
        </div>
      </div>
      {/* wrap-anywhere: a long name typed without spaces wraps instead of widening the page. */}
      <h3 className="mt-4 max-w-full text-xl font-bold leading-snug text-forest-800 wrap-anywhere" lang={scriptLang(lang, m.full_name)}>
        {m.full_name}
      </h3>
      <p className="mt-1 inline-flex max-w-full rounded-full bg-forest-700 px-3 py-0.5 text-sm font-semibold text-white wrap-anywhere">
        <Localized value={designationOf(m, lang)} />
      </p>
      <p className="mt-2 text-sm text-muted">
        {t.memberNo} <span dir="ltr" className="tabular-nums">{m.member_no}</span>
      </p>
      {m.public_phone && <PhoneLink phone={m.public_phone} lang={lang} t={t} />}
    </article>
  );
}

/** Compact card for general members (and search results). */
export function MemberCard({ m, lang, t }: { m: DirectoryMember; lang: Locale; t: CardLabels }) {
  return (
    <article className="flex h-full items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <MemberAvatar name={m.full_name} photoPath={m.photo_path} size={72} labels={t} tone="v2" nameLang={scriptLang(lang, m.full_name)} />
      <div className="min-w-0">
        <h3 className="font-sans text-lg font-semibold leading-snug text-forest-800 wrap-anywhere" lang={scriptLang(lang, m.full_name)}>
          {m.full_name}
        </h3>
        <p className="text-[0.95rem] text-gold-800">
          <Localized value={designationOf(m, lang)} />
        </p>
        <p className="text-sm text-muted">
          <span className="sr-only">{t.memberNo} </span>
          <span dir="ltr" className="tabular-nums">{m.member_no}</span>
        </p>
        {m.public_phone && <PhoneLink phone={m.public_phone} lang={lang} t={t} />}
      </div>
    </article>
  );
}
