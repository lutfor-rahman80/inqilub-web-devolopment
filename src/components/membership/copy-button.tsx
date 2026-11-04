"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { MembershipMessages } from "@/i18n/messages/membership";
import { V2 } from "./styles";

type CopyLabels = MembershipMessages["copy"];

const BN_LABELS: CopyLabels = {
  copy: "কপি করুন",
  copied: "কপি হয়েছে",
  failed: "কপি করা যায়নি",
  failedSr: "কপি করা যায়নি; নম্বরটি লিখে রাখুন",
};

/** Copies a short text (e.g. a tracking number) with visible + announced feedback. */
export function CopyButton({
  text,
  label,
  labels = BN_LABELS,
  className = "",
}: {
  text: string;
  /** Button text before copying (default: labels.copy). */
  label?: string;
  labels?: CopyLabels;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
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

  return (
    <>
      <button type="button" onClick={copy} className={buttonClass("outline", "md", `${V2.outline} ${className}`)}>
        {status === "copied" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        {status === "copied" ? labels.copied : status === "failed" ? labels.failed : (label ?? labels.copy)}
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? labels.copied : status === "failed" ? labels.failedSr : ""}
      </span>
    </>
  );
}
