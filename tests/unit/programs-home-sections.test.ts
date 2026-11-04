import { describe, expect, it } from "vitest";
import { homeProgramSectionViews, programCountText, type HomeProgramSection, type HomeProgramStatus } from "@/lib/programs/home-sections";
import { HOME_STATUS_ORDER } from "@/lib/programs/status";

/** Sections as getHomeProgramSections() returns them (ids stand in for program rows). */
function sections(counts: Partial<Record<HomeProgramStatus, [cards: number, total: number]>>): HomeProgramSection<string>[] {
  return HOME_STATUS_ORDER.map((status) => {
    const [cards, total] = counts[status] ?? [0, 0];
    return { status, items: Array.from({ length: cards }, (_, i) => `${status}-${i}`), total };
  });
}

describe("homeProgramSectionViews", () => {
  it("keeps the organization's order and alternates the sides: title start / end / start", () => {
    const views = homeProgramSectionViews(sections({ ongoing: [1, 1], completed: [3, 7], upcoming: [2, 2] }));
    expect(views.map((v) => [v.status, v.index, v.side])).toEqual([
      ["ongoing", 0, "start"],
      ["completed", 1, "end"],
      ["upcoming", 2, "start"],
    ]);
  });

  it("orders by HOME_STATUS_ORDER even when the input is in another order", () => {
    const input = sections({ ongoing: [1, 1], completed: [2, 2], upcoming: [3, 3] }).reverse();
    expect(homeProgramSectionViews(input).map((v) => v.status)).toEqual(["ongoing", "completed", "upcoming"]);
  });

  it("hides empty sections and re-alternates the rest by position", () => {
    expect(homeProgramSectionViews(sections({ ongoing: [2, 2], upcoming: [1, 1] })).map((v) => [v.status, v.side])).toEqual([
      ["ongoing", "start"],
      ["upcoming", "end"],
    ]);
    expect(homeProgramSectionViews(sections({ completed: [3, 3], upcoming: [2, 2] })).map((v) => [v.status, v.side])).toEqual([
      ["completed", "start"],
      ["upcoming", "end"],
    ]);
    expect(homeProgramSectionViews(sections({ upcoming: [1, 1] })).map((v) => [v.status, v.side])).toEqual([["upcoming", "start"]]);
    expect(homeProgramSectionViews(sections({}))).toEqual([]);
    // A section whose total is positive but has no cards (should not happen) is hidden too.
    expect(homeProgramSectionViews(sections({ ongoing: [0, 4] }))).toEqual([]);
  });

  it("alternates the backgrounds so the last section is always the plain one", () => {
    const tones = (c: Parameters<typeof sections>[0]) => homeProgramSectionViews(sections(c)).map((v) => v.tone);
    expect(tones({ ongoing: [1, 1], completed: [1, 1], upcoming: [1, 1] })).toEqual(["plain", "tint", "plain"]);
    expect(tones({ ongoing: [1, 1], upcoming: [1, 1] })).toEqual(["tint", "plain"]);
    expect(tones({ completed: [1, 1] })).toEqual(["plain"]);
  });

  it("uses the wide single card for exactly one program and the scrolling row otherwise", () => {
    const views = homeProgramSectionViews(sections({ ongoing: [1, 1], completed: [3, 9], upcoming: [2, 2] }));
    expect(views.map((v) => v.layout)).toEqual(["single", "rail", "rail"]);
  });

  it("keeps the database total, never below the number of cards shown", () => {
    const views = homeProgramSectionViews(sections({ ongoing: [1, 1], completed: [3, 12], upcoming: [2, 0] }));
    expect(views.map((v) => v.total)).toEqual([1, 12, 2]);
  });
});

describe("programCountText", () => {
  it("Bengali: total with Bengali digits", () => {
    expect(programCountText("bn", 1)).toBe("মোট ১টি কর্মসূচি");
    expect(programCountText("bn", 3)).toBe("মোট ৩টি কর্মসূচি");
    expect(programCountText("bn", 12)).toBe("মোট ১২টি কর্মসূচি");
    expect(programCountText("bn", 105)).toBe("মোট ১০৫টি কর্মসূচি");
  });

  it("English: singular and plural with ASCII digits", () => {
    expect(programCountText("en", 1)).toBe("1 program");
    expect(programCountText("en", 2)).toBe("2 programs");
    expect(programCountText("en", 12)).toBe("12 programs");
    expect(programCountText("en", 12)).not.toMatch(/[০-৯]/);
  });
});
