import { bn } from "@/lib/format";

/**
 * The homepage hero slider (design C) shows the photos marked “হিরো স্লাইডার”
 * (is_featured) that visitors can see (published, in an active category), in
 * display order — প্রদর্শন ক্রম (sort_order) ascending, then the newest upload
 * first — and at most this many (6 × 6 s per round; every progress segment
 * stays at least 44px wide on a 360px phone). Used by the homepage
 * (getHeroSlides) and by the admin gallery, which shows which marked photos
 * are on the homepage.
 */
export const HERO_SLIDES_LIMIT = 6;

type Orderable<Q> = { order(column: string, options?: { ascending?: boolean }): Q };

/** Applies the hero slider's display order to a gallery_images query (one definition for both readers). */
export function inHeroOrder<Q extends Orderable<Q>>(query: Q): Q {
  return query.order("sort_order", { ascending: true }).order("created_at", { ascending: false }).order("id", { ascending: true });
}

/** Where a photo marked “হিরো স্লাইডার” stands. */
export type HeroPlacement =
  | { status: "shown"; position: number }
  | { status: "over-limit" | "unpublished" | "inactive-category" };

export type HeroCandidate = { id: string; isPublished: boolean; categoryActive: boolean };

/**
 * Placement of every marked photo, given all of them in hero order
 * (inHeroOrder): the first HERO_SLIDES_LIMIT that visitors can see are shown
 * (position 1…6), the rest are over the limit; unpublished photos and photos
 * in an inactive category are not shown at all.
 */
export function heroPlacements(ordered: HeroCandidate[]): Map<string, HeroPlacement> {
  const out = new Map<string, HeroPlacement>();
  let shown = 0;
  for (const c of ordered) {
    if (!c.isPublished) out.set(c.id, { status: "unpublished" });
    else if (!c.categoryActive) out.set(c.id, { status: "inactive-category" });
    else if (shown < HERO_SLIDES_LIMIT) out.set(c.id, { status: "shown", position: ++shown });
    else out.set(c.id, { status: "over-limit" });
  }
  return out;
}

/** Admin text (Bengali) for a placement: a short badge and a sentence for the confirmation message. */
export function heroPlacementText(p: HeroPlacement): { badge: string; added: string } {
  const limit = bn(HERO_SLIDES_LIMIT);
  switch (p.status) {
    case "shown":
      return {
        badge: `হোমপেজে দেখাচ্ছে (${bn(p.position)} নম্বর)`,
        added: `হিরো স্লাইডারে (হোমপেজের উপরে) যুক্ত হয়েছে — ${bn(p.position)} নম্বর ছবি হিসেবে দেখাবে।`,
      };
    case "over-limit":
      return {
        badge: `হোমপেজে দেখাচ্ছে না — প্রথম ${limit}টিই দেখায়`,
        added: `হিরো স্লাইডারে চিহ্নিত হয়েছে, তবে হোমপেজে প্রথম ${limit}টি ছবিই দেখায় — এটি দেখাতে প্রদর্শন ক্রম কমান বা অন্য একটি ছবি হিরো স্লাইডার থেকে সরান।`,
      };
    case "unpublished":
      return {
        badge: "হোমপেজে দেখাচ্ছে না — ছবিটি অপ্রকাশিত",
        added: "হিরো স্লাইডারে চিহ্নিত হয়েছে, তবে ছবিটি অপ্রকাশিত — প্রকাশ করলে হোমপেজে দেখাবে।",
      };
    case "inactive-category":
      return {
        badge: "হোমপেজে দেখাচ্ছে না — ক্যাটাগরি নিষ্ক্রিয়",
        added: "হিরো স্লাইডারে চিহ্নিত হয়েছে, তবে ছবির ক্যাটাগরি নিষ্ক্রিয় — ক্যাটাগরি সক্রিয় করলে হোমপেজে দেখাবে।",
      };
  }
}
