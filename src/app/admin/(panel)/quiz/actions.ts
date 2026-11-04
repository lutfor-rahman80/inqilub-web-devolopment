"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { errorMessage, type ActionResult } from "@/lib/errors";
import {
  QUIZ_GENDERS,
  normalizeRoll,
  splitMobiles,
  type QuizCutoffInput,
  type QuizRound2Input,
  type QuizRound2Result,
  type QuizRow,
  type QuizSaveInput,
} from "@/lib/quiz/admin";

const FORM_ERROR = "ফর্মের কিছু তথ্য সঠিক নয়। ঘরগুলো দেখে আবার চেষ্টা করুন।";
const MOBILE_ERROR = "মোবাইল নম্বর সঠিক নয়। ০১ দিয়ে শুরু ১১ ডিজিটের নম্বর দিন।";

const yearSchema = z.number().int().min(2000).max(2100);

const saveSchema = z.object({
  id: z.number().int().positive().nullable().optional(),
  year: yearSchema,
  roll: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(200),
  institution: z.string().trim().min(1).max(200),
  gender: z.enum(QUIZ_GENDERS),
  marks: z.number().min(0).max(1000),
  mobile: z.string().max(500),
});

const cutoffSchema = z.object({
  year: yearSchema,
  boys: z.number().min(0).max(1000),
  girls: z.number().min(0).max(1000),
});

const round2Schema = z.object({
  year: yearSchema,
  roll: z.string().trim().min(1).max(60),
  round2Marks: z.number().min(0).max(1000),
  mobile: z.string().max(500).optional(),
  overwrite: z.boolean().optional(),
});

/** Bengali messages for the errors raised by the quiz admin RPCs. */
const QUIZ_MESSAGES: [string, string][] = [
  ["DUPLICATE_ROLL", "এই রোল নম্বর ইতিমধ্যে অন্য শিক্ষার্থীর। রোল অবশ্যই ইউনিক হতে হবে।"],
  ["MISSING_FIELDS", "রোল, নাম ও শিক্ষাপ্রতিষ্ঠান পূরণ করুন।"],
  ["INVALID_GENDER", "লিঙ্গ হিসেবে ছেলে বা মেয়ে নির্বাচন করুন।"],
  ["INVALID_MARKS", "প্রাপ্ত নাম্বার ০ বা তার বেশি একটি সংখ্যা হতে হবে।"],
  ["INVALID_MOBILE", MOBILE_ERROR],
  ["INVALID_CUTOFF", "কাট-অফ ০ থেকে ১০০০ এর মধ্যে হতে হবে।"],
  ["INVALID_YEAR", "সালটি সঠিক নয়। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।"],
  ["YEAR_EXISTS", "এই সাল ইতিমধ্যে যোগ করা আছে।"],
  ["YEAR_MISMATCH", "এই ফলাফলটি অন্য সালের। নির্বাচিত সালের ফলাফলই শুধু সম্পাদনা করা যাবে।"],
  ["ROUND2_DISABLED", "২য় রাউন্ড এখন বন্ধ আছে। আগে ২য় রাউন্ড চালু করুন।"],
  ["ROUND2_EXISTS", "এই শিক্ষার্থীর ২য় রাউন্ডের নাম্বার ইতিমধ্যে দেওয়া হয়েছে। আগের নাম্বার বদলাতে সম্মতি দিন।"],
  ["STUDENT_NOT_QUALIFIED", "এই শিক্ষার্থী কাট-অফে উত্তীর্ণ নয়, তাই ২য় রাউন্ডের নাম্বার দেওয়া যাবে না।"],
  ["STUDENT_NOT_FOUND", "এই রোলের কোনো শিক্ষার্থী পাওয়া যায়নি।"],
  ["AMBIGUOUS_ROLL", "এই রোলের একাধিক শিক্ষার্থী পাওয়া গেছে। রোল নম্বর যাচাই করুন।"],
];

function quizError(error: unknown): string {
  const raw = (error as { message?: string } | null | undefined)?.message ?? "";
  for (const [token, message] of QUIZ_MESSAGES) {
    if (raw.includes(token)) return message;
  }
  return errorMessage(error);
}

function validMobiles(value: string): boolean {
  const mobiles = splitMobiles(value);
  return mobiles.length > 0 && mobiles.every((mobile) => /^01\d{9}$/.test(mobile));
}

export async function addQuizYear(year: number): Promise<ActionResult<number>> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = yearSchema.safeParse(year);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_admin_add_year", { p_year: parsed.data });
  if (error) return { ok: false, error: quizError(error) };

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  return { ok: true, data: Number(data) };
}

export async function saveQuizResult(input: QuizSaveInput): Promise<ActionResult<QuizRow>> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };
  if (!validMobiles(parsed.data.mobile)) return { ok: false, error: MOBILE_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_admin_save_result", {
    p_id: parsed.data.id ?? null,
    p_roll: normalizeRoll(parsed.data.roll),
    p_name: parsed.data.name,
    p_institution: parsed.data.institution,
    p_gender: parsed.data.gender,
    p_marks: parsed.data.marks,
    p_mobile: splitMobiles(parsed.data.mobile).join(", "),
    p_year: parsed.data.year,
  });

  if (error) return { ok: false, error: quizError(error) };
  const row = data?.[0];
  if (!row) return { ok: false, error: errorMessage(null) };

  revalidatePath("/admin/quiz");
  return {
    ok: true,
    data: {
      id: Number(row.id),
      year: Number(row.year),
      roll: row.roll,
      name: row.name,
      institution: row.institution,
      gender: row.gender as QuizRow["gender"],
      marks: row.marks === null ? null : Number(row.marks),
      round2_marks: row.round2_marks === null ? null : Number(row.round2_marks),
      round2_updated_at: row.round2_updated_at,
      created_at: row.created_at,
    },
  };
}

export async function saveQuizCutoffs(input: QuizCutoffInput): Promise<ActionResult> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = cutoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.rpc("quiz_admin_set_cutoffs", {
    p_year: parsed.data.year,
    p_boys: parsed.data.boys,
    p_girls: parsed.data.girls,
  });
  if (error) return { ok: false, error: quizError(error) };

  revalidatePath("/admin/quiz");
  return { ok: true };
}

export async function setQuizRound2Enabled(year: number, enabled: boolean): Promise<ActionResult> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = yearSchema.safeParse(year);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.rpc("quiz_admin_set_round2_enabled", {
    p_year: parsed.data,
    p_enabled: Boolean(enabled),
  });
  if (error) return { ok: false, error: quizError(error) };

  revalidatePath("/admin/quiz");
  return { ok: true };
}

export async function saveQuizRound2(input: QuizRound2Input): Promise<ActionResult<QuizRound2Result>> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = round2Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const mobile = parsed.data.mobile?.trim() ? splitMobiles(parsed.data.mobile).join(", ") : "";
  if (mobile && !/^01[3-9]\d{8}$/.test(mobile)) {
    return { ok: false, error: "নতুন মোবাইল নম্বরটি সঠিক নয় (০১ দিয়ে শুরু ১১ ডিজিটের নম্বর দিন)।" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_admin_set_round2", {
    p_roll: normalizeRoll(parsed.data.roll),
    p_round2_marks: parsed.data.round2Marks,
    p_mobile: mobile || null,
    p_overwrite: Boolean(parsed.data.overwrite),
    p_year: parsed.data.year,
  });

  if (error) return { ok: false, error: quizError(error) };
  const row = data?.[0];
  if (!row) return { ok: false, error: errorMessage(null) };

  revalidatePath("/admin/quiz");
  return {
    ok: true,
    data: {
      id: Number(row.id),
      roll: row.roll,
      name: row.name,
      round2_marks: row.round2_marks === null ? null : Number(row.round2_marks),
      total_marks: row.total_marks === null ? null : Number(row.total_marks),
      mobile: row.mobile,
    },
  };
}

/** Reveal every mobile number for one year; only staff with quiz access can call this. */
export async function getQuizMobiles(year: number): Promise<ActionResult<Record<string, string>>> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  const parsed = yearSchema.safeParse(year);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_admin_mobiles", { p_id: null, p_year: parsed.data });
  if (error) return { ok: false, error: quizError(error) };

  const mobiles: Record<string, string> = {};
  for (const row of data ?? []) mobiles[String(row.id)] = row.mobile ?? "";
  return { ok: true, data: mobiles };
}

/** Fetch one student's mobile number for the edit / round-2 dialogs. */
export async function getQuizMobile(id: number, year: number): Promise<ActionResult<string>> {
  if (!(await staffWith("quiz.manage", "content.manage"))) return { ok: false, error: DENIED };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: errorMessage(null) };
  const parsed = yearSchema.safeParse(year);
  if (!parsed.success) return { ok: false, error: FORM_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quiz_admin_mobiles", { p_id: id, p_year: parsed.data });
  if (error) return { ok: false, error: quizError(error) };
  return { ok: true, data: data?.[0]?.mobile ?? "" };
}
