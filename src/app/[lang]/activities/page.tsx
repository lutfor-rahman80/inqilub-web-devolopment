import "server-only";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { activities as activitiesMessages } from "@/i18n/messages/activities";
import { pageMetadata } from "@/lib/site/metadata";
import { getActivityCategoriesWithCovers } from "@/lib/gallery/queries";
import { container } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { ActivityCard } from "@/components/gallery/activity-card";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) return {};
  const t = activitiesMessages[locale];
  return pageMetadata({ title: t.title, description: t.metaDescription, path: "/activities", lang: locale });
}

export default async function ActivitiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = ((await params).lang as Locale) ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) notFound();
  const lang = locale;
  const t = activitiesMessages[lang];

  const categories = await getActivityCategoriesWithCovers();

  return (
    <main>
      <PageHero lang={lang} title={t.title} eyebrow={t.eyebrow} breadcrumb={[{ href: "/activities", label: t.crumb }]} />
      <section className={`${container} py-12 sm:py-14`} aria-labelledby="activity-list-heading">
        <h2 id="activity-list-heading" className="sr-only">
          {t.listHeading}
        </h2>
        {categories.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white px-6 py-14 text-center text-lg text-muted shadow-[var(--shadow-card)]">
            {t.empty}
          </p>
        ) : (
          <ul data-testid="activity-list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id} className="min-w-0">
                <ActivityCard category={category} lang={lang} />
              </li>
            ))}
          </ul>
        )}
        <p className="mx-auto mt-12 max-w-2xl text-center text-muted">
          {t.programsNote}{" "}
          <Link
            href={localePath(lang, "/programs")}
            className="inline-flex items-center gap-1 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline"
          >
            {t.programsLink}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </p>
      </section>
    </main>
  );
}
