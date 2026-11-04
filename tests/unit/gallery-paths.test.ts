import { describe, expect, it } from "vitest";
import {
  fileIdOf,
  fileName,
  fitWithin,
  imagePaths,
  isSlug,
  isUploadPair,
  moveTarget,
  parseUploadPath,
  reservedFilePaths,
  slugOfPath,
} from "@/lib/gallery/paths";
import { convertTargets, findMissing, photoSubfolders, planCategory, presentPaths } from "@/lib/gallery/sync-plan";
import { pageWindow } from "@/components/gallery/pager";

const ID = "3f0c9a52-6a0b-4c55-9d1e-2b7c4f1a8e90";

describe("gallery paths", () => {
  it("builds the folder layout", () => {
    expect(imagePaths("winter-clothing", ID)).toEqual({
      full: `activities/winter-clothing/${ID}.webp`,
      thumb: `activities/winter-clothing/thumbs/${ID}.webp`,
    });
    expect(imagePaths("x", ID, "jpg").thumb).toBe(`activities/x/thumbs/${ID}.jpg`);
  });
  it("validates upload pairs", () => {
    const p = imagePaths("volunteering", ID);
    expect(isUploadPair("volunteering", p.full, p.thumb)).toBe(true);
    expect(isUploadPair("volunteering", p.full, p.full)).toBe(false);
    expect(isUploadPair("volunteering", "activities/volunteering/photo.webp", "activities/volunteering/thumbs/photo.webp")).toBe(false);
    expect(isUploadPair("volunteer", p.full, p.thumb)).toBe(false);
  });
  it("moves files between category folders keeping the file name", () => {
    expect(moveTarget(`activities/a/${ID}.webp`, "b")).toBe(`activities/b/${ID}.webp`);
    expect(moveTarget(`activities/a/thumbs/${ID}.webp`, "b", true)).toBe(`activities/b/thumbs/${ID}.webp`);
    expect(fileName(`activities/a/${ID}.webp`)).toBe(`${ID}.webp`);
    expect(slugOfPath(`activities/eid-distribution/thumbs/${ID}.webp`)).toBe("eid-distribution");
    expect(slugOfPath("photos/x.webp")).toBeNull();
  });
  it("parses uploader paths and lists every name a reservation may produce", () => {
    expect(parseUploadPath(`activities/eid-distribution/thumbs/${ID}.jpg`)).toEqual({
      slug: "eid-distribution",
      fileId: ID,
      ext: "jpg",
      thumb: true,
    });
    expect(parseUploadPath(`activities/x/${ID}.webp`)?.thumb).toBe(false);
    expect(parseUploadPath(`activities/x/sub/${ID}.webp`)).toBeNull();
    expect(parseUploadPath(`activities/x/${ID}.png`)).toBeNull();
    expect(parseUploadPath(`activities/X/${ID}.webp`)).toBeNull();
    expect(parseUploadPath("activities/x/IMG_1.jpg")).toBeNull();
    expect(reservedFilePaths("x", ID)).toEqual([
      `activities/x/${ID}.webp`,
      `activities/x/thumbs/${ID}.webp`,
      `activities/x/${ID}.jpg`,
      `activities/x/thumbs/${ID}.jpg`,
    ]);
    expect(fileIdOf(`activities/x/thumbs/${ID.toUpperCase()}.webp`)).toBe(ID);
    expect(fileIdOf("IMG_1.jpg")).toBeNull();
  });
  it("validates slugs and fits dimensions", () => {
    expect(isSlug("ramadan-iftar")).toBe(true);
    expect(isSlug("Ramadan")).toBe(false);
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 4000, 480)).toEqual({ width: 120, height: 480 });
  });
});

describe("folder sync planning", () => {
  const root = [
    { name: "thumbs", id: null },
    { name: ".emptyFolderPlaceholder", id: "p" },
    { name: `${ID}.webp`, id: "o1" },
    { name: "IMG_2041.jpg", id: "o2" },
    { name: "registered.webp", id: "o3" },
    { name: "7d1e2f3a-4b5c-4d6e-8f70-1a2b3c4d5e6f.webp", id: "o4" },
  ];
  const thumbs = [{ name: `${ID}.webp`, id: "t1" }, { name: "registered.webp", id: "t3" }];
  const registered = new Set(["activities/x/registered.webp", "activities/x/thumbs/registered.webp"]);

  it("ignores folders, placeholders and registered files; adopts optimized orphans", () => {
    const plan = planCategory("x", root, thumbs, registered);
    expect(plan.map((c) => [c.path, c.kind])).toEqual([
      [`activities/x/${ID}.webp`, "adopt"],
      ["activities/x/IMG_2041.jpg", "convert"],
      ["activities/x/7d1e2f3a-4b5c-4d6e-8f70-1a2b3c4d5e6f.webp", "convert"], // no thumbnail
    ]);
    expect(plan[0].thumbPath).toBe(`activities/x/thumbs/${ID}.webp`);
    expect(plan[1].objectId).toBe("o2");
  });
  it("skips names reserved by a browser upload that is still in progress", () => {
    const reserved = new Set([ID, "7d1e2f3a-4b5c-4d6e-8f70-1a2b3c4d5e6f"]);
    expect(planCategory("x", root, thumbs, registered, { reserved }).map((c) => c.path)).toEqual(["activities/x/IMG_2041.jpg"]);
  });
  it("converts photos one folder down and ignores thumbs/", () => {
    const withSub = [...root, { name: "2025-event", id: null }];
    expect(photoSubfolders(withSub)).toEqual(["2025-event"]);
    const nested = [
      { folder: "2025-event", entries: [{ name: "a.jpg", id: "n1" }, { name: ".emptyFolderPlaceholder", id: "p2" }, { name: "deeper", id: null }] },
    ];
    const plan = planCategory("x", [], [], new Set(), { nested });
    expect(plan).toEqual([{ slug: "x", path: "activities/x/2025-event/a.jpg", objectId: "n1", kind: "convert", thumbPath: null }]);
  });
  it("uses the storage object id as the converted file name (idempotent)", () => {
    expect(convertTargets("x", "o2")).toEqual({ full: "activities/x/o2.webp", thumb: "activities/x/thumbs/o2.webp" });
  });
  it("reports rows whose files are missing, only for scanned folders", () => {
    const present = presentPaths("x", root, thumbs);
    const rows = [
      { id: "1", storage_path: "activities/x/registered.webp", thumb_path: "activities/x/thumbs/registered.webp", caption: "" },
      { id: "2", storage_path: "activities/x/gone.webp", thumb_path: null, caption: "হারানো" },
      { id: "3", storage_path: "activities/x/IMG_2041.jpg", thumb_path: "activities/x/thumbs/none.webp", caption: "" },
      { id: "4", storage_path: "activities/y/gone.webp", thumb_path: null, caption: "" },
    ];
    expect(findMissing(rows, present, new Set(["activities/x"]))).toEqual([
      { id: "2", path: "activities/x/gone.webp", caption: "হারানো", what: "image" },
      { id: "3", path: "activities/x/thumbs/none.webp", caption: "", what: "thumb" },
    ]);
  });
});

describe("pager window", () => {
  it("shows first, last and neighbours with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(pageWindow(10, 10)).toEqual([1, "gap", 9, 10]);
  });
});
