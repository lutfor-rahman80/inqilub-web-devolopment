import type { Locale, Messages } from "../config";

/**
 * Public member directory (/members). Names, designations and member numbers
 * come from the public_members view; English designations fall back to
 * Bengali. English texts are drafts for the organization's review.
 */
const bn = {
  metaTitle: "সদস্যবৃন্দ",
  metaDescription: "{org}-এর দায়িত্বশীল ও সদস্যদের তালিকা (সদস্যদের সম্মতিক্রমে প্রকাশিত)।",
  crumb: "সদস্যবৃন্দ",
  eyebrow: "সদস্যবৃন্দ",
  title: "আমাদের সদস্যবৃন্দ",
  intro: "{org}-এর দায়িত্বশীল ও সদস্যদের তালিকা। শুধু যারা সম্মতি দিয়েছেন তাদের নাম এখানে প্রকাশ করা হয়।",
  search: {
    label: "সদস্য খুঁজুন",
    name: "নাম দিয়ে খুঁজুন",
    placeholder: "সদস্যের নাম লিখুন",
    designation: "পদবী",
    allDesignations: "সব পদবী",
    submit: "খুঁজুন",
    clear: "মুছুন",
    clearLabel: "অনুসন্ধান মুছুন, পুরো তালিকা দেখুন",
  },
  count: {
    found: "{count} জন সদস্য পাওয়া গেছে",
    foundOne: "{count} জন সদস্য পাওয়া গেছে",
    designation: " · পদবী: {name}",
    none: "কোনো সদস্য পাওয়া যায়নি।",
    total: "তালিকায় মোট {count} জন",
    totalOne: "তালিকায় মোট {count} জন",
  },
  empty: {
    title: "এখনো কোনো সদস্যের নাম প্রকাশ করা হয়নি",
    body: "সদস্যদের সম্মতিক্রমে অনুমোদিত সদস্যদের নাম এখানে প্রকাশ করা হবে।",
  },
  noResults: {
    title: "কোনো সদস্য পাওয়া যায়নি",
    before: "বানান বা পদবী পরিবর্তন করে আবার খুঁজুন, অথবা ",
    link: "পুরো তালিকা দেখুন",
    after: "।",
  },
  committee: "কমিটি",
  leadership: { eyebrow: "নেতৃত্ব", title: "দায়িত্বশীলবৃন্দ" },
  general: { eyebrow: "সদস্য", title: "সাধারণ সদস্যবৃন্দ" },
  resultsTitle: "অনুসন্ধানের ফলাফল",
  pagination: {
    label: "সদস্য তালিকার পৃষ্ঠা",
    previous: "আগের",
    next: "পরের",
    page: "পৃষ্ঠা {n}",
  },
  card: {
    memberNo: "সদস্য নম্বর:",
    photoAlt: "{name}-এর ছবি",
    noPhoto: "{name} (ছবি যুক্ত করা হয়নি)",
    call: "ফোন করুন: {phone}",
  },
  footnoteBefore:
    "তালিকায় শুধু সদস্যদের সম্মতিক্রমে নাম, পদবী, সদস্য নম্বর ও সংগঠন কর্তৃক যুক্ত ছবি দেখানো হয়। তালিকায় কোনো ভুল থাকলে বা নাম সরাতে চাইলে ",
  footnoteLink: "যোগাযোগ করুন",
  footnoteAfter: "।",
} as const;

const en: Messages<typeof bn> = {
  metaTitle: "Members",
  metaDescription: "Office bearers and members of {org} (listed with the members' consent).",
  crumb: "Members",
  eyebrow: "Members",
  title: "Our members",
  intro: "Office bearers and members of {org}. Only members who have given their consent are listed here.",
  search: {
    label: "Search members",
    name: "Search by name",
    placeholder: "Type a member's name",
    designation: "Designation",
    allDesignations: "All designations",
    submit: "Search",
    clear: "Clear",
    clearLabel: "Clear the search and show the full list",
  },
  count: {
    found: "{count} members found",
    foundOne: "{count} member found",
    designation: " · Designation: {name}",
    none: "No members found.",
    total: "{count} people listed",
    totalOne: "{count} person listed",
  },
  empty: {
    title: "No members have been listed yet",
    body: "Approved members will be listed here with their consent.",
  },
  noResults: {
    title: "No members found",
    before: "Try another spelling or designation, or ",
    link: "see the full list",
    after: ".",
  },
  committee: "Committee",
  leadership: { eyebrow: "Leadership", title: "Office bearers" },
  general: { eyebrow: "Members", title: "General members" },
  resultsTitle: "Search results",
  pagination: {
    label: "Member list pages",
    previous: "Previous",
    next: "Next",
    page: "Page {n}",
  },
  card: {
    memberNo: "Member no.:",
    photoAlt: "Photo of {name}",
    noPhoto: "{name} (no photo added)",
    call: "Call {phone}",
  },
  footnoteBefore:
    "Only names, designations, member numbers and photos added by the organization are shown, with the members' consent. If something in the list is wrong or you would like your name removed, please ",
  footnoteLink: "contact us",
  footnoteAfter: ".",
};

export const members: Record<Locale, Messages<typeof bn>> = { bn, en };
export type MembersMessages = Messages<typeof bn>;
