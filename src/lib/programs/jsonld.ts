import type { ProgramStatus } from "./status";

/**
 * schema.org Event for a program page (pure; unit tested). Only facts from
 * the database are used; no attendance mode or prices are invented, and the
 * location is left out when the program has none recorded (the organization's
 * own area is not assumed — e.g. disaster relief may happen elsewhere).
 */
export function programEventJsonLd(p: {
  name: string;
  description: string;
  startsOn: string;
  endsOn: string | null;
  status: ProgramStatus;
  url: string;
  image: string;
  /** The program's own place; empty → no location in the markup. */
  location: string;
  organizerName: string;
  organizerUrl: string;
  inLanguage: string;
}) {
  const eventStatus =
    p.status === "cancelled"
      ? "https://schema.org/EventCancelled"
      : p.status === "postponed"
        ? "https://schema.org/EventPostponed"
        : "https://schema.org/EventScheduled";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    startDate: p.startsOn,
    endDate: p.endsOn ?? p.startsOn,
    eventStatus,
    url: p.url,
    image: [p.image],
    inLanguage: p.inLanguage,
    ...(p.location.trim() ? { location: { "@type": "Place", name: p.location.trim(), address: p.location.trim() } } : {}),
    organizer: { "@type": "Organization", name: p.organizerName, url: p.organizerUrl },
  };
}

/** JSON for a <script type="application/ld+json"> (with "<" escaped so text cannot close the tag). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
