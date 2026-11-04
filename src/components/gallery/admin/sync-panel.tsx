"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderSync, Loader2 } from "lucide-react";
import { bn } from "@/lib/format";
import { Alert } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { syncGalleryFolders } from "@/app/admin/(panel)/gallery/actions";
import type { CategoryOption } from "./upload-panel";
import { useUploadBusy } from "./upload-activity";

type Totals = {
  registered: number;
  failed: { path: string; reason: string }[];
  missing: { id: string; path: string; caption: string; what: "image" | "thumb" }[];
  unknownFolders: string[];
  unreadableFolders: string[];
  ignored: { path: string; reason: "outside-category" | "too-deep" }[];
};

const IGNORED_REASON = {
  "outside-category": "কোনো ক্যাটাগরি ফোল্ডারের ভেতরে নেই",
  "too-deep": "ফোল্ডারের ভেতরের ফোল্ডারের ভেতরে (দুই স্তর নিচে)",
} as const;

const MAX_ROUNDS = 60;

export function SyncPanel({ categories }: { categories: CategoryOption[] }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ registered: number; remaining: number } | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploading = useUploadBusy();

  async function run() {
    setRunning(true);
    setError(null);
    setTotals(null);
    const acc: Totals = { registered: 0, failed: [], missing: [], unknownFolders: [], unreadableFolders: [], ignored: [] };
    setProgress({ registered: 0, remaining: 0 });
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await syncGalleryFolders(acc.failed.map((f) => f.path));
        if (!res.ok) {
          setError(res.error);
          break;
        }
        const d = res.data;
        acc.registered += d.registered;
        acc.failed.push(...d.failed);
        acc.missing = d.missing;
        acc.unknownFolders = d.unknownFolders;
        acc.unreadableFolders = d.unreadableFolders;
        acc.ignored = d.ignored;
        setProgress({ registered: acc.registered, remaining: d.remaining });
        if (d.remaining === 0) break;
      }
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
    }
    setTotals(acc);
    setRunning(false);
  }

  return (
    <Card className="p-4 sm:p-6">
      <section aria-labelledby="sync-title">
        <h2 id="sync-title" className="flex items-center gap-2 text-xl font-bold">
          <FolderSync className="size-6 text-brand-700" aria-hidden="true" />
          ফোল্ডার সিঙ্ক
        </h2>
        <p className="mt-1 text-muted">
          Supabase ড্যাশবোর্ডে <span className="font-medium text-ink">Storage → gallery → activities → (ফোল্ডার)</span>-এ সরাসরি রাখা
          ছবিগুলো খুঁজে স্বয়ংক্রিয়ভাবে ছোট (WebP) করে গ্যালারিতে যুক্ত করে। নতুন ছবি <strong>অপ্রকাশিত</strong> অবস্থায় যুক্ত হয় —
          দেখে নিয়ে প্রকাশ করুন। যেসব ছবির ফাইল স্টোরেজে নেই, সেগুলোর তালিকাও দেখায়।
        </p>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
          <li>
            ছবি রাখুন ক্যাটাগরির ফোল্ডারে (<code dir="ltr">activities/&lt;ফোল্ডার&gt;/</code>) অথবা তার ভেতরের একটি ফোল্ডারে; এর বেশি গভীরে বা{" "}
            <code dir="ltr">activities/</code>-এ সরাসরি রাখা ফাইল যুক্ত হয় না (তালিকায় দেখানো হয়)।
          </li>
          <li>ড্যাশবোর্ডে রাখা মূল ফাইল সিঙ্কের আগ পর্যন্ত সরাসরি লিংকে খোলা যায়, তাই ছবি রাখার পরপরই সিঙ্ক চালান।</li>
        </ul>

        <details className="mt-3 rounded-xl border border-line bg-cream px-4 py-2">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">ফোল্ডারের নাম ও ক্যাটাগরির তালিকা</summary>
          <ul className="mb-2 mt-1 space-y-1 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap gap-x-2">
                <code className="rounded bg-white px-1.5 py-0.5 text-brand-800" dir="ltr">activities/{c.slug}/</code>
                <span>{c.name}</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-4">
          <Button variant="outline" onClick={run} disabled={running || uploading} aria-describedby={uploading ? "sync-wait" : undefined}>
            {running ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FolderSync className="size-5" aria-hidden="true" />
            )}
            {running ? "সিঙ্ক চলছে…" : "ফোল্ডার সিঙ্ক করুন"}
          </Button>
          {uploading && (
            <p id="sync-wait" className="mt-2 text-sm text-muted">আপলোড শেষ হলে সিঙ্ক করা যাবে।</p>
          )}
        </div>

        <div aria-live="polite" className="mt-4 space-y-3">
          {running && progress && (
            <p className="text-muted">
              এ পর্যন্ত {bn(progress.registered)}টি ছবি যুক্ত হয়েছে
              {progress.remaining > 0 ? ` · আরও ${bn(progress.remaining)}টি বাকি` : ""}…
            </p>
          )}
          {error && <Alert>{error}</Alert>}
          {totals && !running && (
            <div className="space-y-3" data-testid="sync-summary">
              <Alert tone={totals.failed.length > 0 ? "error" : "success"}>
                <p className="font-semibold">সিঙ্ক সম্পন্ন</p>
                <ul className="mt-1 space-y-0.5">
                  <li>নতুন যুক্ত (অপ্রকাশিত): {bn(totals.registered)}টি</li>
                  <li>ব্যর্থ: {bn(totals.failed.length)}টি</li>
                  <li>ফাইল পাওয়া যায়নি: {bn(totals.missing.length)}টি</li>
                </ul>
                {totals.registered > 0 && (
                  <Link href="/admin/gallery?status=unpublished" className="mt-2 inline-block font-semibold underline underline-offset-4">
                    অপ্রকাশিত ছবিগুলো দেখুন
                  </Link>
                )}
              </Alert>
              {totals.failed.length > 0 && (
                <div>
                  <p className="font-semibold">ব্যর্থ ফাইল</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {totals.failed.map((f) => (
                      <li key={f.path} className="break-all">
                        <code dir="ltr">{f.path}</code> — {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {totals.missing.length > 0 && (
                <div>
                  <p className="font-semibold">ডাটাবেসে আছে কিন্তু ফাইল নেই</p>
                  <p className="text-sm text-muted">এগুলো ওয়েবসাইটে ভাঙা ছবি হিসেবে দেখাতে পারে; অপ্রকাশ করুন বা মুছে ফেলুন।</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {totals.missing.map((m) => (
                      <li key={`${m.id}-${m.what}`} className="break-all">
                        <code dir="ltr">{m.path}</code>
                        {m.what === "thumb" ? " (থাম্বনেইল)" : ""}
                        {m.caption ? ` — ${m.caption}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {totals.ignored.length > 0 && (
                <div>
                  <p className="font-semibold">যুক্ত করা হয়নি — ফাইলগুলো ঠিক ফোল্ডারে সরান</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {totals.ignored.map((f) => (
                      <li key={f.path} className="break-all">
                        <code dir="ltr">{f.path}</code> — {IGNORED_REASON[f.reason]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {totals.unknownFolders.length > 0 && (
                <p className="text-sm text-muted">
                  কোনো ক্যাটাগরির সাথে মেলে না এমন ফোল্ডার (উপেক্ষা করা হয়েছে):{" "}
                  {totals.unknownFolders.map((f) => (
                    <code key={f} dir="ltr" className="me-2">{f}</code>
                  ))}
                </p>
              )}
              {totals.unreadableFolders.length > 0 && (
                <p className="text-sm text-red-700">
                  পড়া যায়নি: {totals.unreadableFolders.map((f) => (
                    <code key={f} dir="ltr" className="me-2">{f}</code>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </Card>
  );
}
