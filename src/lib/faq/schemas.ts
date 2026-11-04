import { z } from "zod";
import { bn } from "@/lib/format";
import { multiLine, oneLine } from "@/lib/admin/text";

/**
 * FAQ (প্রশ্নোত্তর) admin validation — mirrors the faqs table constraints
 * (question 3–300, answer 1–5000 characters; English optional). Pure, shared
 * by the browser preview and the server action (the server is the source of
 * truth). Messages are Bengali (the admin panel is Bengali-only).
 */

export const FAQ_LIMITS = { questionMin: 3, questionMax: 300, answerMax: 5000 } as const;

export type FaqValues = {
  question_bn: string;
  answer_bn: string;
  question_en: string;
  answer_en: string;
  is_published: boolean;
};

/** What is written to the database (empty English → null = Bengali is shown on English pages). */
export type FaqData = {
  question_bn: string;
  answer_bn: string;
  question_en: string | null;
  answer_en: string | null;
  is_published: boolean;
};

export type FaqFieldErrors = Partial<Record<keyof FaqValues | "form", string>>;
export type FaqParsed = { ok: true; data: FaqData } | { ok: false; fieldErrors: FaqFieldErrors };

const q = (label: string) =>
  z
    .string()
    .min(FAQ_LIMITS.questionMin, { error: `${label} লিখুন (কমপক্ষে ${bn(FAQ_LIMITS.questionMin)} অক্ষর)।` })
    .max(FAQ_LIMITS.questionMax, { error: `${label} সর্বোচ্চ ${bn(FAQ_LIMITS.questionMax)} অক্ষরের হতে পারে।` });

const schema = z
  .object({
    question_bn: q("প্রশ্ন"),
    answer_bn: z
      .string()
      .min(1, { error: "উত্তর লিখুন।" })
      .max(FAQ_LIMITS.answerMax, { error: `উত্তর সর্বোচ্চ ${bn(FAQ_LIMITS.answerMax)} অক্ষরের হতে পারে।` }),
    question_en: z.string().refine((v) => v === "" || (v.length >= FAQ_LIMITS.questionMin && v.length <= FAQ_LIMITS.questionMax), {
      error: `ইংরেজি প্রশ্ন ${bn(FAQ_LIMITS.questionMin)}–${bn(FAQ_LIMITS.questionMax)} অক্ষরের হতে হবে (অথবা খালি রাখুন)।`,
    }),
    answer_en: z.string().max(FAQ_LIMITS.answerMax, { error: `ইংরেজি উত্তর সর্বোচ্চ ${bn(FAQ_LIMITS.answerMax)} অক্ষরের হতে পারে।` }),
    is_published: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.answer_en && !v.question_en) {
      ctx.addIssue({ code: "custom", path: ["question_en"], message: "ইংরেজি উত্তর দিলে ইংরেজি প্রশ্নও লিখুন।" });
    }
  });

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

/** Raw form values → clean data or Bengali field errors. */
export function parseFaq(raw: Record<string, unknown>): FaqParsed {
  const result = schema.safeParse({
    question_bn: oneLine(str(raw.question_bn)),
    answer_bn: multiLine(str(raw.answer_bn)),
    question_en: oneLine(str(raw.question_en)),
    answer_en: multiLine(str(raw.answer_en)),
    is_published: bool(raw.is_published),
  });
  if (!result.success) {
    const fieldErrors: FaqFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = (issue.path[0] as keyof FaqValues | undefined) ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const d = result.data;
  return {
    ok: true,
    data: {
      question_bn: d.question_bn,
      answer_bn: d.answer_bn,
      question_en: d.question_en || null,
      answer_en: d.answer_en || null,
      is_published: d.is_published,
    },
  };
}

export const isFaqDirection = (v: unknown): v is "up" | "down" => v === "up" || v === "down";
