import type { StatusValidationMessages } from "@/i18n/messages/membership";
import { BD_MOBILE_RE, TRACKING_NO_RE, normalizeMobile, normalizeTrackingNo } from "./normalize";

/**
 * Public status lookup input: tracking number + mobile number (both required).
 * Messages in the page's language (membership[lang].statusValidation).
 */

export type StatusField = "application_no" | "mobile";
export type StatusQuery = { application_no: string; mobile: string };
export type StatusParse =
  | { ok: true; data: StatusQuery }
  | { ok: false; fieldErrors: Partial<Record<StatusField, string>>; values: StatusQuery };

export function parseStatusQuery(rawNo: unknown, rawMobile: unknown, m: StatusValidationMessages): StatusParse {
  const noText = typeof rawNo === "string" ? rawNo.slice(0, 60) : "";
  const mobileText = typeof rawMobile === "string" ? rawMobile.slice(0, 40) : "";
  const application_no = normalizeTrackingNo(noText);
  const mobile = normalizeMobile(mobileText);
  const fieldErrors: Partial<Record<StatusField, string>> = {};
  if (!application_no) fieldErrors.application_no = m.noRequired;
  else if (!TRACKING_NO_RE.test(application_no)) fieldErrors.application_no = m.noInvalid;
  if (!mobile) fieldErrors.mobile = m.mobileRequired;
  else if (!BD_MOBILE_RE.test(mobile)) fieldErrors.mobile = m.mobileInvalid;
  if (fieldErrors.application_no || fieldErrors.mobile) {
    return { ok: false, fieldErrors, values: { application_no: application_no || noText.trim(), mobile: mobileText.trim() } };
  }
  return { ok: true, data: { application_no, mobile } };
}
