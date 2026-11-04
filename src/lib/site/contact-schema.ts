import { z } from "zod";
import { toAsciiDigits } from "@/lib/format";
import type { ContactValidationMessages } from "@/i18n/messages/contact";

/**
 * Contact form validation (server-side source of truth; mirrors the
 * contact_messages table constraints). Error texts come from the caller in
 * the page's language (contact[lang].validation), so the browser preview and
 * the server answer in the same language.
 */

export const CONTACT_LIMITS = {
  name: { min: 2, max: 120 },
  subject: { min: 2, max: 200 },
  message: { min: 10, max: 5000 },
  email: { max: 254 },
} as const;

export type ContactField = "name" | "mobile" | "email" | "subject" | "message";
export type ContactValues = Record<ContactField, string>;

const BD_MOBILE = /^01[3-9]\d{8}$/;

/** "+880 1712-345678" / "০১৭১২৩৪৫৬৭৮" → "01712345678" (other input returned trimmed). */
export function normalizeMobile(value: string): string {
  let v = toAsciiDigits(value).replace(/[\s\-().]/g, "");
  if (v.startsWith("+880")) v = v.slice(3);
  else if (v.startsWith("880") && v.length === 13) v = v.slice(2);
  return v;
}

function contactSchema(m: ContactValidationMessages) {
  return z
    .object({
      name: z
        .string()
        .min(CONTACT_LIMITS.name.min, { error: m.name })
        .max(CONTACT_LIMITS.name.max, { error: m.nameMax }),
      mobile: z.string().refine((v) => v === "" || BD_MOBILE.test(v), { error: m.mobile }),
      email: z
        .string()
        .max(CONTACT_LIMITS.email.max, { error: m.emailMax })
        .refine((v) => v === "" || z.email().safeParse(v).success, { error: m.email }),
      subject: z
        .string()
        .min(CONTACT_LIMITS.subject.min, { error: m.subject })
        .max(CONTACT_LIMITS.subject.max, { error: m.subjectMax }),
      message: z
        .string()
        .min(CONTACT_LIMITS.message.min, { error: m.message })
        .max(CONTACT_LIMITS.message.max, { error: m.messageMax }),
    })
    .superRefine((v, ctx) => {
      if (!v.mobile && !v.email) {
        ctx.addIssue({ code: "custom", path: ["mobile"], message: m.replyRequired });
        ctx.addIssue({ code: "custom", path: ["email"], message: m.replyRequired });
      }
    });
}

export type ContactInput = {
  name: string;
  mobile: string | null;
  email: string | null;
  subject: string;
  message: string;
};

export type ContactParseResult =
  | { ok: true; data: ContactInput }
  | { ok: false; fieldErrors: Partial<Record<ContactField, string>> };

/** Reads the raw form values (strings only), trimmed. */
export function readContactValues(get: (name: string) => unknown): ContactValues {
  const str = (name: string) => {
    const v = get(name);
    return typeof v === "string" ? v : "";
  };
  return {
    name: str("name").trim(),
    mobile: str("mobile").trim(),
    email: str("email").trim(),
    subject: str("subject").trim(),
    message: str("message").replace(/\r\n?/g, "\n").trim(),
  };
}

export function parseContact(values: ContactValues, messages: ContactValidationMessages): ContactParseResult {
  const prepared = {
    name: values.name.replace(/\s+/g, " "),
    mobile: values.mobile ? normalizeMobile(values.mobile) : "",
    email: values.email.toLowerCase(),
    subject: values.subject.replace(/\s+/g, " "),
    message: values.message,
  };
  const result = contactSchema(messages).safeParse(prepared);
  if (!result.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as ContactField | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const d = result.data;
  return {
    ok: true,
    data: {
      name: d.name,
      mobile: d.mobile || null,
      email: d.email || null,
      subject: d.subject,
      message: d.message,
    },
  };
}
