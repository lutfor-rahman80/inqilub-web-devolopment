import { describe, expect, it } from "vitest";
import {
  matchesTab,
  parseCategorySlug,
  parseStatusTab,
  parseYear,
  programsQuery,
  STATUS_TABS,
  yearRange,
  yearsOf,
} from "@/lib/programs/filters";
import { slugify, suggestProgramSlug, uniqueSlug } from "@/lib/programs/slug";
import { parseIdList, parseProgram } from "@/lib/programs/schemas";
import { programErrorMessage, PROGRAM_ERRORS } from "@/lib/programs/errors";
import { jsonLdString, programEventJsonLd } from "@/lib/programs/jsonld";
import { programDateText } from "@/lib/programs/format";
import { HOME_STATUS_ORDER } from "@/lib/programs/status";

const UUID = "0d7a8c6d-117f-448a-b329-2f6e6d9d3f22";

describe("status tabs", () => {
  it("lists all first, then the organization's order", () => {
    expect(STATUS_TABS).toEqual(["all", ...HOME_STATUS_ORDER]);
  });
  it("parses ?status (unknown → all)", () => {
    expect(parseStatusTab("ongoing")).toBe("ongoing");
    expect(parseStatusTab(["upcoming", "x"])).toBe("upcoming");
    expect(parseStatusTab(" Completed ")).toBe("completed");
    for (const bad of [undefined, "", "postponed", "cancelled", "<script>"]) expect(parseStatusTab(bad)).toBe("all");
  });
  it("puts postponed/cancelled programs only in 'all'", () => {
    const today = "2026-10-28";
    const postponed = { starts_on: "2026-11-01", ends_on: null, status_override: "postponed" };
    const cancelled = { starts_on: "2026-10-01", ends_on: null, status_override: "cancelled" };
    for (const p of [postponed, cancelled]) {
      expect(matchesTab(p, "all", today)).toBe(true);
      for (const tab of HOME_STATUS_ORDER) expect(matchesTab(p, tab, today)).toBe(false);
    }
    const ongoing = { starts_on: "2026-10-20", ends_on: "2026-11-05", status_override: null };
    expect(matchesTab(ongoing, "ongoing", today)).toBe(true);
    expect(matchesTab(ongoing, "upcoming", today)).toBe(false);
    expect(matchesTab({ starts_on: "2026-10-29", ends_on: null, status_override: null }, "upcoming", today)).toBe(true);
    expect(matchesTab({ starts_on: "2026-10-27", ends_on: null, status_override: null }, "completed", today)).toBe(true);
  });
});

describe("list filters", () => {
  it("parses years with Bengali digits, within 2000–2100", () => {
    expect(parseYear("2026")).toBe(2026);
    expect(parseYear("২০২৫")).toBe(2025);
    for (const bad of ["1999", "2101", "26", "20x6", "", undefined]) expect(parseYear(bad)).toBeNull();
  });
  it("accepts only well-formed category slugs", () => {
    expect(parseCategorySlug("winter-clothing")).toBe("winter-clothing");
    expect(parseCategorySlug("Winter-Clothing")).toBe("winter-clothing");
    for (const bad of ["a b", "../x", "-x", "শীত", "x".repeat(61), ""]) expect(parseCategorySlug(bad)).toBeNull();
  });
  it("builds query strings without defaults", () => {
    expect(programsQuery({ status: "all" })).toBe("");
    expect(programsQuery({ status: "ongoing", category: "eid-distribution", year: 2026, page: 2 })).toBe(
      "?status=ongoing&category=eid-distribution&year=2026&page=2",
    );
    expect(programsQuery({ page: 1 })).toBe("");
  });
  it("derives distinct years, newest first", () => {
    expect(yearsOf(["2026-01-02", "2025-12-31", "2026-10-28", "bad"])).toEqual([2026, 2025]);
    expect(yearRange(2026)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("slugs", () => {
  it("slugifies latin text", () => {
    expect(slugify("Winter Clothing Distribution 2026!")).toBe("winter-clothing-distribution-2026");
    expect(slugify("  Iftar & Doa — Café ")).toBe("iftar-and-doa-cafe");
    expect(slugify("শীতবস্ত্র বিতরণ")).toBe("");
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(80);
    expect(slugify(`${"word ".repeat(30)}end`)).not.toMatch(/-$/);
  });
  it("suggests from the English title, else category + date", () => {
    expect(suggestProgramSlug({ titleEn: "Eid Gift Distribution", startsOn: "2026-03-30", categorySlug: "eid-distribution" })).toBe(
      "eid-gift-distribution",
    );
    expect(suggestProgramSlug({ titleEn: "", startsOn: "2026-12-15", categorySlug: "winter-clothing" })).toBe("winter-clothing-2026-12-15");
    expect(suggestProgramSlug({ titleEn: "ঈদ", startsOn: "2026-12-15", categorySlug: null })).toBe("program-2026-12-15");
    expect(suggestProgramSlug({ titleEn: null, startsOn: "", categorySlug: "" })).toBe("");
  });
  it("finds a free variant", () => {
    expect(uniqueSlug("eid", [])).toBe("eid");
    expect(uniqueSlug("eid", ["eid", "eid-2"])).toBe("eid-3");
    const long = "x".repeat(80);
    expect(uniqueSlug(long, [long]).length).toBeLessThanOrEqual(80);
  });
});

describe("program form validation", () => {
  const base = {
    category_id: UUID,
    slug: "winter-2026",
    title_bn: "শীতবস্ত্র বিতরণ",
    title_en: "",
    summary_bn: "",
    summary_en: "",
    body_bn: "",
    body_en: "",
    location_bn: "",
    location_en: "",
    starts_on: "২০২৬-১২-১৫",
    ends_on: "",
    status_override: "",
    cover_image_id: "",
    is_published: "on",
    sort_order: "০",
  };
  it("normalizes optional fields to null and converts Bengali digits", () => {
    const r = parseProgram(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        starts_on: "2026-12-15",
        ends_on: null,
        title_en: null,
        status_override: null,
        cover_image_id: null,
        is_published: true,
        sort_order: 0,
      });
    }
  });
  it("rejects bad slugs, a missing title, unknown overrides and categories", () => {
    const r = parseProgram({ ...base, slug: "Bad Slug", title_bn: "", status_override: "done", category_id: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["category_id", "slug", "status_override", "title_bn"]);
  });
  it("rejects an end date before the start date", () => {
    const r = parseProgram({ ...base, ends_on: "2026-12-14" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors).toEqual({ ends_on: "শেষের তারিখ শুরুর তারিখের আগে হতে পারে না।" });
  });
  it("rejects impossible dates", () => {
    const r = parseProgram({ ...base, starts_on: "2026-02-30" });
    expect(r.ok).toBe(false);
  });
  it("accepts postponed/cancelled", () => {
    for (const o of ["postponed", "cancelled"]) {
      const r = parseProgram({ ...base, status_override: o });
      expect(r.ok && r.data.status_override).toBe(o);
    }
  });
  it("validates image id lists", () => {
    expect(parseIdList([UUID, UUID.toUpperCase()])).toEqual([UUID]);
    expect(parseIdList([])).toBeNull();
    expect(parseIdList(["x"])).toBeNull();
    expect(parseIdList("x")).toBeNull();
  });
});

describe("errors, dates and JSON-LD", () => {
  it("maps database codes to Bengali", () => {
    expect(programErrorMessage({ message: 'P0001: PROGRAM_SLUG_LOCKED' })).toBe(PROGRAM_ERRORS.PROGRAM_SLUG_LOCKED);
    expect(programErrorMessage({ message: "PROGRAM_COVER_MISMATCH" })).toBe(PROGRAM_ERRORS.PROGRAM_COVER_MISMATCH);
    expect(programErrorMessage({ message: "PROGRAM_CATEGORY_MISMATCH" })).toBe(PROGRAM_ERRORS.PROGRAM_CATEGORY_MISMATCH);
    expect(programErrorMessage({ code: "23505", message: 'duplicate key value violates unique constraint "programs_slug_key"' })).toMatch(
      /স্লাগ/,
    );
    expect(programErrorMessage({ message: "something internal" })).not.toMatch(/internal/);
  });
  it("formats single days and ranges", () => {
    expect(programDateText("2026-12-15", null, "bn")).toBe("১৫ ডিসেম্বর ২০২৬");
    expect(programDateText("2026-12-15", "2026-12-17", "en")).toBe("15 December 2026 – 17 December 2026");
    expect(programDateText("2026-12-15", "2026-12-15", "en")).toBe("15 December 2026");
  });
  it("builds an Event with status and escapes '<'", () => {
    const ld = programEventJsonLd({
      name: "</script><b>x",
      description: "",
      startsOn: "2026-12-15",
      endsOn: null,
      status: "cancelled",
      url: "https://example.org/programs/x",
      image: "https://example.org/x.webp",
      location: "নারায়ণগঞ্জ",
      organizerName: "ইনকিলাব যুব সংগঠন",
      organizerUrl: "https://example.org/",
      inLanguage: "bn",
    });
    expect(ld).toMatchObject({ "@type": "Event", endDate: "2026-12-15", eventStatus: "https://schema.org/EventCancelled" });
    expect(ld).not.toHaveProperty("description");
    expect(ld).toMatchObject({ location: { "@type": "Place", name: "নারায়ণগঞ্জ" } });
    const json = jsonLdString(ld);
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe("</script><b>x");
    expect(programEventJsonLd({ ...ld, name: "x", description: "d", startsOn: "2026-01-01", endsOn: "2026-01-02", status: "postponed", url: "", image: "", location: "", organizerName: "", organizerUrl: "", inLanguage: "en" }).eventStatus).toBe(
      "https://schema.org/EventPostponed",
    );
    // No recorded place → no location (the organization's area is not assumed).
    expect(programEventJsonLd({ ...ld, name: "x", description: "", startsOn: "2026-01-01", endsOn: null, status: "completed", url: "", image: "", location: "  ", organizerName: "", organizerUrl: "", inLanguage: "bn" })).not.toHaveProperty("location");
  });
});
