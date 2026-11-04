/**
 * Program (কর্মসূচি) status, computed from dates in Asia/Dhaka.
 * Mirrors public.program_status() in the database (tests keep them in sync).
 */
export type ProgramStatus = "upcoming" | "ongoing" | "completed" | "postponed" | "cancelled";

/** Today's date in Bangladesh as YYYY-MM-DD. */
export function dhakaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function programStatus(
  p: { starts_on: string; ends_on: string | null; status_override: string | null },
  today: string = dhakaToday(),
): ProgramStatus {
  if (p.status_override === "postponed" || p.status_override === "cancelled") return p.status_override;
  if (p.starts_on > today) return "upcoming";
  if ((p.ends_on ?? p.starts_on) < today) return "completed";
  return "ongoing";
}

/** Homepage order chosen by the organization (2026-10-28): ongoing → completed → upcoming. */
export const HOME_STATUS_ORDER = ["ongoing", "completed", "upcoming"] as const;
