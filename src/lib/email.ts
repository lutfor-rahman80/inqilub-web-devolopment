import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";
import { SITE_URL } from "@/lib/env";

type Kind = "application_received" | "application_approved" | "application_rejected";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function compose(kind: Kind, a: { full_name: string; application_no: string; member_no: string | null; decision_note: string | null }) {
  const name = escapeHtml(a.full_name);
  const no = escapeHtml(a.application_no);
  const statusLink = `${SITE_URL}/membership/status`;
  const footer = `<p style="color:#555;font-size:13px">ইনকিলাব যুব সংগঠন · কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ<br>এটি একটি স্বয়ংক্রিয় ইমেইল।</p>`;
  switch (kind) {
    case "application_received":
      return {
        subject: `আবেদন গৃহীত হয়েছে — ${a.application_no}`,
        // Sent before any human review, so it never echoes visitor-supplied text.
        html: `<p>প্রিয় আবেদনকারী,</p><p>ইনকিলাব যুব সংগঠনের সদস্য পদের জন্য আপনার আবেদন আমরা পেয়েছি।</p><p>ট্র্যাকিং নম্বর: <strong>${no}</strong></p><p>আবেদনের অবস্থা জানতে <a href="${statusLink}">${statusLink}</a> পৃষ্ঠায় ট্র্যাকিং নম্বর ও মোবাইল নম্বর দিন।</p>${footer}`,
      };
    case "application_approved":
      return {
        subject: `সদস্য পদ অনুমোদিত — ${a.member_no ?? a.application_no}`,
        html: `<p>প্রিয় ${name},</p><p>আলহামদুলিল্লাহ! ইনকিলাব যুব সংগঠনের সদস্য পদের জন্য আপনার আবেদন (${no}) অনুমোদিত হয়েছে।</p>${a.member_no ? `<p>আপনার সদস্য নম্বর: <strong>${escapeHtml(a.member_no)}</strong></p>` : ""}<p>সংগঠনের কার্যক্রমে আপনাকে স্বাগতম।</p>${footer}`,
      };
    case "application_rejected":
      return {
        subject: `আবেদনের সিদ্ধান্ত — ${a.application_no}`,
        html: `<p>প্রিয় ${name},</p><p>দুঃখিত, ইনকিলাব যুব সংগঠনের সদস্য পদের জন্য আপনার আবেদন (${no}) এই মুহূর্তে অনুমোদন করা সম্ভব হয়নি।</p>${a.decision_note ? `<p>মন্তব্য: ${escapeHtml(a.decision_note)}</p>` : ""}<p>বিস্তারিত জানতে সংগঠনের সাথে যোগাযোগ করুন।</p>${footer}`,
      };
  }
}

/**
 * Sends a notification email for an application if the applicant gave an
 * email AND Resend is configured. Never throws: failures are recorded in
 * notification_log and never block the membership workflow.
 */
export async function notifyApplicant(applicationId: string, kind: Kind): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data } = await admin.rpc("application_contact", { p_application_id: applicationId });
    const a = data?.[0];
    if (!a?.email) return;

    if (!serverEnv.resendApiKey || !serverEnv.emailFrom) {
      await admin.from("notification_log").insert({
        application_id: applicationId, kind, recipient: a.email, status: "skipped",
        error: "email not configured",
      });
      return;
    }

    const { subject, html } = compose(kind, a);
    const resend = new Resend(serverEnv.resendApiKey);
    const { error } = await resend.emails.send({ from: serverEnv.emailFrom, to: a.email, subject, html });
    await admin.from("notification_log").insert({
      application_id: applicationId, kind, recipient: a.email,
      status: error ? "failed" : "sent", error: error?.message ?? null,
    });
  } catch (err) {
    console.error("notifyApplicant failed", err);
    await admin.from("notification_log").insert({
      application_id: applicationId, kind, recipient: "unknown", status: "failed",
      error: err instanceof Error ? err.message.slice(0, 500) : "unknown error",
    }).then(() => undefined, () => undefined);
  }
}
