"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import QuizSlider from "./quiz-slider";

/**
 * সীরাত কুইজ — শিক্ষার্থীর ফলাফল পেজ (আগের static student.html এর React রূপ)।
 *
 * ডেটা আসে শুধু anon-অনুমোদিত RPC থেকে (get_quiz_years,
 * get_quiz_institutions, get_institution_students, get_student_result) —
 * কোনো সরাসরি টেবিল কোয়েরি নয়। নম্বর সার্ভার শুধু ২য় রাউন্ডে নির্বাচিত
 * শিক্ষার্থীর জন্যই পাঠায় (marks = null মানে নম্বর দেখানো যাবে না)।
 * round2_marks ফিল্ডটি ঐচ্ছিক: RPC তা পাঠালে (আলাদা মাইগ্রেশনের পর)
 * ১ম + ২য় রাউন্ড + মোট নম্বর দেখায়, না পাঠালে আগের মতোই শুধু প্রাপ্ত নম্বর।
 */

type InstitutionStudent = { roll: string; name: string; institution: string; year: number };

type StudentResultRow = {
  roll: string;
  name: string;
  institution: string;
  gender: string;
  marks: number | null;
  selected: boolean | null;
  year: number;
  round2_marks?: number | null;
};

type View =
  | { kind: "none" }
  | { kind: "message"; type: "error" | "not-found"; content: React.ReactNode }
  | { kind: "list"; institutionName: string; students: InstitutionStudent[] }
  | { kind: "results"; students: StudentResultRow[] };

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
function toBnDigits(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** নম্বর ফরম্যাট: দশমিকের ভাসমান ভুল ঝেড়ে বাংলা অঙ্কে। */
function fmtMarks(v: number): string {
  return toBnDigits(String(Math.round(v * 100) / 100));
}

const LOGO_SRC = "/quiz/assets/logo.jpg";
const HELPLINES = [
  { label: "হেল্পলাইন ০১", display: "০১৯৪৩ ৪২১২৩২", copy: "০১৯৪৩৪২১২৩২", tel: "tel:+8801943421232" },
  { label: "হেল্পলাইন ০২", display: "০১৬১৭ ০৫২৪১০", copy: "০১৬১৭০৫২৪১০", tel: "tel:+8801617052410" },
];

const NOT_FOUND_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);

const PHONE_ICON_PATH =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";

/* ------------------------------------------------------------------ */
/* ফলাফল প্রিন্ট: static পেজের মতোই শুধু ওই কার্ডটাই ছাপা হয়           */
/* ------------------------------------------------------------------ */
const PRINT_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT"]);
let printOriginalTitle: string | null = null;

function cleanupPrint() {
  document.querySelectorAll(".print-hide").forEach((el) => el.classList.remove("print-hide"));
  document.querySelectorAll(".result-card.print-target").forEach((el) => el.classList.remove("print-target"));
  if (printOriginalTitle !== null) {
    document.title = printOriginalTitle;
    printOriginalTitle = null;
  }
}

function printResultCard(card: HTMLElement) {
  cleanupPrint();
  card.classList.add("print-target");

  let node: HTMLElement | null = card;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    Array.from(parent.children).forEach((sib) => {
      if (sib !== node && !PRINT_SKIP_TAGS.has(sib.tagName)) sib.classList.add("print-hide");
    });
    node = parent;
  }

  const dateEl = card.querySelector(".print-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
  }

  printOriginalTitle = document.title;
  document.title = "সীরাত কুইজ - ফলাফল";

  window.addEventListener("afterprint", cleanupPrint, { once: true });
  window.print();
}

/* ------------------------------------------------------------------ */
/* একক শিক্ষার্থীর রেজাল্ট কার্ড + ২য় রাউন্ড ব্যানার                     */
/* ------------------------------------------------------------------ */
function StudentResultCard({ student }: { student: StudentResultRow }) {
  const isSelected = student.selected === true;
  const selectionUnknown = student.selected === null || student.selected === undefined;
  const yearBn = toBnDigits(student.year);
  const hasRound2 = isSelected && student.marks !== null && student.round2_marks !== null && student.round2_marks !== undefined;

  return (
    <>
      {isSelected ? (
        <div className="round2-announcement selected" role="alert">
          <div className="round2-selected-wrapper">
            <svg className="round2-selected-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
            </svg>
            <p className="round2-selected-text">
              অভিনন্দন! আপনি সীরাত কুইজের ২য় রাউন্ডে জায়গা করে নিয়েছেন। বিস্তারিত আপনাকে মেসেজের (SMS) মাধ্যমে জানানো হবে। তাই আপনার মেসেজ ইনবক্সে নিয়মিত খেয়াল রাখুন, যেন গুরুত্বপূর্ণ কোনো তথ্য মিস না হয়।
            </p>
          </div>
        </div>
      ) : selectionUnknown ? (
        <div className="round2-announcement" role="status">
          <p className="not-selected-p2" style={{ margin: 0 }}>
            ২য় রাউন্ডের নির্বাচনী ফলাফল এখনো প্রকাশিত হয়নি।
          </p>
        </div>
      ) : (
        <div className="round2-announcement not-selected" role="alert">
          <div className="not-selected-header">
            <svg className="inspiration-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
            <h3 className="not-selected-title">আপনার অংশগ্রহণই আমাদের অনুপ্রেরণা!</h3>
          </div>
          <p className="not-selected-p1"></p>
          <p className="not-selected-p2">
            ইনশাআল্লাহ, সামনে আরও নতুন সুযোগ আসবে। নবীজি ﷺ-এর আদর্শ জানুন, শিখুন এবং জীবনে ধারণ করার চেষ্টা করুন। আল্লাহ আপনার জ্ঞানচর্চায় বরকত দান করুন। পরবর্তী আয়োজনে আবারও অংশগ্রহণ করবেন। আপনার জন্য রইল আন্তরিক শুভকামনা!
          </p>
        </div>
      )}

      <div className="result-card">
        {isSelected && (
          <div className="print-letterhead" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="print-logo" alt="" src={LOGO_SRC} />
            <div>
              <div className="print-org">ইনকিলাব যুব সংগঠন</div>
              <div className="print-event">সীরাত কুইজ - {yearBn}ইং</div>
            </div>
          </div>
        )}
        <div className={`result-header${isSelected ? " has-print-btn" : ""}`}>
          {isSelected && (
            <button
              type="button"
              className="btn-print-result"
              title="ফলাফল প্রিন্ট করুন"
              aria-label="ফলাফল প্রিন্ট করুন"
              onClick={(e) => {
                const card = e.currentTarget.closest(".result-card");
                if (card) printResultCard(card as HTMLElement);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
            </button>
          )}
          <h2>{student.institution}</h2>
          <p>সীরাত কুইজ - {yearBn}ইং প্রতিযোগিতার ফলাফল</p>
        </div>
        <div className="result-body">
          <div className="result-row">
            <span className="result-label">রোল নাম্বার</span>
            <span className="result-value">{toBnDigits(student.roll)}</span>
          </div>
          <div className="result-row">
            <span className="result-label">শিক্ষার্থীর নাম</span>
            <span className="result-value">{student.name}</span>
          </div>
          {isSelected &&
            student.marks !== null &&
            (hasRound2 ? (
              <>
                <div className="result-row">
                  <span className="result-label">১ম রাউন্ডের নম্বর</span>
                  <span className="result-value">
                    <span className="marks-badge">{fmtMarks(student.marks)}</span>
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">২য় রাউন্ডের নম্বর</span>
                  <span className="result-value">
                    <span className="marks-badge">{fmtMarks(student.round2_marks as number)}</span>
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-label">মোট নম্বর</span>
                  <span className="result-value">
                    <span className="marks-badge">{fmtMarks(student.marks + (student.round2_marks as number))}</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="result-row">
                <span className="result-label">প্রাপ্ত নাম্বার</span>
                <span className="result-value">
                  <span className="marks-badge">{fmtMarks(student.marks)}</span>
                </span>
              </div>
            ))}
          <div className="result-row">
            <span className="result-label">শিক্ষাপ্রতিষ্ঠান</span>
            <span className="result-value">{student.institution}</span>
          </div>
          {!selectionUnknown && (
            <div className="result-row result-status-row">
              <span className="result-label">ফলাফল</span>
              <span className="result-value">
                <span className={`result-status ${isSelected ? "pass" : "fail"}`}>{isSelected ? "উত্তীর্ণ" : "অনুত্তীর্ণ"}</span>
              </span>
            </div>
          )}
        </div>
        {isSelected && (
          <div className="print-footer" aria-hidden="true">
            প্রিন্টের তারিখ: <span className="print-date"></span>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* মূল পেজ                                                              */
/* ------------------------------------------------------------------ */
export default function QuizClient() {
  const supabase = useMemo(() => createClient(), []);

  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | "">("");
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [institution, setInstitution] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [roll, setRoll] = useState("");
  const [rollHot, setRollHot] = useState(false);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<View>({ kind: "none" });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const yearRef = useRef<HTMLSelectElement>(null);
  const institutionRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLInputElement>(null);
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const yearValueRef = useRef<number | "">("");
  yearValueRef.current = year;

  /* সালের তালিকা */
  useEffect(() => {
    let alive = true;
    supabase.rpc("get_quiz_years").then(({ data, error }) => {
      if (alive && !error && data) setYears(data.map((d) => d.year));
    });
    return () => {
      alive = false;
    };
  }, [supabase]);

  /* কম্বোবক্সের বাইরে ক্লিক করলে বন্ধ */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setComboOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /* ফলাফল এলে সেখানে স্ক্রল (static পেজের মতো) */
  useEffect(() => {
    if (view.kind === "list" || view.kind === "results") {
      resultAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  const handleYearChange = async (value: string) => {
    const y = value === "" ? "" : Number(value);
    setYear(y);
    setInstitution("");
    setInstitutions([]);
    setComboOpen(false);
    if (y === "") return;
    const { data, error } = await supabase.rpc("get_quiz_institutions", { p_year: y });
    if (yearValueRef.current !== y) return; // এর মধ্যে সাল বদলে গেছে
    if (!error && data) setInstitutions(data.map((d) => d.institution));
  };

  const filteredInstitutions = useMemo(() => {
    const f = institution.trim().toLowerCase();
    return institutions.filter((inst) => !f || inst.toLowerCase().includes(f));
  }, [institutions, institution]);

  const showMessage = (type: "error" | "not-found", content: React.ReactNode) =>
    setView({ kind: "message", type, content });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setComboOpen(false);
    setView({ kind: "none" });

    if (year === "") {
      showMessage("error", "অনুগ্রহ করে প্রথমে সাল সিলেক্ট করুন।");
      yearRef.current?.focus();
      return;
    }
    const institutionRaw = institution.trim();
    if (!institutionRaw) {
      showMessage("error", "অনুগ্রহ করে শিক্ষাপ্রতিষ্ঠানের নাম লিখুন বা ড্রপডাউন থেকে বাছাই করুন।");
      institutionRef.current?.focus();
      institutionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const rollRaw = roll.trim();

    setSearching(true);
    try {
      if (!rollRaw) {
        /* শুধু শিক্ষাপ্রতিষ্ঠান: ওই প্রতিষ্ঠানের সব শিক্ষার্থীর তালিকা */
        const { data, error } = await supabase.rpc("get_institution_students", {
          p_year: year,
          p_institution: institutionRaw,
        });
        if (error) throw error;
        // লাইভ RPC বর্তমানে p_institution ফিল্টার প্রয়োগ করে না (সব প্রতিষ্ঠানের
        // শিক্ষার্থী ফেরত দেয়) — তাই static পেজের আচরণ অনুযায়ী ব্রাউজারেই
        // নির্বাচিত প্রতিষ্ঠান দিয়ে ফিল্টার করা হয় (get_student_result-এর
        // "verify in frontend" প্যাটার্নের মতো)।
        const students = ((data ?? []) as InstitutionStudent[]).filter((s) =>
          (s.institution ?? "").toLowerCase().includes(institutionRaw.toLowerCase()),
        );
        if (students.length === 0) {
          showMessage(
            "not-found",
            <>
              {NOT_FOUND_ICON}
              <strong>কোনো শিক্ষার্থী পাওয়া যায়নি</strong>
              <br />
              &quot;{institutionRaw}&quot; নামের কোনো শিক্ষাপ্রতিষ্ঠানের ফলাফল পাওয়া যায়নি। ড্রপডাউন থেকে সঠিক নাম বেছে নিন।
            </>,
          );
        } else {
          setView({ kind: "list", institutionName: students[0].institution || institutionRaw, students });
        }
        return;
      }

      /* রোল + শিক্ষাপ্রতিষ্ঠান: সরাসরি ফলাফল। সার্ভার প্রতিষ্ঠান যাচাই করে
         না (মাইগ্রেশনের নোট) — এখানে ফ্রন্টএন্ডে মিলিয়ে দেখা হয়। */
      const { data, error } = await supabase.rpc("get_student_result", {
        p_year: year,
        p_roll: rollRaw,
        p_institution: institutionRaw,
      });
      if (error) throw error;
      const rows = (data ?? []) as unknown as StudentResultRow[];
      const needle = institutionRaw.toLowerCase();
      const matched = rows.filter((r) => (r.institution ?? "").trim().toLowerCase().includes(needle));

      if (matched.length === 0) {
        showMessage(
          "not-found",
          <>
            {NOT_FOUND_ICON}
            <strong>কোনো ফলাফল পাওয়া যায়নি</strong>
            <br />
            &quot;{institutionRaw}&quot; প্রতিষ্ঠানে &quot;{rollRaw}&quot; রোল নাম্বারের কোনো শিক্ষার্থী মেলেনি। সঠিক রোল নাম্বার দিয়ে আবার চেষ্টা করুন।
          </>,
        );
      } else {
        setView({ kind: "results", students: matched });
      }
    } catch (err) {
      console.error("সার্চ ত্রুটি:", err);
      showMessage("error", "সার্ভারের সাথে যোগাযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setSearching(false);
    }
  };

  const pickRoll = (r: string) => {
    setRoll(r);
    const input = rollRef.current;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setRollHot(true);
      setTimeout(() => setRollHot(false), 1500);
    }
  };

  const copyHelpline = (num: string, idx: number) => {
    navigator.clipboard
      .writeText(num)
      .then(() => {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
      })
      .catch(() => {
        alert("নাম্বার কপি হয়েছে: " + num);
      });
  };

  const badgeYear = year === "" ? 2026 : year;

  return (
    <div className="quiz-page">
      <noscript>
        <div
          style={{
            padding: 16,
            margin: 16,
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 8,
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          ফলাফল দেখতে আপনার ব্রাউজারে জাভাস্ক্রিপ্ট চালু করুন।
        </div>
      </noscript>

      {/* হেডার */}
      <header className="site-header" id="siteHeader">
        <div className="container container--tight header-bar">
          <div className="header-logo-area">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="ইনকিলাব যুব সংগঠন লোগো" className="site-logo" width="70" height="70" />
          </div>
          <div className="header-brand">
            <h1 className="org-title">ইনকিলাব যুব সংগঠন</h1>
            <span className="event-badge">সীরাত কুইজ - {toBnDigits(badgeYear)}ইং</span>
          </div>
          {/* হেডার হেল্পলাইন (সরাসরি ডায়ালযোগ্য) */}
          <div className="header-helpline-area" aria-label="জরুরি হেল্পলাইন">
            <div className="header-helpline-head">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={PHONE_ICON_PATH}></path>
              </svg>
              <span>হেল্পলাইন</span>
            </div>
            <div className="header-helpline-numbers">
              <a href="tel:+8801943421232" className="header-helpline-link" title="কল করতে ট্যাপ করুন">
                ০১৯৪৩ ৪২১২৩২
              </a>
              <a href="tel:+8801617052410" className="header-helpline-link" title="কল করতে ট্যাপ করুন">
                ০১৬১৭ ০৫২৪১০
              </a>
            </div>
          </div>
          <div className="header-qr-area">
            <a
              href="https://www.facebook.com/profile.php?id=61566432706839"
              target="_blank"
              rel="noopener noreferrer"
              className="qr-link"
              title="আমাদের অফিসিয়াল ফেসবুক পেজ দেখুন"
              aria-label="আমাদের অফিসিয়াল ফেসবুক পেজ দেখুন (নতুন ট্যাবে খুলবে)"
            >
              <span className="qr-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/quiz/assets/fb-qr.png" alt="" className="qr-image" width="60" height="60" />
              </span>
              <span className="qr-label">
                আমাদের পেজ
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* ফটো স্লাইডার ব্যানার */}
      <QuizSlider />

      {/* মেইন কন্টেন্ট */}
      <main className="main-content">
        <div className="container container--tight">
          <div className="search-card-wrapper">
            <div className="search-card">
              <h2 className="search-card-title">প্রতিযোগিতার ফলাফল দেখুন</h2>
              <p className="search-card-subtitle">
                রেজাল্ট দেখতে আপনার শিক্ষাপ্রতিষ্ঠান নির্বাচন করুন এবং রোল নাম্বার দিয়ে সার্চ বাটনে ক্লিক করুন
              </p>
              <p className="search-card-hint">
                রোল নাম্বার ভুলে গেলে বা হারিয়ে গেলে শুধু শিক্ষাপ্রতিষ্ঠানের নাম দিয়ে সার্চ করে লিস্ট থেকে আপনার রোল নাম্বার খুঁজে আবার সার্চ করুন
              </p>

              <form id="student-search-form" className="search-form" noValidate onSubmit={handleSearch}>
                <div className="form-group">
                  <label htmlFor="student-year">
                    সাল <span className="required">*</span>
                  </label>
                  <select
                    id="student-year"
                    className="form-input"
                    ref={yearRef}
                    value={year === "" ? "" : String(year)}
                    onChange={(e) => handleYearChange(e.target.value)}
                  >
                    <option value="" disabled>
                      সাল সিলেক্ট করুন...
                    </option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {toBnDigits(y)}ইং
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="student-institution">
                    শিক্ষাপ্রতিষ্ঠানের নাম <span className="required">*</span>
                  </label>
                  <div className={`custom-combobox-wrapper${comboOpen ? " is-open" : ""}`} id="student-institution-combobox" ref={comboRef}>
                    <div className="combobox-input-wrap">
                      <input
                        type="text"
                        id="student-institution"
                        className="form-input"
                        placeholder="শিক্ষাপ্রতিষ্ঠানের নাম লিখুন বা বাছাই করুন"
                        required
                        autoComplete="off"
                        ref={institutionRef}
                        value={institution}
                        disabled={year === ""}
                        onChange={(e) => {
                          setInstitution(e.target.value);
                          if (year !== "") setComboOpen(true);
                        }}
                        onFocus={() => {
                          if (year !== "") setComboOpen(true);
                        }}
                        onClick={() => {
                          if (year !== "") setComboOpen(true);
                        }}
                      />
                      <button
                        type="button"
                        className="combobox-toggle-btn"
                        id="student-institution-toggle"
                        aria-label="ড্রপডাউন খুলুন"
                        title="সব প্রতিষ্ঠান দেখুন"
                        disabled={year === ""}
                        onClick={() => setComboOpen((o) => !o)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                    </div>
                    <div className="combobox-dropdown" id="student-institution-dropdown">
                      {filteredInstitutions.length === 0 ? (
                        <div className="combobox-empty">কোনো প্রতিষ্ঠান মেলেনি</div>
                      ) : (
                        filteredInstitutions.map((inst) => (
                          <div
                            key={inst}
                            className={`combobox-item${institution.trim().toLowerCase() === inst.toLowerCase() ? " active" : ""}`}
                            onClick={() => {
                              setInstitution(inst);
                              setComboOpen(false);
                            }}
                          >
                            {inst}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="student-roll">রোল নাম্বার</label>
                  <input
                    type="text"
                    id="student-roll"
                    className="form-input"
                    placeholder="আপনার রোল নাম্বার লিখুন (যেমন: ১২৬)"
                    autoComplete="off"
                    ref={rollRef}
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    style={rollHot ? { borderColor: "var(--primary)" } : undefined}
                  />
                </div>

                <button type="submit" id="btn-search-result" className="btn-search" disabled={searching}>
                  {searching ? (
                    <>
                      <span className="spinner-inline"></span> খোঁজা হচ্ছে...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      সার্চ করুন
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* রেজাল্ট এরিয়া */}
            <div id="result-area" ref={resultAreaRef}>
              {view.kind === "message" && <div className={`message-box ${view.type}`}>{view.content}</div>}

              {view.kind === "list" && (
                <>
                  <div className="institution-search-banner" id="inst-search-banner">
                    <div className="inst-prompt-text" style={{ marginBottom: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      <span>রেজাল্ট দেখতে নিচে থেকে রোল নাম্বার খুঁজে রোল নাম্বার ঘরে আপনার রোলটি বসান।</span>
                    </div>
                  </div>

                  <div className="institution-list-card">
                    <div className="institution-list-header">
                      <h3 className="institution-list-title">{view.institutionName}</h3>
                      <span className="institution-list-count">মোট {toBnDigits(view.students.length)} জন শিক্ষার্থী</span>
                    </div>
                    <div className="table-responsive">
                      <table className="student-list-table">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: 80 }}>
                              সিরিয়াল নং
                            </th>
                            <th scope="col" style={{ width: 140 }}>
                              রোল
                            </th>
                            <th scope="col">নাম</th>
                          </tr>
                        </thead>
                        <tbody>
                          {view.students.map((s, idx) => (
                            <tr key={`${s.roll}-${idx}`}>
                              <td>{toBnDigits(idx + 1)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="roll-badge-clickable"
                                  title="এই রোলটি নির্বাচন করে উপরে বসাতে ক্লিক করুন"
                                  onClick={() => pickRoll(s.roll)}
                                >
                                  {toBnDigits(s.roll)}
                                </button>
                              </td>
                              <td>
                                <strong>{s.name}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {view.kind === "results" &&
                view.students.map((s, i) => <StudentResultCard key={`${s.roll}-${s.institution}-${i}`} student={s} />)}
            </div>

            {/* হেল্পলাইন ও যোগাযোগ সেকশন */}
            <div className="helpline-card" aria-label="জরুরি যোগাযোগ">
              <div className="helpline-header">
                <div className="helpline-header-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d={PHONE_ICON_PATH}></path>
                  </svg>
                </div>
                <h3 className="helpline-title">যেকোনো তথ্যের জন্য যোগাযোগ করুন</h3>
              </div>

              <div className="helpline-grid">
                {HELPLINES.map((h, idx) => (
                  <div className="helpline-item" key={h.tel}>
                    <div className="helpline-num-wrap">
                      <span className="helpline-label">{h.label}</span>
                      <span className="helpline-number">{h.display}</span>
                    </div>
                    <div className="helpline-actions">
                      <a href={h.tel} className="btn-help-call" title="সরাসরি কল করুন">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={PHONE_ICON_PATH}></path>
                        </svg>
                        কল
                      </a>
                      <button
                        type="button"
                        className={`btn-help-copy${copiedIdx === idx ? " copied" : ""}`}
                        title="নাম্বার কপি করুন"
                        onClick={() => copyHelpline(h.copy, idx)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span className="copy-text">{copiedIdx === idx ? "✓ কপিড" : "কপি"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="site-footer">ইনকিলাব যুব সংগঠন কর্তৃক প্রকাশিত | সর্বস্বত্ব সংরক্ষিত</footer>
    </div>
  );
}
