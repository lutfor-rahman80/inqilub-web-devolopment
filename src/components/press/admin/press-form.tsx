"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Info, Save, TriangleAlert } from "lucide-react";
import { createPress, updatePress } from "@/app/admin/(panel)/notice/actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckField } from "@/components/admin/check-field";
import { PendingButton } from "@/components/admin/pending-button";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-guard";
import { bn } from "@/lib/format";
import { dhakaToday } from "@/lib/programs/status";
import type { FieldErrors } from "@/lib/programs/schemas";
import { normalizePressUrl, PRESS_LIMITS, type PressKind } from "@/lib/press/schemas";
import { isVideoLink, youtubeId, youtubeThumbnail } from "@/lib/press/youtube";
import { PressDeleteButton } from "./press-delete-button";

export type PressFormValues = {
  kind: PressKind;
  title_bn: string;
  title_en: string;
  outlet_bn: string;
  outlet_en: string;
  url: string;
  published_on: string;
  summary_bn: string;
  summary_en: string;
  program_id: string;
  is_published: boolean;
};

export type ProgramChoice = { id: string; label: string };

const KINDS: { value: PressKind; label: string; hint: string }[] = [
  { value: "news", label: "সংবাদ", hint: "পত্রিকা বা অনলাইন পোর্টালে প্রকাশিত খবর" },
  { value: "interview", label: "সাক্ষাৎকার", hint: "টিভি/অনলাইন চ্যানেলকে দেওয়া সাক্ষাৎকার" },
  { value: "video_report", label: "ভিডিও প্রতিবেদন", hint: "চ্যানেলের ভিডিও প্রতিবেদন" },
];

/** What the website will do with a link (shown live under the URL field). */
function UrlPreview({ url }: { url: string }) {
  if (!url.trim()) return null;
  const safe = normalizePressUrl(url);
  if (!safe) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        লিংকটি এখনো সঠিক নয় — https:// দিয়ে শুরু হওয়া পুরো লিংক দিন।
      </p>
    );
  }
  const id = youtubeId(safe);
  if (id) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-2 text-sm text-brand-900" data-testid="youtube-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={youtubeThumbnail(id)} alt="" width={120} height={90} className="h-[68px] w-[120px] rounded-lg bg-stone-200 object-cover" />
        <p className="flex items-start gap-1.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            ইউটিউব ভিডিও শনাক্ত হয়েছে (<code dir="ltr">{id}</code>)। ওয়েবসাইটে ছবিসহ “চালান” বোতাম দেখাবে; চাপলে তবেই ইউটিউব থেকে ভিডিও লোড হবে।
          </span>
        </p>
      </div>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
      {isVideoLink(safe)
        ? "ভিডিও লিংক (ইউটিউব নয়) — ওয়েবসাইটে “ভিডিও দেখুন” লিংক দেখাবে, যা নতুন ট্যাবে মূল পাতায় খুলবে।"
        : "ওয়েবসাইটে মূল প্রতিবেদনের লিংক দেখাবে, যা নতুন ট্যাবে খুলবে।"}
    </p>
  );
}

export function PressForm({
  id,
  initial,
  programs,
  updatedAt: initialUpdatedAt,
  justCreated = false,
}: {
  id?: string;
  initial: PressFormValues;
  programs: ProgramChoice[];
  updatedAt?: string;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const [v, setV] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    justCreated ? { ok: true, message: "প্রতিবেদনটি যুক্ত হয়েছে।" } : null,
  );
  const [fe, setFe] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useUnsavedChangesGuard(dirty);
  useEffect(() => {
    if (Object.keys(fe).length) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  const set = <K extends keyof PressFormValues>(key: K, value: PressFormValues[K]) => {
    setDirty(true);
    setV((prev) => ({ ...prev, [key]: value }));
  };
  const err = (name: keyof PressFormValues) => fe[name];
  const describe = (name: string, hint: boolean) => (fe[name] ? `${name}-error` : hint ? `${name}-hint` : undefined);

  function submit() {
    setStatus(null);
    startTransition(async () => {
      try {
        const r = id ? await updatePress(id, v, updatedAt) : await createPress(v);
        if (!r.ok) {
          setFe(r.fieldErrors ?? {});
          setStatus({ ok: false, message: r.error });
          return;
        }
        setFe({});
        setDirty(false);
        if (!id) {
          router.push(`/admin/notice/${r.id}?created=1`);
          return;
        }
        setUpdatedAt(r.updatedAt);
        setStatus({
          ok: true,
          message: r.isPublished
            ? "পরিবর্তন সংরক্ষিত হয়েছে। প্রতিবেদনটি ওয়েবসাইটের “Notice” পাতায় প্রকাশিত।"
            : "পরিবর্তন সংরক্ষিত হয়েছে। এটি খসড়া হিসেবে আছে (ওয়েবসাইটে দেখা যাবে না)।",
        });
        router.refresh();
      } catch {
        setStatus({ ok: false, message: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}

      <Card className="space-y-5 p-4 sm:p-6">
        <fieldset aria-describedby={fe.kind ? "kind-error" : undefined}>
          <legend className="font-medium text-ink">
            ধরন <span className="text-red-700" aria-hidden="true">*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <label
                key={k.value}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-gold-500 ${
                  v.kind === k.value ? "border-brand-700 bg-brand-50 ring-2 ring-brand-700/25" : "border-line bg-white hover:bg-brand-50/60"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  checked={v.kind === k.value}
                  onChange={() => set("kind", k.value)}
                  className="mt-1 size-5 shrink-0 accent-brand-700"
                />
                <span>
                  <span className="block font-medium">{k.label}</span>
                  <span className="block text-sm text-muted">{k.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {fe.kind && <p id="kind-error" role="alert" className="mt-1 text-sm font-medium text-red-700">{fe.kind}</p>}
        </fieldset>

        <Field
          id="url"
          label="মূল প্রতিবেদন বা ভিডিওর লিংক"
          required
          error={err("url")}
          hint="সংবাদমাধ্যমের নিজের পাতার লিংক দিন (https://…)। সংবাদের লেখা বা ভিডিও এই ওয়েবসাইটে কপি করে রাখা হয় না।"
        >
          <Input
            id="url"
            type="url"
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            maxLength={PRESS_LIMITS.url}
            value={v.url}
            placeholder="https://"
            onChange={(e) => set("url", e.target.value)}
            required
            aria-invalid={err("url") ? true : undefined}
            aria-describedby={describe("url", true)}
          />
        </Field>
        <div aria-live="polite">
          <UrlPreview url={v.url} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="outlet_bn" label="সংবাদমাধ্যমের নাম" required error={err("outlet_bn")} hint="যেমন পত্রিকা, পোর্টাল বা টিভি চ্যানেলের নাম">
            <Input
              id="outlet_bn"
              value={v.outlet_bn}
              maxLength={PRESS_LIMITS.outlet}
              onChange={(e) => set("outlet_bn", e.target.value)}
              required
              aria-invalid={err("outlet_bn") ? true : undefined}
              aria-describedby={describe("outlet_bn", true)}
            />
          </Field>
          <Field id="outlet_en" label="সংবাদমাধ্যমের নাম (ইংরেজি)" error={err("outlet_en")}>
            <Input
              id="outlet_en"
              lang="en"
              dir="ltr"
              value={v.outlet_en}
              maxLength={PRESS_LIMITS.outlet}
              onChange={(e) => set("outlet_en", e.target.value)}
              aria-invalid={err("outlet_en") ? true : undefined}
              aria-describedby={describe("outlet_en", false)}
            />
          </Field>
          <Field id="published_on" label="প্রকাশের তারিখ" required error={err("published_on")}>
            <Input
              id="published_on"
              type="date"
              min="2000-01-02"
              max={dhakaToday()}
              value={v.published_on}
              onChange={(e) => set("published_on", e.target.value)}
              required
              aria-invalid={err("published_on") ? true : undefined}
              aria-describedby={describe("published_on", false)}
            />
          </Field>
          <Field id="program_id" label="সংশ্লিষ্ট কর্মসূচি" error={err("program_id")} hint="বেছে নিলে প্রতিবেদনটি সেই কর্মসূচির পাতাতেও দেখাবে।">
            <Select
              id="program_id"
              value={v.program_id}
              onChange={(e) => set("program_id", e.target.value)}
              aria-invalid={err("program_id") ? true : undefined}
              aria-describedby={describe("program_id", true)}
            >
              <option value="">— কোনো কর্মসূচি নয় —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <h2 className="text-xl font-bold">বাংলা</h2>
        <Field id="title_bn" label="শিরোনাম" required error={err("title_bn")} hint="প্রতিবেদনের শিরোনাম (সংবাদমাধ্যমে যেমন আছে)।">
          <Input
            id="title_bn"
            value={v.title_bn}
            maxLength={PRESS_LIMITS.title}
            onChange={(e) => set("title_bn", e.target.value)}
            required
            aria-invalid={err("title_bn") ? true : undefined}
            aria-describedby={describe("title_bn", true)}
          />
        </Field>
        <Field
          id="summary_bn"
          label="সংক্ষিপ্ত বিবরণ"
          error={err("summary_bn")}
          hint={`নিজের ভাষায় এক-দুই বাক্য; সংবাদের লেখা কপি করবেন না। (${bn(v.summary_bn.length)}/${bn(PRESS_LIMITS.summary)})`}
        >
          <Textarea
            id="summary_bn"
            rows={3}
            value={v.summary_bn}
            maxLength={PRESS_LIMITS.summary}
            onChange={(e) => set("summary_bn", e.target.value)}
            aria-invalid={err("summary_bn") ? true : undefined}
            aria-describedby={describe("summary_bn", true)}
          />
        </Field>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-bold">ইংরেজি (ঐচ্ছিক)</h2>
          <p className="mt-1 text-muted">ফাঁকা থাকলে ইংরেজি ওয়েবসাইটে বাংলা লেখাটিই দেখানো হবে।</p>
        </div>
        <Field id="title_en" label="শিরোনাম (ইংরেজি)" error={err("title_en")}>
          <Input
            id="title_en"
            lang="en"
            dir="ltr"
            value={v.title_en}
            maxLength={PRESS_LIMITS.title}
            onChange={(e) => set("title_en", e.target.value)}
            aria-invalid={err("title_en") ? true : undefined}
            aria-describedby={describe("title_en", false)}
          />
        </Field>
        <Field id="summary_en" label="সংক্ষিপ্ত বিবরণ (ইংরেজি)" error={err("summary_en")}>
          <Textarea
            id="summary_en"
            lang="en"
            dir="ltr"
            rows={3}
            value={v.summary_en}
            maxLength={PRESS_LIMITS.summary}
            onChange={(e) => set("summary_en", e.target.value)}
            aria-invalid={err("summary_en") ? true : undefined}
            aria-describedby={describe("summary_en", false)}
          />
        </Field>
      </Card>

      <CheckField
        id="is_published"
        label="ওয়েবসাইটে প্রকাশ করুন"
        hint="টিক না দিলে খসড়া হিসেবে থাকবে; শুধু অ্যাডমিন প্যানেলে দেখা যাবে।"
        checked={v.is_published}
        onChange={(e) => set("is_published", e.target.checked)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <PendingButton type="submit" pending={pending} icon={<Save className="size-5" aria-hidden="true" />}>
          {pending ? "সংরক্ষণ হচ্ছে…" : isEdit ? "পরিবর্তন সংরক্ষণ করুন" : "প্রতিবেদন যুক্ত করুন"}
        </PendingButton>
        <Link href="/admin/notice" className={buttonClass("ghost", "md", "border border-line bg-white")}>
          তালিকায় ফিরে যান
        </Link>
        {isEdit && normalizePressUrl(initial.url) && (
          <a href={normalizePressUrl(initial.url)!} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "md")}>
            মূল লিংক খুলুন <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
          </a>
        )}
        {isEdit && id && (
          <span className="ms-auto">
            <PressDeleteButton id={id} title={initial.title_bn} />
          </span>
        )}
      </div>
    </form>
  );
}
