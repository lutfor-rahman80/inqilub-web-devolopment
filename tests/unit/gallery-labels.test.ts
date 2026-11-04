import { describe, expect, it } from "vitest";
import { adminPhotoLabel } from "@/lib/gallery/labels";

describe("adminPhotoLabel", () => {
  it("starts with the position so a batch with one caption stays distinguishable", () => {
    const caption = "শীতবস্ত্র বিতরণ কর্মসূচি";
    expect(adminPhotoLabel(1, caption)).toBe("ছবি ১ (শীতবস্ত্র বিতরণ কর্মসূচি)");
    expect(adminPhotoLabel(12, caption)).toBe("ছবি ১২ (শীতবস্ত্র বিতরণ কর্মসূচি)");
    expect(adminPhotoLabel(1, caption)).not.toBe(adminPhotoLabel(2, caption));
  });

  it("shortens long captions and handles empty ones", () => {
    const long = "ক".repeat(300);
    const label = adminPhotoLabel(3, long);
    expect(label).toBe(`ছবি ৩ (${"ক".repeat(40)}…)`);
    expect(adminPhotoLabel(4, "   ")).toBe("ছবি ৪ (ক্যাপশন নেই)");
    expect(adminPhotoLabel(5, "এক   দুই\nতিন")).toBe("ছবি ৫ (এক দুই তিন)");
  });
});
