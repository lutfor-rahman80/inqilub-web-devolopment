import Link from "next/link";
import { CalendarDays, ExternalLink, Newspaper } from "lucide-react";
import { fmt, type Locale } from "@/i18n/config";
import { pickText } from "@/i18n/content";
import { FmtText, Localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { press } from "@/i18n/messages/press";
import { formatDate } from "@/lib/format";
import { safeHttpsUrl } from "@/lib/site/urls";
import { isVideoLink, youtubeId } from "@/lib/press/youtube";
import type { PressRow } from "@/lib/press/queries";
import { buttonClass } from "@/components/ui/button";
import { YouTubePlayer } from "./youtube-player";

const KIND_STYLE: Record<string, string> = {
  news: "bg-sage-100 text-forest-800",
  interview: "bg-gold-100 text-gold-800",
  video_report: "bg-forest-600 text-white",
};

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * One press item: outlet, date, type, title, summary, related program and a
 * link to the original publication (https only, new tab). YouTube links get
 * a click-to-load player; other video links simply link out.
 */
export function PressCard({
  item,
  lang,
  headingLevel = "h2",
  showProgram = true,
  layout = "row",
}: {
  item: PressRow;
  lang: Locale;
  headingLevel?: "h2" | "h3";
  showProgram?: boolean;
  /** "row": video beside the text from md up (full-width lists); "stack": video above (narrow columns). */
  layout?: "row" | "stack";
}) {
  const t = press[lang];
  const Heading = headingLevel;
  const title = pickText(lang, item.title_bn, item.title_en);
  const outlet = pickText(lang, item.outlet_bn, item.outlet_en);
  const summary = pickText(lang, item.summary_bn, item.summary_en);
  const url = safeHttpsUrl(item.url);
  const videoId = youtubeId(url);
  const kind = item.kind === "interview" || item.kind === "video_report" ? item.kind : "news";
  const program = one(item.program);
  const linkLabel = isVideoLink(url) || kind === "video_report" ? t.watchVideo : kind === "interview" ? t.readInterview : t.readNews;

  return (
    <article
      className={`h-full rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${
        videoId && layout === "row" ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start" : "flex flex-col gap-3"
      }`}
      data-testid="press-item"
    >
      {videoId && (
        <div className={layout === "row" ? "md:order-last" : ""}>
          <YouTubePlayer
            id={videoId}
            labels={{
              play: t.play,
              playName: <FmtText template={t.playLabel} name="title" value={title.text} valueLang={title.isFallback ? "bn" : undefined} />,
              videoTitle: fmt(t.videoTitle, { title: title.text }),
              note: t.playerNote,
            }}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 font-semibold ${KIND_STYLE[kind]}`}>{t.kind[kind]}</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-forest-800">
            <Newspaper className="size-4 shrink-0 text-forest-600" aria-hidden="true" />
            <span className="sr-only">{t.outlet}: </span>
            <Localized value={outlet} />
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t.date}: </span>
            <time dateTime={item.published_on}>{formatDate(item.published_on, lang)}</time>
          </span>
        </div>
        <Heading className="text-xl font-bold leading-snug text-forest-800 wrap-anywhere">
          <Localized value={title} />
        </Heading>
        {summary.text && <Localized as="p" value={summary} className="whitespace-pre-line text-ink/90" />}
        {showProgram && program && (
          <p className="text-sm">
            <span className="text-muted">{t.relatedProgram}: </span>
            <Link
              href={localePath(lang, `/programs/${program.slug}`)}
              className="inline-flex min-h-11 items-center font-semibold text-forest-700 underline underline-offset-4 hover:text-forest-900"
            >
              <Localized value={pickText(lang, program.title_bn, program.title_en)} />
            </Link>
          </p>
        )}
        {url && (
          <div className="mt-auto pt-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "md", "press border-forest-600 text-forest-800 hover:bg-sage-50")}
            >
              {videoId ? t.watchOnYoutube : linkLabel}
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">
                {" "}— <Localized value={title} /> {t.opensInNewTab}
              </span>
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
