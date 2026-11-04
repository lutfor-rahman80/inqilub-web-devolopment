"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { FacebookIcon } from "@/components/ui/facebook-icon";
import { buttonClass } from "@/components/ui/button";
import { isLocale, type Locale } from "@/i18n/config";
import { FmtText } from "@/i18n/localized";
import { shareLabels, type ShareLabels } from "@/i18n/messages/seo";
import { facebookShareUrl, whatsappShareUrl } from "@/lib/site/urls";

const button = (extra = "") =>
  buttonClass("outline", "md", `press border-forest-600 bg-white text-forest-800 hover:bg-sage-100 ${extra}`);

/** True in browsers that can open the system share sheet (most phones); false on the server. */
function useCanShare(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

/**
 * Share links for a public page: Facebook, WhatsApp (plain links, no SDK or
 * third-party script — nothing is sent anywhere until the visitor clicks),
 * the phone's own share sheet where available (Messenger and other apps;
 * Facebook's Messenger "send" dialog needs an app id, so it is not linked
 * directly) and copy-link with visible and announced feedback.
 *
 * Labels come from `labels` (preferred) or the share messages of `lang`;
 * without either, the language of the current route is used. The group is
 * named “Share: <title>” through a hidden element, so a Bengali title on an
 * English page can be marked lang="bn" (`titleLang`).
 */
export function ShareButtons({
  url,
  title,
  titleLang,
  lang,
  labels,
}: {
  url: string;
  title: string;
  /** Language of `title` when it differs from the page (a Bengali fallback on an English page). */
  titleLang?: Locale;
  lang?: Locale;
  labels?: ShareLabels;
}) {
  const nameId = useId();
  const params = useParams<{ lang?: string }>();
  const routeLang: Locale = isLocale(params?.lang) ? params.lang : "bn";
  const t = labels ?? shareLabels[lang ?? routeLang];
  const canShare = useCanShare();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    setStatus(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }

  async function shareNative() {
    try {
      await navigator.share({ title, url });
    } catch {
      // Cancelled by the visitor or not allowed: nothing to do.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-labelledby={nameId} role="group" data-share-buttons="">
      <span id={nameId} hidden>
        <FmtText template={t.label} name="title" value={title} valueLang={titleLang} />
      </span>
      <a href={facebookShareUrl(url)} target="_blank" rel="noopener noreferrer" className={button()}>
        <FacebookIcon className="size-5" />
        {t.facebook}
        <span className="sr-only">{t.newTab}</span>
      </a>
      <a href={whatsappShareUrl(url, title)} target="_blank" rel="noopener noreferrer" className={button()}>
        <MessageCircle className="size-5" aria-hidden="true" />
        {t.whatsapp}
        <span className="sr-only">{t.newTab}</span>
      </a>
      {canShare && (
        <button type="button" onClick={shareNative} className={button()}>
          <Share2 className="size-5" aria-hidden="true" />
          {t.more}
        </button>
      )}
      <button type="button" onClick={copy} className={button()}>
        {status === "copied" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        {status === "copied" ? t.copied : t.copy}
      </button>
      <p aria-live="polite" className="sr-only">
        {status === "copied" ? t.copied : status === "failed" ? t.copyFailed : ""}
      </p>
      {status === "failed" && <p className="w-full text-sm text-red-700">{t.copyFailedHelp}</p>}
    </div>
  );
}
