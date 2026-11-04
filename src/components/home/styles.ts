import { buttonClass } from "@/components/ui/button";

/** Design v2 buttons for the homepage (forest instead of the deep brand green; AA: white on forest-600 6.1:1). */
export const primaryButton = (size: "md" | "lg" = "lg", extra = "") =>
  buttonClass("primary", size, `press bg-forest-600 text-white hover:bg-forest-700 ${extra}`);

export const outlineButton = (size: "md" | "lg" = "lg", extra = "") =>
  buttonClass("outline", size, `press border-forest-600 bg-white text-forest-800 hover:bg-sage-100 ${extra}`);

export const ghostButton = (size: "md" | "lg" = "md", extra = "") =>
  buttonClass("ghost", size, `press text-forest-700 hover:bg-sage-100 hover:text-forest-900 ${extra}`);

/** Inline text link with a 44px touch target. */
export const textLink =
  "inline-flex min-h-11 items-center gap-1 font-semibold text-forest-700 underline-offset-4 hover:text-forest-900 hover:underline";
