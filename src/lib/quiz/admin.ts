import { toAsciiDigits } from "@/lib/format";

export const QUIZ_GENDERS = ["ছেলে", "মেয়ে"] as const;
export type QuizGender = (typeof QUIZ_GENDERS)[number];

export type QuizRow = {
  id: number;
  year: number;
  roll: string;
  name: string;
  institution: string;
  gender: QuizGender;
  marks: number | null;
  round2_marks: number | null;
  round2_updated_at: string | null;
  created_at: string;
};

export type QuizSettings = {
  round2Enabled: boolean;
  cutoffBoys: number;
  cutoffGirls: number;
};

export type QuizSettingRow = { key: string; value: string };
export type QuizYearRow = { year: number };

export type QuizSaveInput = {
  id?: number | null;
  year: number;
  roll: string;
  name: string;
  institution: string;
  gender: QuizGender;
  marks: number;
  mobile: string;
};

export type QuizCutoffInput = {
  year: number;
  boys: number;
  girls: number;
};

export type QuizRound2Input = {
  year: number;
  roll: string;
  round2Marks: number;
  mobile?: string;
  overwrite?: boolean;
};

export type QuizRound2Result = {
  id: number;
  roll: string;
  name: string;
  round2_marks: number | null;
  total_marks: number | null;
  mobile: string | null;
};

export function normalizeRoll(value: string | null | undefined): string {
  return toAsciiDigits(String(value ?? "")).trim();
}

export function splitMobiles(value: string | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of String(value ?? "").split(/[,/;\s]+/)) {
    const mobile = toAsciiDigits(part).trim();
    if (mobile && !seen.has(mobile)) {
      seen.add(mobile);
      result.push(mobile);
    }
  }
  return result;
}

export function joinMobiles(values: readonly string[]): string {
  return splitMobiles(values.join(",")).join(", ");
}

/** Total shown in the merit sheet: first round + second round, once round 2 has a mark. */
export function quizTotal(row: Pick<QuizRow, "marks" | "round2_marks">): number | null {
  if (row.round2_marks === null || row.round2_marks === undefined) return null;
  return (row.marks ?? 0) + row.round2_marks;
}

export function isRound2On(value: string | null | undefined): boolean {
  return ["true", "1", "yes"].includes(String(value ?? "").toLowerCase().trim());
}

function numericSetting(rows: Map<string, string>, key: string, fallback: number): number {
  const value = Number(rows.get(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function parseQuizSettings(rows: readonly QuizSettingRow[]): QuizSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    round2Enabled: isRound2On(map.get("round2_enabled")),
    cutoffBoys: numericSetting(map, "round2_cutoff_boys", 20),
    cutoffGirls: numericSetting(map, "round2_cutoff_girls", 25),
  };
}

/** Reads a year from a URL search parameter, or null when it is not a sensible year. */
export function parseQuizYear(value: string | string[] | null | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}$/.test(raw.trim())) return null;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : null;
}

function rollNumber(roll: string): number {
  return Number(toAsciiDigits(roll).replace(/\D/g, "")) || 0;
}

/** Merit sheet order: total (once round 2 has a mark) → first round → roll. */
export function sortMeritRows(rows: readonly QuizRow[]): QuizRow[] {
  return [...rows].sort((a, b) => {
    const totalA = quizTotal(a);
    const totalB = quizTotal(b);
    if (totalA !== null && totalB !== null && totalB !== totalA) return totalB - totalA;
    if (totalA !== null && totalB === null) return -1;
    if (totalA === null && totalB !== null) return 1;

    const marksA = a.marks ?? 0;
    const marksB = b.marks ?? 0;
    if (marksB !== marksA) return marksB - marksA;

    const rollA = rollNumber(a.roll);
    const rollB = rollNumber(b.roll);
    if (rollA !== rollB) return rollA - rollB;
    return a.roll.localeCompare(b.roll, "bn");
  });
}

export type QuizGroup = { institution: string; rows: QuizRow[] };

/** Institution groups (Bengali alphabetical), each sorted by marks then name. */
export function groupQuizRows(rows: readonly QuizRow[]): QuizGroup[] {
  const groups = new Map<string, QuizRow[]>();
  for (const row of rows) {
    const name = row.institution.trim() || "অন্যান্য";
    const list = groups.get(name);
    if (list) list.push(row);
    else groups.set(name, [row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "bn"))
    .map(([institution, list]) => ({
      institution,
      rows: [...list].sort((a, b) => {
        const marksA = a.marks ?? 0;
        const marksB = b.marks ?? 0;
        if (marksB !== marksA) return marksB - marksA;
        return a.name.localeCompare(b.name, "bn");
      }),
    }));
}

