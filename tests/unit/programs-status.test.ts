import { describe, expect, it } from "vitest";
import { dhakaToday, programStatus } from "@/lib/programs/status";

describe("programStatus", () => {
  const today = "2026-10-28";
  it.each([
    [{ starts_on: "2026-11-01", ends_on: null, status_override: null }, "upcoming"],
    [{ starts_on: "2026-10-28", ends_on: null, status_override: null }, "ongoing"],
    [{ starts_on: "2026-10-20", ends_on: "2026-10-30", status_override: null }, "ongoing"],
    [{ starts_on: "2026-10-20", ends_on: "2026-10-28", status_override: null }, "ongoing"],
    [{ starts_on: "2026-10-20", ends_on: "2026-10-27", status_override: null }, "completed"],
    [{ starts_on: "2026-10-27", ends_on: null, status_override: null }, "completed"],
    [{ starts_on: "2026-11-01", ends_on: null, status_override: "postponed" }, "postponed"],
    [{ starts_on: "2026-10-01", ends_on: null, status_override: "cancelled" }, "cancelled"],
  ])("%o → %s", (p, expected) => {
    expect(programStatus(p, today)).toBe(expected);
  });

  it("uses the Bangladesh date (UTC+6)", () => {
    expect(dhakaToday(new Date("2026-10-27T18:30:00Z"))).toBe("2026-10-28");
    expect(dhakaToday(new Date("2026-10-27T17:59:00Z"))).toBe("2026-10-27");
  });
});
