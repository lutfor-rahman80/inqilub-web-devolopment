import { describe, expect, it } from "vitest";
import { HERO_SLIDES_LIMIT, heroPlacements, heroPlacementText, inHeroOrder } from "@/lib/gallery/hero";

const visible = (id: string) => ({ id, isPublished: true, categoryActive: true });

describe("hero slider placement (admin gallery)", () => {
  it("shows at most six photos the public can see, numbered in display order; the rest are over the limit", () => {
    expect(HERO_SLIDES_LIMIT).toBe(6);
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const p = heroPlacements(ids.map(visible));
    expect(ids.map((id) => p.get(id))).toEqual([
      { status: "shown", position: 1 },
      { status: "shown", position: 2 },
      { status: "shown", position: 3 },
      { status: "shown", position: 4 },
      { status: "shown", position: 5 },
      { status: "shown", position: 6 },
      { status: "over-limit" },
      { status: "over-limit" },
    ]);
  });

  it("unpublished photos and photos in an inactive category are never shown and do not take a place", () => {
    const p = heroPlacements([
      { id: "draft", isPublished: false, categoryActive: true },
      visible("a"),
      { id: "hidden-cat", isPublished: true, categoryActive: false },
      visible("b"),
      visible("c"),
      visible("d"),
      visible("e"),
      visible("f"),
      visible("g"),
    ]);
    expect(p.get("draft")).toEqual({ status: "unpublished" });
    expect(p.get("hidden-cat")).toEqual({ status: "inactive-category" });
    expect(p.get("a")).toEqual({ status: "shown", position: 1 });
    expect(p.get("f")).toEqual({ status: "shown", position: 6 });
    expect(p.get("g")).toEqual({ status: "over-limit" });
  });

  it("explains each placement in Bengali (badge and confirmation)", () => {
    expect(heroPlacementText({ status: "shown", position: 2 }).badge).toBe("হোমপেজে দেখাচ্ছে (২ নম্বর)");
    expect(heroPlacementText({ status: "over-limit" }).badge).toBe("হোমপেজে দেখাচ্ছে না — প্রথম ৬টিই দেখায়");
    expect(heroPlacementText({ status: "over-limit" }).added).toContain("প্রথম ৬টি ছবিই দেখায়");
    expect(heroPlacementText({ status: "over-limit" }).added).toContain("প্রদর্শন ক্রম");
    expect(heroPlacementText({ status: "unpublished" }).added).toContain("অপ্রকাশিত");
    expect(heroPlacementText({ status: "inactive-category" }).added).toContain("নিষ্ক্রিয়");
  });

  it("orders like the homepage: display order, then newest upload, then id", () => {
    const calls: [string, { ascending?: boolean } | undefined][] = [];
    const q = {
      order(column: string, options?: { ascending?: boolean }) {
        calls.push([column, options]);
        return q;
      },
    };
    expect(inHeroOrder(q)).toBe(q);
    expect(calls).toEqual([
      ["sort_order", { ascending: true }],
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
  });
});
