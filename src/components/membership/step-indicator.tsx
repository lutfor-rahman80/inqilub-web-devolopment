"use client";

import { Check } from "lucide-react";
import { num } from "@/lib/format";
import { fmt, type Locale } from "@/i18n/config";
import type { MembershipMessages } from "@/i18n/messages/membership";
import { APPLICATION_STEPS } from "@/lib/membership/schema";

/**
 * Progress indicator for the 4-step application. Visited steps are buttons
 * (to go back and edit); later steps are disabled until reached. The visible
 * step title is part of each button's accessible name ("Step 2: Address
 * (completed)"), so voice-control users can say what they see.
 */
export function StepIndicator({
  lang,
  t,
  step,
  maxStep,
  disabled,
  onJump,
}: {
  lang: Locale;
  t: Pick<MembershipMessages["form"], "stepsLabel" | "steps" | "stepsShort" | "stepButton" | "stepCurrent" | "stepDone">;
  step: number;
  maxStep: number;
  disabled?: boolean;
  onJump: (index: number) => void;
}) {
  return (
    <nav aria-label={t.stepsLabel} className="print:hidden">
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {APPLICATION_STEPS.map((key, i) => {
          const title = t.steps[i];
          const current = i === step;
          const done = i < step || (i <= maxStep && i !== step);
          const reachable = i <= maxStep && !current;
          // "Step {n}: " before the visible title, the state after it (screen readers only).
          const [before] = t.stepButton.split("{title}");
          return (
            <li key={key} className="min-w-0">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!reachable || disabled}
                aria-current={current ? "step" : undefined}
                className={`group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center transition-colors disabled:cursor-default ${
                  reachable ? "hover:bg-sage-50" : ""
                }`}
              >
                <span className="relative flex w-full items-center justify-center" aria-hidden="true">
                  {/* connector line */}
                  {i > 0 && (
                    <span
                      className={`absolute end-1/2 top-1/2 me-5 h-0.5 w-[calc(100%-2.5rem)] -translate-y-1/2 rounded ${
                        i <= Math.max(step, maxStep) ? "bg-forest-600" : "bg-line"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 inline-flex size-10 items-center justify-center rounded-full border-2 font-serif text-lg font-bold ${
                      current
                        ? "border-forest-700 bg-forest-700 text-white ring-4 ring-gold-400/40"
                        : done
                          ? "border-forest-600 bg-sage-50 text-forest-800"
                          : "border-line bg-white text-muted"
                    }`}
                  >
                    {done && !current ? <Check className="size-5" /> : num(lang, i + 1)}
                  </span>
                </span>
                <span
                  className={`block w-full truncate text-xs leading-tight sm:whitespace-normal sm:text-sm ${
                    current ? "font-semibold text-forest-800" : "text-muted"
                  }`}
                >
                  <span className="sr-only">{fmt(before, { n: num(lang, i + 1) })}</span>
                  <span className="sm:hidden">{t.stepsShort[i]}</span>
                  <span className="hidden sm:inline">{title}</span>
                  <span className="sr-only">{current ? t.stepCurrent : done ? t.stepDone : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
