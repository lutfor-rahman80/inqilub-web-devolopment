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
import { FAQ_LIMITS, type FaqFieldErrors, type FaqValues } from "@/lib/faq/schemas";
import { createFaq, deleteFaq, updateFaq } from "./actions";

/** Create / edit one FAQ entry (Bengali required, English optional). */
export function FaqForm({
  id,
  initial,
  updatedAt: initialUpdatedAt,
  justCreated = false,
}: {
  id?: string;
  initial: FaqValues;
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
    justCreated ? { ok: true, message: "প্রশ্নটি তৈরি হয়েছে।" } : null,
  );
  const [fe, setFe] = useState<FaqFieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (Object.keys(fe).length) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  const set = <K extends keyof FaqValues>(key: K, value: FaqValues[K]) => {
    setDirty(true);
    setV((prev) => ({ ...prev, [key]: value }));
  };

  function submit() {
    setStatus(null);
    startTransition(async () => {
      try {
        const r = id ? await updateFaq(id, v, updatedAt) : await createFaq(v);
        if (!r.ok) {
          setFe(r.fieldErrors ?? {});
          setStatus({ ok: false, message: r.error });
          return;
        }
        setFe({});
        setDirty(false);
        if (!id) {
          router.push(`/admin/faq/${r.id}?created=1`);
          return;
        }
        setUpdatedAt(r.updatedAt);
        setSavedPublished(r.isPublished);
        setStatus({
          ok: true,
          message: r.isPublished
            ? "পরিবর্তন সংরক্ষিত হয়েছে। প্রশ্নটি ওয়েবসাইটে প্রকাশিত।"
            : "পরিবর্তন সংরক্ষিত হয়েছে। প্রশ্নটি খসড়া হিসেবে আছে (ওয়েবসাইটে দেখা যাবে না)।",
        });
        router.refresh();
      } catch {
        setStatus({ ok: false, message: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      }
    });
  }

  const err = (key: keyof FaqValues, hint = false) =>
    fe[key] ? `faq-${key}-error` : hint ? `faq-${key}-hint` : undefined;

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
        data-testid="faq-form"
      >
        {status && !pending && <Alert tone={status.ok ? "success" : "error"}>{status.message}</Alert>}

        <Card className="space-y-5 p-4 sm:p-6">
          <h2 className="text-lg font-bold">বাংলা</h2>
          <Field id="faq-question_bn" label="প্রশ্ন" required error={fe.question_bn}>
            <Input
              id="faq-question_bn"
              name="question_bn"
              value={v.question_bn}
              required
              maxLength={FAQ_LIMITS.questionMax}
              onChange={(e) => set("question_bn", e.target.value)}
              aria-invalid={fe.question_bn ? true : undefined}
              aria-describedby={err("question_bn")}
            />
          </Field>
          <Field
            id="faq-answer_bn"
            label="উত্তর"
            required
            error={fe.answer_bn}
            hint="সাধারণ লেখা হিসেবে দেখানো হবে। নতুন অনুচ্ছেদ শুরু করতে মাঝে একটি ফাঁকা লাইন রাখুন। শুধু যাচাই করা তথ্য লিখুন।"
          >
            <Textarea
              id="faq-answer_bn"
              name="answer_bn"
              value={v.answer_bn}
              rows={6}
              required
              maxLength={FAQ_LIMITS.answerMax}
              onChange={(e) => set("answer_bn", e.target.value)}
              aria-invalid={fe.answer_bn ? true : undefined}
              aria-describedby={err("answer_bn", true)}
              className="max-h-[60vh] min-h-36 leading-relaxed field-sizing-content"
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">ইংরেজি (ঐচ্ছিক)</h2>
            <p className="text-sm text-muted">
              খালি রাখলে ইংরেজি পাতায় বাংলা প্রশ্ন ও উত্তর দেখানো হবে। শুধু উত্তর খালি রাখলে ইংরেজি প্রশ্নের নিচে বাংলা উত্তর দেখানো হবে।
            </p>
          </div>
          <Field id="faq-question_en" label="প্রশ্ন (ইংরেজি)" error={fe.question_en}>
            <Input
              id="faq-question_en"
              name="question_en"
              lang="en"
              value={v.question_en}
              maxLength={FAQ_LIMITS.questionMax}
              onChange={(e) => set("question_en", e.target.value)}
              aria-invalid={fe.question_en ? true : undefined}
              aria-describedby={err("question_en")}
            />
          </Field>
          <Field id="faq-answer_en" label="উত্তর (ইংরেজি)" error={fe.answer_en}>
            <Textarea
              id="faq-answer_en"
              name="answer_en"
              lang="en"
              value={v.answer_en}
              rows={5}
              maxLength={FAQ_LIMITS.answerMax}
              onChange={(e) => set("answer_en", e.target.value)}
              aria-invalid={fe.answer_en ? true : undefined}
              aria-describedby={err("answer_en")}
              className="max-h-[60vh] min-h-32 leading-relaxed field-sizing-content"
            />
          </Field>
        </Card>

        <CheckField
          id="faq-published"
          label="ওয়েবসাইটে প্রকাশ করুন"
          hint="টিক না দিলে খসড়া হিসেবে থাকবে; শুধু অ্যাডমিন প্যানেলে দেখা যাবে।"
          checked={v.is_published}
          onChange={(e) => set("is_published", e.target.checked)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <PendingButton type="submit" pending={pending} icon={<Save className="size-5" aria-hidden="true" />}>
            {pending ? "সংরক্ষণ হচ্ছে…" : isEdit ? "পরিবর্তন সংরক্ষণ করুন" : "প্রশ্ন যুক্ত করুন"}
          </PendingButton>
          <Link href="/admin/faq" className={buttonClass("ghost", "md", "border border-line bg-white")}>
            তালিকায় ফিরে যান
          </Link>
          {isEdit && savedPublished && (
            <Link href={`/faq#q-${id!.slice(0, 8)}`} target="_blank" className={buttonClass("ghost", "md")}>
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
          title="প্রশ্নটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const r = await deleteFaq(id);
            if (!r.ok) return r.error;
            setDirty(false);
            router.push("/admin/faq?deleted=1");
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{initial.question_bn}</span>” স্থায়ীভাবে মুছে যাবে এবং ওয়েবসাইট থেকেও সরে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
          <p className="text-muted">শুধু লুকাতে চাইলে মুছে না ফেলে “ওয়েবসাইটে প্রকাশ করুন” থেকে টিক তুলে দিন।</p>
        </ConfirmDialog>
      )}
    </>
  );
}
