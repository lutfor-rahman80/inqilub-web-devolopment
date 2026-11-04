import type { Locale, Messages } from "../config";

/**
 * Public gallery (/gallery), photo grid and lightbox. Captions are entered in
 * Bengali; English pages mark them lang="bn". English texts are drafts for
 * the organization's review.
 */
const bn = {
  title: "গ্যালারি",
  eyebrow: "ছবিতে আমাদের কার্যক্রম",
  crumb: "গ্যালারি",
  intro: "সংগঠনের বিভিন্ন কার্যক্রমের ছবি। ক্যাটাগরি বেছে নিয়ে নির্দিষ্ট কার্যক্রমের ছবি দেখুন; ছবিতে চাপ দিলে বড় করে দেখা যাবে।",
  metaDescription: "ইনকিলাব যুব সংগঠনের বিভিন্ন সামাজিক, সেবা ও শিক্ষামূলক কার্যক্রমের ছবি।",
  metaCategoryTitle: "{name} — গ্যালারি",
  metaCategoryDescription: "ইনকিলাব যুব সংগঠনের “{name}” কার্যক্রমের ছবি।",
  filterLabel: "ক্যাটাগরি অনুযায়ী ছবি",
  all: "সব",
  allPhotos: "সব ছবি",
  total: "মোট {count}টি ছবি",
  totalOne: "মোট ১টি ছবি",
  pageOf: "পৃষ্ঠা {page} / {total}",
  categoryDetails: "কার্যক্রমের বিস্তারিত",
  unknownTitle: "ক্যাটাগরিটি খুঁজে পাওয়া যায়নি",
  unknownBody: "লিংকটি পুরোনো হতে পারে।",
  seeAll: "সব ছবি দেখুন",
  emptyPage: "এই পৃষ্ঠায় কোনো ছবি নেই",
  firstPage: "প্রথম পৃষ্ঠায় যান",
  emptyCategory: "এই কার্যক্রমের ছবি শীঘ্রই যুক্ত করা হবে",
  emptyCategoryBody: "অন্য কার্যক্রমের ছবি দেখতে উপরের তালিকা থেকে একটি ক্যাটাগরি বেছে নিন।",
  emptyAll: "গ্যালারিতে এখনো কোনো ছবি যুক্ত হয়নি",
  emptyAllBody: "সংগঠনের কার্যক্রমের ছবি শীঘ্রই এখানে যুক্ত করা হবে।",
  photosLabel: "{name} — ছবি",
  loading: "ছবি লোড হচ্ছে…",
  pager: {
    label: "গ্যালারির পৃষ্ঠা",
    previous: "আগের",
    next: "পরের",
    page: "পৃষ্ঠা {page}",
  },
  grid: {
    listLabel: "ছবির তালিকা",
    enlarge: "বড় করে দেখুন: {alt}",
  },
  lightbox: {
    Previous: "আগের ছবি",
    Next: "পরের ছবি",
    Close: "বন্ধ করুন (Esc)",
    Lightbox: "ছবি বড় করে দেখা",
    Carousel: "ছবির সারি",
    Slide: "ছবি",
    "Photo gallery": "ছবির গ্যালারি",
    "{index} of {total}": "{total}টির মধ্যে {index} নম্বর ছবি",
    Caption: "ক্যাপশন",
    "Show captions": "ক্যাপশন দেখান",
    "Hide captions": "ক্যাপশন লুকান",
  },
} as const;

const en: Messages<typeof bn> = {
  title: "Gallery",
  eyebrow: "Our work in pictures",
  crumb: "Gallery",
  intro: "Photos of the organization's activities. Choose a category to see the photos of one activity; select a photo to view it larger.",
  metaDescription: "Photos of the social, service and educational activities of Inqilab Jubo Sangathan.",
  metaCategoryTitle: "{name} — gallery",
  metaCategoryDescription: "Photos of the “{name}” activities of Inqilab Jubo Sangathan.",
  filterLabel: "Photos by category",
  all: "All",
  allPhotos: "All photos",
  total: "{count} photos in total",
  totalOne: "1 photo in total",
  pageOf: "Page {page} of {total}",
  categoryDetails: "About this activity",
  unknownTitle: "This category was not found",
  unknownBody: "The link may be out of date.",
  seeAll: "See all photos",
  emptyPage: "There are no photos on this page",
  firstPage: "Go to the first page",
  emptyCategory: "Photos of this activity will be added soon",
  emptyCategoryBody: "Choose another category above to see photos of other activities.",
  emptyAll: "No photos have been added to the gallery yet",
  emptyAllBody: "Photos of the organization's activities will be added here soon.",
  photosLabel: "{name} — photos",
  loading: "Loading photos…",
  pager: {
    label: "Gallery pages",
    previous: "Previous",
    next: "Next",
    page: "Page {page}",
  },
  grid: {
    listLabel: "List of photos",
    enlarge: "View larger: {alt}",
  },
  lightbox: {
    Previous: "Previous photo",
    Next: "Next photo",
    Close: "Close (Esc)",
    Lightbox: "Photo viewer",
    Carousel: "Photos",
    Slide: "Photo",
    "Photo gallery": "Photo gallery",
    "{index} of {total}": "Photo {index} of {total}",
    Caption: "Caption",
    "Show captions": "Show captions",
    "Hide captions": "Hide captions",
  },
};

export const gallery: Record<Locale, Messages<typeof bn>> = { bn, en };
export type GalleryGridMessages = Messages<typeof bn>["grid"];
export type LightboxMessages = Messages<typeof bn>["lightbox"];
export type PagerMessages = Messages<typeof bn>["pager"];
/** Only what the photo grid + lightbox need (client fallback when no labels are passed). */
export const photoViewerMessages: Record<Locale, { grid: GalleryGridMessages; lightbox: LightboxMessages }> = {
  bn: { grid: bn.grid, lightbox: bn.lightbox },
  en: { grid: en.grid, lightbox: en.lightbox },
};
