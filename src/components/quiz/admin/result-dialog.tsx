"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { getQuizMobile, saveQuizResult } from "@/app/admin/(panel)/quiz/actions";
import { AdminModal } from "@/components/admin/modal";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { bn, toAsciiDigits } from "@/lib/format";
import {
  QUIZ_GENDERS,
  normalizeRoll,
  splitMobiles,
  type QuizGender,
  type QuizRow,
} from "@/lib/quiz/admin";

const MOBILE_PATTERN = /^01\d{9}$/;

type Props = {
  year: number;
  row: QuizRow | null;
  rows: readonly QuizRow[];
  institutions: readonly string[];
  /** The currently revealed mobile string, when the list is showing numbers. */
  initialMobile?: string;
  onClose: () => void;
  onSaved: (row: QuizRow, message: string, mobile: string) => void;
};

export function QuizResultDialog({ year, row, rows, institutions, initialMobile = "", onClose, onSaved }: Props) {
  const editing = row !== null;
  const [roll, setRoll] = useState(row?.roll ?? "");
  const [name, setName] = useState(row?.name ?? "");
  const [institution, setInstitution] = useState(row?.institution ?? "");
  const [gender, setGender] = useState<QuizGender>(row?.gender ?? "ছেলে");
  const [marks, setMarks] = useState(row?.marks === null || row?.marks === undefined ? "" : String(row.marks));
  const [mobileInputs, setMobileInputs] = useState<string[]>(() => {
    const values = splitMobiles(initialMobile);
    return values.length ? values : [""];
  });
  const [loadingMobile, setLoadingMobile] = useState(editing && splitMobiles(initialMobile).length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const studentId = row?.id;

  useEffect(() => {
    if (studentId === undefined || splitMobiles(initialMobile).length > 0) return;
    let cancelled = false;
    getQuizMobile(studentId, year)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          const values = splitMobiles(result.data);
          if (values.length) setMobileInputs(values);
        }
        setLoadingMobile(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingMobile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, initialMobile, year]);

  const duplicate = useMemo(() => {
    const value = normalizeRoll(roll);
    if (!value) return null;
    return (
      rows.find(
        (item) => item.year === year && item.id !== studentId && normalizeRoll(item.roll) === value,
      ) ?? null
    );
  }, [roll, rows, studentId, year]);

  // Shown while typing (not only on submit), scoped to the year selected above.
  const duplicateWarning = duplicate
    ? `⚠ এই রোলটি (${bn(normalizeRoll(roll))}) ইতিমধ্যে "${duplicate.name}" (${duplicate.institution}) এর নামে সংরক্ষিত আছে!`
    : null;
  const rollError = (errors.roll || duplicateWarning) || undefined;

  function setMobileAt(index: number, value: string) {
    setMobileInputs((previous) => previous.map((mobile, position) => (position === index ? value : mobile)));
  }

  function addMobile() {
    setMobileInputs((previous) => [...previous, ""]);
  }

  function removeMobile(index: number) {
    setMobileInputs((previous) => (previous.length === 1 ? [""] : previous.filter((_, position) => position !== index)));
  }

  function submit() {
    setFormError(null);
    const nextErrors: Record<string, string> = {};

    const rollValue = normalizeRoll(roll);
    if (!rollValue) nextErrors.roll = "রোল নম্বর দিন।";
    else if (duplicate) nextErrors.roll = `এই রোলটি ইতিমধ্যে "${duplicate.name}" (${duplicate.institution}) এর নামে আছে।`;

    const nameValue = name.trim();
    if (!nameValue) nextErrors.name = "শিক্ষার্থীর নাম দিন।";

    const institutionValue = institution.trim();
    if (!institutionValue) nextErrors.institution = "শিক্ষাপ্রতিষ্ঠানের নাম দিন বা বেছে নিন।";

    const marksValue = Number(toAsciiDigits(marks).trim());
    if (!marks.trim() || !Number.isFinite(marksValue) || marksValue < 0) {
      nextErrors.marks = "০ বা তার বেশি একটি সঠিক নাম্বার দিন।";
    }

    const allMobiles = mobileInputs.map((mobile) => toAsciiDigits(mobile).trim());
    const primaryMobile = allMobiles[0] ?? "";
    const invalidExtra = allMobiles.some((mobile, index) => index > 0 && mobile !== "" && !MOBILE_PATTERN.test(mobile));
    if (!primaryMobile) nextErrors.mobile = "মূল মোবাইল নম্বর দিন। ০১ দিয়ে শুরু ১১ ডিজিটের নম্বর।";
    else if (!MOBILE_PATTERN.test(primaryMobile)) {
      nextErrors.mobile = "মোবাইল নম্বর ০১ দিয়ে শুরু ১১ ডিজিটের হতে হবে (যেমন: 017xxxxxxxx)।";
    } else if (invalidExtra) {
      nextErrors.mobile = "অতিরিক্ত মোবাইল নম্বরগুলো ০১ দিয়ে শুরু ১১ ডিজিটের হতে হবে।";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const mobile = allMobiles.filter(Boolean).join(", ");

    startTransition(async () => {
      try {
        const result = await saveQuizResult({
          id: row?.id ?? null,
          year,
          roll: rollValue,
          name: nameValue,
          institution: institutionValue,
          gender,
          marks: marksValue,
          mobile,
        });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        onSaved(result.data, editing ? "ফলাফল সফলভাবে আপডেট হয়েছে।" : "নতুন ফলাফল যোগ হয়েছে।", mobile);
      } catch {
        setFormError("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
      }
    });
  }

  return (
    <AdminModal
      title={editing ? "ফলাফল সংশোধন করুন" : "নতুন ফলাফল যোগ করুন"}
      description={editing ? "শিক্ষার্থীর তথ্য, নাম্বার ও মোবাইল নম্বর বদলান।" : "প্রথম রাউন্ডের ফলাফল যোগ করুন।"}
      onClose={onClose}
      busy={pending}
      size="lg"
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {formError && <Alert>{formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="quiz-roll" label="রোল নম্বর" required error={rollError}>
            <Input
              id="quiz-roll"
              data-autofocus
              inputMode="numeric"
              autoComplete="off"
              value={roll}
              onChange={(event) => {
                setRoll(event.target.value);
                if (errors.roll) setErrors((previous) => ({ ...previous, roll: "" }));
              }}
              aria-invalid={rollError ? true : undefined}
              aria-describedby={rollError ? "quiz-roll-error" : undefined}
            />
          </Field>
          <Field id="quiz-marks" label="প্রাপ্ত নাম্বার" required error={errors.marks}>
            <Input
              id="quiz-marks"
              inputMode="decimal"
              autoComplete="off"
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
              aria-invalid={errors.marks ? true : undefined}
              aria-describedby={errors.marks ? "quiz-marks-error" : undefined}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="quiz-name" label="শিক্ষার্থীর নাম" required error={errors.name}>
              <Input
                id="quiz-name"
                autoComplete="off"
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "quiz-name-error" : undefined}
              />
            </Field>
          </div>
          <Field id="quiz-institution" label="শিক্ষাপ্রতিষ্ঠান" required error={errors.institution}>
            <Input
              id="quiz-institution"
              list="quiz-institution-options"
              autoComplete="off"
              maxLength={200}
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              aria-invalid={errors.institution ? true : undefined}
              aria-describedby={errors.institution ? "quiz-institution-error" : undefined}
            />
            <datalist id="quiz-institution-options">
              {institutions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field id="quiz-gender" label="লিঙ্গ" required error={errors.gender}>
            <Select
              id="quiz-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value as QuizGender)}
              aria-invalid={errors.gender ? true : undefined}
              aria-describedby={errors.gender ? "quiz-gender-error" : undefined}
            >
              {QUIZ_GENDERS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="font-medium text-ink">
            মোবাইল নম্বর <span className="ms-1 text-red-700" aria-hidden="true">*</span>
          </legend>
          {loadingMobile && <p className="text-sm text-muted">বর্তমান মোবাইল নম্বর লোড হচ্ছে…</p>}
          <div className="space-y-2">
            {mobileInputs.map((mobile, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  id={`quiz-mobile-${index}`}
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  autoComplete="off"
                  value={mobile}
                  disabled={pending || loadingMobile}
                  onChange={(event) => setMobileAt(index, event.target.value)}
                  aria-label={index === 0 ? "মূল মোবাইল নম্বর" : `অতিরিক্ত মোবাইল নম্বর ${bn(index + 1)}`}
                  placeholder={index === 0 ? "017xxxxxxxx" : "018xxxxxxxx"}
                  aria-invalid={errors.mobile ? true : undefined}
                  aria-describedby={errors.mobile ? "quiz-mobile-error" : undefined}
                />
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 border border-line"
                    onClick={() => removeMobile(index)}
                    disabled={pending || loadingMobile}
                    aria-label={`অতিরিক্ত মোবাইল নম্বর ${bn(index + 1)} বাদ দিন`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {errors.mobile && (
            <p id="quiz-mobile-error" role="alert" className="text-sm font-medium text-red-700">
              {errors.mobile}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={addMobile} disabled={pending || loadingMobile}>
            <Plus className="size-4" aria-hidden="true" />
            আরেকটি নম্বর যোগ করুন
          </Button>
        </fieldset>

        {editing && row.round2_marks !== null && (
          <Alert tone="info">
            এই শিক্ষার্থীর ২য় রাউন্ডের নাম্বার ইতিমধ্যে সংরক্ষিত আছে ({bn(row.round2_marks)})।
          </Alert>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" className="border border-line" onClick={onClose} disabled={pending}>
            বাতিল
          </Button>
          <Button type="submit" disabled={pending || loadingMobile} aria-busy={pending}>
            {pending && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {pending ? (editing ? "আপডেট হচ্ছে…" : "সংরক্ষণ হচ্ছে…") : editing ? "আপডেট করুন" : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </form>
    </AdminModal>
  );
}
