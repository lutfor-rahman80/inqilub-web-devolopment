import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { QuizAdmin } from "@/components/quiz/admin/quiz-admin";
import { QuizYearPicker } from "@/components/quiz/admin/year-picker";
import { bn } from "@/lib/format";
import {
  parseQuizSettings,
  parseQuizYear,
  type QuizRow,
  type QuizSettingRow,
} from "@/lib/quiz/admin";

export const metadata: Metadata = { title: "সীরাত কুইজ" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function QuizAdminPage({ searchParams }: Props) {
  await requirePagePermission("quiz.manage", "content.manage");

  const sp = await searchParams;
  const supabase = await createClient();
  const yearsResult = await supabase
    .from("quiz_years")
    .select("year")
    .order("year", { ascending: false });

  const years = (yearsResult.data ?? [])
    .map((row) => Number(row.year))
    .filter((value) => Number.isInteger(value) && value >= 2000 && value <= 2100);
  const requestedYear = parseQuizYear(sp.year);
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : years[0] ?? 2026;

  const [settingsResult, resultsResult] = await Promise.all([
    supabase.from("quiz_settings").select("key, value").eq("year", year),
    supabase
      .from("quiz_results")
      .select("id, year, roll, name, institution, gender, marks, round2_marks, round2_updated_at, created_at")
      .eq("year", year)
      .order("id"),
  ]);

  const settings = parseQuizSettings((settingsResult.data ?? []) as QuizSettingRow[]);
  const rows = (resultsResult.data ?? []) as QuizRow[];
  const loadError = yearsResult.error ?? resultsResult.error ?? settingsResult.error;

  return (
    <>
      <AdminPageHeader
        title={`সীরাত কুইজ — ${bn(year)}`}
        description={`${bn(year)} সালের ফলাফল এন্ট্রি, ২য় রাউন্ডের কাট-অফ, নম্বর ও মেধা তালিকা পরিচালনা করুন।`}
      />
      <QuizYearPicker years={years} year={year} />
      {loadError && (
        <div className="mb-4">
          <Alert>কুইজের তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}
      <QuizAdmin key={year} year={year} initialRows={rows} initialSettings={settings} />
    </>
  );
}
