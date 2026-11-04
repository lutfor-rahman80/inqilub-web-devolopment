import type { Locale, Messages } from "../config";

/**
 * "Notice" (organization decision Q9 — the same English word on Bengali and
 * English pages; table press_items): news coverage of the organization's activities and
 * interviews given to news channels. Owned by the programs module.
 * English texts are drafts for the organization's review.
 */
const bn = {
  breadcrumb: "পৃষ্ঠার অবস্থান",
  title: "Notice",
  eyebrow: "গণমাধ্যমে আমাদের কার্যক্রম",
  intro: "বিভিন্ন সংবাদমাধ্যমে প্রকাশিত আমাদের কার্যক্রমের খবর এবং টিভি ও অনলাইন নিউজ চ্যানেলকে দেওয়া সাক্ষাৎকার ও ভিডিও প্রতিবেদন।",
  metaDescription: "সংবাদমাধ্যমে ইনকিলাব যুব সংগঠনের কার্যক্রমের খবর এবং নিউজ চ্যানেলে দেওয়া সাক্ষাৎকার ও ভিডিও প্রতিবেদন।",
  sourceNote: "এখানে শুধু মূল প্রকাশকের প্রতিবেদনের লিংক দেওয়া হয়; সংবাদের লেখা বা ভিডিও এই ওয়েবসাইটে কপি করে রাখা হয় না।",
  tabsLabel: "ধরন অনুযায়ী প্রতিবেদন",
  tabs: { all: "সব", news: "সংবাদ", interview: "সাক্ষাৎকার", video_report: "ভিডিও প্রতিবেদন" },
  kind: { news: "সংবাদ", interview: "সাক্ষাৎকার", video_report: "ভিডিও প্রতিবেদন" },
  listLabel: "প্রতিবেদনের তালিকা",
  count: "মোট {count}টি প্রতিবেদন",
  countOne: "মোট ১টি প্রতিবেদন",
  pageOf: "পৃষ্ঠা {page} / {total}",
  pagerLabel: "প্রতিবেদন তালিকার পৃষ্ঠা",
  previous: "আগের",
  next: "পরের",
  page: "পৃষ্ঠা {page}",
  outlet: "সংবাদমাধ্যম",
  date: "প্রকাশের তারিখ",
  readNews: "সংবাদটি পড়ুন",
  readInterview: "সাক্ষাৎকারটি পড়ুন",
  watchVideo: "ভিডিও দেখুন",
  watchOnYoutube: "ইউটিউবে দেখুন",
  opensInNewTab: "(নতুন ট্যাবে খুলবে)",
  relatedProgram: "সংশ্লিষ্ট কর্মসূচি",
  play: "চালান",
  playLabel: "ভিডিও চালান: {title}",
  videoTitle: "{title} — ভিডিও",
  playerNote: "“চালান” চাপলে ইউটিউব থেকে ভিডিওটি লোড হবে।",
  empty: {
    all: { title: "এখনো কোনো প্রতিবেদন যুক্ত করা হয়নি", body: "সংবাদমাধ্যমে প্রকাশিত খবর ও সাক্ষাৎকার এখানে যুক্ত করা হবে।" },
    kind: { title: "এই ধরনের কোনো প্রতিবেদন এখনো নেই", body: "অন্য ধরনের প্রতিবেদন দেখতে “সব” বেছে নিন।" },
    page: { title: "এই পৃষ্ঠায় কোনো প্রতিবেদন নেই" },
  },
  seeAll: "সব প্রতিবেদন দেখুন",
  firstPage: "প্রথম পৃষ্ঠায় যান",
} as const;

const en: Messages<typeof bn> = {
  breadcrumb: "Breadcrumb",
  title: "Notice",
  eyebrow: "Our activities in the media",
  intro: "News coverage of our activities by news outlets, and interviews and video reports by TV and online news channels.",
  metaDescription: "News coverage of Inqilab Jubo Sangathan's activities, and interviews and video reports by news channels.",
  sourceNote: "This page only links to the original publisher's report; articles and videos are not copied to this website.",
  tabsLabel: "Reports by type",
  tabs: { all: "All", news: "News", interview: "Interviews", video_report: "Video reports" },
  kind: { news: "News", interview: "Interview", video_report: "Video report" },
  listLabel: "List of reports",
  count: "{count} reports in total",
  countOne: "1 report in total",
  pageOf: "Page {page} of {total}",
  pagerLabel: "Report list pages",
  previous: "Previous",
  next: "Next",
  page: "Page {page}",
  outlet: "News outlet",
  date: "Published on",
  readNews: "Read the news",
  readInterview: "Read the interview",
  watchVideo: "Watch the video",
  watchOnYoutube: "Watch on YouTube",
  opensInNewTab: "(opens in a new tab)",
  relatedProgram: "Related program",
  play: "Play",
  playLabel: "Play video: {title}",
  videoTitle: "{title} — video",
  playerNote: "The video loads from YouTube only when you press “Play”.",
  empty: {
    all: { title: "No reports have been added yet", body: "News coverage and interviews will be listed here." },
    kind: { title: "There are no reports of this type yet", body: "Choose “All” to see other reports." },
    page: { title: "There are no reports on this page" },
  },
  seeAll: "See all reports",
  firstPage: "Go to the first page",
};

export const press: Record<Locale, Messages<typeof bn>> = { bn, en };
