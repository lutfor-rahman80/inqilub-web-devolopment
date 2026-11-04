import { APPLICATION_STATUS, MEMBER_STATUS, bn, formatDate, formatDateTime } from "@/lib/format";

/**
 * Turns raw audit_logs rows into readable Bengali. Pure (no server-only
 * imports) so it can be unit tested and used by the dashboard and the audit
 * page alike.
 *
 * The database never copies personal data into the log (see
 * private.audit_row_change); on top of that, only values of the fields listed
 * in SAFE_VALUES are displayed — for every other field only its name is shown.
 */

export const AUDIT_ACTIONS: Record<string, { label: string; tone: "green" | "blue" | "red" | "gray" }> = {
  insert: { label: "তৈরি", tone: "green" },
  update: { label: "পরিবর্তন", tone: "blue" },
  delete: { label: "মুছে ফেলা", tone: "red" },
  // Account events written by public.log_account_event (no row change).
  password_reset: { label: "পাসওয়ার্ড রিসেট", tone: "gray" },
  password_change: { label: "পাসওয়ার্ড পরিবর্তন", tone: "gray" },
  mfa_enrol: { label: "দুই ধাপের লগইন চালু", tone: "gray" },
  mfa_remove: { label: "অথেনটিকেটর অ্যাপ মুছে ফেলা", tone: "gray" },
  mfa_reset: { label: "দুই ধাপের লগইন রিসেট", tone: "gray" },
};

export const AUDIT_ENTITIES: Record<string, string> = {
  membership_applications: "সদস্য আবেদন",
  members: "সদস্য",
  gallery_images: "গ্যালারির ছবি",
  activity_categories: "কার্যক্রম / ক্যাটাগরি",
  announcements: "ঘোষণা",
  site_settings: "ওয়েবসাইট কনটেন্ট",
  staff_profiles: "ব্যবহারকারী",
  roles: "ভূমিকা",
  role_permissions: "ভূমিকার অনুমতি",
  designations: "পদবী",
  programs: "কর্মসূচি",
  press_items: "Notice",
  faqs: "প্রশ্নোত্তর",
  quiz_results: "কুইজ ফলাফল",
  quiz_settings: "কুইজ সেটিংস",
  quiz_years: "কুইজ সাল",
};

export const SETTINGS_SECTIONS: Record<string, string> = {
  organization: "সংগঠনের পরিচিতি",
  about: "আমাদের সম্পর্কে",
  contact: "যোগাযোগের তথ্য",
  membership: "সদস্য পদ ও অঙ্গীকারনামা",
  directory: "সদস্য তালিকা",
  social: "সামাজিক মাধ্যম",
  quiz: "সীরাত কুইজ লিংক",
};

/** Fields inside a website-content section (site_settings.value), as named on the content page. */
export const SETTINGS_FIELD_LABELS: Record<string, string> = {
  name_bn: "সংগঠনের নাম",
  tagline: "পরিচিতি বাক্য",
  slogan: "স্লোগান",
  location: "অবস্থান",
  what_is: "আমরা কারা (পরিচিতি)",
  goal: "লক্ষ্য",
  objective: "উদ্দেশ্য",
  why: "কেন এই সংগঠন",
  address: "ঠিকানা",
  phone: "ফোন নম্বর",
  email: "ইমেইল",
  facebook_url: "ফেসবুক পেজের লিংক",
  map_url: "গুগল ম্যাপ",
  office_hours: "অফিস সময়",
  is_open: "অনলাইনে আবেদন গ্রহণ",
  declaration: "অঙ্গীকারনামা",
  enabled: "“সদস্যবৃন্দ” পৃষ্ঠা",
  en: "ইংরেজি সংস্করণ",
  committee_term_bn: "কমিটির মেয়াদ",
  committee_term_en: "কমিটির মেয়াদ (ইংরেজি)",
  links: "সামাজিক মাধ্যমের লিংক",
  url: "লিংক",
  label_bn: "মেনুর লেখা (বাংলা)",
  label_en: "মেনুর লেখা (ইংরেজি)",
};

export const FIELD_LABELS: Record<string, string> = {
  id: "আইডি",
  status: "অবস্থা",
  title: "শিরোনাম",
  body: "বিস্তারিত",
  caption: "ক্যাপশন",
  name_bn: "নাম",
  full_name: "নাম",
  father_name: "পিতার নাম",
  mother_name: "মাতার নাম",
  date_of_birth: "জন্ম তারিখ",
  nationality: "জাতীয়তা",
  religion: "ধর্ম",
  occupation: "পেশা",
  permanent_address: "স্থায়ী ঠিকানা",
  present_address: "বর্তমান ঠিকানা",
  id_type: "পরিচয়পত্রের ধরন",
  id_number: "পরিচয়পত্র নম্বর",
  mobile: "মোবাইল",
  email: "ইমেইল",
  blood_group: "রক্তের গ্রুপ",
  declaration_accepted_at: "অঙ্গীকারনামায় সম্মতি",
  directory_consent: "তালিকায় প্রকাশের সম্মতি",
  decision_note: "সিদ্ধান্তের মন্তব্য",
  reviewed_by: "যাচাইকারী",
  reviewed_at: "যাচাইয়ের সময়",
  submission_token: "জমার টোকেন",
  application_no: "ট্র্যাকিং নম্বর",
  application_id: "আবেদন",
  member_no: "সদস্য নম্বর",
  designation_id: "পদবী",
  photo_path: "ছবি",
  show_in_directory: "সদস্য তালিকায় প্রকাশ",
  public_phone_consent: "ফোন প্রকাশের সম্মতি",
  public_phone: "প্রকাশ্য ফোন",
  joined_on: "যোগদানের তারিখ",
  notes: "নোট",
  sort_order: "ক্রম",
  rank_order: "ক্রম",
  is_active: "সক্রিয়",
  is_published: "প্রকাশিত",
  is_pinned: "পিন করা",
  is_featured: "হিরো স্লাইডার",
  is_system: "সিস্টেম ভূমিকা",
  published_at: "প্রকাশের সময়",
  created_by: "তৈরি করেছেন",
  uploaded_by: "আপলোড করেছেন",
  category_id: "ক্যাটাগরি",
  storage_path: "ফাইলের অবস্থান",
  thumb_path: "থাম্বনেইল",
  width: "প্রস্থ",
  height: "উচ্চতা",
  size_bytes: "ফাইলের আকার",
  event_date: "অনুষ্ঠানের তারিখ",
  source: "উৎস",
  slug: "ফোল্ডার",
  summary: "সারসংক্ষেপ",
  description: "বিবরণ",
  icon: "আইকন",
  cover_image_id: "প্রচ্ছদ ছবি",
  key: "কী",
  value: "বিষয়বস্তু",
  updated_by: "পরিবর্তন করেছেন",
  role_id: "ভূমিকা",
  permission: "অনুমতি",
  name_en: "নাম (ইংরেজি)",
  title_bn: "শিরোনাম",
  title_en: "শিরোনাম (ইংরেজি)",
  summary_bn: "সারসংক্ষেপ",
  summary_en: "সারসংক্ষেপ (ইংরেজি)",
  body_bn: "বিস্তারিত",
  body_en: "বিস্তারিত (ইংরেজি)",
  description_en: "বিবরণ (ইংরেজি)",
  question_bn: "প্রশ্ন",
  question_en: "প্রশ্ন (ইংরেজি)",
  answer_bn: "উত্তর",
  answer_en: "উত্তর (ইংরেজি)",
  location_bn: "স্থান",
  location_en: "স্থান (ইংরেজি)",
  starts_on: "শুরুর তারিখ",
  ends_on: "শেষের তারিখ",
  status_override: "স্থগিত / বাতিল",
  first_published_at: "প্রথম প্রকাশের সময়",
  program_id: "কর্মসূচি",
  kind: "ধরন",
  outlet_bn: "সংবাদমাধ্যম",
  outlet_en: "সংবাদমাধ্যম (ইংরেজি)",
  url: "লিংক",
  published_on: "প্রকাশের তারিখ",
  guardian_consent: "অভিভাবকের সম্মতি",
  year: "সাল",
  roll: "রোল নাম্বার",
  institution: "শিক্ষাপ্রতিষ্ঠান",
  gender: "লিঙ্গ",
  marks: "প্রাপ্ত নাম্বার",
  round2_marks: "২য় রাউন্ডের নাম্বার",
  round2_updated_at: "২য় রাউন্ড হালনাগাদ",
  total_marks: "সর্বমোট নাম্বার",
};

/** Fields whose VALUES may be displayed (everything else: name only). */
const SAFE_VALUES = new Set([
  "status", "title", "caption", "name_bn", "application_no", "member_no", "designation_id", "show_in_directory",
  "directory_consent", "public_phone_consent", "sort_order", "rank_order", "is_active", "is_published",
  "is_pinned", "is_featured", "is_system", "published_at", "category_id", "event_date", "slug", "key",
  "role_id", "permission", "joined_on", "source", "year", "roll", "institution", "gender", "marks",
  "round2_marks", "total_marks",
]);
/** Quiz entities: old/new values are stored by their audit trigger. */
const QUIZ_ENTITIES = new Set(["quiz_results", "quiz_settings", "quiz_years"]);
/** Field names used inside quiz_settings.value. */
const QUIZ_SETTING_LABELS: Record<string, string> = {
  round2_enabled: "২য় রাউন্ড চালু",
  round2_cutoff_boys: "২য় রাউন্ড কাট-অফ (ছেলে)",
  round2_cutoff_girls: "২য় রাউন্ড কাট-অফ (মেয়ে)",
};
/** Fields never worth listing (bookkeeping). */
const HIDDEN_FIELDS = new Set(["id", "submission_token", "created_at", "updated_at", "updated_by"]);
/** Staff names are visible to all staff already; members'/applicants' names are not shown. */
const NAME_VISIBLE_ENTITIES = new Set(["staff_profiles"]);

export type AuditRow = {
  id: number;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  created_at: string;
};

export type AuditLookups = {
  roles?: Map<string, string>;
  categories?: Map<string, string>;
  designations?: Map<string, string>;
  permissions?: Map<string, string>;
  /** Current names/titles of the rows an entry is about (for updates that did not change them). */
  staff?: Map<string, string>;
  announcements?: Map<string, string>;
  members?: Map<string, string>;
  applications?: Map<string, string>;
  images?: Map<string, string>;
};

export type AuditField = { key: string; label: string; value: string | null };

export type AuditView = {
  id: number;
  actor: string;
  isSystem: boolean;
  action: string;
  actionTone: "green" | "blue" | "red" | "gray";
  entity: string;
  /** What the row is about (title, name, tracking number…), when safe to show. */
  subject: string | null;
  fields: AuditField[];
  when: string;
  createdAt: string;
};

/** Own-property lookup (never inherited keys such as "constructor"). */
function own<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function clip(s: string, max = 80): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function formatValue(entity: string, key: string, v: unknown, lookups: AuditLookups): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "হ্যাঁ" : "না";
  if (key === "status" && typeof v === "string") {
    if (entity === "membership_applications" && Object.hasOwn(APPLICATION_STATUS, v)) {
      return APPLICATION_STATUS[v as keyof typeof APPLICATION_STATUS].label;
    }
    if (entity === "members" && Object.hasOwn(MEMBER_STATUS, v)) return MEMBER_STATUS[v as keyof typeof MEMBER_STATUS].label;
  }
  if (key === "role_id" && typeof v === "string") return lookups.roles?.get(v) ?? "অজানা ভূমিকা";
  if (key === "category_id" && typeof v === "string") return lookups.categories?.get(v) ?? "অজানা ক্যাটাগরি";
  if (key === "designation_id" && (typeof v === "number" || typeof v === "string")) {
    return lookups.designations?.get(String(v)) ?? `#${bn(v)}`;
  }
  if (key === "permission" && typeof v === "string") return lookups.permissions?.get(v) ?? v;
  if (key === "key" && entity === "site_settings" && typeof v === "string") return own(SETTINGS_SECTIONS, v) ?? v;
  if (key === "source" && typeof v === "string") return v === "sync" ? "ফোল্ডার সিঙ্ক" : v === "upload" ? "আপলোড" : v;
  if ((key === "event_date" || key === "joined_on") && typeof v === "string") return formatDate(v);
  if (key === "published_at" && typeof v === "string") return formatDateTime(v);
  if (typeof v === "number") return bn(v);
  if (typeof v === "string") return clip(v);
  return "…";
}

function subjectOf(entity: string, entityId: string | null, values: Record<string, unknown>, lookups: AuditLookups): string | null {
  const s = (k: string) => (typeof values[k] === "string" && values[k] ? clip(values[k] as string, 60) : null);
  const current = (map: Map<string, string> | undefined) => {
    const v = entityId ? map?.get(entityId) : undefined;
    return v ? clip(v, 60) : null;
  };
  switch (entity) {
    case "announcements":
      return s("title") ?? current(lookups.announcements);
    case "programs":
    case "press_items":
      return s("title_bn");
    case "faqs":
      return s("question_bn");
    case "roles":
      return s("name_bn") ?? (entityId ? lookups.roles?.get(entityId) ?? null : null);
    case "activity_categories":
      return s("name_bn") ?? (entityId ? lookups.categories?.get(entityId) ?? null : null);
    case "designations":
      return s("name_bn") ?? (entityId ? lookups.designations?.get(entityId) ?? null : null);
    case "gallery_images":
      return s("caption") ?? current(lookups.images);
    case "staff_profiles":
      return s("full_name") ?? current(lookups.staff);
    case "membership_applications":
      return s("application_no") ?? current(lookups.applications);
    case "members":
      return s("member_no") ?? current(lookups.members);
    case "site_settings":
      return entityId ? own(SETTINGS_SECTIONS, entityId) ?? entityId : null;
    case "role_permissions": {
      const role = typeof values.role_id === "string" ? lookups.roles?.get(values.role_id) : entityId ? lookups.roles?.get(entityId) : undefined;
      return role ?? null;
    }
    case "quiz_results": {
      const year = typeof values.year === "number" || typeof values.year === "string" ? bn(values.year) : null;
      const roll = typeof values.roll === "string" && values.roll ? clip(values.roll, 20) : null;
      return [roll ? `রোল ${roll}` : null, year ? `${year} সাল` : null].filter(Boolean).join(" · ") || null;
    }
    case "quiz_settings": {
      const year = typeof values.year === "number" || typeof values.year === "string" ? bn(values.year) : null;
      const setting = typeof values.key === "string" ? own(QUIZ_SETTING_LABELS, values.key) ?? values.key : null;
      return [year ? `${year} সাল` : null, setting].filter(Boolean).join(" · ") || null;
    }
    case "quiz_years": {
      return typeof values.year === "number" || typeof values.year === "string" ? `${bn(values.year)} সাল` : null;
    }
    default:
      return null;
  }
}

export function describeAudit(row: AuditRow, lookups: AuditLookups = {}): AuditView {
  const details = asRecord(row.details);
  const values = asRecord(details.values);
  const oldValues = asRecord(details.old_values);
  const newValues = asRecord(details.new_values);
  const changed = Array.isArray(details.changed) ? details.changed.filter((k): k is string => typeof k === "string") : [];
  // Website content: which fields inside the section changed (names only;
  // recorded by the site_settings audit trigger since migration 300001).
  const contentFields = Array.isArray(details.fields) ? details.fields.filter((k): k is string => typeof k === "string") : null;
  const entity = row.entity_type;
  const isQuiz = QUIZ_ENTITIES.has(entity);
  const valueAllowed = (key: string) =>
    SAFE_VALUES.has(key) || (entity === "quiz_settings" && key === "value");
  const act = own(AUDIT_ACTIONS, row.action) ?? { label: row.action, tone: "gray" as const };

  // For inserts/deletes every column is "changed"; list only the meaningful ones.
  const keys = changed.filter((k) => !HIDDEN_FIELDS.has(k));
  const fields: AuditField[] = [];
  for (const key of keys) {
    // For a created or deleted row, listing every column name says nothing:
    // show only the columns whose (safe, non-empty) value can be displayed.
    if (row.action === "insert" || row.action === "delete") {
      const showable = (valueAllowed(key) || (key === "full_name" && NAME_VISIBLE_ENTITIES.has(entity))) && key in values;
      if (!showable || values[key] === null || values[key] === "") continue;
    }
    // The settings section is already the entry's subject.
    if (entity === "site_settings" && key === "key") continue;
    if (entity === "quiz_settings" && (key === "key" || key === "year")) continue;
    if (entity === "quiz_years" && key === "year") continue;
    // "Content changed" → the names of the changed fields, when recorded.
    if (entity === "site_settings" && key === "value" && contentFields && row.action === "update") {
      for (const f of contentFields) fields.push({ key: `value.${f}`, label: own(SETTINGS_FIELD_LABELS, f) ?? f, value: null });
      if (contentFields.length) continue;
    }
    const showName = key === "full_name" && NAME_VISIBLE_ENTITIES.has(entity);
    const safe = (valueAllowed(key) || showName) && key in values;
    // role_permissions rows are fully described by subject + permission.
    if (entity === "role_permissions" && key === "role_id") continue;
    let value: string | null = null;
    if (safe) {
      // Quiz writes keep both the old and the new value; show the change.
      if (isQuiz && row.action === "update" && (key in oldValues || key in newValues)) {
        const before = formatValue(entity, key, oldValues[key], lookups);
        const after = formatValue(entity, key, newValues[key], lookups);
        value = `${before} → ${after}`;
      } else {
        value = formatValue(entity, key, values[key], lookups);
      }
    }
    fields.push({
      key,
      label: own(FIELD_LABELS, key) ?? key,
      value,
    });
  }

  return {
    id: row.id,
    actor: row.actor_name?.trim() || (row.actor_id ? "অজানা ব্যবহারকারী" : "পাবলিক / সিস্টেম"),
    isSystem: !row.actor_id && !row.actor_name,
    action: act.label,
    actionTone: act.tone,
    entity: own(AUDIT_ENTITIES, entity) ?? entity,
    subject: subjectOf(entity, row.entity_id, values, lookups),
    fields,
    when: formatDateTime(row.created_at),
    createdAt: row.created_at,
  };
}

/** One-line Bengali summary, e.g. "ঘোষণা তৈরি — “ঈদ উপলক্ষে…”". */
export function auditSentence(v: AuditView): string {
  return `${v.entity} ${v.action}${v.subject ? ` — “${v.subject}”` : ""}`;
}
