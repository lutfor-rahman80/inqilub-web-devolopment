import type { Locale, Messages } from "../config";

/** Public FAQ page (প্রশ্নোত্তর). The questions and answers come from the database. English texts are drafts for review. */
const bn = {
  title: "প্রশ্নোত্তর",
  eyebrow: "সাধারণ জিজ্ঞাসা",
  crumb: "প্রশ্নোত্তর",
  intro: "সংগঠন, সদস্য পদ ও এই ওয়েবসাইট নিয়ে প্রায়ই জিজ্ঞাসা করা প্রশ্নের উত্তর।",
  metaDescription: "ইনকিলাব যুব সংগঠন, সদস্য পদ, আবেদনের অবস্থা ও ওয়েবসাইট নিয়ে সাধারণ প্রশ্ন ও উত্তর।",
  listLabel: "প্রশ্ন ও উত্তর",
  count: "{count}টি প্রশ্ন",
  countOne: "১টি প্রশ্ন",
  hint: "প্রশ্নে চাপ দিলে উত্তর দেখা যাবে।",
  emptyTitle: "এখনো কোনো প্রশ্নোত্তর প্রকাশ করা হয়নি",
  emptyBody: "আপনার কোনো প্রশ্ন থাকলে যোগাযোগ পৃষ্ঠার ফর্মে আমাদের লিখুন।",
  errorTitle: "প্রশ্নোত্তর এই মুহূর্তে লোড করা যাচ্ছে না",
  errorBody: "কিছুক্ষণ পর পৃষ্ঠাটি আবার খুলুন, অথবা যোগাযোগ পৃষ্ঠার ফর্মে আপনার প্রশ্ন লিখুন।",
  englishNote: "কিছু প্রশ্ন বা উত্তর এখনো শুধু বাংলায় আছে।",
  moreTitle: "আপনার প্রশ্নের উত্তর পাননি?",
  moreBody: "যোগাযোগ পৃষ্ঠার ফর্মে আমাদের লিখুন; সংগঠনের দায়িত্বপ্রাপ্তরা উত্তর দেবেন।",
  contactCta: "যোগাযোগ করুন",
} as const;

const en: Messages<typeof bn> = {
  title: "Frequently asked questions",
  eyebrow: "FAQ",
  crumb: "FAQ",
  intro: "Answers to questions we are often asked about the organization, membership and this website.",
  metaDescription: "Common questions and answers about Inqilab Jubo Sangathan, membership, application status and the website.",
  listLabel: "Questions and answers",
  count: "{count} questions",
  countOne: "1 question",
  hint: "Select a question to see its answer.",
  emptyTitle: "No questions and answers have been published yet",
  emptyBody: "If you have a question, please write to us using the form on the contact page.",
  errorTitle: "The questions and answers cannot be loaded right now",
  errorBody: "Please open this page again in a little while, or send your question using the contact form.",
  englishNote: "Some questions or answers are so far available in Bengali only.",
  moreTitle: "Didn't find your answer?",
  moreBody: "Write to us using the form on the contact page; the organization's responsible members will reply.",
  contactCta: "Contact us",
};

export const faq: Record<Locale, Messages<typeof bn>> = { bn, en };
