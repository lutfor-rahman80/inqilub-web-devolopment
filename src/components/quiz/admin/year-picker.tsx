"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { addQuizYear } from "@/app/admin/(panel)/quiz/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { bn } from "@/lib/format";

type Props = {
  /** Every year that exists, newest first. */
  years: number[];
  year: number;
};

/** Year switcher and "add year" form. Changing the year reloads the page with ?year=. */
export function QuizYearPicker({ years, year }: Props) {
  const router = useRouter();
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = years.includes(year) ? years : [year, ...years];

  function choose(value: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed === year) return;
    router.push(`/admin/quiz?year=${parsed}`, { scroll: false });
  }

  function add(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const raw = newYear.trim();
    const value = Number(raw);
    if (!/^\d{4}$/.test(raw) || value < 2000 || value > 2100) {
      setError("সালটি ২০০০ থেকে ২১০০ এর মধ্যে চার সংখ্যার হতে হবে।");
      return;
    }

    startTransition(async () => {
      try {
        const result = await addQuizYear(value);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNewYear("");
        router.push(`/admin/quiz?year=${value}`, { scroll: false });
      } catch {
        setError("নতুন সাল যোগ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
      }
    });
  }

  return (
    <Card className="mb-5 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="lg:pr-4">
          <Field id="quiz-year" label="কুইজের সাল" optionalLabel={null}>
            <Select
              id="quiz-year"
              value={String(year)}
              onChange={(event) => choose(event.target.value)}
              className="h-11"
            >
              {options.map((option) => (
                <option key={option} value={option}>{bn(option)}</option>
              ))}
            </Select>
          </Field>
        </div>

        <form noValidate className="flex flex-col sm:flex-row items-start sm:items-end gap-2 w-full lg:w-auto" onSubmit={add}>
          <Field id="quiz-new-year" label="নতুন সাল যোগ করুন" optionalLabel={null}>
            <Input
              id="quiz-new-year"
              inputMode="numeric"
              autoComplete="off"
              className="w-full sm:w-32 h-11"
              placeholder="যেমন: ২০২৭"
              value={newYear}
              disabled={pending}
              onChange={(event) => setNewYear(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="outline" disabled={pending} aria-busy={pending} className="h-11 w-full sm:w-auto whitespace-nowrap">
            {pending ? (
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {pending ? "যোগ হচ্ছে…" : "যোগ করুন"}
          </Button>
        </form>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <p className="mt-4 text-sm text-muted" role="status" aria-live="polite">
        এখন <strong className="text-ink">{bn(year)}</strong> সালের কুইজ পরিচালনা করছেন। এই পেজের সব তথ্য ও কাজ শুধু এই সালেই প্রযোজ্য।
      </p>
    </Card>
  );
}
