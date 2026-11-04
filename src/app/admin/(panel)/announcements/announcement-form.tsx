"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Save, Trash2 } from "lucide-react";
import { Alert, Field, Input, Textarea } from "@/components/ui/field";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckField } from "@/components/admin/check-field";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PendingButton } from "@/components/admin/pending-button";
import { useUnsavedChangesGuard } from "@/components/admin/use-unsaved-guard";
import { ANNOUNCEMENT_LIMITS, type AnnouncementFieldErrors, type AnnouncementValues } from "@/lib/site/announcement-schema";
import { toParagraphs } from "@/lib/site/text";
import { bn } from "@/lib/format";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "./actions";

/** Create / edit an announcement: Bengali title (required) and body; optional English title and body. */
export function AnnouncementForm({
  id,
  initial,
  updatedAt: initialUpdatedAt,
  justCreated = false,
}: {
  id?: string;
  initial: AnnouncementValues;
  updatedAt?: string;
  justCreated?: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(id);
  const [v, setV] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [savedPublished, setSavedPublished] = useState(initial.is_published);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    justCreated ? { ok: true, message: "ঘোষণাটি তৈরি হয়েছে।" } : null,
  );
  const [fe, setFe] = useState<AnnouncementFieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Covers reloads AND in-panel links ("তালিকায় ফিরে যান", sidebar).
  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (Object.keys(fe).length) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  const set = <K extends keyof AnnouncementValues>(key: K, value: AnnouncementValues[K]) => {
    setDirty(true);
    setV((prev) => ({ ...prev, [key]: value }));
  };

  function submit() {
    setStatus(null);
    startTransition(async () => {
      try {
        const r = id ? await updateAnnouncement(id, v, updatedAt) : await createAnnouncement(v);
        if (!r.ok) {
          setFe(r.fieldErrors ?? {});
          setStatus({ ok: false, message: r.error });
          return;
        }
        setFe({});
        setDirty(false);
        if (!id) {
          router.push(`/admin/announcements/${r.id}?created=1`);
          return;
        }
        setUpdatedAt(r.updatedAt);
        setSavedPublished(r.isPublished);
        setStatus({
          ok: true,
          message: r.isPublished
            ? "পরিবর্তন সংরক্ষিত হয়েছে। ঘোষণাটি ওয়েবসাইটে প্রকাশিত।"
            : "পরিবর্তন সংরক্ষিত হয়েছে। ঘোষণাটি খসড়া হিসেবে আছে (ওয়েবসাইটে দেখা যাবে না)।",
        });
        router.refresh();
      } catch {
        setStatus({ ok: false, message: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  const describedBy = (key: keyof AnnouncementValues, hint = false) =>
    fe[key] ? `ann-${key}-error` : hint ? `ann-${key}-hint` : undefined;
  const paragraphs = toParagraphs(v.body);
  const paragraphsEn = toParagraphs(v.body_en);

  return (
    <>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
        data-testid="announcement-form"
      >
        {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}

        <Card className="space-y-5 p-4 sm:p-6">
          <h2 className="text-lg font-bold">বাংলা</h2>
          <Field id="ann-title" label="শিরোনাম" required error={fe.title}>
            <Input
              id="ann-title"
              name="title"
              value={v.title}
              required
              maxLength={ANNOUNCEMENT_LIMITS.titleMax}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={fe.title ? true : undefined}
              aria-describedby={fe.title ? "ann-title-error" : undefined}
            />
          </Field>

          <Field
            id="ann-body"
            label="বিস্তারিত"
            error={fe.body}
            hint="সাধারণ লেখা হিসেবে দেখানো হবে (HTML বা বিশেষ ফরম্যাটিং কাজ করে না)। নতুন অনুচ্ছেদ শুরু করতে মাঝে একটি ফাঁকা লাইন রাখুন।"
          >
            <Textarea
              id="ann-body"
              name="body"
              value={v.body}
              rows={10}
              maxLength={ANNOUNCEMENT_LIMITS.bodyMax}
              onChange={(e) => set("body", e.target.value)}
              aria-invalid={fe.body ? true : undefined}
              aria-describedby={describedBy("body", true)}
              className="max-h-[70vh] min-h-48 leading-relaxed field-sizing-content"
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">ইংরেজি (ঐচ্ছিক)</h2>
            <p className="text-sm text-muted">
              ইংরেজি ওয়েবসাইটে (/en) এই লেখা দেখানো হবে। খালি রাখলে সেখানে বাংলা শিরোনাম ও বিস্তারিত দেখানো হবে।
            </p>
          </div>
          <Field id="ann-title_en" label="শিরোনাম (ইংরেজি)" error={fe.title_en}>
            <Input
              id="ann-title_en"
              name="title_en"
              lang="en"
              value={v.title_en}
              maxLength={ANNOUNCEMENT_LIMITS.titleMax}
              onChange={(e) => set("title_en", e.target.value)}
              aria-invalid={fe.title_en ? true : undefined}
              aria-describedby={describedBy("title_en")}
            />
          </Field>
          <Field id="ann-body_en" label="বিস্তারিত (ইংরেজি)" error={fe.body_en}>
            <Textarea
              id="ann-body_en"
              name="body_en"
              lang="en"
              value={v.body_en}
              rows={6}
              maxLength={ANNOUNCEMENT_LIMITS.bodyMax}
              onChange={(e) => set("body_en", e.target.value)}
              aria-invalid={fe.body_en ? true : undefined}
              aria-describedby={describedBy("body_en")}
              className="max-h-[70vh] min-h-36 leading-relaxed field-sizing-content"
            />
          </Field>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <CheckField
            id="ann-published"
            label="ওয়েবসাইটে প্রকাশ করুন"
            hint="টিক না দিলে খসড়া হিসেবে থাকবে; শুধু অ্যাডমিন প্যানেলে দেখা যাবে।"
            checked={v.is_published}
            onChange={(e) => set("is_published", e.target.checked)}
          />
          <CheckField
            id="ann-pinned"
            label="উপরে পিন করুন"
            hint="পিন করা ঘোষণা তালিকার শুরুতে ও হোম পেজে আগে দেখানো হয়।"
            checked={v.is_pinned}
            onChange={(e) => set("is_pinned", e.target.checked)}
          />
        </div>

        <details className="rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer font-semibold text-brand-800">ওয়েবসাইটে যেমন দেখাবে (প্রিভিউ)</summary>
          <div className="mt-3 space-y-3">
            <p className="font-serif text-xl font-bold text-brand-900">{v.title.trim() || "শিরোনাম"}</p>
            {paragraphs.length ? (
              paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line text-ink/90">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-muted">বিস্তারিত লেখা নেই।</p>
            )}
            <p className="text-sm text-muted">{bn(paragraphs.length)}টি অনুচ্ছেদ</p>
            {(v.title_en.trim() || paragraphsEn.length > 0) && (
              <div className="space-y-3 border-t border-line pt-3" lang="en">
                <p className="text-sm font-semibold text-muted" lang="bn">ইংরেজি পাতায়:</p>
                <p className="font-serif text-xl font-bold text-brand-900">{v.title_en.trim() || v.title.trim()}</p>
                {paragraphsEn.map((p, i) => (
                  <p key={i} className="whitespace-pre-line text-ink/90">
                    {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <PendingButton type="submit" pending={pending} icon={<Save className="size-5" aria-hidden="true" />}>
            {pending ? "সংরক্ষণ হচ্ছে…" : isEdit ? "পরিবর্তন সংরক্ষণ করুন" : "ঘোষণা তৈরি করুন"}
          </PendingButton>
          <Link href="/admin/announcements" className={buttonClass("ghost", "md", "border border-line bg-white")}>
            তালিকায় ফিরে যান
          </Link>
          {isEdit && savedPublished && (
            <Link href={`/announcements/${id}`} target="_blank" className={buttonClass("ghost", "md")}>
              ওয়েবসাইটে দেখুন <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
            </Link>
          )}
          {isEdit && (
            <Button variant="ghost" className="ms-auto text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 className="size-5" aria-hidden="true" /> মুছে ফেলুন
            </Button>
          )}
        </div>
      </form>

      {confirmDelete && id && (
        <ConfirmDialog
          title="ঘোষণাটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const r = await deleteAnnouncement(id);
            if (!r.ok) return r.error;
            setDirty(false);
            router.push("/admin/announcements?deleted=1");
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{initial.title}</span>” স্থায়ীভাবে মুছে যাবে এবং ওয়েবসাইট থেকেও সরে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
          <p className="text-muted">শুধু লুকাতে চাইলে মুছে না ফেলে “ওয়েবসাইটে প্রকাশ করুন” থেকে টিক তুলে দিন।</p>
        </ConfirmDialog>
      )}
    </>
  );
}
