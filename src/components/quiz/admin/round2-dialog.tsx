"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LoaderCircle, Save, SkipForward } from "lucide-react";
import { getQuizMobile, saveQuizRound2 } from "@/app/admin/(panel)/quiz/actions";
import { AdminModal } from "@/components/admin/modal";
import { CheckField } from "@/components/admin/check-field";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/field";
import { bn, toAsciiDigits } from "@/lib/format";
import {
  normalizeRoll,
  splitMobiles,
  type QuizRound2Result,
  type QuizRow,
  type QuizSettings,
} from "@/lib/quiz/admin";

const MOBILE_PATTERN = /^01[3-9]\d{8}$/;

type Props = {
  year: number;
  rows: readonly QuizRow[];
  settings: QuizSettings;
  onClose: () => void;
  onSaved: (result: QuizRound2Result, mode: "save" | "next") => void;
};

export function QuizRound2Dialog({ year, rows, settings, onClose, onSaved }: Props) {
  const [roll, setRoll] = useState("");
  const [marks, setMarks] = useState("");
  const [mobile, setMobile] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [existingMobile, setExistingMobile] = useState("");
  const [loadingMobile, setLoadingMobile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rollRef = useRef<HTMLInputElement>(null);

  const rollValue = normalizeRoll(roll);
  const student = useMemo(
    () => (rollValue ? rows.find((item) => normalizeRoll(item.roll) === rollValue) ?? null : null),
    [rollValue, rows],
  );
  const studentId = student?.id;

  const cutoff = student ? (student.gender === "মেয়ে" ? settings.cutoffGirls : settings.cutoffBoys) : 0;
  const qualified = student ? (student.marks ?? 0) >= cutoff : false;
  const hasExisting = student?.round2_marks !== null && student?.round2_marks !== undefined;

  useEffect(() => {
    if (studentId === undefined) return;

    let cancelled = false;
    getQuizMobile(studentId, year)
      .then((result) => {
        if (cancelled) return;
        setExistingMobile(result.ok ? result.data : "");
        setLoadingMobile(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingMobile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, year]);

  function changeRoll(value: string) {
    setRoll(value);
    setOverwrite(false);
    setExistingMobile("");
    setFormError(null);
    setLoadingMobile(value.trim() !== "");
  }

  function submit(mode: "save" | "next") {
    setFormError(null);

    if (!rollValue) {
      setFormError("অনুগ্রহ করে শিক্ষার্থীর রোল নম্বর লিখুন।");
      rollRef.current?.focus();
      return;
    }
    if (!student) {
      setFormError("এই রোলের কোনো শিক্ষার্থী পাওয়া যায়নি। রোল নম্বর যাচাই করুন।");
      rollRef.current?.focus();
      return;
    }
    if (!qualified) {
      setFormError("এই শিক্ষার্থী কাট-অফে উত্তীর্ণ নয়, তাই ২য় রাউন্ডের নাম্বার দেওয়া যাবে না।");
      return;
    }

    const marksValue = Number(toAsciiDigits(marks).trim());
    if (!marks.trim() || !Number.isFinite(marksValue) || marksValue < 0) {
      setFormError("সঠিক প্রাপ্ত নাম্বার দিন (০ বা তার বেশি একটি সংখ্যা)।");
      return;
    }
    if (hasExisting && !overwrite) {
      setFormError("আগের নাম্বার বদলাতে চাই — চেকবক্সে টিক দিন।");
      return;
    }

    const cleanMobile = toAsciiDigits(mobile).trim();
    if (cleanMobile && !MOBILE_PATTERN.test(cleanMobile)) {
      setFormError("নতুন মোবাইল নম্বরটি সঠিক নয় (০১ দিয়ে শুরু ১১ ডিজিটের নম্বর দিন)।");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveQuizRound2({
          year,
          roll: normalizeRoll(student.roll),
          round2Marks: marksValue,
          mobile: cleanMobile || undefined,
          overwrite,
        });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }

        onSaved(result.data, mode);

        if (mode === "next") {
          setRoll("");
          setMarks("");
          setMobile("");
          setOverwrite(false);
          setExistingMobile("");
          setLoadingMobile(false);
          setFormError(null);
          requestAnimationFrame(() => rollRef.current?.focus());
        }
      } catch {
        setFormError("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
      }
    });
  }

  return (
    <AdminModal
      title="২য় রাউন্ডের নাম্বার যোগ করুন"
      description="রোল দিয়ে শিক্ষার্থী খুঁজুন। কাট-অফে উত্তীর্ণ শিক্ষার্থীর ২য় রাউন্ডের নাম্বার সংরক্ষণ করুন।"
      onClose={onClose}
      busy={pending}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit("save");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            submit("next");
          }
        }}
      >
        <Field id="quiz-round2-roll" label="রোল নম্বর" required>
          <Input
            ref={rollRef}
            id="quiz-round2-roll"
            data-autofocus
            inputMode="numeric"
            autoComplete="off"
            value={roll}
            onChange={(event) => changeRoll(event.target.value)}
            placeholder="শিক্ষার্থীর রোল লিখুন"
          />
        </Field>

        {rollValue && !student && <Alert>এই রোলের কোনো শিক্ষার্থী পাওয়া যায়নি।</Alert>}

        {student && (
          <div className="space-y-2">
            <div className="rounded-xl border border-line bg-cream px-4 py-3 text-sm">
              <p className="font-semibold text-ink">{student.name}</p>
              <p className="text-muted">{student.institution || "—"}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <dt className="text-muted">লিঙ্গ</dt>
                  <dd>{student.gender}</dd>
                </div>
                <div>
                  <dt className="text-muted">১ম রাউন্ড</dt>
                  <dd className="font-semibold">{bn(student.marks ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{student.gender === "মেয়ে" ? "মেয়েদের" : "ছেলেদের"} কাট-অফ</dt>
                  <dd>{bn(cutoff)}</dd>
                </div>
                <div>
                  <dt className="text-muted">বর্তমান মোবাইল</dt>
                  <dd dir="ltr">
                    {loadingMobile ? "লোড হচ্ছে…" : existingMobile ? splitMobiles(existingMobile).map(bn).join(", ") : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {!qualified && (
              <Alert>
                অনুত্তীর্ণ শিক্ষার্থী — ১ম রাউন্ডে {bn(student.marks ?? 0)}, কাট-অফ {bn(cutoff)}। এই শিক্ষার্থীর ২য়
                রাউন্ডের নাম্বার এন্ট্রি করা যাবে না।
              </Alert>
            )}
          </div>
        )}

        <Field
          id="quiz-round2-marks"
          label="২য় রাউন্ডের প্রাপ্ত নাম্বার"
          required
          hint="যেমন: ২৫ বা ২৫.৫"
        >
          <Input
            id="quiz-round2-marks"
            inputMode="decimal"
            autoComplete="off"
            value={marks}
            disabled={!student || !qualified || pending}
            onChange={(event) => setMarks(event.target.value)}
          />
        </Field>

        <Field id="quiz-round2-mobile" label="নতুন মোবাইল নম্বর" hint="আগের নম্বর না থাকলে বা নতুন নম্বর যোগ করতে চাইলে।">
          <Input
            id="quiz-round2-mobile"
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="off"
            maxLength={20}
            value={mobile}
            disabled={!student || !qualified || pending}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="018xxxxxxxx"
          />
        </Field>

        {hasExisting && student && (
          <CheckField
            id="quiz-round2-overwrite"
            label="আগের নাম্বার বদলাতে চাই"
            hint={`পূর্বের ২য় রাউন্ড নাম্বার: ${bn(student.round2_marks ?? 0)}`}
            checked={overwrite}
            disabled={pending}
            onChange={(event) => setOverwrite(event.target.checked)}
          />
        )}

        {formError && <Alert>{formError}</Alert>}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" className="border border-line" onClick={onClose} disabled={pending}>
            বাতিল
          </Button>
          <Button
            variant="outline"
            onClick={() => submit("next")}
            disabled={!student || !qualified || pending || loadingMobile}
            aria-busy={pending}
          >
            <SkipForward className="size-4" aria-hidden="true" />
            সংরক্ষণ করে পরেরটি
          </Button>
          <Button type="submit" disabled={!student || !qualified || pending || loadingMobile} aria-busy={pending}>
            {pending ? (
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
