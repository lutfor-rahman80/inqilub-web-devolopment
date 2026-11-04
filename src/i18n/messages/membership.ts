import type { Locale, Messages } from "../config";

/**
 * Membership: application form (/membership), status look-up
 * (/membership/status) and the pledge & terms page (/membership/terms),
 * including the validation messages the shared zod schema returns in the
 * page's language (src/lib/membership/schema.ts, status.ts) and the server
 * actions' answers.
 *
 * Stored data never depends on the language: select values (religion, blood
 * group "জানা নেই", ID type) stay the same, only their labels are translated.
 * E-mails to applicants stay Bengali (the applicant's language is not stored).
 * English texts are drafts for the organization's review.
 */
const bn = {
  eyebrow: "সদস্যপদ",
  newTab: "(নতুন ট্যাবে খুলবে)",
  apply: {
    crumb: "সদস্য হোন",
    metaTitle: "সদস্য হোন",
    metaDescription:
      "{org}-এর সদস্য পদের জন্য অনলাইনে আবেদন করুন — ব্যক্তিগত তথ্য, ঠিকানা, পরিচয় ও যোগাযোগ এবং অঙ্গীকারনামা।",
    title: "সদস্য পদের জন্য আবেদন",
    intro:
      "{org}-এর সদস্য ফরম এখন অনলাইনে পূরণ করা যায়। চারটি ধাপে তথ্য দিন, অঙ্গীকারনামায় সম্মতি দিয়ে জমা দিন এবং একটি ট্র্যাকিং নম্বর নিন।",
    closed: {
      title: "নতুন আবেদন গ্রহণ সাময়িকভাবে বন্ধ আছে",
      body: "এই মুহূর্তে অনলাইনে নতুন সদস্য আবেদন নেওয়া হচ্ছে না। আবেদন গ্রহণ আবার শুরু হলে এই পৃষ্ঠায় ফরমটি দেখা যাবে। আপনার আগ্রহের জন্য ধন্যবাদ।",
      statusCta: "আগের আবেদনের অবস্থা",
      contactCta: "যোগাযোগ করুন",
      facebookBefore: "সংগঠনের খবর জানতে আমাদের ",
      facebookLink: "ফেসবুক পেজ",
      facebookAfter: " দেখুন।",
    },
    aside: {
      label: "আবেদনের আগে জেনে নিন",
      needTitle: "আবেদনের জন্য যা লাগবে",
      needId: "জাতীয় পরিচয়পত্র অথবা জন্ম নিবন্ধন সনদের নম্বর",
      needMobile: "সচল মোবাইল নম্বর (আবেদনের অবস্থা জানতে লাগবে)",
      needEmail: "ইমেইল ঠিকানা (ঐচ্ছিক)",
      privacyTitle: "আপনার তথ্যের সুরক্ষা",
      privacyBody:
        "আবেদনের তথ্য শুধু সংগঠনের অনুমোদিত কমিটি সদস্যরা দেখতে পারেন। পরিচয়পত্র নম্বর, ঠিকানা ও মোবাইল নম্বর কখনো ওয়েবসাইটে প্রকাশ করা হয় না।",
      terms: "অঙ্গীকারনামা ও শর্তাবলি",
      privacy: "গোপনীয়তা নীতি",
      alreadyTitle: "আগেই আবেদন করেছেন?",
      alreadyBody: "ট্র্যাকিং নম্বর ও মোবাইল নম্বর দিয়ে আবেদনের অবস্থা দেখুন।",
      alreadyCta: "আবেদনের অবস্থা",
      languageNote: "",
    },
  },

  /** Application form (client component). */
  form: {
    stepsLabel: "আবেদনের ধাপসমূহ",
    steps: ["ব্যক্তিগত তথ্য", "ঠিকানা", "পরিচয় ও যোগাযোগ", "অঙ্গীকারনামা ও পর্যালোচনা"],
    stepsShort: ["ব্যক্তিগত", "ঠিকানা", "যোগাযোগ", "জমা"],
    stepButton: "ধাপ {n}: {title}",
    stepCurrent: " (বর্তমান ধাপ)",
    stepDone: " (সম্পন্ন)",
    stepOf: "ধাপ {n} / {total}",
    requiredNote: "চিহ্নিত ঘরগুলো পূরণ করা আবশ্যক।",
    reviewNote: "জমা দেওয়ার আগে আপনার দেওয়া তথ্যগুলো ভালো করে দেখে নিন।",
    errorsOne: "একটি ঘরে ভুল আছে।",
    errorsMany: "{count}টি ঘরে ভুল আছে।",
    errorsFix: "লাল চিহ্নিত ঘরগুলো ঠিক করুন।",
    restoredReload: "আপনার আগের অসমাপ্ত আবেদনের তথ্য ফিরিয়ে আনা হয়েছে।",
    restoredLanguage: "ভাষা বদলানোর পরও আপনার লেখা তথ্য রাখা হয়েছে।",
    startOver: "নতুন করে শুরু করুন",
    honeypot: "এই ঘরটি খালি রাখুন",
    choose: "নির্বাচন করুন",
    fields: {
      full_name: "পূর্ণ নাম",
      full_name_hint: "জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন সনদে যেভাবে লেখা আছে।",
      father_name: "পিতার নাম",
      mother_name: "মাতার নাম",
      date_of_birth: "জন্ম তারিখ",
      date_of_birth_hint: "ক্যালেন্ডার থেকে দিন, মাস ও বছর বেছে নিন।",
      nationality: "জাতীয়তা",
      religion: "ধর্ম",
      religion_other: "ধর্মের নাম",
      occupation: "পেশা",
      occupation_hint: "যেমন: শিক্ষার্থী, চাকরিজীবী, ব্যবসায়ী।",
      permanent_address: "স্থায়ী ঠিকানা",
      permanent_address_hint: "গ্রাম/মহল্লা, ডাকঘর, উপজেলা/থানা ও জেলা লিখুন।",
      same_address: "বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো একই",
      same_address_note: "বর্তমান ঠিকানা হিসেবে স্থায়ী ঠিকানাটিই ব্যবহার করা হবে।",
      present_address: "বর্তমান ঠিকানা",
      present_address_hint: "এখন যেখানে থাকেন।",
      id_type: "পরিচয়পত্রের ধরন",
      id_type_nid: "জাতীয় পরিচয়পত্র",
      id_type_birth_reg: "জন্ম নিবন্ধন",
      id_number: "পরিচয়পত্র নম্বর",
      id_number_nid: "জাতীয় পরিচয়পত্র নম্বর",
      id_number_birth_reg: "জন্ম নিবন্ধন নম্বর",
      id_number_hint_nid: "জাতীয় পরিচয়পত্রের ১০, ১৩ অথবা ১৭ সংখ্যার নম্বর।",
      id_number_hint_birth_reg: "জন্ম নিবন্ধন সনদের ১৭ সংখ্যার নম্বর।",
      id_number_hint_none: "আগে পরিচয়পত্রের ধরন নির্বাচন করুন।",
      mobile: "মোবাইল নম্বর",
      mobile_hint: "এই নম্বর ও ট্র্যাকিং নম্বর দিয়ে পরে আবেদনের অবস্থা জানতে পারবেন।",
      mobile_placeholder: "০১XXXXXXXXX",
      email: "ইমেইল",
      email_hint_enabled: "দিলে আবেদন গ্রহণ ও সিদ্ধান্তের খবর ইমেইলেও পাবেন।",
      email_hint_disabled: "দিলে প্রয়োজনে সংগঠন ইমেইলে যোগাযোগ করতে পারবে।",
      blood_group: "রক্তের গ্রুপ",
      blood_group_unknown: "জানা নেই",
    },
    /** Labels for the religion options, in the order of RELIGIONS (the stored values stay Bengali). */
    religions: ["ইসলাম", "হিন্দু", "বৌদ্ধ", "খ্রিস্টান", "অন্যান্য"],
    occupationSuggestions: ["শিক্ষার্থী", "চাকরিজীবী", "ব্যবসায়ী", "শিক্ষক", "কৃষক", "শ্রমিক", "প্রবাসী", "ফ্রিল্যান্সার"],
    previous: "আগের ধাপ",
    next: "পরের ধাপ",
    backToReview: "পর্যালোচনায় ফিরে যান",
    submit: "আবেদন জমা দিন",
    submitting: "জমা দেওয়া হচ্ছে…",
    submittingSr: "আবেদন জমা দেওয়া হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।",
    formError: "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করে আবার জমা দিন।",
    networkError:
      "সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার “আবেদন জমা দিন” চাপুন — একই আবেদন দুবার জমা হবে না।",
    clear: {
      question: "এই ফর্মে দেওয়া সব তথ্য এই ব্রাউজার থেকে মুছে যাবে। নিশ্চিত?",
      yes: "হ্যাঁ, মুছে ফেলুন",
      no: "না, রেখে দিন",
      note: "শেয়ার করা বা পাবলিক কম্পিউটারে আবেদন করলে কাজ শেষে তথ্য মুছে দিন।",
      action: "ফর্মের তথ্য মুছে ফেলুন",
    },
    review: {
      edit: "সম্পাদনা",
      editLabel: "{title} সম্পাদনা করুন",
      age: " (বয়স {age} বছর)",
      sameAsPermanent: "স্থায়ী ঠিকানার মতো একই",
      notGiven: "দেওয়া হয়নি",
      applicant: "আবেদনকারী",
      declarationTitle: "অঙ্গীকারনামা",
      date: "তারিখ: {date}",
      termsLink: "অঙ্গীকারনামা ও শর্তাবলি",
      officialNote: "বাংলা লেখাটিই অফিসিয়াল অঙ্গীকারনামা।",
      showOriginal: "বাংলা মূল লেখা দেখুন",
      bengaliOnly: "অঙ্গীকারনামাটি শুধু বাংলায় আছে।",
      declarationCheck: "আমি উপরের অঙ্গীকারনামা পড়েছি, এতে সম্মতি দিচ্ছি এবং আমার দেওয়া সকল তথ্য সঠিক।",
      consentLabel: "অনুমোদনের পর আমার ছবি, নাম ও পদবী ওয়েবসাইটের সদস্য তালিকায় প্রকাশ করা যাবে",
      optional: "(ঐচ্ছিক)",
      consentHint:
        "সম্মতি না দিলেও আবেদন করা যাবে; তখন আপনার নাম পাবলিক তালিকায় দেখানো হবে না। জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর, ঠিকানা ও মোবাইল নম্বর কখনো প্রকাশ করা হয় না।",
      minorNote: "আপনার বয়স ১৮ বছরের কম। অভিভাবকের সম্মতি সংগঠনের রেকর্ডে যুক্ত না হওয়া পর্যন্ত আপনার নাম তালিকায় দেখানো হবে না।",
    },
  },

  /** Validation messages of the shared schema (browser preview and server answer). */
  validation: {
    /** Digits used in these messages. */
    locale: "bn",
    labels: {
      full_name: "নাম",
      father_name: "পিতার নাম",
      mother_name: "মাতার নাম",
      nationality: "জাতীয়তা",
      occupation: "পেশা",
      permanent_address: "স্থায়ী ঠিকানা",
      present_address: "বর্তমান ঠিকানা",
    },
    required: "{label} লিখুন।",
    min: "{Label} কমপক্ষে {min} অক্ষরের হতে হবে।",
    max: "{Label} সর্বোচ্চ {max} অক্ষরের হতে পারে।",
    nameDigits: "{label}-এ কোনো সংখ্যা থাকতে পারবে না।",
    nameChars: "{label}-এ শুধু অক্ষর, স্পেস এবং ডট (.), হাইফেন (-) বা ঊর্ধ্বকমা (') ব্যবহার করা যাবে।",
    nameInvalid: "{label} সঠিকভাবে লিখুন।",
    dobRequired: "জন্ম তারিখ দিন।",
    dobInvalid: "সঠিক জন্ম তারিখ দিন (দিন/মাস/বছর)।",
    dobFuture: "জন্ম তারিখ আজকের পরের হতে পারে না।",
    dobTooOld: "সঠিক জন্ম তারিখ দিন ({year} সালের পরের)।",
    religion: "ধর্ম নির্বাচন করুন।",
    religionOtherRequired: "ধর্মের নাম লিখুন।",
    religionOtherLength: "ধর্মের নাম {min} থেকে {max} অক্ষরের মধ্যে লিখুন।",
    idType: "পরিচয়পত্রের ধরন নির্বাচন করুন।",
    idRequired: "পরিচয়পত্র নম্বর লিখুন।",
    idRequiredNid: "জাতীয় পরিচয়পত্র নম্বর লিখুন।",
    idRequiredBirthReg: "জন্ম নিবন্ধন নম্বর লিখুন।",
    idDigitsOnly: "শুধু সংখ্যা লিখুন (স্পেস বা ড্যাশ ছাড়া)।",
    nidLength: "জাতীয় পরিচয়পত্র নম্বর ১০, ১৩ অথবা ১৭ সংখ্যার হতে হবে (আপনি {count}টি সংখ্যা দিয়েছেন)।",
    birthRegLength: "জন্ম নিবন্ধন নম্বর ১৭ সংখ্যার হতে হবে (আপনি {count}টি সংখ্যা দিয়েছেন)।",
    mobileRequired: "মোবাইল নম্বর লিখুন।",
    mobileInvalid: "সঠিক মোবাইল নম্বর দিন (যেমন: ০১৭১২৩৪৫৬৭৮)।",
    emailTooLong: "ইমেইল ঠিকানাটি অনেক বড়।",
    emailInvalid: "সঠিক ইমেইল ঠিকানা দিন (যেমন: name@example.com)।",
    bloodGroup: "তালিকা থেকে রক্তের গ্রুপ নির্বাচন করুন।",
    declaration: "আবেদন জমা দিতে অঙ্গীকারনামায় সম্মতি দিন।",
  },

  /** Answers of the submit server action. */
  server: {
    formError: "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করে আবার জমা দিন।",
    honeypot: "আবেদনটি জমা দেওয়া যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।",
    token: "ফর্মটি পুনরায় লোড করে আবার চেষ্টা করুন।",
    start: "ফর্মটি খুব দ্রুত বা অনেক পুরোনো পৃষ্ঠা থেকে জমা দেওয়া হয়েছে। কয়েক সেকেন্ড পর আবার “আবেদন জমা দিন” চাপুন।",
    closed: "এই মুহূর্তে নতুন সদস্য আবেদন গ্রহণ বন্ধ আছে। আবেদন গ্রহণ আবার শুরু হলে জমা দিন।",
    rateLimited: "অল্প সময়ে অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    duplicateId:
      "এই জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে একটি আবেদন জমা আছে। আগের আবেদনের অবস্থা জানতে “আবেদনের অবস্থা” পৃষ্ঠা দেখুন।",
    invalidDob: "সঠিক জন্ম তারিখ দিন।",
    declarationRequired: "অঙ্গীকারনামায় সম্মতি দিতে হবে।",
    generic: "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
  },

  /** Confirmation after submitting (client component). */
  success: {
    printTitle: "{org} — সদস্য আবেদন",
    title: "আপনার আবেদন জমা হয়েছে",
    thanksBefore: "ধন্যবাদ, ",
    thanksAfter: "। সদস্য পদের জন্য আপনার আবেদন আমরা পেয়েছি।",
    already: "এই আবেদনটি আগেই জমা হয়েছিল — তাই একই ট্র্যাকিং নম্বর দেখানো হচ্ছে। নতুন করে আর জমা দেওয়ার প্রয়োজন নেই।",
    trackingLabel: "আপনার ট্র্যাকিং নম্বর",
    submittedAt: "জমার সময়: {time}",
    copy: "নম্বরটি কপি করুন",
    keepStrong: "নম্বরটি লিখে রাখুন",
    keepRest:
      " অথবা এই পাতার স্ক্রিনশট / প্রিন্ট নিয়ে রাখুন। ট্র্যাকিং নম্বর ও আবেদনে দেওয়া মোবাইল নম্বর দিয়ে যেকোনো সময় আবেদনের অবস্থা জানতে পারবেন।",
    nextTitle: "এরপর কী হবে?",
    nextSteps: [
      "সংগঠনের দায়িত্বপ্রাপ্ত কমিটি সদস্যরা আপনার আবেদনের তথ্য যাচাই করবেন।",
      "যাচাই শেষে আবেদন অনুমোদন অথবা প্রত্যাখ্যানের সিদ্ধান্ত নেওয়া হবে।",
      "অনুমোদিত হলে আপনাকে একটি সদস্য নম্বর দেওয়া হবে, যা “আবেদনের অবস্থা” পৃষ্ঠায় দেখতে পাবেন।",
    ],
    emailStep: "আপনার দেওয়া ইমেইল ঠিকানায় আবেদন গ্রহণ ও সিদ্ধান্তের খবর পাঠানো হবে।",
    statusCta: "আবেদনের অবস্থা দেখুন",
    print: "প্রিন্ট করুন",
    another: "আরেকটি আবেদন করুন",
  },

  copy: {
    copy: "কপি করুন",
    copied: "কপি হয়েছে",
    failed: "কপি করা যায়নি",
    failedSr: "কপি করা যায়নি; নম্বরটি লিখে রাখুন",
  },

  /** Application statuses (labels for the public pages). */
  statusLabels: {
    pending: "অপেক্ষমাণ",
    under_review: "যাচাই চলছে",
    approved: "অনুমোদিত",
    rejected: "প্রত্যাখ্যাত",
  },

  status: {
    crumb: "আবেদনের অবস্থা",
    metaTitle: "আবেদনের অবস্থা যাচাই",
    metaDescription: "ট্র্যাকিং নম্বর ও মোবাইল নম্বর দিয়ে সদস্য আবেদনের বর্তমান অবস্থা জানুন।",
    title: "আবেদনের অবস্থা যাচাই",
    intro: "আবেদন জমা দেওয়ার সময় পাওয়া ট্র্যাকিং নম্বর এবং আবেদনে দেওয়া মোবাইল নম্বর লিখুন।",
    meaningsLabel: "আবেদনের অবস্থাগুলোর অর্থ",
    meaningsTitle: "অবস্থাগুলোর অর্থ",
    meanings: {
      pending: "আবেদন জমা হয়েছে, যাচাইয়ের অপেক্ষায়।",
      under_review: "দায়িত্বপ্রাপ্ত কমিটি সদস্যরা তথ্য যাচাই করছেন।",
      approved: "সদস্য পদ অনুমোদিত; সদস্য নম্বর দেওয়া হয়েছে।",
      rejected: "আবেদনটি এই মুহূর্তে অনুমোদন করা সম্ভব হয়নি।",
    },
    privacyTitle: "গোপনীয়তা",
    privacyBody:
      "দুটি তথ্যই মিললে শুধু নাম, অবস্থা, তারিখ ও (অনুমোদিত হলে) সদস্য নম্বর দেখানো হয়। অন্য কোনো ব্যক্তিগত তথ্য এখানে দেখানো হয় না।",
    notYetTitle: "এখনো আবেদন করেননি?",
    notYetCta: "সদস্য ফরম পূরণ করুন",
  },

  /** Status look-up form and result (client component). */
  statusForm: {
    tracking: "ট্র্যাকিং নম্বর",
    trackingHint: "আবেদন জমা দেওয়ার পর যে নম্বরটি পেয়েছিলেন, যেমন:",
    mobile: "মোবাইল নম্বর",
    mobileHint: "আবেদনে যে মোবাইল নম্বর দিয়েছিলেন।",
    mobilePlaceholder: "০১XXXXXXXXX",
    submit: "অবস্থা দেখুন",
    searching: "খোঁজা হচ্ছে…",
    notFoundTitle: "তথ্য মেলেনি",
    statusLabel: "আবেদনের অবস্থা:",
    submittedOn: "আবেদন জমার তারিখ",
    decidedOn: "সিদ্ধান্তের তারিখ",
    reviewStartedOn: "যাচাই শুরুর তারিখ",
    memberNo: "সদস্য নম্বর",
    pending: "আপনার আবেদন জমা আছে এবং যাচাইয়ের অপেক্ষায় রয়েছে। সিদ্ধান্ত হলে এই পৃষ্ঠায় জানতে পারবেন।",
    underReview: "সংগঠনের দায়িত্বপ্রাপ্ত কমিটি সদস্যরা আপনার আবেদন যাচাই করছেন। সিদ্ধান্ত হলে এই পৃষ্ঠায় জানতে পারবেন।",
    approved: "অভিনন্দন! আপনার সদস্য পদ অনুমোদিত হয়েছে। সংগঠনের কার্যক্রমে আপনাকে স্বাগতম।",
    rejectedBefore: "দুঃখিত, আপনার আবেদনটি এই মুহূর্তে অনুমোদন করা সম্ভব হয়নি। বিস্তারিত জানতে ",
    rejectedLink: "যোগাযোগ করুন",
    rejectedAfter: "।",
  },

  /** Status look-up: validation and server answers. */
  statusValidation: {
    noRequired: "ট্র্যাকিং নম্বর লিখুন।",
    noInvalid: "সঠিক ট্র্যাকিং নম্বর লিখুন (যেমন: IJS-A-2026-0001)।",
    mobileRequired: "আবেদনে দেওয়া মোবাইল নম্বর লিখুন।",
    mobileInvalid: "সঠিক মোবাইল নম্বর লিখুন (যেমন: ০১৭১২৩৪৫৬৭৮)।",
    bothFields: "দুটি ঘরই সঠিকভাবে পূরণ করুন।",
    notFound: "তথ্য মেলেনি। ট্র্যাকিং নম্বর ও মোবাইল নম্বর আবেদনে যেভাবে দিয়েছিলেন ঠিক সেভাবে লিখে আবার চেষ্টা করুন।",
    rateLimited: "অল্প সময়ে অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    generic: "একটি সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
  },

  terms: {
    crumb: "অঙ্গীকারনামা ও শর্তাবলি",
    metaTitle: "অঙ্গীকারনামা ও শর্তাবলি",
    metaDescription:
      "সদস্য আবেদনের অঙ্গীকারনামা, আবেদন যাচাই ও অনুমোদনের প্রক্রিয়া এবং আবেদনে নেওয়া তথ্য কারা দেখতে পারেন।",
    title: "অঙ্গীকারনামা ও শর্তাবলি",
    intro: "{org}-এর সদস্য পদের আবেদন, অঙ্গীকারনামা ও আবেদন যাচাইয়ের নিয়ম।",
    declarationTitle: "অঙ্গীকারনামা",
    declarationLead: "সদস্য ফরম জমা দেওয়ার আগে প্রত্যেক আবেদনকারীকে নিচের অঙ্গীকারনামায় সম্মতি দিতে হয়:",
    nameSlot: "আবেদনকারীর নাম",
    declarationMissing: "অঙ্গীকারনামার লেখা এখনো যুক্ত করা হয়নি।",
    declarationAuto: "অনলাইন ফরমে অঙ্গীকারনামায় আপনার নাম স্বয়ংক্রিয়ভাবে বসানো হয় এবং সম্মতির তারিখ ও সময় সংরক্ষণ করা হয়।",
    reviewTitle: "আবেদন যেভাবে যাচাই ও অনুমোদন হয়",
    reviewSteps: {
      pending: "অনলাইনে ফরম জমা দিলে আবেদনটি “অপেক্ষমাণ” অবস্থায় থাকে এবং আপনি একটি ট্র্যাকিং নম্বর পান।",
      under_review: "সংগঠনের অনুমোদিত কমিটি সদস্যরা আবেদনের তথ্য যাচাই শুরু করলে অবস্থা হয় “যাচাই চলছে”।",
      approved: "অনুমোদিত হলে একটি সদস্য রেকর্ড ও সদস্য নম্বর তৈরি হয়।",
      rejected: "অনুমোদন করা সম্ভব না হলে কারণসহ সিদ্ধান্ত সংরক্ষণ করা হয়। ভুলবশত প্রত্যাখ্যাত আবেদন পুনর্বিবেচনা করা যায়।",
    },
    reviewRules: [
      "আবেদন অনুমোদন বা প্রত্যাখ্যান করতে পারেন শুধু সংগঠনের সেই কমিটি সদস্যরা, যাদের এই কাজের অনুমতি দেওয়া আছে।",
      "একই জাতীয় পরিচয়পত্র বা জন্ম নিবন্ধন নম্বর দিয়ে একসাথে একাধিক আবেদন রাখা যায় না।",
    ],
    statusRuleBefore: "ট্র্যাকিং নম্বর ও আবেদনে দেওয়া মোবাইল নম্বর দিয়ে ",
    statusRuleLink: "আবেদনের অবস্থা",
    statusRuleAfter: " পৃষ্ঠায় যেকোনো সময় অবস্থা জানা যায়।",
    dataTitle: "কোন তথ্য নেওয়া হয় ও কারা দেখতে পারেন",
    dataCollected:
      "আবেদন ফরমে নাম, পিতা ও মাতার নাম, জন্ম তারিখ, জাতীয়তা, ধর্ম, পেশা, স্থায়ী ও বর্তমান ঠিকানা, জাতীয় পরিচয়পত্র বা জন্ম নিবন্ধন নম্বর, মোবাইল নম্বর এবং ঐচ্ছিকভাবে ইমেইল ও রক্তের গ্রুপ নেওয়া হয়। আবেদন ফরমে কোনো ছবি নেওয়া হয় না।",
    dataAccessBefore:
      "এই তথ্য শুধু সংগঠনের অনুমোদিত কমিটি সদস্যরা অ্যাডমিন প্যানেল থেকে দেখতে পারেন। পরিচয়পত্র নম্বর, ঠিকানা, মোবাইল নম্বর, ইমেইল ও জন্ম তারিখ ওয়েবসাইটের কোনো পাবলিক পৃষ্ঠায় দেখানো হয় না। বিস্তারিত জানতে ",
    dataAccessLink: "গোপনীয়তা নীতি",
    dataAccessAfter: " দেখুন।",
    directoryTitle: "সদস্য তালিকায় প্রকাশ",
    directoryBefore:
      "ফরমে সম্মতি দিলে, আবেদন অনুমোদনের পর ওয়েবসাইটের সদস্য তালিকায় আপনার ছবি (সংগঠন যুক্ত করলে), নাম, পদবী ও সদস্য নম্বর দেখানো হতে পারে। সম্মতি না দিলে আপনার নাম পাবলিক তালিকায় আসবে না। পরে তালিকা থেকে নাম সরাতে চাইলে ",
    directoryLink: "যোগাযোগ",
    directoryAfter: " করুন।",
    directoryMinors: "১৮ বছরের কম বয়সী সদস্যের নাম অভিভাবকের সম্মতি সংগঠনের রেকর্ডে যুক্ত না হওয়া পর্যন্ত তালিকায় দেখানো হয় না।",
    applyCta: "সদস্য ফরম পূরণ করুন",
    statusCta: "আবেদনের অবস্থা",
  },
} as const;

const en: Messages<typeof bn> = {
  eyebrow: "Membership",
  newTab: "(opens in a new tab)",
  apply: {
    crumb: "Become a member",
    metaTitle: "Become a member",
    metaDescription:
      "Apply online for membership of {org} — personal details, address, identity and contact, and the membership pledge.",
    title: "Apply for membership",
    intro:
      "The membership form of {org} can now be filled in online. Give your details in four steps, accept the pledge, submit, and receive a tracking number.",
    closed: {
      title: "New applications are paused for now",
      body: "Online membership applications are not being accepted at the moment. The form will appear on this page again when applications reopen. Thank you for your interest.",
      statusCta: "Status of an earlier application",
      contactCta: "Contact us",
      facebookBefore: "For news from the organization, visit our ",
      facebookLink: "Facebook page",
      facebookAfter: ".",
    },
    aside: {
      label: "Before you apply",
      needTitle: "What you need",
      needId: "Your national ID card or birth registration certificate number",
      needMobile: "A working mobile number (needed to check your application status)",
      needEmail: "Email address (optional)",
      privacyTitle: "How your data is protected",
      privacyBody:
        "Only the organization's authorised committee members can see your application. Your ID number, address and mobile number are never published on the website.",
      terms: "Pledge & terms",
      privacy: "Privacy policy",
      alreadyTitle: "Already applied?",
      alreadyBody: "Check your application status with your tracking number and mobile number.",
      alreadyCta: "Application status",
      languageNote:
        "You can fill in the form in English or Bengali. Names and addresses may be written in either language. Emails from the organization are sent in Bengali.",
    },
  },

  form: {
    stepsLabel: "Application steps",
    steps: ["Personal details", "Address", "Identity & contact", "Pledge & review"],
    stepsShort: ["Personal", "Address", "Contact", "Submit"],
    stepButton: "Step {n}: {title}",
    stepCurrent: " (current step)",
    stepDone: " (completed)",
    stepOf: "Step {n} of {total}",
    requiredNote: "marks a required field.",
    reviewNote: "Please check your information carefully before you submit.",
    errorsOne: "One field needs your attention.",
    errorsMany: "{count} fields need your attention.",
    errorsFix: "Please correct the fields marked in red.",
    restoredReload: "The details of your unfinished application have been restored.",
    restoredLanguage: "Your entries were kept when you switched the language.",
    startOver: "Start over",
    honeypot: "Leave this field empty",
    choose: "Choose…",
    fields: {
      full_name: "Full name",
      full_name_hint: "As written on your national ID card / birth registration certificate.",
      father_name: "Father's name",
      mother_name: "Mother's name",
      date_of_birth: "Date of birth",
      date_of_birth_hint: "Choose the day, month and year from the calendar.",
      nationality: "Nationality",
      religion: "Religion",
      religion_other: "Name of religion",
      occupation: "Occupation",
      occupation_hint: "For example: student, employee, business.",
      permanent_address: "Permanent address",
      permanent_address_hint: "Village/area, post office, upazila/thana and district.",
      same_address: "My present address is the same as my permanent address",
      same_address_note: "Your permanent address will be used as your present address.",
      present_address: "Present address",
      present_address_hint: "Where you live now.",
      id_type: "Type of ID",
      id_type_nid: "National ID card",
      id_type_birth_reg: "Birth registration",
      id_number: "ID number",
      id_number_nid: "National ID number",
      id_number_birth_reg: "Birth registration number",
      id_number_hint_nid: "The 10, 13 or 17-digit number on your national ID card.",
      id_number_hint_birth_reg: "The 17-digit number on your birth registration certificate.",
      id_number_hint_none: "First choose the type of ID.",
      mobile: "Mobile number",
      mobile_hint: "With this number and your tracking number you can check your application status later.",
      mobile_placeholder: "01XXXXXXXXX",
      email: "Email",
      email_hint_enabled: "If you give it, you will also receive the confirmation and the decision by email (in Bengali).",
      email_hint_disabled: "If you give it, the organization can contact you by email when needed.",
      blood_group: "Blood group",
      blood_group_unknown: "Don't know",
    },
    religions: ["Islam", "Hinduism", "Buddhism", "Christianity", "Other"],
    occupationSuggestions: ["Student", "Employee", "Business", "Teacher", "Farmer", "Worker", "Expatriate", "Freelancer"],
    previous: "Previous step",
    next: "Next step",
    backToReview: "Back to review",
    submit: "Submit application",
    submitting: "Submitting…",
    submittingSr: "Submitting your application, please wait.",
    formError: "Some of the information is not valid. Please correct the marked fields and submit again.",
    networkError:
      "Could not reach the server. Please check your internet connection and press “Submit application” again — the same application will not be submitted twice.",
    clear: {
      question: "All the information in this form will be deleted from this browser. Are you sure?",
      yes: "Yes, delete it",
      no: "No, keep it",
      note: "If you are using a shared or public computer, delete the information when you have finished.",
      action: "Delete form data",
    },
    review: {
      edit: "Edit",
      editLabel: "Edit {title}",
      age: " (age {age})",
      sameAsPermanent: "Same as permanent address",
      notGiven: "Not given",
      applicant: "Applicant",
      declarationTitle: "Pledge",
      date: "Date: {date}",
      termsLink: "Pledge & terms",
      officialNote:
        "The Bengali text is the official pledge. The English text below is a translation for your reference.",
      showOriginal: "Show the official Bengali text",
      bengaliOnly: "The pledge is available in Bengali only.",
      declarationCheck:
        "I have read the pledge above (the Bengali text is binding), I accept it, and all the information I have given is correct.",
      consentLabel: "After approval, my photo, name and designation may be published in the website's member directory",
      optional: "(optional)",
      consentHint:
        "You can apply without this consent; your name will then not appear in the public directory. Your national ID / birth registration number, address and mobile number are never published.",
      minorNote: "You are under 18. Your name will only be listed after the organization has recorded your guardian's consent.",
    },
  },

  validation: {
    locale: "en",
    labels: {
      full_name: "your name",
      father_name: "your father's name",
      mother_name: "your mother's name",
      nationality: "your nationality",
      occupation: "your occupation",
      permanent_address: "your permanent address",
      present_address: "your present address",
    },
    required: "Please enter {label}.",
    min: "{Label} must be at least {min} characters long.",
    max: "{Label} can be at most {max} characters long.",
    nameDigits: "{Label} cannot contain numbers.",
    nameChars: "{Label} may contain only letters, spaces, full stops (.), hyphens (-) and apostrophes (').",
    nameInvalid: "Please enter {label} correctly.",
    dobRequired: "Please enter your date of birth.",
    dobInvalid: "Please enter a valid date of birth (day/month/year).",
    dobFuture: "The date of birth cannot be in the future.",
    dobTooOld: "Please enter a valid date of birth (after {year}).",
    religion: "Please choose your religion.",
    religionOtherRequired: "Please enter the name of your religion.",
    religionOtherLength: "The name of the religion must be {min} to {max} characters long.",
    idType: "Please choose the type of ID.",
    idRequired: "Please enter your ID number.",
    idRequiredNid: "Please enter your national ID number.",
    idRequiredBirthReg: "Please enter your birth registration number.",
    idDigitsOnly: "Please enter digits only (no spaces or dashes).",
    nidLength: "A national ID number has 10, 13 or 17 digits (you entered {count}).",
    birthRegLength: "A birth registration number has 17 digits (you entered {count}).",
    mobileRequired: "Please enter your mobile number.",
    mobileInvalid: "Please enter a valid Bangladeshi mobile number (e.g. 01712345678).",
    emailTooLong: "This email address is too long.",
    emailInvalid: "Please enter a valid email address (e.g. name@example.com).",
    bloodGroup: "Please choose a blood group from the list.",
    declaration: "Please accept the pledge to submit your application.",
  },

  server: {
    formError: "Some of the information is not valid. Please correct the marked fields and submit again.",
    honeypot: "The application could not be submitted. Please refresh the page and try again.",
    token: "Please reload the form and try again.",
    start:
      "The form was submitted too quickly or from a page that is too old. Please wait a few seconds and press “Submit application” again.",
    closed: "New membership applications are not being accepted at the moment. Please submit when applications reopen.",
    rateLimited: "Too many attempts in a short time. Please try again in a little while.",
    duplicateId:
      "An application with this national ID / birth registration number has already been submitted. To see how it is progressing, use the “Application status” page.",
    invalidDob: "Please enter a valid date of birth.",
    declarationRequired: "You must accept the pledge.",
    generic: "Something went wrong. Please try again in a little while.",
  },

  success: {
    printTitle: "{org} — membership application",
    title: "Your application has been submitted",
    thanksBefore: "Thank you, ",
    thanksAfter: ". We have received your membership application.",
    already: "This application had already been submitted, so the same tracking number is shown. There is no need to submit it again.",
    trackingLabel: "Your tracking number",
    submittedAt: "Submitted: {time}",
    copy: "Copy the number",
    keepStrong: "Write this number down",
    keepRest:
      " or keep a screenshot or printout of this page. With the tracking number and the mobile number from your application you can check your application status at any time.",
    nextTitle: "What happens next?",
    nextSteps: [
      "The organization's responsible committee members will check the information in your application.",
      "After the check, a decision will be made to approve or reject the application.",
      "If it is approved, you will receive a member number, which you can see on the “Application status” page.",
    ],
    emailStep: "News of receipt and of the decision will be sent to the email address you gave (in Bengali).",
    statusCta: "Check application status",
    print: "Print",
    another: "Submit another application",
  },

  copy: {
    copy: "Copy",
    copied: "Copied",
    failed: "Could not copy",
    failedSr: "Could not copy; please write the number down",
  },

  statusLabels: {
    pending: "Pending",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
  },

  status: {
    crumb: "Application status",
    metaTitle: "Check application status",
    metaDescription: "Check the current status of a membership application with the tracking number and mobile number.",
    title: "Check application status",
    intro: "Enter the tracking number you received when you applied and the mobile number given in your application.",
    meaningsLabel: "What the application statuses mean",
    meaningsTitle: "What the statuses mean",
    meanings: {
      pending: "The application has been submitted and is waiting to be checked.",
      under_review: "The responsible committee members are checking the information.",
      approved: "Membership approved; a member number has been given.",
      rejected: "The application could not be approved at this time.",
    },
    privacyTitle: "Privacy",
    privacyBody:
      "Only when both values match are the name, status, dates and (if approved) member number shown. No other personal information is shown here.",
    notYetTitle: "Not applied yet?",
    notYetCta: "Fill in the membership form",
  },

  statusForm: {
    tracking: "Tracking number",
    trackingHint: "The number you received after submitting your application, for example:",
    mobile: "Mobile number",
    mobileHint: "The mobile number you gave in your application.",
    mobilePlaceholder: "01XXXXXXXXX",
    submit: "Check status",
    searching: "Searching…",
    notFoundTitle: "No match found",
    statusLabel: "Application status:",
    submittedOn: "Date submitted",
    decidedOn: "Date of decision",
    reviewStartedOn: "Review started on",
    memberNo: "Member number",
    pending: "Your application has been received and is waiting to be checked. You will see the decision on this page.",
    underReview: "The organization's responsible committee members are checking your application. You will see the decision on this page.",
    approved: "Congratulations! Your membership has been approved. Welcome to the organization's activities.",
    rejectedBefore: "We are sorry, your application could not be approved at this time. For details, please ",
    rejectedLink: "contact us",
    rejectedAfter: ".",
  },

  statusValidation: {
    noRequired: "Please enter the tracking number.",
    noInvalid: "Please enter a valid tracking number (e.g. IJS-A-2026-0001).",
    mobileRequired: "Please enter the mobile number given in your application.",
    mobileInvalid: "Please enter a valid mobile number (e.g. 01712345678).",
    bothFields: "Please fill in both fields correctly.",
    notFound:
      "No match found. Please enter the tracking number and the mobile number exactly as given in your application and try again.",
    rateLimited: "Too many attempts in a short time. Please try again in a little while.",
    generic: "Something went wrong. Please try again in a little while.",
  },

  terms: {
    crumb: "Pledge & terms",
    metaTitle: "Membership pledge & terms",
    metaDescription:
      "The membership pledge, how applications are checked and approved, and who can see the information in an application.",
    title: "Membership pledge & terms",
    intro: "The rules for applying for membership of {org}: the pledge and how applications are checked.",
    declarationTitle: "Pledge",
    declarationLead: "Before submitting the membership form, every applicant must accept the following pledge:",
    nameSlot: "Applicant's name",
    declarationMissing: "The text of the pledge has not been added yet.",
    declarationAuto: "In the online form your name is filled into the pledge automatically, and the date and time of your acceptance are recorded.",
    reviewTitle: "How applications are checked and approved",
    reviewSteps: {
      pending: "When you submit the form online, the application is “Pending” and you receive a tracking number.",
      under_review: "When the organization's authorised committee members start checking the information, the status becomes “Under review”.",
      approved: "If the application is approved, a member record and a member number are created.",
      rejected: "If it cannot be approved, the decision is recorded with a reason. An application rejected by mistake can be reconsidered.",
    },
    reviewRules: [
      "Only those committee members of the organization who have been given this permission can approve or reject applications.",
      "Only one open application at a time is possible with the same national ID or birth registration number.",
    ],
    statusRuleBefore: "With the tracking number and the mobile number from your application you can check the status at any time on the ",
    statusRuleLink: "Application status",
    statusRuleAfter: " page.",
    dataTitle: "What information is collected and who can see it",
    dataCollected:
      "The application form asks for your name, your father's and mother's names, date of birth, nationality, religion, occupation, permanent and present address, national ID or birth registration number, mobile number and, optionally, email and blood group. No photo is collected with the application.",
    dataAccessBefore:
      "Only the organization's authorised committee members can see this information, in the admin panel. ID number, address, mobile number, email and date of birth are never shown on any public page of the website. For details, see the ",
    dataAccessLink: "privacy policy",
    dataAccessAfter: ".",
    directoryTitle: "Listing in the member directory",
    directoryBefore:
      "If you give your consent in the form, after approval your photo (if the organization adds one), name, designation and member number may be shown in the website's member directory. Without consent your name does not appear in the public directory. To have your name removed later, please ",
    directoryLink: "contact us",
    directoryAfter: ".",
    directoryMinors: "Members under 18 are not listed until a guardian's consent has been recorded by the organization.",
    applyCta: "Fill in the membership form",
    statusCta: "Application status",
  },
};

export const membership: Record<Locale, Messages<typeof bn>> = { bn, en };
export type MembershipMessages = Messages<typeof bn>;
export type ApplicationValidationMessages = MembershipMessages["validation"];
export type StatusValidationMessages = MembershipMessages["statusValidation"];
export type ApplicationStatusKey = keyof MembershipMessages["statusLabels"];

/** What the application form (client component) needs. */
export type ApplicationFormMessages = Pick<MembershipMessages, "form" | "validation" | "success" | "copy" | "newTab">;
export function applicationFormMessages(lang: Locale): ApplicationFormMessages {
  const t = membership[lang];
  return { form: t.form, validation: t.validation, success: t.success, copy: t.copy, newTab: t.newTab };
}

/** What the status look-up form (client component) needs. */
export type StatusFormMessages = Pick<MembershipMessages, "statusForm" | "statusLabels" | "copy">;
export function statusFormMessages(lang: Locale): StatusFormMessages {
  const t = membership[lang];
  return { statusForm: t.statusForm, statusLabels: t.statusLabels, copy: t.copy };
}
