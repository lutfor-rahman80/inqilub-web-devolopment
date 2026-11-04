import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/admin/text";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MessageActions } from "@/components/admin/message-actions";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "বার্তা" };

type Props = { params: Promise<{ id: string }> };

export default async function MessageDetailPage({ params }: Props) {
  await requirePagePermission("messages.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const db = await createClient();
  const { data: m, error } = await db
    .from("contact_messages")
    .select("id, name, mobile, email, subject, message, is_read, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return (
      <>
        <AdminPageHeader title="বার্তা" />
        <Alert>বার্তাটি লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      </>
    );
  }
  if (!m) notFound();

  const replySubject = encodeURIComponent(`উত্তর: ${m.subject}`);

  return (
    <>
      <Link href="/admin/messages" className="mb-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> সব বার্তা
      </Link>
      <AdminPageHeader title="বার্তার বিস্তারিত" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="min-w-0 break-words text-xl font-bold" data-testid="message-subject">{m.subject}</h2>
            {!m.is_read && <Badge tone="amber">নতুন</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
          </p>
          {/* Plain text: React escapes it; line breaks are kept. */}
          <div className="mt-5 whitespace-pre-wrap break-words border-t border-line pt-5 text-ink" data-testid="message-body">
            {m.message}
          </div>
        </Card>

        <aside className="space-y-4" aria-label="প্রেরকের তথ্য">
          <Card className="p-4 sm:p-5">
            <h2 className="text-lg font-bold">প্রেরক</h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-sm text-muted">নাম</dt>
                <dd className="break-words font-semibold" data-testid="message-name">{m.name}</dd>
              </div>
              {m.mobile && (
                <div>
                  <dt className="text-sm text-muted">মোবাইল</dt>
                  <dd>
                    <a href={`tel:${m.mobile}`} dir="ltr" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline">
                      <Phone className="size-4" aria-hidden="true" /> {m.mobile}
                    </a>
                  </dd>
                </div>
              )}
              {m.email && (
                <div>
                  <dt className="text-sm text-muted">ইমেইল</dt>
                  <dd className="min-w-0">
                    <a href={`mailto:${m.email}`} dir="ltr" className="inline-flex min-h-11 max-w-full items-center gap-1.5 break-all font-semibold text-brand-700 underline-offset-4 hover:underline">
                      <Mail className="size-4 shrink-0" aria-hidden="true" /> {m.email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {m.mobile && (
                <a href={`tel:${m.mobile}`} className={buttonClass("primary", "md")}>
                  <Phone className="size-5" aria-hidden="true" /> কল করুন
                </a>
              )}
              {m.email && (
                <a href={`mailto:${m.email}?subject=${replySubject}`} className={buttonClass(m.mobile ? "outline" : "primary", "md")}>
                  <Mail className="size-5" aria-hidden="true" /> ইমেইলে উত্তর
                </a>
              )}
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <MessageActions id={m.id} isRead={m.is_read} subject={m.subject} />
          </Card>
        </aside>
      </div>
    </>
  );
}
