import { describe, expect, it } from "vitest";
import {
  groupQuizRows,
  joinMobiles,
  normalizeRoll,
  parseQuizSettings,
  quizTotal,
  sortMeritRows,
  splitMobiles,
  type QuizRow,
} from "@/lib/quiz/admin";
import { buildQuizPrintHtml } from "@/lib/quiz/print";

function row(overrides: Partial<QuizRow> = {}): QuizRow {
  return {
    id: 1,
    year: 2026,
    roll: "1",
    name: "শিক্ষার্থী",
    institution: "ইনস্টিটিউট",
    gender: "ছেলে",
    marks: 10,
    round2_marks: null,
    round2_updated_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("quiz admin helpers", () => {
  it("normalizes Bengali rolls and splits unique mobile numbers", () => {
    expect(normalizeRoll("  ১২৩  ")).toBe("123");
    expect(splitMobiles("01711111111, 01822222222 / 01711111111")).toEqual([
      "01711111111",
      "01822222222",
    ]);
    expect(joinMobiles(["01711111111", "01822222222"])).toBe("01711111111, 01822222222");
  });

  it("parses settings with the documented defaults", () => {
    expect(parseQuizSettings([])).toEqual({
      round2Enabled: false,
      cutoffBoys: 20,
      cutoffGirls: 25,
    });
    expect(
      parseQuizSettings([
        { key: "round2_enabled", value: "TRUE" },
        { key: "round2_cutoff_boys", value: "22" },
        { key: "round2_cutoff_girls", value: "27" },
      ]),
    ).toEqual({ round2Enabled: true, cutoffBoys: 22, cutoffGirls: 27 });
  });

  it("totals a merit score only after round 2", () => {
    expect(quizTotal(row({ marks: 12 }))).toBeNull();
    expect(quizTotal(row({ marks: 12, round2_marks: 8 }))).toBe(20);
  });

  it("sorts the merit sheet by total, then first-round marks, then roll", () => {
    const sorted = sortMeritRows([
      row({ id: 1, roll: "3", marks: 30, round2_marks: null }),
      row({ id: 2, roll: "2", marks: 20, round2_marks: 15 }),
      row({ id: 3, roll: "4", marks: 40, round2_marks: null }),
      row({ id: 4, roll: "1", marks: 20, round2_marks: 15 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([4, 2, 3, 1]);
  });

  it("groups by institution with a Bengali alphabetical order", () => {
    const groups = groupQuizRows([
      row({ id: 1, institution: "খ" }),
      row({ id: 2, institution: "ক" }),
      row({ id: 3, institution: "খ" }),
    ]);

    expect(groups.map((group) => group.institution)).toEqual(["ক", "খ"]);
    expect(groups[1].rows).toHaveLength(2);
  });
});

describe("quiz print HTML", () => {
  const base = {
    year: 2026,
    rows: [row({ name: "<script>alert(1)</script>", institution: "ক" })],
    round2Enabled: false,
    showMarks: true,
    showMobiles: false,
    mobiles: { "1": "01711111111" },
  };

  it("escapes user content", () => {
    const html = buildQuizPrintHtml(base);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("only includes mobile numbers when they are shown", () => {
    expect(buildQuizPrintHtml(base)).not.toContain("০১৭১১১১১১১১");
    expect(buildQuizPrintHtml({ ...base, showMobiles: true })).toContain("০১৭১১১১১১১১");
  });
});
