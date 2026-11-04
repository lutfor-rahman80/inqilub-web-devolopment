"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { YOUTUBE_ID_RE, youtubeEmbedUrl, youtubeThumbnail } from "@/lib/press/youtube";

/**
 * Click-to-load YouTube player: shows the video's thumbnail and a "play"
 * button; the (privacy-enhanced, youtube-nocookie.com) player is only
 * created after the visitor presses it. Keyboard: the button is a native
 * <button>; after it is pressed focus moves into the player.
 * The button is named by `playName` (visually hidden content, e.g. “Play
 * video: <title>” with a Bengali title marked lang="bn"), which includes
 * the visible “Play” label (shown, but hidden from assistive technology).
 */
export function YouTubePlayer({
  id,
  labels,
}: {
  id: string;
  labels: { play: string; playName: ReactNode; videoTitle: string; note: string };
}) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const thumb = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  // A thumbnail that failed before hydration fires no React onError.
  useEffect(() => {
    const img = thumb.current;
    if (img && img.complete && img.naturalWidth === 0) setThumbFailed(true);
  }, []);

  if (!YOUTUBE_ID_RE.test(id)) return null;

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-900">
        {playing ? (
          <iframe
            ref={frame}
            src={youtubeEmbedUrl(id)}
            title={labels.videoTitle}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
            data-testid="youtube-frame"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 block size-full focus-visible:outline-offset-[-4px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={thumb}
              hidden={thumbFailed}
              onError={() => setThumbFailed(true)}
              src={youtubeThumbnail(id)}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="sr-only">{labels.playName}</span>
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-forest-800/95 px-6 text-lg font-semibold text-white shadow-lg ring-2 ring-white/70 transition-colors group-hover:bg-forest-700">
                <Play className="size-5 fill-current" />
                {labels.play}
              </span>
            </span>
          </button>
        )}
      </div>
      {!playing && <p className="mt-1.5 text-sm text-muted">{labels.note}</p>}
    </div>
  );
}
