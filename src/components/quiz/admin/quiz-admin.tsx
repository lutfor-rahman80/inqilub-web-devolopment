"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Download, Eye, EyeOff, LoaderCircle, Plus, RefreshCcw, Search, Trophy } from "lucide-react";
import {
  getQuizMobiles,
  setQuizRound2Enabled,
  saveQuizCutoffs,
} from "@/app/admin/(panel)/quiz/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { QuizResultViews } from "@/components/quiz/admin/result-views";
import { QuizResultDialog } from "@/components/quiz/admin/result-dialog";
import { QuizRound2Dialog } from "@/components/quiz/admin/round2-dialog";
import { bn, toAsciiDigits } from "@/lib/format";
import {
  groupQuizRows,
  normalizeRoll,
  quizTotal,
  sortMeritRows,
  splitMobiles,
  type QuizGender,
  type QuizRow,
  type QuizSettings,
} from "@/lib/quiz/admin";
import { printQuizResults } from "@/lib/quiz/print";

type Props = {
  year: number;
  initialRows: QuizRow[];
  initialSettings: QuizSettings;
};

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; row: QuizRow }
  | { kind: "round2" }
  | null;

type Toast = { message: string; tone: "success" | "error" } | null;

function QuizSettingsCard({
  year,
  settings,
  onSaved,
  onToggleRound2,
  notify,
}: {
  year: number;
  settings: QuizSettings;
  onSaved: (next: Pick<QuizSettings, "cutoffBoys" | "cutoffGirls">) => void;
  onToggleRound2: () => void;
  notify: (message: string, tone: "success" | "error") => void;
}) {
  const [boys, setBoys] = useState(String(settings.cutoffBoys));
  const [girls, setGirls] = useState(String(settings.cutoffGirls));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const boysValue = Number(toAsciiDigits(boys).trim());
    const girlsValue = Number(toAsciiDigits(girls).trim());

    if (!boys.trim() || !Number.isFinite(boysValue) || boysValue < 0) {
      setError("ছেলেদের কাট-অফ ০ বা তার বেশি একটি সঠিক নাম্বার দিন।");
      return;
    }
    if (!girls.trim() || !Number.isFinite(girlsValue) || girlsValue < 0) {
      setError("মেয়েদের কাট-অফ ০ বা তার বেশি একটি সঠিক নাম্বার দিন।");
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveQuizCutoffs({ year, boys: boysValue, girls: girlsValue });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSaved({ cutoffBoys: boysValue, cutoffGirls: girlsValue });
        notify("২য় রাউন্ডের কাট-অফ সংরক্ষণ হয়েছে।", "success");
      } catch {
        setError("কাট-অফ সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
      }
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">কুইজ সেটিংস - {bn(year)}ইং</h2>
          <p className="mt-2 text-sm text-muted">
            শুধু {bn(year)} সালের কাট-অফে উত্তীর্ণ শিক্ষার্থীদের ২য় রাউন্ডের নাম্বার রাখা যাবে।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={settings.round2Enabled ? "green" : "gray"}>
            {settings.round2Enabled ? "চালু" : "বন্ধ"}
          </Badge>
          <Button variant="outline" size="sm" onClick={onToggleRound2} disabled={pending}>
            {settings.round2Enabled ? "২য় রাউন্ড বন্ধ করুন" : "২য় রাউন্ড চালু করুন"}
          </Button>
        </div>
      </div>

      <form noValidate className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={save}>
        <Field id="quiz-cutoff-boys" label="ছেলেদের কাট-অফ">
          <Input
            id="quiz-cutoff-boys"
            inputMode="decimal"
            autoComplete="off"
            value={boys}
            disabled={pending}
            onChange={(event) => setBoys(event.target.value)}
          />
        </Field>
        <Field id="quiz-cutoff-girls" label="মেয়েদের কাট-অফ">
          <Input
            id="quiz-cutoff-girls"
            inputMode="decimal"
            autoComplete="off"
            value={girls}
            disabled={pending}
            onChange={(event) => setGirls(event.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full" aria-busy={pending}>
            {pending && <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {pending ? "সংরক্ষণ হচ্ছে…" : "কাট-অফ সংরক্ষণ করুন"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </Card>
  );
}

export function QuizAdmin({ year, initialRows, initialSettings }: Props) {
  const [rows, setRows] = useState<QuizRow[]>(initialRows);
  const [settings, setSettings] = useState<QuizSettings>(initialSettings);
  const [search, setSearch] = useState("");
  const [institution, setInstitution] = useState("");
  const [minMarks, setMinMarks] = useState("");
  const [gender, setGender] = useState<"all" | QuizGender>("all");
  const [showMarks, setShowMarks] = useState(true);
  const [showMobiles, setShowMobiles] = useState(false);
  const [mobiles, setMobiles] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pendingRound2, setPendingRound2] = useState<boolean | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [mobilePending, startMobileTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const institutions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.institution.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "bn"),
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const searchValue = toAsciiDigits(search).trim().toLowerCase();
    const minValue = minMarks.trim() ? Number(toAsciiDigits(minMarks).trim()) : null;
    const institutionValue = institution.trim().toLowerCase();

    return rows.filter((row) => {
      if (searchValue) {
        const rollValue = normalizeRoll(row.roll).toLowerCase();
        const nameValue = row.name.trim().toLowerCase();
        const institutionName = row.institution.trim().toLowerCase();
        const mobileMatch =
          showMobiles &&
          splitMobiles(mobiles[String(row.id)]).some((mobile) => mobile.toLowerCase().includes(searchValue));

        const matches =
          rollValue.includes(searchValue) ||
          nameValue.includes(searchValue) ||
          institutionName.includes(searchValue) ||
          mobileMatch;
        if (!matches) return false;
      }

      if (minValue !== null && Number.isFinite(minValue)) {
        const total = settings.round2Enabled ? quizTotal(row) : null;
        const mark = total ?? row.marks ?? 0;
        if (mark < minValue) return false;
      }

      if (institutionValue && row.institution.trim().toLowerCase() !== institutionValue) return false;
      if (gender !== "all" && row.gender !== gender) return false;
      return true;
    });
  }, [rows, search, minMarks, institution, gender, showMobiles, mobiles, settings.round2Enabled]);

  const groups = useMemo(() => groupQuizRows(filteredRows), [filteredRows]);
  const meritRows = useMemo(() => sortMeritRows(filteredRows), [filteredRows]);
  const filtersActive = Boolean(search.trim() || institution || minMarks.trim() || gender !== "all");

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
  }

  function resetFilters() {
    setSearch("");
    setInstitution("");
    setMinMarks("");
    setGender("all");
  }

  function toggleMobiles() {
    if (showMobiles) {
      setShowMobiles(false);
      setMobiles({});
      return;
    }

    startMobileTransition(async () => {
      try {
        const result = await getQuizMobiles(year);
        if (!result.ok) {
          notify(result.error, "error");
          return;
        }
        setMobiles(result.data);
        setShowMobiles(true);
      } catch {
        notify("মোবাইল নম্বর লোড করা যায়নি। আবার চেষ্টা করুন।", "error");
      }
    });
  }

  async function copyMobile(mobile: string) {
    try {
      await navigator.clipboard.writeText(mobile);
      notify(`${bn(mobile)} কপি হয়েছে।`, "success");
    } catch {
      notify("মোবাইল নম্বর কপি করা যায়নি।", "error");
    }
  }

  function handleResultSaved(saved: QuizRow, message: string, mobile: string) {
    setRows((previous) => {
      const exists = previous.some((row) => row.id === saved.id);
      if (!exists) return [...previous, saved];
      return previous.map((row) => (row.id === saved.id ? saved : row));
    });
    if (showMobiles && mobile) {
      setMobiles((previous) => ({ ...previous, [String(saved.id)]: mobile }));
    }
    setDialog(null);
    notify(message, "success");
  }

  function handleRound2Saved(result: { id: number; round2_marks: number | null; mobile: string | null }, mode: "save" | "next") {
    setRows((previous) =>
      previous.map((row) => (row.id === result.id ? { ...row, round2_marks: result.round2_marks } : row)),
    );
    if (showMobiles && result.mobile) {
      setMobiles((previous) => ({ ...previous, [String(result.id)]: result.mobile ?? "" }));
    }
    if (mode === "save") setDialog(null);
    notify("২য় রাউন্ডের নাম্বার সংরক্ষণ হয়েছে।", "success");
  }

  function exportFiltered() {
    if (filteredRows.length === 0) return;
    const opened = printQuizResults({
      year,
      rows: filteredRows,
      round2Enabled: settings.round2Enabled,
      showMarks,
      showMobiles,
      mobiles,
    });
    if (!opened) {
      notify("প্রিন্ট উইন্ডো খোলা যায়নি। পপ-আপ ব্লক বন্ধ করে আবার চেষ্টা করুন।", "error");
    }
  }

  return (
    <>
      <div className="space-y-5">
        <QuizSettingsCard
          key={`${year}-${settings.cutoffBoys}-${settings.cutoffGirls}`}
          year={year}
          settings={settings}
          onSaved={(next) => setSettings((previous) => ({ ...previous, ...next }))}
          onToggleRound2={() => setPendingRound2(!settings.round2Enabled)}
          notify={notify}
        />

        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">{bn(year)} সালের ফলাফল খুঁজুন</h2>
              <p className="text-sm text-muted">রোল, নাম, প্রতিষ্ঠান বা মোবাইল নম্বর দিয়ে ফিল্টার করুন।</p>
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="border border-line">
                <RefreshCcw className="size-4" aria-hidden="true" />
                ফিল্টার রিসেট
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="quiz-search" label="সার্চ" optionalLabel={null}>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="quiz-search"
                  type="search"
                  autoComplete="off"
                  className="ps-9"
                  placeholder="রোল, নাম বা প্রতিষ্ঠান"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </Field>
            <Field id="quiz-filter-institution" label="শিক্ষাপ্রতিষ্ঠান" optionalLabel={null}>
              <Select
                id="quiz-filter-institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
              >
                <option value="">সব প্রতিষ্ঠান</option>
                {institutions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </Field>
            <Field id="quiz-filter-marks" label="সর্বনিম্ন নাম্বার" optionalLabel={null}>
              <Input
                id="quiz-filter-marks"
                inputMode="decimal"
                autoComplete="off"
                placeholder="যেমন: ২৫"
                value={minMarks}
                onChange={(event) => setMinMarks(event.target.value)}
              />
            </Field>
            <Field id="quiz-filter-gender" label="লিঙ্গ" optionalLabel={null}>
              <Select
                id="quiz-filter-gender"
                value={gender}
                onChange={(event) => setGender(event.target.value as "all" | QuizGender)}
              >
                <option value="all">সবাই</option>
                <option value="ছেলে">ছেলে</option>
                <option value="মেয়ে">মেয়ে</option>
              </Select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMobiles}
              disabled={mobilePending}
              aria-pressed={showMobiles}
            >
              {mobilePending ? (
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : showMobiles ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              {mobilePending ? "লোড হচ্ছে…" : showMobiles ? "মোবাইল লুকান" : "মোবাইল দেখান"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMarks((visible) => !visible)}
              aria-pressed={showMarks}
            >
              {showMarks ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              {showMarks ? "নাম্বার লুকান" : "নাম্বার দেখান"}
            </Button>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {filtersActive
              ? `ফিল্টার করা ${bn(filteredRows.length)} জন · মোট ${bn(rows.length)} জন`
              : `মোট ${bn(rows.length)} জন শিক্ষার্থী`}
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredRows.length > 0 && (
              <Button variant="outline" onClick={exportFiltered}>
                <Download className="size-4" aria-hidden="true" />
                প্রিন্ট / PDF
              </Button>
            )}
            <Button onClick={() => setDialog({ kind: "add" })}>
              <Plus className="size-4" aria-hidden="true" />
              নতুন ফলাফল
            </Button>
            <Button
              variant="gold"
              disabled={!settings.round2Enabled}
              title={settings.round2Enabled ? undefined : "২য় রাউন্ড এখনো চালু হয়নি"}
              onClick={() => setDialog({ kind: "round2" })}
            >
              <Trophy className="size-4" aria-hidden="true" />
              ২য় রাউন্ড
            </Button>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <EmptyState title="কোনো ফলাফল পাওয়া যায়নি">
            {filtersActive ? "ফিল্টার বদলে আবার খুঁজুন অথবা সব ফিল্টার রিসেট করুন।" : "নতুন ফলাফল যোগ করে শুরু করুন।"}
          </EmptyState>
        ) : (
          <QuizResultViews
            round2Enabled={settings.round2Enabled}
            groups={groups}
            meritRows={meritRows}
            showMarks={showMarks}
            showMobiles={showMobiles}
            mobiles={mobiles}
            onEdit={(row) => setDialog({ kind: "edit", row })}
            onCopyMobile={copyMobile}
          />
        )}
      </div>

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <QuizResultDialog
          year={year}
          row={dialog?.kind === "edit" ? dialog.row : null}
          rows={rows}
          institutions={institutions}
          initialMobile={dialog?.kind === "edit" && showMobiles ? mobiles[String(dialog.row.id)] ?? "" : ""}
          onClose={() => setDialog(null)}
          onSaved={handleResultSaved}
        />
      )}

      {dialog?.kind === "round2" && (
        <QuizRound2Dialog
          year={year}
          rows={rows}
          settings={settings}
          onClose={() => setDialog(null)}
          onSaved={handleRound2Saved}
        />
      )}

      {pendingRound2 !== null && (
        <ConfirmDialog
          title={pendingRound2 ? "২য় রাউন্ড চালু করবেন?" : "২য় রাউন্ড বন্ধ করবেন?"}
          confirmLabel={pendingRound2 ? "চালু করুন" : "বন্ধ করুন"}
          tone={pendingRound2 ? "primary" : "danger"}
          onCancel={() => setPendingRound2(null)}
          onConfirm={async () => {
            const result = await setQuizRound2Enabled(year, pendingRound2);
            if (!result.ok) return result.error;
            setSettings((previous) => ({ ...previous, round2Enabled: pendingRound2 }));
            if (!pendingRound2) setDialog(null);
            setPendingRound2(null);
            notify(pendingRound2 ? "২য় রাউন্ড চালু হয়েছে।" : "২য় রাউন্ড বন্ধ হয়েছে।", "success");
            return null;
          }}
        >
          <p>
            {pendingRound2
              ? "চালু করলে ২য় রাউন্ডের নাম্বার এন্ট্রি করা যাবে এবং পাবলিক পেজে মেধা তালিকা দেখানো হবে।"
              : "বন্ধ করলে ২য় রাউন্ডের নতুন এন্ট্রি বন্ধ হবে এবং পাবলিক পেজে গ্রুপভিত্তিক ফলাফল দেখানো হবে।"}
          </p>
        </ConfirmDialog>
      )}

      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md" aria-live="polite">
        {toast && (
          <div className="pointer-events-auto">
            <Alert tone={toast.tone}>{toast.message}</Alert>
          </div>
        )}
      </div>
    </>
  );
}
