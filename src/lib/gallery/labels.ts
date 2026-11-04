import { bn } from "@/lib/format";

/**
 * Short, distinct accessible name for an admin photo ("ছবি ৩ (শীতবস্ত্র বিতরণ…)").
 * A batch upload gives every photo the same caption, so the position comes
 * first and long captions are shortened.
 */
export function adminPhotoLabel(position: number, caption: string, max = 40): string {
  const text = caption.replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  const short = chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : text;
  return `ছবি ${bn(position)} (${short || "ক্যাপশন নেই"})`;
}
