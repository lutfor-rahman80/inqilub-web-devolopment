import { buttonClass } from "@/components/ui/button";

/**
 * Design v2 classes for the public membership pages (forest buttons and links
 * on cream/sage; AA contrast: forest-600 with white text 6.1:1, forest-700
 * text on white/sage-50 ≥ 6.9:1). Admin pages keep the shared defaults.
 */
export const V2 = {
  primary: "press bg-forest-600 text-white hover:bg-forest-700",
  outline: "press border-forest-600 text-forest-800 hover:bg-sage-50",
  ghost: "press text-forest-800 hover:bg-sage-50",
  link: "font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900",
} as const;

/** Link/button classes in the v2 colours; long (English) labels wrap instead of overflowing at 360 px. */
export function v2Button(variant: "primary" | "outline" | "ghost", size: "sm" | "md" | "lg" = "md", extra = ""): string {
  return buttonClass(variant, size, `${V2[variant]} whitespace-normal text-center ${extra}`);
}

/** lang="bn" for text in Bengali script shown on an English page (names, addresses typed in Bengali). */
export function scriptLang(pageLang: "bn" | "en", text: string | null | undefined): "bn" | undefined {
  return pageLang === "en" && text && /[ঀ-৿]/.test(text) ? "bn" : undefined;
}
