import type { Locale, Messages } from "../config";

/**
 * Activity areas (কার্যক্রমের ক্ষেত্র): /activities and /activities/<slug>.
 * Category names/summaries/descriptions come from the database (English
 * optional). English texts are drafts for the organization's review.
 */
const bn = {
  title: "কার্যক্রমের ক্ষেত্র",
  eyebrow: "আমাদের কার্যক্রম",
  crumb: "কার্যক্রমের ক্ষেত্র",
  metaDescription: "ইনকিলাব যুব সংগঠনের ইসলামিক, সামাজিক কল্যাণ, সেবা ও শিক্ষামূলক কার্যক্রমের ক্ষেত্রসমূহ ও সেগুলোর ছবি।",
  listHeading: "কার্যক্রমের তালিকা",
  empty: "কার্যক্রমের তথ্য শীঘ্রই যুক্ত করা হবে",
  programsNote: "তারিখসহ নির্দিষ্ট আয়োজনগুলো দেখতে কর্মসূচি পাতা দেখুন।",
  programsLink: "সব কর্মসূচি",
  card: {
    photos: "{count}টি ছবি",
    photoOne: "১টি ছবি",
    noPhotos: "ছবি শীঘ্রই যুক্ত হবে",
    details: "বিস্তারিত",
  },
  detail: {
    metaDescription: "ইনকিলাব যুব সংগঠনের “{name}” কার্যক্রম, কর্মসূচি ও ছবি।",
    notFound: "কার্যক্রম পাওয়া যায়নি",
    englishMissing: "এই ক্ষেত্রের ইংরেজি বিবরণ এখনো যুক্ত হয়নি; বাংলা লেখা দেখানো হচ্ছে।",
    share: "এই পৃষ্ঠা শেয়ার করুন",
    programs: "এই ক্ষেত্রের কর্মসূচি",
    programsLabel: "{name} — কর্মসূচি",
    programsEmpty: "এই ক্ষেত্রে এখনো কোনো কর্মসূচি প্রকাশ করা হয়নি।",
    programsAll: "এই ক্ষেত্রের সব কর্মসূচি",
    allPrograms: "সব কর্মসূচি দেখুন",
    photos: "ছবি",
    photoCount: "({count}টি)",
    photosLabel: "{name} — ছবি",
    inGallery: "গ্যালারিতে দেখুন",
    morePhotos: "আরও ছবি দেখুন ({count}টি)",
    noPhotos: "এই কার্যক্রমের ছবি শীঘ্রই যুক্ত করা হবে",
    otherPhotos: "অন্যান্য কার্যক্রমের ছবি দেখতে গ্যালারি ঘুরে আসুন।",
    galleryCta: "গ্যালারি দেখুন",
    others: "অন্যান্য কার্যক্রম",
  },
} as const;

const en: Messages<typeof bn> = {
  title: "Areas of work",
  eyebrow: "Our activities",
  crumb: "Areas of work",
  metaDescription: "Areas of the Islamic, social welfare, service and educational work of Inqilab Jubo Sangathan, with photos.",
  listHeading: "List of activity areas",
  empty: "Information about our activities will be added soon",
  programsNote: "To see individual events with their dates, visit the programs page.",
  programsLink: "All programs",
  card: {
    photos: "{count} photos",
    photoOne: "1 photo",
    noPhotos: "Photos coming soon",
    details: "Details",
  },
  detail: {
    metaDescription: "“{name}” — activities, programs and photos of Inqilab Jubo Sangathan.",
    notFound: "Activity not found",
    englishMissing: "The English description of this area has not been added yet; the Bengali text is shown.",
    share: "Share this page",
    programs: "Programs in this area",
    programsLabel: "{name} — programs",
    programsEmpty: "No programs have been published in this area yet.",
    programsAll: "All programs in this area",
    allPrograms: "See all programs",
    photos: "Photos",
    photoCount: "({count})",
    photosLabel: "{name} — photos",
    inGallery: "View in the gallery",
    morePhotos: "See more photos ({count})",
    noPhotos: "Photos of this activity will be added soon",
    otherPhotos: "Visit the gallery to see photos of our other activities.",
    galleryCta: "Open the gallery",
    others: "Other activities",
  },
};

export const activities: Record<Locale, Messages<typeof bn>> = { bn, en };
