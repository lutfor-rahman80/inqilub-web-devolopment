"use client";

import { Copy, Pencil, Phone } from "lucide-react";
import { bn } from "@/lib/format";
import { quizTotal, splitMobiles, type QuizGroup, type QuizRow } from "@/lib/quiz/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Props = {
  round2Enabled: boolean;
  groups: readonly QuizGroup[];
  meritRows: readonly QuizRow[];
  showMarks: boolean;
  showMobiles: boolean;
  mobiles: Record<string, string>;
  onEdit: (row: QuizRow) => void;
  onCopyMobile: (mobile: string) => void;
};

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-lg text-brand-800 transition-colors hover:bg-brand-50 disabled:opacity-50";

function genderTone(gender: string) {
  return gender === "মেয়ে" ? "gold" : "blue";
}

function MobileNumbers({
  value,
  onCopy,
  compact = false,
}: {
  value: string | undefined;
  onCopy: (mobile: string) => void;
  compact?: boolean;
}) {
  const mobiles = splitMobiles(value);
  if (mobiles.length === 0) return <span className="text-muted">—</span>;

  return (
    <span className="flex flex-wrap gap-1.5">
      {mobiles.map((mobile) => (
        <span
          key={mobile}
          className={`inline-flex items-center overflow-hidden rounded-lg border border-line bg-white ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          <a
            href={`tel:${mobile}`}
            className="inline-flex min-h-8 items-center gap-1 px-2 font-medium text-brand-800 hover:bg-brand-50"
            title={`${bn(mobile)} — কল করুন`}
          >
            <Phone className="size-3.5" aria-hidden="true" />
            <span dir="ltr">{bn(mobile)}</span>
          </a>
          <button
            type="button"
            onClick={() => onCopy(mobile)}
            className="inline-flex min-h-8 items-center px-2 text-muted hover:bg-brand-50 hover:text-brand-800"
            aria-label={`${bn(mobile)} কপি করুন`}
            title="নম্বর কপি করুন"
          >
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </span>
  );
}

function Marks({ value, tone = "green" }: { value: number | null | undefined; tone?: "green" | "blue" | "gold" }) {
  if (value === null || value === undefined) return <span className="font-bold text-muted">—</span>;
  return <Badge tone={tone}>{bn(value)}</Badge>;
}

function EditButton({ row, onEdit }: { row: QuizRow; onEdit: (row: QuizRow) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(row)}
      className={iconButton}
      aria-label={`${row.name} — তথ্য সম্পাদনা করুন`}
      title="তথ্য সম্পাদনা করুন"
    >
      <Pencil className="size-4" aria-hidden="true" />
    </button>
  );
}

function MeritTable({ rows, showMarks, showMobiles, mobiles, onEdit, onCopyMobile }: Omit<Props, "groups" | "meritRows" | "round2Enabled"> & { rows: readonly QuizRow[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-stone-50 text-xs text-muted">
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">নং</th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">রোল</th>
            <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">নাম</th>
            <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">শিক্ষাপ্রতিষ্ঠান</th>
            {showMarks && (
              <>
                <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">১ম রাউন্ড</th>
                <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">২য় রাউন্ড</th>
                <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">টোটাল</th>
              </>
            )}
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">লিঙ্গ</th>
            {showMobiles && <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">মোবাইল নম্বর</th>}
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-brand-50/40">
              <td className="px-3 py-2 text-center text-muted">{bn(index + 1)}</td>
              <td className="px-3 py-2 text-center font-semibold" dir="ltr">{bn(row.roll)}</td>
              <td className="px-3 py-2 font-semibold">{row.name}</td>
              <td className="px-3 py-2 text-muted">{row.institution || "—"}</td>
              {showMarks && (
                <>
                  <td className="px-3 py-2 text-center"><Marks value={row.marks} /></td>
                  <td className="px-3 py-2 text-center"><Marks value={row.round2_marks} tone="blue" /></td>
                  <td className="px-3 py-2 text-center"><Marks value={quizTotal(row)} tone="gold" /></td>
                </>
              )}
              <td className="px-3 py-2 text-center"><Badge tone={genderTone(row.gender)}>{row.gender}</Badge></td>
              {showMobiles && (
                <td className="px-3 py-2">
                  <MobileNumbers value={mobiles[String(row.id)]} onCopy={onCopyMobile} compact />
                </td>
              )}
              <td className="px-3 py-2 text-center"><EditButton row={row} onEdit={onEdit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MeritCards({ rows, showMarks, showMobiles, mobiles, onEdit, onCopyMobile }: Omit<Props, "groups" | "meritRows" | "round2Enabled"> & { rows: readonly QuizRow[] }) {
  return (
    <ul className="divide-y divide-line md:hidden">
      {rows.map((row, index) => (
        <li key={row.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-muted">#{bn(index + 1)} · রোল <span dir="ltr">{bn(row.roll)}</span></p>
              <p className="font-semibold break-words">{row.name}</p>
              <p className="text-sm break-words text-muted">{row.institution || "—"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge tone={genderTone(row.gender)}>{row.gender}</Badge>
              <EditButton row={row} onEdit={onEdit} />
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {showMarks && (
              <>
                <div><dt className="text-muted">১ম রাউন্ড</dt><dd className="mt-0.5"><Marks value={row.marks} /></dd></div>
                <div><dt className="text-muted">২য় রাউন্ড</dt><dd className="mt-0.5"><Marks value={row.round2_marks} tone="blue" /></dd></div>
                <div><dt className="text-muted">টোটাল</dt><dd className="mt-0.5"><Marks value={quizTotal(row)} tone="gold" /></dd></div>
              </>
            )}
            {showMobiles && (
              <div className="col-span-2">
                <dt className="text-muted">মোবাইল নম্বর</dt>
                <dd className="mt-0.5"><MobileNumbers value={mobiles[String(row.id)]} onCopy={onCopyMobile} /></dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function GroupTable({ group, showMarks, showMobiles, mobiles, onEdit, onCopyMobile }: Omit<Props, "groups" | "meritRows" | "round2Enabled" | "onEdit" | "onCopyMobile"> & { group: QuizGroup; onEdit: Props["onEdit"]; onCopyMobile: Props["onCopyMobile"] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-stone-50 text-xs text-muted">
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">নং</th>
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">রোল</th>
            <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">নাম</th>
            {showMarks && <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">প্রাপ্ত নাম্বার</th>}
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">লিঙ্গ</th>
            {showMobiles && <th scope="col" className="border-b border-line px-3 py-2.5 font-semibold">মোবাইল নম্বর</th>}
            <th scope="col" className="border-b border-line px-3 py-2.5 text-center font-semibold">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row, index) => (
            <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-brand-50/40">
              <td className="px-3 py-2 text-center text-muted">{bn(index + 1)}</td>
              <td className="px-3 py-2 text-center font-semibold" dir="ltr">{bn(row.roll)}</td>
              <td className="px-3 py-2 font-semibold">{row.name}</td>
              {showMarks && <td className="px-3 py-2 text-center"><Marks value={row.marks} /></td>}
              <td className="px-3 py-2 text-center"><Badge tone={genderTone(row.gender)}>{row.gender}</Badge></td>
              {showMobiles && (
                <td className="px-3 py-2">
                  <MobileNumbers value={mobiles[String(row.id)]} onCopy={onCopyMobile} compact />
                </td>
              )}
              <td className="px-3 py-2 text-center"><EditButton row={row} onEdit={onEdit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupCards({ group, showMarks, showMobiles, mobiles, onEdit, onCopyMobile }: Omit<Props, "groups" | "meritRows" | "round2Enabled" | "onEdit" | "onCopyMobile"> & { group: QuizGroup; onEdit: Props["onEdit"]; onCopyMobile: Props["onCopyMobile"] }) {
  return (
    <ul className="divide-y divide-line md:hidden">
      {group.rows.map((row, index) => (
        <li key={row.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-muted">#{bn(index + 1)} · রোল <span dir="ltr">{bn(row.roll)}</span></p>
              <p className="font-semibold break-words">{row.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Badge tone={genderTone(row.gender)}>{row.gender}</Badge>
              <EditButton row={row} onEdit={onEdit} />
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            {showMarks && (
              <div><dt className="text-muted">প্রাপ্ত নাম্বার</dt><dd className="mt-0.5"><Marks value={row.marks} /></dd></div>
            )}
            {showMobiles && (
              <div className="col-span-2">
                <dt className="text-muted">মোবাইল নম্বর</dt>
                <dd className="mt-0.5"><MobileNumbers value={mobiles[String(row.id)]} onCopy={onCopyMobile} /></dd>
              </div>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** Merit sheet (round 2 on) or institution-grouped result tables. */
export function QuizResultViews({ round2Enabled, groups, meritRows, ...shared }: Props) {
  if (round2Enabled) {
    const boys = meritRows.filter((row) => row.gender !== "মেয়ে").length;
    const girls = meritRows.length - boys;

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-stone-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold">মেধা তালিকা</h2>
            <p className="text-sm text-muted">১ম + ২য় রাউন্ডের টোটাল নম্বর অনুযায়ী সাজানো · মোট {bn(meritRows.length)} জন</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">ছেলে {bn(boys)}</Badge>
            <Badge tone="gold">মেয়ে {bn(girls)}</Badge>
          </div>
        </div>
        <MeritTable rows={meritRows} {...shared} />
        <MeritCards rows={meritRows} {...shared} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <Card key={group.institution} className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line bg-stone-50 px-4 py-3">
            <h2 className="text-lg font-bold break-words">{group.institution}</h2>
            <span className="text-sm text-muted">মোট {bn(group.rows.length)} জন শিক্ষার্থী</span>
          </div>
          <GroupTable group={group} {...shared} />
          <GroupCards group={group} {...shared} />
        </Card>
      ))}
    </div>
  );
}
