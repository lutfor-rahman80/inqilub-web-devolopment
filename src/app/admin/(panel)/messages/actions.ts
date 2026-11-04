"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/errors";
import { DENIED, staffWith } from "@/lib/admin/guard";
import { isUuid } from "@/lib/admin/text";

type Result = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "বার্তাটি খুঁজে পাওয়া যায়নি। হয়তো এটি মুছে ফেলা হয়েছে।";

/** Mark a contact message read/unread (messages.view; RLS + column grant enforce it again). */
export async function setMessageRead(id: unknown, read: unknown): Promise<Result> {
  if (!(await staffWith("messages.view"))) return { ok: false, error: DENIED };
  if (!isUuid(id) || typeof read !== "boolean") return { ok: false, error: NOT_FOUND };
  const db = await createClient();
  const { data, error } = await db.from("contact_messages").update({ is_read: read }).eq("id", id).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Permanently delete a contact message. */
export async function deleteMessage(id: unknown): Promise<Result> {
  if (!(await staffWith("messages.view"))) return { ok: false, error: DENIED };
  if (!isUuid(id)) return { ok: false, error: NOT_FOUND };
  const db = await createClient();
  const { data, error } = await db.from("contact_messages").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
