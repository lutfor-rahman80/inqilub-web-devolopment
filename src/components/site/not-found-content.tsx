import Link from "next/link";
import { House, Images, Layers, Megaphone, Mail } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { container } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { common } from "@/i18n/messages/common";
import { localePath } from "@/i18n/paths";
import { num } from "@/lib/format";

type CommonMessages = (typeof common)["bn"];

const SUGGESTIONS = [
  { href: "/activities", key: "activities", icon: Layers },
  { href: "/gallery", key: "gallery", icon: Images },
  { href: "/announcements", key: "announcements", icon: Megaphone },
  { href: "/contact", key: "contact", icon: Mail },
] as const;

/** Body of the public 404 page (inside SiteChrome). */
export function NotFoundContent({ lang, t }: { lang: Locale; t: CommonMessages }) {
  return (
    <section className={`${container} py-16 sm:py-24`} aria-labelledby="not-found-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-serif text-7xl font-bold text-gold-700 sm:text-8xl" aria-hidden="true">{num(lang, 404)}</p>
        <h1 id="not-found-title" className="mt-4 text-3xl font-bold sm:text-4xl">{t.notFound.title}</h1>
        <p className="mt-4 text-lg text-muted">{t.notFound.body}</p>
        <div className="mt-8 flex justify-center">
          <LinkButton href={localePath(lang, "/")} size="lg">
            <House className="size-5" aria-hidden="true" />
            {t.actions.goHome}
          </LinkButton>
        </div>
        <nav aria-label={t.notFound.linksLabel} className="mt-10">
          <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {SUGGESTIONS.map(({ href, key, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={localePath(lang, href)}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-start font-medium text-ink shadow-sm hover:border-brand-200 hover:bg-brand-50"
                >
                  <Icon className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
                  {t.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
