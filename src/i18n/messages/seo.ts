import type { Locale, Messages } from "../config";

/**
 * Shared page furniture of the pages module: breadcrumb label and the share
 * buttons. English texts are drafts for the organization's review.
 */
const bn = {
  breadcrumb: "পৃষ্ঠার অবস্থান",
  share: {
    label: "শেয়ার করুন: {title}",
    facebook: "ফেসবুকে শেয়ার",
    whatsapp: "হোয়াটসঅ্যাপে শেয়ার",
    more: "অন্য অ্যাপে শেয়ার",
    copy: "লিংক কপি করুন",
    copied: "লিংক কপি হয়েছে",
    copyFailed: "লিংক কপি করা যায়নি",
    copyFailedHelp: "লিংক কপি করা যায়নি। ঠিকানা বার থেকে লিংকটি কপি করুন।",
    newTab: "(নতুন ট্যাবে খুলবে)",
  },
} as const;

const en: Messages<typeof bn> = {
  breadcrumb: "Breadcrumb",
  share: {
    label: "Share: {title}",
    facebook: "Share on Facebook",
    whatsapp: "Share on WhatsApp",
    more: "Share via another app",
    copy: "Copy link",
    copied: "Link copied",
    copyFailed: "The link could not be copied",
    copyFailedHelp: "The link could not be copied. Please copy it from the address bar.",
    newTab: "(opens in a new tab)",
  },
};

export const seo: Record<Locale, Messages<typeof bn>> = { bn, en };
export type ShareLabels = Messages<typeof bn>["share"];
/** Only the share labels (small; used by the client share buttons as a fallback). */
export const shareLabels: Record<Locale, ShareLabels> = { bn: bn.share, en: en.share };
