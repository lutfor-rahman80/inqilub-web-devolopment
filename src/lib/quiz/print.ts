import { bn } from "@/lib/format";
import { groupQuizRows, quizTotal, sortMeritRows, splitMobiles, type QuizRow } from "./admin";

export type QuizPrintOptions = {
  year: number;
  rows: readonly QuizRow[];
  round2Enabled: boolean;
  showMarks: boolean;
  showMobiles: boolean;
  mobiles: Record<string, string>;
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const cell = "padding:7px 9px;border:1px solid #cbd5e1;";
const head = `${cell}background:#f1f5f9;font-weight:700;text-align:center;`;

function marksText(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : bn(value);
}

function genderCell(gender: string): string {
  const girl = gender === "মেয়ে";
  return `<td style="${cell}text-align:center;"><span style="display:inline-block;padding:1px 8px;border-radius:999px;background:${
    girl ? "#fdf2f8" : "#eff6ff"
  };color:${girl ? "#be185d" : "#1d4ed8"};font-size:11px;font-weight:700;">${esc(gender)}</span></td>`;
}

function mobileCell(row: QuizRow, options: QuizPrintOptions): string {
  const mobiles = splitMobiles(options.mobiles[String(row.id)]);
  const text = mobiles.length ? mobiles.map((mobile) => esc(bn(mobile))).join(", ") : "-";
  return `<td style="${cell}text-align:center;">${text}</td>`;
}

function meritTable(rows: readonly QuizRow[], options: QuizPrintOptions): string {
  const { showMarks, showMobiles } = options;
  const marksHeads = showMarks
    ? `<th style="${head}width:76px;">১ম রাউন্ড</th>
       <th style="${head}width:76px;">২য় রাউন্ড</th>
       <th style="${head}width:76px;background:#fef3c7;color:#92400e;">টোটাল</th>`
    : "";

  const body = sortMeritRows(rows)
    .map((row, index) => {
      const marksCells = showMarks
        ? `<td style="${cell}text-align:center;font-weight:600;">${marksText(row.marks)}</td>
           <td style="${cell}text-align:center;color:#1d4ed8;font-weight:700;">${marksText(row.round2_marks)}</td>
           <td style="${cell}text-align:center;background:#fffbeb;color:#92400e;font-weight:800;">${marksText(
             quizTotal(row),
           )}</td>`
        : "";

      return `<tr style="background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="${cell}text-align:center;">${bn(index + 1)}</td>
        <td style="${cell}text-align:center;font-weight:600;">${esc(bn(row.roll))}</td>
        <td style="${cell}font-weight:600;">${esc(row.name)}</td>
        <td style="${cell}font-size:11px;">${esc(row.institution || "-")}</td>
        ${marksCells}
        ${genderCell(row.gender)}
        ${showMobiles ? mobileCell(row, options) : ""}
      </tr>`;
    })
    .join("");

  return `<table>
    <thead><tr>
      <th style="${head}width:44px;">নং</th>
      <th style="${head}width:64px;">রোল</th>
      <th style="${head}">নাম</th>
      <th style="${head}width:190px;">শিক্ষাপ্রতিষ্ঠান</th>
      ${marksHeads}
      <th style="${head}width:58px;">লিঙ্গ</th>
      ${showMobiles ? `<th style="${head}width:140px;">মোবাইল নম্বর</th>` : ""}
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function groupedTables(rows: readonly QuizRow[], options: QuizPrintOptions): string {
  const { showMarks, showMobiles } = options;

  return groupQuizRows(rows)
    .map((group) => {
      const body = group.rows
        .map((row, index) => {
          const marksCell = showMarks
            ? `<td style="${cell}text-align:center;font-weight:700;">${marksText(row.marks)}</td>`
            : "";

          return `<tr style="background:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
            <td style="${cell}text-align:center;">${bn(index + 1)}</td>
            <td style="${cell}text-align:center;font-weight:600;">${esc(bn(row.roll))}</td>
            <td style="${cell}font-weight:600;">${esc(row.name)}</td>
            ${marksCell}
            ${genderCell(row.gender)}
            ${showMobiles ? mobileCell(row, options) : ""}
          </tr>`;
        })
        .join("");

      return `<section style="margin-bottom:18px;">
        <h2 style="margin:0 0 6px;padding:7px 12px;border:1px solid #a7f3d0;border-bottom:none;border-radius:8px 8px 0 0;background:#ecfdf5;color:#064e3b;font-size:15px;">
          ${esc(group.institution)}
          <span style="font-size:11px;font-weight:600;color:#047857;"> &middot; ${bn(group.rows.length)} জন</span>
        </h2>
        <table>
          <thead><tr>
            <th style="${head}width:44px;">নং</th>
            <th style="${head}width:64px;">রোল</th>
            <th style="${head}">নাম</th>
            ${showMarks ? `<th style="${head}width:100px;">প্রাপ্ত নাম্বার</th>` : ""}
            <th style="${head}width:58px;">লিঙ্গ</th>
            ${showMobiles ? `<th style="${head}width:150px;">মোবাইল নম্বর</th>` : ""}
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>`;
    })
    .join("");
}

/** Printable HTML for the filtered result list / merit sheet. */
export function buildQuizPrintHtml(options: QuizPrintOptions): string {
  const { rows, round2Enabled, year } = options;
  const boys = rows.filter((row) => row.gender !== "মেয়ে").length;
  const girls = rows.length - boys;
  const badge = round2Enabled ? "মেধা তালিকা (২য় রাউন্ড)" : "ফিল্টার করা ফলাফল তালিকা";
  const count =
    rows.length > 0
      ? `মোট ${bn(rows.length)} জন${round2Enabled ? ` &middot; ছেলে ${bn(boys)} &middot; মেয়ে ${bn(girls)}` : ""}`
      : "";

  const body = round2Enabled ? meritTable(rows, options) : groupedTables(rows, options);

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(`সীরাত কুইজ ${bn(year)} — ${badge}`)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; font-family: "Hind Siliguri", "Noto Sans Bengali", "Noto Sans", sans-serif; color: #0f172a; background: #fff; }
  h1 { margin: 0; font-size: 24px; color: #064e3b; text-align: center; }
  .subtitle { margin: 4px 0 0; font-size: 17px; font-weight: 700; color: #047857; text-align: center; }
  .badge { display: block; width: fit-content; margin: 8px auto 0; padding: 2px 14px; border: 1px solid #fde68a; border-radius: 999px; background: #fef3c7; color: #b45309; font-size: 13px; font-weight: 700; }
  .count { margin: 6px 0 0; color: #475569; font-size: 12px; text-align: center; }
  header { border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; text-align: center; }
  .toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .toolbar button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 10px; background: #047857; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  @media print { .toolbar { display: none; } body { padding: 10mm 10mm 12mm; } }
</style>
</head>
<body>
  <div class="toolbar"><button type="button" onclick="window.print()">প্রিন্ট / PDF</button></div>
  <header>
    <h1>ইনকিলাব যুব সংগঠন</h1>
    <p class="subtitle">সীরাত কুইজ - ${bn(year)}ইং</p>
    <span class="badge">${esc(badge)}</span>
    ${count ? `<p class="count">${count}</p>` : ""}
  </header>
  ${body}
  <footer>ইনকিলাব যুব সংগঠন কর্তৃক প্রকাশিত ফলাফল তালিকা | সর্বস্বত্ব সংরক্ষিত</footer>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    });
  </script>
</body>
</html>`;
}

/** Opens the printable list in a new window and starts the print dialog. */
export function printQuizResults(options: QuizPrintOptions): boolean {
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(buildQuizPrintHtml(options));
  win.document.close();
  return true;
}
