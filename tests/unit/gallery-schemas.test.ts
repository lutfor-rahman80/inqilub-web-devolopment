import { describe, expect, it } from "vitest";
import {
  captionSchema,
  categoryCreateSchema,
  categoryFieldsSchema,
  eventDateSchema,
  fieldErrorsOf,
  idListSchema,
  imagePatchSchema,
  isValidEventDate,
  itemsInCategory,
  readCategoryForm,
  registerSchema,
  slugSchema,
  sortOrderSchema,
} from "@/lib/gallery/schemas";

const UUID = "3f0c9a52-6a0b-4c55-9d1e-2b7c4f1a8e90";
const UUID2 = "7d1e2f3a-4b5c-4d6e-8f70-1a2b3c4d5e6f";

describe("event date", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  it("accepts real past dates and today (Dhaka)", () => {
    expect(isValidEventDate("2025-12-16", now)).toBe(true);
    expect(isValidEventDate("2026-10-27", now)).toBe(true);
  });
  it("rejects impossible, malformed, too old and future dates", () => {
    expect(isValidEventDate("2025-02-30", now)).toBe(false);
    expect(isValidEventDate("2025-2-3", now)).toBe(false);
    expect(isValidEventDate("1989-12-31", now)).toBe(false);
    expect(isValidEventDate("2026-10-29", now)).toBe(false);
  });
  it("converts Bengali digits and empty values", () => {
    expect(eventDateSchema.parse("২০২৫-০১-১৫")).toBe("2025-01-15");
    expect(eventDateSchema.parse("")).toBeNull();
    expect(eventDateSchema.parse(null)).toBeNull();
    expect(eventDateSchema.safeParse("2099-01-01").success).toBe(false);
  });
});

describe("caption and sort order", () => {
  it("collapses whitespace and limits captions to 300 characters", () => {
    expect(captionSchema.parse("  শীতবস্ত্র \n বিতরণ  ")).toBe("শীতবস্ত্র বিতরণ");
    expect(captionSchema.safeParse("ক".repeat(301)).success).toBe(false);
    expect(captionSchema.safeParse("ক".repeat(300)).success).toBe(true);
  });
  it("parses ASCII/Bengali integers within range", () => {
    expect(sortOrderSchema.parse("১২")).toBe(12);
    expect(sortOrderSchema.parse(-5)).toBe(-5);
    expect(sortOrderSchema.safeParse("1.5").success).toBe(false);
    expect(sortOrderSchema.safeParse("abc").success).toBe(false);
    expect(sortOrderSchema.safeParse("200000").success).toBe(false);
  });
  it("explains out-of-range orders as a range problem, not as 'not a whole number'", () => {
    const message = (v: string) => sortOrderSchema.safeParse(v).error?.issues[0]?.message;
    expect(message("৯৯৯৯৯৯৯")).toBe("ক্রম −১০০০০০ থেকে ১০০০০০ এর মধ্যে হতে হবে।");
    expect(message("-123456789012345678901234567890")).toBe("ক্রম −১০০০০০ থেকে ১০০০০০ এর মধ্যে হতে হবে।");
    expect(message("abc")).toBe("ক্রম একটি পূর্ণ সংখ্যা হতে হবে।");
    expect(message("১.৫")).toBe("ক্রম একটি পূর্ণ সংখ্যা হতে হবে।");
    expect(sortOrderSchema.safeParse("abc").error?.issues).toHaveLength(1);
  });
});

describe("registerSchema", () => {
  const item = (id: string, slug = "volunteering") => ({
    path: `activities/${slug}/${id}.webp`,
    thumbPath: `activities/${slug}/thumbs/${id}.webp`,
    width: 1600,
    height: 1200,
  });
  const base = { categoryId: UUID, caption: "ক্যাপশন", eventDate: null, publish: true };

  it("accepts 1..30 items", () => {
    expect(registerSchema.safeParse({ ...base, items: [item(UUID2)] }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    const many = Array.from({ length: 31 }, (_, i) => item(`7d1e2f3a-4b5c-4d6e-8f70-${String(i).padStart(12, "0")}`));
    expect(registerSchema.safeParse({ ...base, items: many }).success).toBe(false);
  });
  it("rejects duplicate paths and bad dimensions", () => {
    expect(registerSchema.safeParse({ ...base, items: [item(UUID2), item(UUID2)] }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, items: [{ ...item(UUID2), width: 0 }] }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, categoryId: "nope", items: [item(UUID2)] }).success).toBe(false);
  });
  it("checks that files belong to the category folder", () => {
    expect(itemsInCategory("volunteering", [item(UUID2)])).toBe(true);
    expect(itemsInCategory("blood-group", [item(UUID2)])).toBe(false);
    expect(itemsInCategory("volunteering", [{ path: item(UUID2).path, thumbPath: item(UUID).thumbPath }])).toBe(false);
    expect(itemsInCategory("volunteering", [{ path: "activities/volunteering/../x.webp", thumbPath: "activities/volunteering/thumbs/x.webp" }])).toBe(false);
  });
});

describe("image patch / id lists", () => {
  it("requires at least one change", () => {
    expect(imagePatchSchema.safeParse({}).success).toBe(false);
    expect(imagePatchSchema.parse({ isPublished: false })).toEqual({ isPublished: false });
  });
  it("validates id lists", () => {
    expect(idListSchema.safeParse([UUID]).success).toBe(true);
    expect(idListSchema.safeParse([]).success).toBe(false);
    expect(idListSchema.safeParse(["x"]).success).toBe(false);
  });
});

describe("categories", () => {
  it("accepts lowercase latin slugs only", () => {
    expect(slugSchema.parse("  Tree-Plantation ")).toBe("tree-plantation");
    for (const bad of ["a", "-x", "x-", "a--b", "গাছ", "a_b", "a b", "x".repeat(61)]) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
  it("validates fields and reports the first error per field", () => {
    const ok = categoryFieldsSchema.safeParse({
      name_bn: " বৃক্ষরোপণ ", summary: "", description: "অনুচ্ছেদ ১\r\n\r\n\r\nঅনুচ্ছেদ ২", icon: "gift", sort_order: "১০", is_active: true,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.name_bn).toBe("বৃক্ষরোপণ");
      expect(ok.data.description).toBe("অনুচ্ছেদ ১\n\nঅনুচ্ছেদ ২");
      expect(ok.data.sort_order).toBe(10);
    }
    const bad = categoryCreateSchema.safeParse({
      slug: "Bad Slug", name_bn: "", summary: "", description: "", icon: "unknown", sort_order: "x", is_active: true,
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(Object.keys(fieldErrorsOf(bad.error)).sort()).toEqual(["icon", "name_bn", "slug", "sort_order"]);
    }
  });
  it("reads form data", () => {
    const fd = new FormData();
    fd.set("name_bn", "নাম");
    fd.set("is_active", "on");
    expect(readCategoryForm(fd)).toMatchObject({ name_bn: "নাম", is_active: true, sort_order: "0", slug: "" });
  });
});
