import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { pickText } from "@/i18n/content";
import { Localized } from "@/i18n/localized";
import { home } from "@/i18n/messages/home";
import type { ActivityCategory } from "@/lib/gallery/queries";
import { container } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { HomeHeading } from "./section-heading";
import { outlineButton } from "./styles";

/** কার্যক্রমের ক্ষেত্র: every active category (localized name and summary) → /activities/<slug>. */
export function HomeCategories({ lang, categories }: { lang: Locale; categories: ActivityCategory[] }) {
  if (categories.length === 0) return null;
  const t = home[lang].categories;
  return (
    <section aria-labelledby="activities-title" data-home-section="categories" className="border-y border-line bg-surface py-16 sm:py-20">
      <div className={container}>
        <HomeHeading id="activities-title" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
        {/* Flex rather than grid so an incomplete last row (13 areas) is centred. */}
        <ul className="flex flex-wrap justify-center gap-4" data-testid="home-categories">
          {categories.map((c) => {
            const name = pickText(lang, c.name_bn, c.name_en);
            const summary = pickText(lang, c.summary, c.summary_en);
            return (
              <li key={c.id} className="reveal min-w-0 basis-full sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]">
                <Link
                  href={localePath(lang, `/activities/${c.slug}`)}
                  className="lift group flex h-full items-start gap-4 rounded-[var(--radius-card)] border border-line bg-cream/60 p-4 hover:border-sage-300 hover:bg-sage-50 sm:p-5"
                >
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-forest-700 ring-1 ring-sage-200 transition-colors group-hover:bg-forest-600 group-hover:text-white">
                    <CategoryIcon name={c.icon} className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    <Localized value={name} className="block font-serif text-lg font-semibold leading-snug text-forest-800 group-hover:text-forest-600" />
                    {summary.text && <Localized value={summary} className="mt-1 block text-[0.95rem] leading-relaxed text-muted" />}
                  </span>
                  <ArrowRight className="mt-1 size-5 shrink-0 text-forest-600 opacity-60 transition-opacity group-hover:opacity-100 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-10 text-center">
          <Link href={localePath(lang, "/activities")} className={outlineButton("md")}>
            {t.all}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
