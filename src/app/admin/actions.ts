"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { MFA_PATH, mfaRule, safeAdminNext, tokenAal } from "@/lib/admin/mfa";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "ইমেইল ও পাসওয়ার্ড দিন।" };

  if (!(await rateLimit("admin-login", 10, 15 * 60))) {
    return { error: "অনেকবার চেষ্টা করা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return { error: "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।" };

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("is_active, roles(key)")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "এই অ্যাকাউন্টের অ্যাডমিন প্যানেলে প্রবেশের অনুমতি নেই।" };
  }

  const next = safeAdminNext(formData.get("next"));
  // Second step (authenticator code), or its first-time setup for super admins.
  const verified = (data.user.factors ?? []).filter((f) => f.status === "verified" && f.factor_type === "totp").length;
  const rule = mfaRule(profile.roles?.key ?? "", tokenAal(data.session.access_token), verified);
  if (!rule.satisfied) {
    redirect(next === "/admin" ? MFA_PATH : `${MFA_PATH}?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
