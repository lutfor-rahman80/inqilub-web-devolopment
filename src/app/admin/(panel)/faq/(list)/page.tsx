import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { FaqRowActions } from "../faq-row-actions";

export const metadata: Metadata = { title: "প্রশ্নোত্তর" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** All entries on one page (an FAQ stays short); order = the public page's order. */
const MAX_ROWS = 500;

export default async function FaqAdminPage({ searchParams }: Props) {
  await requirePagePermission("content.manage");
  const sp = await searchParams;
  const db = await createClient();
  const { data, error } = await db
    .from("faqs")
    .select("id, question_bn, question_en, answer_en, is_published, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(MAX_ROWS);
  const rows = data ?? [];
  const published = rows.filter((r) => r.is_published).length;

  return (
    <>
      <AdminPageHeader
        title="প্রশ্নোত্তর"
        description="ওয়েবসাইটের “প্রশ্নোত্তর” পাতায় দেখানো প্রশ্ন ও উত্তর। এখানে যে ক্রমে আছে, ওয়েবসাইটেও সেই ক্রমে দেখানো হয়। শুধু যাচাই করা তথ্য প্রকাশ করুন।"
        actions={
          <LinkButton href="/admin/faq/new">
            <Plus className="size-5" aria-hidden="true" /> নতুন প্রশ্ন
          </LinkButton>
        }
      />

      {sp.deleted === "1" && (
        <div className="mb-4">
          <Alert tone="success">প্রশ্নটি মুছে ফেলা হয়েছে।</Alert>
        </div>
      )}

      {error ? (
        <Alert>প্রশ্নোত্তরের তালিকা লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="এখনো কোনো প্রশ্ন যুক্ত হয়নি">“নতুন প্রশ্ন” বোতাম দিয়ে প্রথম প্রশ্ন ও উত্তর লিখুন।</EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted" aria-live="polite">
              মোট {bn(rows.length)}টি প্রশ্ন · প্রকাশিত {bn(published)}টি · খসড়া {bn(rows.length - published)}টি
            </p>
            {published > 0 && (
              <Link href="/faq" target="_blank" className={buttonClass("ghost", "sm", "min-h-11")}>
                <ExternalLink className="size-4" aria-hidden="true" /> ওয়েবসাইটে দেখুন
                <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
              </Link>
            )}
          </div>
          <ol
            className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]"
            data-testid="faq-admin-list"
          >
            {rows.map((r, i) => {
              const position = bn(i + 1);
              return (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start" data-testid="faq-row" data-faq-id={r.id}>
                  <span aria-hidden="true" className="hidden w-8 shrink-0 pt-0.5 text-center font-serif text-lg font-bold text-gold-700 lg:block">
                    {position}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="sr-only">{position}. </span>
                      <Link
                        href={`/admin/faq/${r.id}`}
                        className="min-w-0 break-words font-semibold text-brand-900 underline-offset-4 hover:underline"
                      >
                        {r.question_bn}
                      </Link>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      {r.is_published ? <Badge tone="green">প্রকাশিত</Badge> : <Badge tone="amber">খসড়া</Badge>}
                      {r.question_en ? (
                        <Badge tone="blue">{r.answer_en ? "ইংরেজি আছে" : "ইংরেজি প্রশ্ন আছে, উত্তর নেই"}</Badge>
                      ) : (
                        <Badge tone="gray">শুধু বাংলা</Badge>
                      )}
                    </p>
                    {r.question_en && (
                      <p className="mt-1 text-sm text-muted" lang="en">
                        {r.question_en}
                      </p>
                    )}
                    <LinkButton
                      href={`/admin/faq/${r.id}`}
                      variant="ghost"
                      size="sm"
                      className="mt-2 min-h-11 border border-line"
                      aria-label={`সম্পাদনা: প্রশ্ন ${position}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
                    </LinkButton>
                  </div>
                  <FaqRowActions
                    id={r.id}
                    question={r.question_bn}
                    position={position}
                    isFirst={i === 0}
                    isLast={i === rows.length - 1}
                    isPublished={r.is_published}
                  />
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}
