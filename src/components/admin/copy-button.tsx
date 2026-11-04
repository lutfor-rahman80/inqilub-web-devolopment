"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/** Copies `value` to the clipboard; announces the result to screen readers. */
export function CopyButton({ value, label = "কপি করুন" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={buttonClass("outline", "md")}>
        {state === "copied" ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        {state === "copied" ? "কপি হয়েছে" : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "ক্লিপবোর্ডে কপি হয়েছে" : state === "failed" ? "কপি করা যায়নি; লেখাটি নিজে নির্বাচন করে কপি করুন" : ""}
      </span>
    </>
  );
}
