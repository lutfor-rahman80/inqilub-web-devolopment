"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Braces, Languages, Plus, Save, Trash2 } from "lucide-react";
import { saveContentSection } from "./actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckField } from "@/components/admin/check-field";
import { PendingButton } from "@/components/admin/pending-button";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-guard";
import {
  CONTENT_LIMITS,
  EDITABLE_SOCIAL_PLATFORMS,
  NAME_PLACEHOLDER,
  SOCIAL_URL_EXAMPLES,
  parseSocialSettings,
  type ContentSection,
  type FieldErrors,
} from "@/lib/admin/schemas";
import { bn } from "@/lib/format";

type Values = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Shared save logic: pending state, server result, field errors, unsaved-changes guard. */
function useSectionSave(section: ContentSection, initialUpdatedAt: string | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Covers reloads AND the section tabs / sidebar links (client-side navigations).
  useUnsavedChangesGuard(dirty);

  // Move focus to the first invalid field after a failed save.
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fieldErrors]);

  function save(values: Values) {
    setStatus(null);
    startTransition(async () => {
      try {
        const r = await saveContentSection(section, values, updatedAt);
        if (r.ok) {
          setUpdatedAt(r.updatedAt);
          setFieldErrors({});
          setDirty(false);
          setStatus({
            ok: true,
            message: r.unchanged
              ? "কোনো পরিবর্তন ছিল না; ওয়েবসাইটের লেখা আগের মতোই আছে।"
              : "পরিবর্তন সংরক্ষিত হয়েছে। ওয়েবসাইটেও হালনাগাদ হয়েছে।",
          });
          router.refresh();
        } else {
          setFieldErrors(r.fieldErrors ?? {});
          setStatus({ ok: false, message: r.error });
        }
      } catch {
        setStatus({ ok: false, message: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  /** Errors found in the browser before sending (same rules as the server). */
  function showErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    setStatus({ ok: false, message: "ফর্মের কিছু তথ্য সঠিক নয়। চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।" });
  }

  return { pending, status, fieldErrors, save, showErrors, formRef, markDirty: () => setDirty(true) };
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  multiline,
  rows = 4,
  maxLength,
  lang,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength: number;
  type?: string;
  dir?: string;
  inputMode?: "text" | "tel" | "email" | "url";
  placeholder?: string;
  autoComplete?: string;
  lang?: string;
}) {
  const common = {
    id,
    name: id,
    value,
    maxLength,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, error, hint),
    lang,
  } as const;
  return (
    <Field id={id} label={label} required={required} hint={hint} error={error}>
      {multiline ? (
        <>
          <Textarea
            {...common}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            className="max-h-[70vh] min-h-24 leading-relaxed field-sizing-content"
          />
          <p className="text-end text-sm text-muted" aria-hidden="true">
            {bn(value.length)} / {bn(maxLength)}
          </p>
        </>
      ) : (
        <Input {...common} {...rest} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function FormShell({
  children,
  pending,
  status,
  formRef,
  onSubmit,
}: {
  children: ReactNode;
  pending: boolean;
  status: { ok: boolean; message: string } | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: () => void;
}) {
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}
      <Card className="space-y-5 p-4 sm:p-6">{children}</Card>
      <div className="flex flex-wrap items-center gap-3">
        <PendingButton type="submit" pending={pending} icon={<Save className="size-5" aria-hidden="true" />}>
          {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
        </PendingButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export const EN_OPTIONAL = "ঐচ্ছিক — খালি থাকলে ইংরেজি সাইটে বাংলা দেখাবে";

const ORG_FIELDS = [
  {
    key: "name_bn",
    label: "সংগঠনের নাম",
    max: CONTENT_LIMITS.orgName,
    hint: "হেডার, ফুটার ও বিভিন্ন পৃষ্ঠার লেখায় দেখানো হয়। ব্রাউজার ট্যাবের শিরোনাম ও সার্চ ইঞ্জিনের বিবরণে নামটি ওয়েবসাইটের কোডে লেখা আছে — সেটি বদলাতে ডেভেলপারের সাহায্য লাগবে।",
  },
  { key: "tagline", label: "পরিচিতি বাক্য", max: CONTENT_LIMITS.orgLine, hint: "নামের নিচে ছোট এক লাইনের পরিচিতি।" },
  { key: "slogan", label: "স্লোগান", max: CONTENT_LIMITS.orgLine, hint: "হোম পেজের প্রধান অংশে উদ্ধৃতি চিহ্নসহ দেখানো হয়।" },
  { key: "location", label: "অবস্থান", max: CONTENT_LIMITS.orgLine, hint: "যেমন: এলাকা, থানা, জেলা।" },
] as const;

const ORG_EN_FIELDS = [
  { key: "name", label: "সংগঠনের নাম (ইংরেজি)", max: CONTENT_LIMITS.orgName, hint: EN_OPTIONAL },
  { key: "tagline", label: "পরিচিতি বাক্য (ইংরেজি)", max: CONTENT_LIMITS.orgLine, hint: EN_OPTIONAL },
  {
    key: "slogan",
    label: "স্লোগানের ইংরেজি অর্থ",
    max: CONTENT_LIMITS.orgLine,
    hint: "স্লোগানটি দুই ভাষাতেই বাংলায় দেখানো হয়; ইংরেজি সাইটে এই অর্থটি তার নিচে ছোট করে দেখানো হয়। ঐচ্ছিক — খালি থাকলে শুধু বাংলা স্লোগান দেখাবে।",
  },
  { key: "location", label: "অবস্থান (ইংরেজি)", max: CONTENT_LIMITS.orgLine, hint: EN_OPTIONAL },
] as const;

const ABOUT_FIELDS = [
  { key: "what_is", label: "আমরা কারা (পরিচিতি)", rows: 4 },
  { key: "goal", label: "লক্ষ্য", rows: 4 },
  { key: "objective", label: "উদ্দেশ্য", rows: 3 },
  { key: "why", label: "কেন এই সংগঠন", rows: 8 },
] as const;

/** The English part of a section: visually grouped, marked optional. */
function EnglishFieldset({ children, intro }: { children: ReactNode; intro?: ReactNode }) {
  return (
    <fieldset className="space-y-5 rounded-xl border border-sage-200 bg-sage-50 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 font-serif text-lg font-bold text-forest-800">
        <Languages className="size-5" aria-hidden="true" /> ইংরেজি সংস্করণ <span lang="en" className="font-sans text-base font-semibold">(English)</span>
      </legend>
      <p className="text-sm text-muted">
        ইংরেজি ওয়েবসাইটের (<span dir="ltr">/en</span>) জন্য। {intro ?? "প্রতিটি ঘর ঐচ্ছিক — খালি থাকলে ইংরেজি সাইটে বাংলা লেখাটিই দেখাবে।"}
      </p>
      {children}
    </fieldset>
  );
}

type FieldSpec = { key: string; label: string; max?: number; hint?: string; rows?: number };

function SimpleTextSection({
  section,
  initial,
  updatedAt,
  fields,
  enFields,
  multiline,
}: {
  section: "organization" | "about";
  initial: Values;
  updatedAt: string | null;
  fields: readonly FieldSpec[];
  enFields: readonly FieldSpec[];
  multiline: boolean;
}) {
  const s = useSectionSave(section, updatedAt);
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, str(initial[f.key])])),
  );
  const initialEn = initial.en && typeof initial.en === "object" ? (initial.en as Values) : {};
  const [en, setEn] = useState<Record<string, string>>(() =>
    Object.fromEntries(enFields.map((f) => [f.key, str(initialEn[f.key])])),
  );
  return (
    <FormShell pending={s.pending} status={s.status} formRef={s.formRef} onSubmit={() => s.save({ ...v, en })}>
      {multiline && (
        <p className="text-muted">
          সাধারণ লেখা হিসেবে দেখানো হবে। নতুন অনুচ্ছেদ শুরু করতে মাঝে একটি ফাঁকা লাইন রাখুন। কোনো ঘর ফাঁকা রাখলে ওয়েবসাইটে
          সেই অংশটি দেখানো হবে না।
        </p>
      )}
      {fields.map((f) => (
        <TextField
          key={f.key}
          id={`${section}-${f.key}`}
          label={f.label}
          value={v[f.key]}
          required={!multiline}
          multiline={multiline}
          rows={f.rows}
          maxLength={f.max ?? CONTENT_LIMITS.aboutText}
          hint={f.hint}
          error={s.fieldErrors[f.key]}
          onChange={(value) => {
            s.markDirty();
            setV((prev) => ({ ...prev, [f.key]: value }));
          }}
        />
      ))}
      <EnglishFieldset>
        {enFields.map((f) => (
          <TextField
            key={f.key}
            id={`${section}-en-${f.key}`}
            label={multiline ? `${f.label} (ইংরেজি)` : f.label}
            value={en[f.key]}
            multiline={multiline}
            rows={f.rows}
            lang="en"
            dir="ltr"
            maxLength={f.max ?? CONTENT_LIMITS.aboutText}
            hint={multiline ? EN_OPTIONAL : f.hint}
            error={s.fieldErrors[`en.${f.key}`]}
            onChange={(value) => {
              s.markDirty();
              setEn((prev) => ({ ...prev, [f.key]: value }));
            }}
          />
        ))}
      </EnglishFieldset>
    </FormShell>
  );
}

function ContactSection({ initial, updatedAt }: { initial: Values; updatedAt: string | null }) {
  const s = useSectionSave("contact", updatedAt);
  const [v, setV] = useState({
    address: str(initial.address),
    phone: str(initial.phone),
    email: str(initial.email),
    facebook_url: str(initial.facebook_url),
    map_url: str(initial.map_url),
    office_hours: str(initial.office_hours),
  });
  const initialEn = initial.en && typeof initial.en === "object" ? (initial.en as Values) : {};
  const [en, setEn] = useState({ address: str(initialEn.address), office_hours: str(initialEn.office_hours) });
  const set = (key: keyof typeof v) => (value: string) => {
    s.markDirty();
    setV((prev) => ({ ...prev, [key]: value }));
  };
  const setE = (key: keyof typeof en) => (value: string) => {
    s.markDirty();
    setEn((prev) => ({ ...prev, [key]: value }));
  };
  const fe = s.fieldErrors;
  return (
    <FormShell pending={s.pending} status={s.status} formRef={s.formRef} onSubmit={() => s.save({ ...v, en })}>
      <p className="text-muted">ঐচ্ছিক ঘর ফাঁকা রাখলে ওয়েবসাইটে সেই তথ্যটি দেখানো হবে না।</p>
      <TextField id="contact-address" label="ঠিকানা" value={v.address} onChange={set("address")} error={fe.address} multiline rows={2} maxLength={CONTENT_LIMITS.address} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          id="contact-phone"
          label="ফোন নম্বর"
          value={v.phone}
          onChange={set("phone")}
          error={fe.phone}
          maxLength={20}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="off"
          hint="মোবাইল (০১XXXXXXXXX) বা ল্যান্ডফোন; বাংলা বা ইংরেজি অঙ্কে লেখা যাবে।"
        />
        <TextField
          id="contact-email"
          label="ইমেইল"
          value={v.email}
          onChange={set("email")}
          error={fe.email}
          maxLength={CONTENT_LIMITS.email}
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="off"
        />
      </div>
      <TextField
        id="contact-facebook_url"
        label="ফেসবুক পেজের লিংক"
        value={v.facebook_url}
        onChange={set("facebook_url")}
        error={fe.facebook_url}
        maxLength={CONTENT_LIMITS.url}
        type="url"
        inputMode="url"
        dir="ltr"
        autoComplete="off"
        placeholder="https://www.facebook.com/..."
        hint="হেডারের “সামাজিক মাধ্যম” মেনু, ফুটার ও যোগাযোগ পৃষ্ঠায় দেখানো হয়; সেখানকার QR কোডও এই লিংক থেকেই তৈরি হয়।"
      />
      <TextField
        id="contact-map_url"
        label="গুগল ম্যাপ (এমবেড লিংক)"
        value={v.map_url}
        onChange={set("map_url")}
        error={fe.map_url}
        maxLength={CONTENT_LIMITS.url}
        dir="ltr"
        autoComplete="off"
        placeholder="https://www.google.com/maps/embed?pb=..."
        hint={
          <>
            Google Maps-এ জায়গাটি খুলে <span dir="ltr">Share → Embed a map</span> থেকে লিংক বা পুরো <code dir="ltr">&lt;iframe&gt;</code> কোডটি কপি
            করে এখানে দিন।
          </>
        }
      />
      <TextField
        id="contact-office_hours"
        label="অফিস সময়"
        value={v.office_hours}
        onChange={set("office_hours")}
        error={fe.office_hours}
        maxLength={CONTENT_LIMITS.officeHours}
        hint="যেমন: প্রতি শুক্রবার বিকেল ৪টা – সন্ধ্যা ৬টা"
      />
      <p className="text-sm text-muted">
        ফেসবুক ছাড়া অন্য সামাজিক মাধ্যমের (ইউটিউব ইত্যাদি) লিংক “সামাজিক মাধ্যম” অংশে দিন।
      </p>
      <EnglishFieldset intro="ফোন, ইমেইল ও লিংক দুই ভাষাতেই একই থাকে।">
        <TextField id="contact-en-address" label="ঠিকানা (ইংরেজি)" value={en.address} onChange={setE("address")} error={fe["en.address"]} multiline rows={2} lang="en" dir="ltr" maxLength={CONTENT_LIMITS.address} hint={EN_OPTIONAL} />
        <TextField id="contact-en-office_hours" label="অফিস সময় (ইংরেজি)" value={en.office_hours} onChange={setE("office_hours")} error={fe["en.office_hours"]} lang="en" dir="ltr" maxLength={CONTENT_LIMITS.officeHours} hint={EN_OPTIONAL} placeholder="e.g. Fridays, 4–6 pm" />
      </EnglishFieldset>
    </FormShell>
  );
}

function DeclarationPreview({ paragraphs }: { paragraphs: string[] }) {
  const visible = paragraphs.map((p) => p.trim()).filter(Boolean);
  if (visible.length === 0) return <p className="text-muted">কোনো অনুচ্ছেদ নেই।</p>;
  return (
    <div className="space-y-3 text-ink/90">
      {visible.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p.split(NAME_PLACEHOLDER).map((piece, j) => (
            <span key={j}>
              {j > 0 && <mark className="rounded bg-gold-100 px-1 font-semibold text-brand-900">[আবেদনকারীর নাম]</mark>}
              {piece}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function MembershipSection({ initial, updatedAt }: { initial: Values; updatedAt: string | null }) {
  const s = useSectionSave("membership", updatedAt);
  const [isOpen, setIsOpen] = useState(initial.is_open !== false);
  const [paras, setParas] = useState<string[]>(() => {
    const list = Array.isArray(initial.declaration) ? initial.declaration.map(str) : [];
    return list.length ? list : [""];
  });
  const [enParas, setEnParas] = useState<string[]>(() => {
    const en = initial.en && typeof initial.en === "object" ? (initial.en as Values) : {};
    return Array.isArray(en.declaration) ? en.declaration.map(str) : [];
  });
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const [announce, setAnnounce] = useState("");
  const max = CONTENT_LIMITS.declarationMax;
  const fe = s.fieldErrors;

  function update(next: string[], message = "") {
    s.markDirty();
    setParas(next);
    setAnnounce(message);
  }
  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= paras.length) return;
    const next = [...paras];
    [next[i], next[j]] = [next[j], next[i]];
    update(next, `অনুচ্ছেদ ${bn(i + 1)} এখন ${bn(j + 1)} নম্বরে।`);
  }
  function insertName() {
    const el = firstRef.current;
    const text = paras[0] ?? "";
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = [...paras];
    next[0] = `${text.slice(0, start)}${NAME_PLACEHOLDER}${text.slice(end)}`;
    update(next, "প্রথম অনুচ্ছেদে {name} যোগ হয়েছে।");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + NAME_PLACEHOLDER.length;
      el?.setSelectionRange(pos, pos);
    });
  }
  function submit() {
    // Empty paragraphs are dropped before saving, so error numbers match what is shown.
    const compact = paras.map((p) => p.trim()).filter(Boolean);
    const shown = compact.length ? compact : [""];
    if (shown.length !== paras.length) setParas(shown);
    const enCompact = enParas.map((p) => p.trim()).filter(Boolean);
    if (enCompact.length !== enParas.length) setEnParas(enCompact);
    s.save({ is_open: isOpen, declaration: compact, en: { declaration: enCompact } });
  }

  return (
    <FormShell pending={s.pending} status={s.status} formRef={s.formRef} onSubmit={submit}>
      <CheckField
        id="membership-is_open"
        label="অনলাইনে সদস্য আবেদন গ্রহণ চালু"
        hint="বন্ধ করলে “সদস্য হোন” পৃষ্ঠায় ফর্মের বদলে আবেদন বন্ধ থাকার নোটিশ দেখানো হবে এবং অন্যান্য পৃষ্ঠার আবেদনের বোতাম লুকানো থাকবে।"
        checked={isOpen}
        onChange={(e) => {
          s.markDirty();
          setIsOpen(e.target.checked);
        }}
      />

      <fieldset className="space-y-4" aria-describedby="declaration-help">
        <legend className="font-serif text-lg font-bold text-brand-900">অঙ্গীকারনামা</legend>
        <div id="declaration-help" className="rounded-xl border border-gold-400/60 bg-gold-50 p-4 text-ink/90">
          <p>
            আবেদন ফর্মের শেষ ধাপে এই অনুচ্ছেদগুলো দেখানো হয় এবং আবেদনকারী এতে সম্মতি দেন। মোট {bn(CONTENT_LIMITS.declarationMin)}–{bn(max)}টি
            অনুচ্ছেদ রাখা যাবে।
          </p>
          <p className="mt-2">
            <strong>
              <code dir="ltr" className="rounded bg-white px-1.5 py-0.5 text-brand-800">{NAME_PLACEHOLDER}</code> চিহ্ন:
            </strong>{" "}
            প্রথম অনুচ্ছেদে অবশ্যই <code dir="ltr">{NAME_PLACEHOLDER}</code> লিখুন। ফর্মে ঠিক ওই জায়গায় আবেদনকারীর নাম স্বয়ংক্রিয়ভাবে বসে যাবে —
            যেমন “আমি <code dir="ltr">{NAME_PLACEHOLDER}</code> এই মর্মে অঙ্গীকার করছি…”। বানান হুবহু ইংরেজিতে, বাঁকা বন্ধনীসহ হতে হবে।
          </p>
        </div>
        {fe.declaration && (
          <p id="declaration-error" role="alert" className="font-medium text-red-700">{fe.declaration}</p>
        )}

        <ol className="space-y-4">
          {paras.map((p, i) => {
            const id = `declaration-${i}`;
            const err = fe[`declaration.${i}`];
            return (
              <li key={i} className="rounded-xl border border-line bg-cream/50 p-3 sm:p-4">
                <Field
                  id={id}
                  label={`অনুচ্ছেদ ${bn(i + 1)}`}
                  required
                  error={err}
                  hint={i === 0 ? <>এই অনুচ্ছেদে <code dir="ltr">{NAME_PLACEHOLDER}</code> থাকতে হবে।</> : undefined}
                >
                  <Textarea
                    id={id}
                    ref={i === 0 ? firstRef : undefined}
                    value={p}
                    rows={4}
                    maxLength={CONTENT_LIMITS.paragraphMax}
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${id}-error` : i === 0 ? `${id}-hint` : undefined}
                    onChange={(e) => {
                      const next = [...paras];
                      next[i] = e.target.value;
                      update(next);
                    }}
                    className="max-h-[70vh] min-h-28 leading-relaxed field-sizing-content"
                  />
                </Field>
                <div className="mt-2 flex flex-wrap gap-2">
                  {i === 0 && (
                    <Button variant="outline" size="sm" className="min-h-11" onClick={insertName}>
                      <Braces className="size-4" aria-hidden="true" /> {NAME_PLACEHOLDER} বসান
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 border border-line bg-white"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`অনুচ্ছেদ ${bn(i + 1)} উপরে নিন`}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" /> উপরে
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 border border-line bg-white"
                    disabled={i === paras.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`অনুচ্ছেদ ${bn(i + 1)} নিচে নিন`}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" /> নিচে
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 border border-line bg-white text-red-700 hover:bg-red-50"
                    disabled={paras.length <= 1}
                    onClick={() => update(paras.filter((_, j) => j !== i), `অনুচ্ছেদ ${bn(i + 1)} মুছে ফেলা হয়েছে।`)}
                    aria-label={`অনুচ্ছেদ ${bn(i + 1)} মুছুন`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> মুছুন
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <Button
          variant="outline"
          disabled={paras.length >= max}
          onClick={() => update([...paras, ""], `অনুচ্ছেদ ${bn(paras.length + 1)} যোগ হয়েছে।`)}
        >
          <Plus className="size-5" aria-hidden="true" /> অনুচ্ছেদ যোগ করুন
        </Button>
        {paras.length >= max && <p className="text-sm text-muted">সর্বোচ্চ {bn(max)}টি অনুচ্ছেদ রাখা যায়।</p>}
        <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      </fieldset>

      <details className="rounded-xl border border-line bg-white p-4">
        <summary className="cursor-pointer font-semibold text-brand-800">আবেদনকারী যেমন দেখবেন (প্রিভিউ)</summary>
        <div className="mt-3">
          <DeclarationPreview paragraphs={paras} />
        </div>
      </details>

      <EnglishFieldset intro="এটি শুধু বোঝার সুবিধার জন্য অনুবাদ (reference translation); আবেদনকারী যে অঙ্গীকার করেন তা ওপরের বাংলা অঙ্গীকারনামা — বাংলা লেখাটিই বাধ্যতামূলক ও চূড়ান্ত। ঐচ্ছিক — খালি থাকলে ইংরেজি সাইটে বাংলা অঙ্গীকারনামা দেখাবে।">
        {fe["en.declaration"] && (
          <p id="en-declaration-error" role="alert" className="font-medium text-red-700">{fe["en.declaration"]}</p>
        )}
        {enParas.length > 0 && (
          <ol className="space-y-4">
            {enParas.map((p, i) => {
              const id = `declaration-en-${i}`;
              const err = fe[`en.declaration.${i}`];
              return (
                <li key={i} className="rounded-xl border border-line bg-white p-3 sm:p-4">
                  <Field
                    id={id}
                    label={`ইংরেজি অনুচ্ছেদ ${bn(i + 1)}`}
                    required
                    error={err}
                    hint={i === 0 ? <>প্রথম অনুচ্ছেদে <code dir="ltr">{NAME_PLACEHOLDER}</code> লিখুন, যেমন <span lang="en" dir="ltr">“I, {NAME_PLACEHOLDER}, hereby pledge …”</span></> : undefined}
                  >
                    <Textarea
                      id={id}
                      lang="en"
                      dir="ltr"
                      value={p}
                      rows={4}
                      maxLength={CONTENT_LIMITS.paragraphMax}
                      aria-invalid={err ? true : undefined}
                      aria-describedby={err ? `${id}-error` : i === 0 ? `${id}-hint` : undefined}
                      onChange={(e) => {
                        const next = [...enParas];
                        next[i] = e.target.value;
                        s.markDirty();
                        setEnParas(next);
                      }}
                      className="max-h-[70vh] min-h-28 leading-relaxed field-sizing-content"
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 min-h-11 border border-line bg-white text-red-700 hover:bg-red-50"
                    onClick={() => {
                      s.markDirty();
                      setEnParas(enParas.filter((_, j) => j !== i));
                      setAnnounce(`ইংরেজি অনুচ্ছেদ ${bn(i + 1)} মুছে ফেলা হয়েছে।`);
                    }}
                    aria-label={`ইংরেজি অনুচ্ছেদ ${bn(i + 1)} মুছুন`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> মুছুন
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
        <Button
          variant="outline"
          disabled={enParas.length >= max}
          onClick={() => {
            s.markDirty();
            setEnParas([...enParas, ""]);
            setAnnounce(`ইংরেজি অনুচ্ছেদ ${bn(enParas.length + 1)} যোগ হয়েছে।`);
          }}
        >
          <Plus className="size-5" aria-hidden="true" /> ইংরেজি অনুচ্ছেদ যোগ করুন
        </Button>
      </EnglishFieldset>
    </FormShell>
  );
}

function DirectorySection({ initial, updatedAt }: { initial: Values; updatedAt: string | null }) {
  const s = useSectionSave("directory", updatedAt);
  const [enabled, setEnabled] = useState(initial.enabled !== false);
  const [termBn, setTermBn] = useState(str(initial.committee_term_bn));
  const [termEn, setTermEn] = useState(str(initial.committee_term_en));
  return (
    <FormShell
      pending={s.pending}
      status={s.status}
      formRef={s.formRef}
      onSubmit={() => s.save({ enabled, committee_term_bn: termBn, committee_term_en: termEn })}
    >
      <CheckField
        id="directory-enabled"
        label="ওয়েবসাইটে “সদস্যবৃন্দ” পৃষ্ঠা চালু"
        hint="চালু থাকলে শুধু সক্রিয় ও সম্মতিপ্রাপ্ত সদস্যদের ছবি, নাম, পদবী ও সদস্য নম্বর দেখানো হয় (ফোন নম্বর শুধু আলাদা সম্মতি থাকলে)। বন্ধ করলে পৃষ্ঠাটি ও মেনুর লিংক লুকানো থাকবে।"
        checked={enabled}
        onChange={(e) => {
          s.markDirty();
          setEnabled(e.target.checked);
        }}
      />
      <TextField
        id="directory-committee_term_bn"
        label="কমিটির মেয়াদ"
        value={termBn}
        maxLength={CONTENT_LIMITS.committeeTerm}
        error={s.fieldErrors.committee_term_bn}
        hint="“সদস্যবৃন্দ” পৃষ্ঠায় কমিটির নামের সাথে দেখানো হয়, যেমন: কার্যনির্বাহী কমিটি ২০২৬–২৭। ফাঁকা রাখলে দেখানো হবে না।"
        onChange={(value) => {
          s.markDirty();
          setTermBn(value);
        }}
      />
      <EnglishFieldset>
        <TextField
          id="directory-committee_term_en"
          label="কমিটির মেয়াদ (ইংরেজি)"
          value={termEn}
          lang="en"
          dir="ltr"
          maxLength={CONTENT_LIMITS.committeeTerm}
          error={s.fieldErrors.committee_term_en}
          hint={EN_OPTIONAL}
          placeholder="e.g. Executive Committee 2026–27"
          onChange={(value) => {
            s.markDirty();
            setTermEn(value);
          }}
        />
      </EnglishFieldset>
    </FormShell>
  );
}

const SOCIAL_NAMES: Record<(typeof EDITABLE_SOCIAL_PLATFORMS)[number], string> = {
  youtube: "ইউটিউব (YouTube)",
  instagram: "ইনস্টাগ্রাম (Instagram)",
  tiktok: "টিকটক (TikTok)",
  x: "এক্স / টুইটার (X)",
  whatsapp: "হোয়াটসঅ্যাপ চ্যানেল (WhatsApp)",
  telegram: "টেলিগ্রাম (Telegram)",
  linkedin: "লিংকডইন (LinkedIn)",
};
type EditablePlatform = (typeof EDITABLE_SOCIAL_PLATFORMS)[number];

function SocialSection({ initial, updatedAt }: { initial: Values; updatedAt: string | null }) {
  const s = useSectionSave("social", updatedAt);
  const [rows, setRows] = useState<{ platform: EditablePlatform | ""; url: string }[]>(() =>
    (Array.isArray(initial.links) ? initial.links : [])
      .map((l) => (l && typeof l === "object" ? (l as Values) : {}))
      .filter((l) => (EDITABLE_SOCIAL_PLATFORMS as readonly string[]).includes(str(l.platform)))
      .map((l) => ({ platform: str(l.platform) as EditablePlatform, url: str(l.url) })),
  );
  const [announce, setAnnounce] = useState("");
  const fe = s.fieldErrors;
  const unused = EDITABLE_SOCIAL_PLATFORMS.filter((p) => !rows.some((r) => r.platform === p));
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => {
    s.markDirty();
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  function submit() {
    const values = { links: rows };
    const checked = parseSocialSettings(values);
    if (!checked.ok) {
      s.showErrors(checked.fieldErrors);
      return;
    }
    s.save(values);
  }

  return (
    <FormShell pending={s.pending} status={s.status} formRef={s.formRef} onSubmit={submit}>
      <div className="rounded-xl border border-gold-400/60 bg-gold-50 p-4 text-ink/90">
        <p>
          শুধু সংগঠনের নিজস্ব, যাচাই করা অ্যাকাউন্টের লিংক দিন। লিংক থাকলে তবেই হেডারের “সামাজিক মাধ্যম” মেনু, মোবাইল মেনু ও ফুটারে সেটি দেখানো হয়
          (নতুন ট্যাবে খোলে)। ফেসবুক পেজের লিংক “যোগাযোগ” অংশে দিন।
        </p>
      </div>
      {fe.links && <p role="alert" className="font-medium text-red-700">{fe.links}</p>}
      {rows.length === 0 ? (
        <p className="text-muted" data-testid="social-empty">ফেসবুক ছাড়া এখনো কোনো সামাজিক মাধ্যমের লিংক যোগ করা হয়নি।</p>
      ) : (
        <ol className="space-y-4">
          {rows.map((r, i) => {
            const pid = `social-${i}-platform`;
            const uid = `social-${i}-url`;
            const pErr = fe[`links.${i}.platform`];
            const uErr = fe[`links.${i}.url`];
            return (
              <li key={i} className="grid gap-3 rounded-xl border border-line bg-cream/50 p-3 sm:p-4 xl:grid-cols-[12rem_minmax(0,1fr)] xl:items-start" data-testid="social-row">
                <Field id={pid} label="মাধ্যম" required error={pErr}>
                  <Select
                    id={pid}
                    value={r.platform}
                    aria-invalid={pErr ? true : undefined}
                    aria-describedby={pErr ? `${pid}-error` : undefined}
                    onChange={(e) => update(i, { platform: e.target.value as EditablePlatform })}
                  >
                    <option value="">বেছে নিন…</option>
                    {EDITABLE_SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p} disabled={p !== r.platform && rows.some((x) => x.platform === p)}>
                        {SOCIAL_NAMES[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id={uid} label="লিংক (https)" required error={uErr}>
                  <Input
                    id={uid}
                    type="url"
                    inputMode="url"
                    dir="ltr"
                    autoComplete="off"
                    maxLength={CONTENT_LIMITS.url}
                    value={r.url}
                    placeholder={r.platform ? SOCIAL_URL_EXAMPLES[r.platform] : "https://..."}
                    aria-invalid={uErr ? true : undefined}
                    aria-describedby={uErr ? `${uid}-error` : undefined}
                    onChange={(e) => update(i, { url: e.target.value })}
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 justify-self-start border border-line bg-white text-red-700 hover:bg-red-50 xl:col-span-2"
                  onClick={() => {
                    s.markDirty();
                    setRows(rows.filter((_, j) => j !== i));
                    setAnnounce(`সারি ${bn(i + 1)} মুছে ফেলা হয়েছে।`);
                  }}
                  aria-label={`সারি ${bn(i + 1)} মুছুন`}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> মুছুন
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      <Button
        variant="outline"
        disabled={unused.length === 0}
        onClick={() => {
          s.markDirty();
          setRows([...rows, { platform: unused[0] ?? "", url: "" }]);
          setAnnounce(`সারি ${bn(rows.length + 1)} যোগ হয়েছে।`);
        }}
        data-testid="social-add"
      >
        <Plus className="size-5" aria-hidden="true" /> লিংক যোগ করুন
      </Button>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </FormShell>
  );
}


/** The editing form for one website-content section. */
export function ContentSectionForm({
  section,
  initial,
  updatedAt,
}: {
  section: ContentSection;
  initial: Values;
  updatedAt: string | null;
}) {
  switch (section) {
    case "organization":
      return (
        <SimpleTextSection section="organization" initial={initial} updatedAt={updatedAt} fields={ORG_FIELDS} enFields={ORG_EN_FIELDS} multiline={false} />
      );
    case "about":
      return <SimpleTextSection section="about" initial={initial} updatedAt={updatedAt} fields={ABOUT_FIELDS} enFields={ABOUT_FIELDS} multiline />;
    case "contact":
      return <ContactSection initial={initial} updatedAt={updatedAt} />;
    case "membership":
      return <MembershipSection initial={initial} updatedAt={updatedAt} />;
    case "directory":
      return <DirectorySection initial={initial} updatedAt={updatedAt} />;
    case "social":
      return <SocialSection initial={initial} updatedAt={updatedAt} />;
  }
}
