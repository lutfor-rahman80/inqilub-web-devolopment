import type { Locale, Messages } from "../config";

/**
 * About page (আমাদের সম্পর্কে). The organization's own texts (পরিচিতি,
 * লক্ষ্য, উদ্দেশ্য, কেন) come from site settings via siteTexts(); these are
 * only the headings and links. English texts are drafts for review.
 */
const bn = {
  title: "আমাদের সম্পর্কে",
  crumb: "আমাদের সম্পর্কে",
  metaDescription: "{name} — {tagline}। লক্ষ্য: {goal} উদ্দেশ্য: {objective}",
  intro: "পরিচিতি",
  goalObjective: "লক্ষ্য ও উদ্দেশ্য",
  goal: "লক্ষ্য",
  objective: "উদ্দেশ্য",
  why: "{name} কেন?",
  identity: {
    title: "আমাদের পরিচয়",
  },
  activities: {
    eyebrow: "আমাদের কার্যক্রম",
    title: "সংগঠনের কার্যক্রমসমূহ",
    intro: "প্রতিটি কার্যক্রমের বিস্তারিত বিবরণ, কর্মসূচি ও ছবি দেখতে নামের উপর ক্লিক করুন।",
    programsLink: "তারিখসহ সব কর্মসূচি দেখুন",
  },
  slogan: "আমাদের স্লোগান",
  connect: {
    title: "যুক্ত থাকুন",
    address: "ঠিকানা",
    contact: "যোগাযোগ করুন",
    members: "সদস্যবৃন্দ",
    membersBody: "সংগঠনের দায়িত্বশীল ও সদস্যদের তালিকা ও পদবী দেখুন।",
    membersTerm: "কমিটির মেয়াদ:",
    membersCta: "সদস্যবৃন্দ দেখুন",
    join: "সদস্য হোন",
    joinBody: "অনলাইনে ফর্ম পূরণ করে সদস্য পদের জন্য আবেদন করুন।",
    joinCta: "সদস্য ফর্ম পূরণ করুন",
    joinClosed: "বর্তমানে নতুন সদস্য আবেদন গ্রহণ সাময়িকভাবে বন্ধ রয়েছে।",
    statusCta: "আবেদনের অবস্থা যাচাই",
    press: "Notice",
    pressBody: "সংবাদমাধ্যমে প্রকাশিত আমাদের কার্যক্রমের খবর ও সাক্ষাৎকার।",
    pressCta: "Notice পাতা দেখুন",
    faq: "প্রশ্নোত্তর",
    faqBody: "সংগঠন ও সদস্য পদ নিয়ে সাধারণ প্রশ্নের উত্তর।",
    faqCta: "প্রশ্নোত্তর দেখুন",
  },
} as const;

const en: Messages<typeof bn> = {
  title: "About us",
  crumb: "About us",
  metaDescription: "{name} — {tagline}. Goal: {goal} Objective: {objective}",
  intro: "Introduction",
  goalObjective: "Goal and objective",
  goal: "Goal",
  objective: "Objective",
  why: "Why {name}?",
  identity: {
    title: "Who we are",
  },
  activities: {
    eyebrow: "Our activities",
    title: "Our areas of work",
    intro: "Select an area to see its description, programs and photos.",
    programsLink: "See all programs with their dates",
  },
  slogan: "Our slogan",
  connect: {
    title: "Stay connected",
    address: "Address",
    contact: "Contact us",
    members: "Members",
    membersBody: "See the list of the organization's office-bearers and members with their positions.",
    membersTerm: "Committee term:",
    membersCta: "View members",
    join: "Become a member",
    joinBody: "Apply for membership by filling in the online form.",
    joinCta: "Fill in the membership form",
    joinClosed: "New membership applications are temporarily closed.",
    statusCta: "Check application status",
    press: "Notice",
    pressBody: "News reports and interviews about our work in the media.",
    pressCta: "Visit the Notice page",
    faq: "FAQ",
    faqBody: "Answers to common questions about the organization and membership.",
    faqCta: "Read the FAQ",
  },
};

export const about: Record<Locale, Messages<typeof bn>> = { bn, en };
