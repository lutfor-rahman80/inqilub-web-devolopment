import { Download, ExternalLink } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { home } from "@/i18n/messages/home";
import { container } from "@/components/ui/card";
import { FacebookIcon } from "@/components/ui/facebook-icon";
import { FacebookQr } from "@/components/site/facebook-qr";
import { SocialIcon } from "@/components/site/social-menu-icons";
import type { SocialItem } from "@/components/site/nav";
import { primaryButton } from "./styles";

/**
 * Facebook / social band: the Facebook page (button + scannable QR code) and
 * the other platforms an admin has saved. Only validated, saved links are
 * shown; the band is left out when there are none.
 */
export function SocialBand({ lang, social }: { lang: Locale; social: SocialItem[] }) {
  if (social.length === 0) return null;
  const t = home[lang].social;
  const newTab = common[lang].social.opensInNewTab;
  const facebook = social.find((s) => s.platform === "facebook") ?? null;
  const others = social.filter((s) => s.platform !== "facebook");

  return (
    <section aria-labelledby="social-title" data-home-section="social" className={`${container} pt-16 sm:pt-20`}>
      <div className="reveal overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center gap-8 p-6 text-center sm:p-8 md:flex-row md:text-start">
          <div className="min-w-0 flex-1">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-100 text-forest-700 ring-1 ring-sage-200">
              {facebook ? <FacebookIcon className="size-8" /> : <SocialIcon platform={social[0].platform} className="size-8" />}
            </span>
            <h2 id="social-title" className="mt-4 text-2xl font-bold text-forest-800 sm:text-3xl">
              {facebook ? t.titleFacebook : t.title}
            </h2>
            <p className="mt-2 text-lg text-muted">{facebook ? t.bodyFacebook : t.body}</p>
            {facebook && (
              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center md:justify-start">
                <a href={facebook.url} target="_blank" rel="noopener noreferrer" className={primaryButton("lg")}>
                  <FacebookIcon className="size-5" />
                  {t.facebookButton}
                  <span className="sr-only"> {newTab}</span>
                </a>
              </div>
            )}
            {others.length > 0 && (
              <div className="mt-6">
                {facebook && <p id="social-others" className="mb-2 font-semibold text-forest-800">{t.otherChannels}</p>}
                <ul
                  aria-labelledby={facebook ? "social-others" : "social-title"}
                  className="flex flex-wrap justify-center gap-2 md:justify-start"
                  data-testid="home-social-links"
                >
                  {others.map((s) => (
                    <li key={s.platform}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-sage-200 bg-white px-4 font-semibold text-forest-800 transition-colors hover:bg-sage-100"
                      >
                        <SocialIcon platform={s.platform} className="size-5" />
                        {s.label}
                        <ExternalLink className="size-4 text-muted" aria-hidden="true" />
                        <span className="sr-only"> {newTab}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {facebook && (
            <figure className="flex flex-col items-center gap-2">
              <FacebookQr url={facebook.url} size={184} lang={lang} />
              <figcaption className="text-sm text-muted">{t.qrCaption}</figcaption>
              <a
                href="/qr/facebook"
                download="inqilab-jubo-sangathan-facebook-qr.png"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-forest-700 underline-offset-4 hover:underline"
              >
                <Download className="size-4" aria-hidden="true" />
                {t.qrDownload}
              </a>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
