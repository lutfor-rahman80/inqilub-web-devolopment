import type { Locale, Messages } from "../config";

/**
 * Privacy policy (গোপনীয়তা নীতি). Every statement describes what this
 * website actually does (checked against the code and database rules on the
 * "last updated" date). Text tokens: {contact} → link to the contact page,
 * {access} → link to the "who can see applications" section.
 * The English version is a draft translation for the organization's review.
 */
const bn = {
  title: "গোপনীয়তা নীতি",
  eyebrow: "নীতিমালা",
  crumb: "গোপনীয়তা নীতি",
  metaDescription:
    "সদস্য আবেদন ও যোগাযোগ ফর্মে কোন তথ্য নেওয়া হয়, কেন নেওয়া হয়, কারা দেখতে পারেন, কোথায় সংরক্ষিত থাকে এবং কীভাবে সংশোধন বা মুছে ফেলার অনুরোধ করবেন।",
  intro:
    "{org}-এর ওয়েবসাইট আপনার কোন তথ্য নেয়, কেন নেয়, কীভাবে সুরক্ষিত রাখে এবং কারা তা দেখতে পারেন — সহজ ভাষায় এখানে তুলে ধরা হলো।",
  lastUpdated: "সর্বশেষ হালনাগাদ: {date}",
  summaryTitle: "সংক্ষেপে",
  tocTitle: "বিষয়সূচি",
  tocLabel: "এই পৃষ্ঠার বিষয়সূচি",
  links: {
    contact: "যোগাযোগ পৃষ্ঠার",
    access: "কারা আবেদন দেখতে পারেন",
  },
  summary: [
    "জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা, জন্ম তারিখ, পিতা-মাতার নাম এবং আবেদনের মোবাইল নম্বর কখনো ওয়েবসাইটে প্রকাশ করা হয় না। সদস্য তালিকায় কোনো ফোন নম্বর দেখানো হয় কেবল সংশ্লিষ্ট সদস্যের সুস্পষ্ট সম্মতিতে।",
    "আবেদনের তথ্য শুধু অনুমোদিত কমিটি অ্যাকাউন্ট দেখতে পারে; অনুমতি ডাটাবেস স্তরেও যাচাই করা হয়।",
    "সদস্য তালিকায় নাম দেখানো হয় কেবল আপনার সম্মতি থাকলে; ১৮ বছরের কম বয়সী সদস্যের ক্ষেত্রে অভিভাবকের সম্মতিও লাগে।",
    "সাধারণ দর্শনার্থীদের জন্য কোনো বিজ্ঞাপন, ট্র্যাকিং বা অ্যানালিটিক্স ব্যবহার করা হয় না; আপনি ভাষা বদলালে শুধু পছন্দের ভাষা মনে রাখার একটি কুকি রাখা হয়।",
    "সুপার অ্যাডমিনদের জন্য দুই ধাপের লগইন বাধ্যতামূলক, এবং ওয়েবসাইটে কোনো তৃতীয় পক্ষের স্ক্রিপ্ট চলে না।",
  ],
  sections: [
    {
      id: "membership-data",
      title: "সদস্য আবেদনে যে তথ্য নেওয়া হয়",
      blocks: [
        { p: "সদস্য পদের জন্য অনলাইন আবেদন ফর্মে নিচের তথ্যগুলো নেওয়া হয়:" },
        {
          list: [
            "পূর্ণ নাম, পিতার নাম ও মাতার নাম",
            "জন্ম তারিখ, জাতীয়তা, ধর্ম ও পেশা",
            "স্থায়ী ঠিকানা ও বর্তমান ঠিকানা",
            "জাতীয় পরিচয়পত্র নম্বর অথবা জন্ম নিবন্ধন নম্বর",
            "মোবাইল নম্বর",
            "ইমেইল ঠিকানা (ঐচ্ছিক)",
            "রক্তের গ্রুপ (দিলে)",
            "অঙ্গীকারনামায় আপনার সম্মতি ও সম্মতির সময়",
            "সদস্য তালিকায় নাম প্রকাশে আপনার সম্মতি (ঐচ্ছিক)",
          ],
        },
        { p: "আবেদন ফর্মে আবেদনকারীর কোনো ছবি নেওয়া হয় না।" },
      ],
    },
    {
      id: "why",
      title: "কেন এই তথ্য নেওয়া হয়",
      blocks: [
        {
          list: [
            "আবেদনকারীর পরিচয় ও তথ্য যাচাই করে সদস্য পদ অনুমোদন বা প্রত্যাখ্যানের সিদ্ধান্ত নিতে।",
            "একই জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর দিয়ে একাধিক আবেদন ঠেকাতে।",
            "প্রয়োজনে আবেদনকারীর সাথে যোগাযোগ করতে।",
            "অনুমোদনের পর সদস্য রেকর্ড ও সদস্য নম্বর তৈরি করতে।",
          ],
        },
        { p: "এই তথ্য অন্য কোনো উদ্দেশ্যে ব্যবহার, বিক্রি বা কারো সাথে বিনিময় করা হয় না।" },
      ],
    },
    {
      id: "never-public",
      title: "যে তথ্য কখনো প্রকাশ করা হয় না",
      blocks: [
        {
          p: "জাতীয় পরিচয়পত্র বা জন্ম নিবন্ধন নম্বর, স্থায়ী ও বর্তমান ঠিকানা, জন্ম তারিখ, পিতা-মাতার নাম, ধর্ম, জাতীয়তা, পেশা, রক্তের গ্রুপ, ইমেইল এবং আবেদনে দেওয়া মোবাইল নম্বর ওয়েবসাইটের কোনো পাবলিক পৃষ্ঠায় দেখানো হয় না। এই নিয়ম শুধু ওয়েবসাইটের নকশায় নয়, ডাটাবেসের নিরাপত্তা নিয়মেও (Row-Level Security) প্রয়োগ করা আছে, যাতে সাধারণ দর্শনার্থী এসব তথ্য পড়তে না পারেন।",
        },
        {
          p: "একমাত্র ব্যতিক্রম ফোন নম্বর: কোনো সদস্য সুস্পষ্ট সম্মতি দিলে সদস্য তালিকায় তাঁর একটি ফোন নম্বর দেখানো হতে পারে (পরের অংশ দেখুন)।",
        },
      ],
    },
    {
      id: "directory",
      title: "সদস্য তালিকায় যা দেখা যায়",
      blocks: [
        {
          p: "আবেদনের সময় সম্মতি দিলে, অনুমোদিত ও সক্রিয় সদস্যদের পাবলিক তালিকায় দেখানো হয়: সংগঠন কর্তৃক যুক্ত ছবি (থাকলে), নাম, পদবী ও সদস্য নম্বর। তালিকার জন্য এগুলোর সাথে শুধু সদস্যপদ শুরুর তারিখ এবং তালিকায় সাজানোর ক্রম প্রকাশ্য থাকে; এর বাইরে কোনো তথ্য তালিকায় যায় না।",
        },
        {
          p: "কোনো সদস্যের ফোন নম্বর তালিকায় দেখানো হয় কেবল সেই সদস্যের সুস্পষ্ট সম্মতি থাকলে। সম্মতি না দিলে আপনার নাম পাবলিক তালিকায় আসবে না।",
        },
        {
          p: "জন্ম তারিখ অনুযায়ী যে সদস্যের বয়স ১৮ বছরের কম, সদস্য নিজে সম্মতি দিলেও তাঁর নাম পাবলিক তালিকায় দেখানো হয় কেবল তখনই, যখন অভিভাবকের সম্মতি সংগঠনের রেকর্ডে সংরক্ষিত থাকে। এই নিয়মও ডাটাবেস স্তরে প্রয়োগ করা আছে। এই যাচাইয়ের জন্য আবেদনের জন্ম তারিখ সদস্য রেকর্ডে রাখা হয়; তা কখনো প্রকাশ করা হয় না।",
        },
        {
          p: "সদস্য তালিকার পৃষ্ঠায় সার্চ ইঞ্জিনকে পৃষ্ঠাটি তালিকাভুক্ত (index) না করার নির্দেশ দেওয়া আছে, এবং পৃষ্ঠাটি ওয়েবসাইটের সাইটম্যাপে রাখা হয়নি।",
        },
      ],
    },
    {
      id: "access",
      title: "কারা আবেদন দেখতে পারেন",
      blocks: [
        {
          p: "জমা দেওয়া আবেদন দেখতে পারেন শুধু সংগঠনের অনুমোদিত কমিটি অ্যাকাউন্ট, যাদের অ্যাডমিন প্যানেলে আবেদন দেখার অনুমতি দেওয়া হয়েছে। অনুমোদন বা প্রত্যাখ্যান করতে পারেন কেবল যাদের সেই আলাদা অনুমতি আছে। প্রতিটি অনুমতি ডাটাবেস স্তরে যাচাই করা হয়।",
        },
        {
          p: "এছাড়া প্রশাসনিক কাজের একটি লগ (অডিট লগ) স্বয়ংক্রিয়ভাবে রাখা হয়: কে, কখন, কোন রেকর্ডে কী পরিবর্তন করেছেন। জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা, মোবাইল নম্বর, ইমেইল, জন্ম তারিখ ও পিতা-মাতার নাম লগে কপি করা হয় না — শুধু সেগুলো পরিবর্তিত হয়েছে কি না তা লেখা থাকে। তবে আবেদনকারী বা সদস্যের নাম, ধর্ম, জাতীয়তা, পেশা, রক্তের গ্রুপ, তালিকায় নাম প্রকাশের সম্মতি ও সিদ্ধান্তের মন্তব্যের মতো তথ্য লগে থাকে। এই লগ শুধু অডিট লগ দেখার অনুমতিপ্রাপ্ত কমিটি অ্যাকাউন্ট দেখতে পারে।",
        },
      ],
    },
    {
      id: "security",
      title: "নিরাপত্তা ব্যবস্থা",
      blocks: [
        {
          list: [
            "অ্যাডমিন প্যানেলে সুপার অ্যাডমিনদের জন্য দুই ধাপের লগইন (পাসওয়ার্ডের পর অথেনটিকেটর অ্যাপের কোড) বাধ্যতামূলক। অন্য কমিটি অ্যাকাউন্টও এটি চালু করতে পারে; চালু করলে প্রতিবার লগইনে কোডটি লাগে।",
            "ওয়েবসাইট একটি কনটেন্ট সিকিউরিটি পলিসি (CSP) ব্যবহার করে: ব্রাউজার শুধু এই ওয়েবসাইটের নিজস্ব স্ক্রিপ্ট চালায়; কোনো তৃতীয় পক্ষের স্ক্রিপ্ট, বিজ্ঞাপন বা ট্র্যাকার লোড করা হয় না। মানচিত্র (Google Maps) ও ভিডিও (YouTube) কেবল নির্দিষ্ট ঠিকানা থেকে এম্বেড করা যায়।",
            "ওয়েবসাইটের লেখা, ছবি ও তথ্য শুধু অনুমতিপ্রাপ্ত কমিটি অ্যাকাউন্ট যুক্ত বা পরিবর্তন করতে পারে; প্রতিটি অনুমতি ডাটাবেস স্তরে আবার যাচাই করা হয়।",
          ],
        },
      ],
    },
    {
      id: "status",
      title: "আবেদনের অবস্থা যাচাই",
      blocks: [
        {
          p: "আবেদন জমা দেওয়ার পর একটি ট্র্যাকিং নম্বর দেওয়া হয়। ট্র্যাকিং নম্বর ও আবেদনে দেওয়া মোবাইল নম্বর — দুটোই মিললে তবেই আবেদনের অবস্থা দেখানো হয়: আবেদনকারীর নাম, অবস্থা, জমা ও সিদ্ধান্তের তারিখ এবং অনুমোদিত হলে সদস্য নম্বর। অন্য কোনো ব্যক্তিগত তথ্য সেখানে দেখানো হয় না।",
        },
      ],
    },
    {
      id: "email",
      title: "ইমেইল",
      blocks: [
        {
          p: "আবেদনে ইমেইল ঠিকানা দিলে আবেদন গ্রহণ এবং অনুমোদন বা প্রত্যাখ্যানের খবর স্বয়ংক্রিয় ইমেইলে পাঠানো হতে পারে। এই ইমেইলগুলো Resend নামের একটি আন্তর্জাতিক ইমেইল পাঠানোর সেবার মাধ্যমে যায়। কোন ইমেইল কখন পাঠানো হয়েছে এবং সফল হয়েছে কি না, তার একটি রেকর্ড রাখা হয়। কোনো প্রচারমূলক ইমেইল পাঠানো হয় না।",
        },
      ],
    },
    {
      id: "contact-form",
      title: "যোগাযোগ ফর্ম",
      blocks: [
        {
          p: "{contact} ফর্মে আপনার নাম, মোবাইল নম্বর ও/অথবা ইমেইল, বিষয় এবং বার্তা নেওয়া হয়। এই তথ্য শুধু আপনার বার্তার উত্তর দেওয়ার জন্য ব্যবহৃত হয় এবং কেবল বার্তা দেখার অনুমতিপ্রাপ্ত কমিটি অ্যাকাউন্ট তা দেখতে পারে।",
        },
      ],
    },
    {
      id: "public-content",
      title: "কর্মসূচি, Notice ও প্রকাশিত অন্যান্য তথ্য",
      blocks: [
        {
          p: "ওয়েবসাইটে সংগঠনের কর্মসূচি (তারিখ, স্থান, বিবরণ ও ছবি), কার্যক্রমের ছবি, ঘোষণা, প্রশ্নোত্তর এবং “Notice” পাতায় সংবাদমাধ্যমে প্রকাশিত প্রতিবেদন ও সাক্ষাৎকারের লিংক প্রকাশ করা হয়। এগুলো সংগঠনের অনুমতিপ্রাপ্ত কমিটি অ্যাকাউন্ট থেকে যুক্ত করা হয়; এসব পৃষ্ঠা দেখার জন্য দর্শনার্থীর কাছ থেকে কোনো তথ্য নেওয়া হয় না।",
        },
        {
          p: "Notice পাতায় সংবাদমাধ্যমের প্রতিবেদনের লিংক নতুন ট্যাবে সংশ্লিষ্ট ওয়েবসাইটে খোলে; সেখানে সেই ওয়েবসাইটের নিজস্ব নীতি প্রযোজ্য। ইউটিউব ভিডিওর ক্ষেত্রে ভিডিওর ছোট ছবি (থাম্বনেইল) ইউটিউবের ছবি সার্ভার (i.ytimg.com) থেকে লোড হয়, ফলে আপনার ব্রাউজারের সাধারণ তথ্য (যেমন আইপি ঠিকানা) সেই সার্ভারে পৌঁছায়। ভিডিও প্লেয়ার (youtube-nocookie.com) লোড হয় কেবল আপনি ভিডিও চালু করার বোতাম চাপলে।",
        },
        {
          p: "শেয়ার বোতামগুলো (ফেসবুক, হোয়াটসঅ্যাপ) সাধারণ লিংক: আপনি চাপ না দেওয়া পর্যন্ত এই সেবাগুলোর কাছে কিছু পাঠানো হয় না, এবং এগুলোর কোনো স্ক্রিপ্ট ওয়েবসাইটে লোড করা হয় না।",
        },
      ],
    },
    {
      id: "languages",
      title: "বাংলা ও ইংরেজি সংস্করণ",
      blocks: [
        {
          p: "ওয়েবসাইটের ইংরেজি সংস্করণ /en ঠিকানায় পাওয়া যায়। কোন ভাষায় দেখছেন তা পাতার ঠিকানা (URL) থেকে নির্ধারিত হয়। আপনি BN/EN ভাষা-বোতাম দিয়ে ভাষা বদলালে পছন্দের ভাষাটি একটি কুকিতে (ijs_lang, এক বছরের জন্য) মনে রাখা হয়, যাতে পরের বার মূল ঠিকানায় (/) এলে সেই ভাষায় হোম পেজ খোলে; কুকিটি শুধু এই কাজেই ব্যবহৃত হয়, কোনো ট্র্যাকিংয়ে নয়। যে লেখা এখনো ইংরেজিতে অনুবাদ করা হয়নি তা বাংলায় দেখানো হয়। এই নীতি দুই সংস্করণেই সমানভাবে প্রযোজ্য।",
        },
      ],
    },
    {
      id: "storage",
      title: "তথ্য কোথায় সংরক্ষিত থাকে",
      blocks: [
        {
          p: "ওয়েবসাইটের ডাটাবেস ও ছবি Supabase নামের একটি ক্লাউড সেবায় সংরক্ষিত থাকে, যার সার্ভার বাংলাদেশের বাইরে অবস্থিত। ওয়েবসাইটটি Vercel-এ হোস্ট করা। আপনার ব্রাউজার ও ওয়েবসাইটের মধ্যে সব যোগাযোগ এনক্রিপ্টেড (HTTPS) সংযোগে হয়।",
        },
      ],
    },
    {
      id: "abuse",
      title: "অপব্যবহার রোধ",
      blocks: [
        {
          p: "স্প্যাম ও অপব্যবহার ঠেকাতে ফর্ম জমা দেওয়ার সময় আপনার আইপি ঠিকানা থেকে তৈরি একটি গোপন হ্যাশ (মূল আইপি ঠিকানা নয়) অল্প সময়ের জন্য রাখা হয় এবং পরে স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়। এটি দিয়ে শুধু অল্প সময়ে অতিরিক্ত বার ফর্ম জমা দেওয়া সীমিত করা হয়।",
        },
      ],
    },
    {
      id: "cookies",
      title: "কুকি ও ব্রাউজারে রাখা তথ্য",
      blocks: [
        {
          p: "সাধারণ দর্শনার্থীদের জন্য এই ওয়েবসাইট শুধু একটি প্রয়োজনীয় (ফাংশনাল) কুকি ব্যবহার করে: আপনি BN/EN ভাষা-বোতাম দিয়ে ভাষা বদলালে পছন্দের ভাষা মনে রাখার কুকি (ijs_lang, এক বছরের জন্য; এতে শুধু “bn” বা “en” লেখা থাকে)। কোনো বিজ্ঞাপন, ট্র্যাকিং বা অ্যানালিটিক্স টুল নেই। এ ছাড়া শুধু অ্যাডমিন প্যানেলে লগইন করা কমিটি সদস্যদের জন্য লগইন সেশন ধরে রাখার কুকি ব্যবহৃত হয়।",
        },
        {
          p: "সদস্য আবেদন ফর্ম পূরণের সময় আপনার লেখা তথ্য (জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা, পিতা-মাতার নাম ও মোবাইল নম্বরসহ) জমা না দেওয়া পর্যন্ত শুধু আপনার ব্রাউজারের ওই ট্যাবে (sessionStorage) সাময়িকভাবে রাখা হয়, যাতে পৃষ্ঠা রিফ্রেশ করলে বা ভাষা (বাংলা/English) বদলালে লেখা হারিয়ে না যায়। আবেদন জমা দিলে, “নতুন করে শুরু করুন” চাপলে অথবা ট্যাবটি বন্ধ করলে তা মুছে যায়। শেয়ার করা বা সাইবার ক্যাফের কম্পিউটারে ফর্ম পূরণ করলে কাজ শেষে ট্যাবটি বন্ধ করুন।",
        },
        {
          p: "যোগাযোগ পৃষ্ঠায় গুগল ম্যাপ দেখানো হলে, অথবা আপনি আমাদের ফেসবুক পেজের লিংকে গেলে বা ফেসবুক/হোয়াটসঅ্যাপে শেয়ার করলে, সেসব সেবার নিজস্ব গোপনীয়তা নীতি প্রযোজ্য হবে।",
        },
      ],
    },
    {
      id: "retention",
      title: "তথ্য সংরক্ষণের মেয়াদ",
      blocks: [
        {
          list: [
            "অনুমোদিত সদস্যের রেকর্ড সদস্যপদ বহাল থাকা পর্যন্ত সংরক্ষিত থাকে।",
            "প্রত্যাখ্যাত আবেদন সিদ্ধান্তের রেকর্ডসহ সংরক্ষিত থাকে; সংগঠনের সুপার অ্যাডমিন তা স্থায়ীভাবে মুছে ফেলতে পারেন।",
            "যোগাযোগ ফর্মের বার্তা কাজ শেষ হলে অনুমতিপ্রাপ্ত অ্যাকাউন্ট মুছে ফেলতে পারে।",
            "প্রশাসনিক লগের এন্ট্রি ({access} অংশে বর্ণিত) আবেদন বা সদস্য রেকর্ড মুছে ফেলার পরও থেকে যায়; অ্যাডমিন প্যানেল থেকে এগুলো মোছা যায় না।",
          ],
        },
      ],
    },
    {
      id: "your-rights",
      title: "সংশোধন বা মুছে ফেলার অনুরোধ",
      blocks: [
        {
          p: "আপনার দেওয়া কোনো তথ্য সংশোধন, সদস্য তালিকা থেকে নাম সরানো, তথ্য মুছে ফেলা, অথবা ওয়েবসাইটের কোনো ছবিতে আপনাকে দেখা গেলে তা সরানোর অনুরোধ করতে {contact} ফর্মের মাধ্যমে আমাদের লিখুন। অনুরোধে আপনার নাম এবং (প্রযোজ্য হলে) আবেদনের ট্র্যাকিং নম্বর বা সদস্য নম্বর উল্লেখ করুন। আপনার পরিচয় নিশ্চিত হওয়ার পর সংগঠনের দায়িত্বপ্রাপ্তরা ব্যবস্থা নেবেন।",
        },
        {
          p: "মনে রাখবেন, আবেদন বা সদস্য রেকর্ড সংশোধন বা মুছে ফেলা হলেও প্রশাসনিক লগে আগের কিছু তথ্য থেকে যায় (ওপরের “তথ্য সংরক্ষণের মেয়াদ” অংশ দেখুন)।",
        },
      ],
    },
    {
      id: "changes",
      title: "এই নীতির পরিবর্তন",
      blocks: [
        {
          p: "এই নীতিতে কোনো পরিবর্তন হলে এই পৃষ্ঠায় তা হালনাগাদ করা হবে এবং ওপরের “সর্বশেষ হালনাগাদ” তারিখ পরিবর্তন করা হবে।",
        },
      ],
    },
  ],
} as const;

const en: Messages<typeof bn> = {
  title: "Privacy policy",
  eyebrow: "Policies",
  crumb: "Privacy policy",
  metaDescription:
    "What information the membership application and contact forms collect, why, who can see it, where it is stored and how to ask for a correction or deletion.",
  intro:
    "In plain words: what information the website of {org} collects from you, why, how it is protected and who can see it.",
  lastUpdated: "Last updated: {date}",
  summaryTitle: "In short",
  tocTitle: "Contents",
  tocLabel: "Contents of this page",
  links: {
    contact: "the contact page",
    access: "Who can see applications",
  },
  summary: [
    "National ID / birth registration numbers, addresses, dates of birth, parents' names and the mobile number given in an application are never published on the website. A phone number appears in the member directory only with that member's explicit consent.",
    "Only authorized committee accounts can see applications; permissions are also checked by the database.",
    "Your name appears in the member directory only with your consent; members under 18 also need their guardian's consent.",
    "No advertising, tracking or analytics are used for ordinary visitors; the only cookie for visitors remembers your preferred language, and only after you switch the language.",
    "Two-step login is mandatory for super admins, and no third-party scripts run on the website.",
  ],
  sections: [
    {
      id: "membership-data",
      title: "Information collected in a membership application",
      blocks: [
        { p: "The online membership application form collects the following information:" },
        {
          list: [
            "Full name, father's name and mother's name",
            "Date of birth, nationality, religion and occupation",
            "Permanent and present address",
            "National ID number or birth registration number",
            "Mobile number",
            "Email address (optional)",
            "Blood group (if given)",
            "Your agreement to the pledge and the time of agreement",
            "Your consent to be listed in the member directory (optional)",
          ],
        },
        { p: "The application form does not collect a photo of the applicant." },
      ],
    },
    {
      id: "why",
      title: "Why this information is collected",
      blocks: [
        {
          list: [
            "To verify the applicant's identity and details and decide whether to approve or reject the application.",
            "To prevent several applications with the same national ID / birth registration number.",
            "To contact the applicant when needed.",
            "To create the member record and member number after approval.",
          ],
        },
        { p: "This information is not used for any other purpose, sold or shared with anyone." },
      ],
    },
    {
      id: "never-public",
      title: "Information that is never published",
      blocks: [
        {
          p: "National ID or birth registration numbers, permanent and present addresses, dates of birth, parents' names, religion, nationality, occupation, blood group, email addresses and the mobile number given in an application are not shown on any public page of the website. This rule is enforced not only by the website's design but also by the database's security rules (Row-Level Security), so ordinary visitors cannot read this information.",
        },
        {
          p: "The only exception is a phone number: if a member gives explicit consent, one phone number of theirs may be shown in the member directory (see the next section).",
        },
      ],
    },
    {
      id: "directory",
      title: "What the member directory shows",
      blocks: [
        {
          p: "If you consented when applying, the public list of approved and active members shows: a photo added by the organization (if any), name, position and member number. Apart from these, only the membership start date and the display order are public for the list; nothing else goes into the directory.",
        },
        {
          p: "A member's phone number is shown in the directory only with that member's explicit consent. Without consent, your name will not appear in the public directory.",
        },
        {
          p: "A member who is under 18 according to their date of birth is shown in the public directory only when the guardian's consent is recorded in the organization's records — even if the member has consented. This rule is also enforced by the database. For this check, the date of birth from the application is kept in the member record; it is never published.",
        },
        {
          p: "The member directory page asks search engines not to index it, and it is not listed in the website's sitemap.",
        },
      ],
    },
    {
      id: "access",
      title: "Who can see applications",
      blocks: [
        {
          p: "Submitted applications can be seen only by the organization's authorized committee accounts that have been given permission to view applications in the admin panel. Only accounts with that separate permission can approve or reject them. Every permission is checked by the database.",
        },
        {
          p: "In addition, a log of administrative actions (audit log) is kept automatically: who changed what in which record, and when. National ID / birth registration numbers, addresses, mobile numbers, email addresses, dates of birth and parents' names are not copied into the log — it only records whether they were changed. However, information such as the applicant's or member's name, religion, nationality, occupation, blood group, directory consent and decision notes does appear in the log. Only committee accounts with permission to view the audit log can see it.",
        },
      ],
    },
    {
      id: "security",
      title: "Security measures",
      blocks: [
        {
          list: [
            "In the admin panel, two-step login (a code from an authenticator app after the password) is mandatory for super admins. Other committee accounts can turn it on as well; once on, the code is needed at every login.",
            "The website uses a Content Security Policy (CSP): the browser runs only the website's own scripts; no third-party scripts, advertising or trackers are loaded. Maps (Google Maps) and videos (YouTube) can only be embedded from specific addresses.",
            "Only authorized committee accounts can add or change the website's texts, photos and information; every permission is checked again by the database.",
          ],
        },
      ],
    },
    {
      id: "status",
      title: "Checking an application's status",
      blocks: [
        {
          p: "After you submit an application, you receive a tracking number. The status is shown only when both the tracking number and the mobile number given in the application match: the applicant's name, the status, the submission and decision dates and, if approved, the member number. No other personal information is shown there.",
        },
      ],
    },
    {
      id: "email",
      title: "Email",
      blocks: [
        {
          p: "If you give an email address in your application, automatic emails may be sent when the application is received and when it is approved or rejected. These emails are sent through Resend, an international email delivery service. A record is kept of which email was sent when and whether it was delivered successfully. No promotional emails are sent.",
        },
      ],
    },
    {
      id: "contact-form",
      title: "Contact form",
      blocks: [
        {
          p: "The form on {contact} collects your name, mobile number and/or email address, a subject and your message. This information is used only to reply to your message, and only committee accounts with permission to read messages can see it.",
        },
      ],
    },
    {
      id: "public-content",
      title: "Programs, Notice and other published information",
      blocks: [
        {
          p: "The website publishes the organization's programs (dates, places, descriptions and photos), photos of its activities, announcements, questions and answers, and — on the “Notice” page — links to news reports and interviews published by the media. These are added by the organization's authorized committee accounts; no information is collected from visitors for viewing these pages.",
        },
        {
          p: "On the Notice page, links to media reports open the outlet's website in a new tab; that website's own policy applies there. For YouTube videos, the small preview image (thumbnail) is loaded from YouTube's image server (i.ytimg.com), so basic information from your browser (such as your IP address) reaches that server. The video player (youtube-nocookie.com) loads only when you press the button to play the video.",
        },
        {
          p: "The share buttons (Facebook, WhatsApp) are plain links: nothing is sent to these services until you press one, and none of their scripts are loaded on the website.",
        },
      ],
    },
    {
      id: "languages",
      title: "Bengali and English versions",
      blocks: [
        {
          p: "The English version of the website is available under the /en address. The language you see is determined by the page address (URL). When you change the language with the BN/EN language switch, your choice is remembered in a cookie (ijs_lang, for one year) so that the next time you open the main address (/) the home page opens in that language; the cookie is used only for this, not for any tracking. Text that has not yet been translated into English is shown in Bengali. This policy applies equally to both versions.",
        },
      ],
    },
    {
      id: "storage",
      title: "Where the information is stored",
      blocks: [
        {
          p: "The website's database and photos are stored with a cloud service called Supabase, whose servers are located outside Bangladesh. The website is hosted on Vercel. All communication between your browser and the website uses an encrypted (HTTPS) connection.",
        },
      ],
    },
    {
      id: "abuse",
      title: "Preventing abuse",
      blocks: [
        {
          p: "To prevent spam and abuse, when a form is submitted a secret hash derived from your IP address (not the IP address itself) is kept for a short time and then deleted automatically. It is used only to limit too many submissions in a short time.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies and information kept in your browser",
      blocks: [
        {
          p: "For ordinary visitors this website uses only one functional cookie: when you change the language with the BN/EN language switch, a cookie remembers your choice (ijs_lang, for one year; it contains only “bn” or “en”). There are no advertising, tracking or analytics tools. Apart from that, cookies are used only to keep committee members signed in to the admin panel.",
        },
        {
          p: "While you fill in the membership application form, what you type (including your national ID / birth registration number, address, parents' names and mobile number) is kept temporarily only in that tab of your browser (sessionStorage) until you submit, so that it is not lost if the page is refreshed or you switch the language (Bengali/English). It is deleted when you submit the application, press “Start over” or close the tab. If you fill in the form on a shared or cyber-café computer, close the tab when you have finished.",
        },
        {
          p: "If a Google map is shown on the contact page, or if you follow the link to our Facebook page or share on Facebook/WhatsApp, the privacy policies of those services apply.",
        },
      ],
    },
    {
      id: "retention",
      title: "How long information is kept",
      blocks: [
        {
          list: [
            "An approved member's record is kept for as long as the membership lasts.",
            "A rejected application is kept together with the record of the decision; the organization's super admin can delete it permanently.",
            "Contact form messages can be deleted by an authorized account once they have been dealt with.",
            "Entries in the administrative log (described under “{access}”) remain even after an application or member record is deleted; they cannot be deleted from the admin panel.",
          ],
        },
      ],
    },
    {
      id: "your-rights",
      title: "Asking for a correction or deletion",
      blocks: [
        {
          p: "To ask for a correction of information you gave, the removal of your name from the member directory, the deletion of your information, or the removal of a photo on the website in which you appear, write to us using the form on {contact}. Please include your name and (if applicable) your application tracking number or member number. Once your identity has been confirmed, the organization's responsible members will take action.",
        },
        {
          p: "Please note that even when an application or member record is corrected or deleted, some earlier information remains in the administrative log (see “How long information is kept” above).",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      blocks: [
        {
          p: "If this policy changes, this page will be updated and the “Last updated” date above will be changed.",
        },
      ],
    },
  ],
};

export const privacy: Record<Locale, Messages<typeof bn>> = { bn, en };
/** Date of the last change to the policy text (both languages). */
export const PRIVACY_LAST_UPDATED = "2026-10-28";
