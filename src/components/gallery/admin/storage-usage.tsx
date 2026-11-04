import { bn } from "@/lib/format";
import { Card } from "@/components/ui/card";

/** Supabase free tier storage quota. */
const QUOTA_BYTES = 1024 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bn(bytes)} B`;
  if (bytes < 1024 * 1024) return `${bn((bytes / 1024).toFixed(0))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${bn((bytes / (1024 * 1024)).toFixed(1))} MB`;
  return `${bn((bytes / (1024 * 1024 * 1024)).toFixed(2))} GB`;
}

export function StorageUsage({
  total,
  published,
  featured,
  objectCount,
  totalBytes,
}: {
  total: number;
  published: number;
  featured: number;
  objectCount: number;
  totalBytes: number;
}) {
  const pct = Math.min(100, (totalBytes / QUOTA_BYTES) * 100);
  const tone = pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-amber-500" : "bg-brand-600";
  const tiles = [
    { label: "মোট ছবি", value: bn(total) },
    { label: "প্রকাশিত", value: bn(published) },
    { label: "হিরো স্লাইডারে", value: bn(featured) },
  ];
  return (
    <section aria-label="গ্যালারির সারসংক্ষেপ" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="p-4">
          <p className="text-sm text-muted">{t.label}</p>
          <p className="mt-1 font-serif text-2xl font-bold text-brand-900">{t.value}</p>
        </Card>
      ))}
      <Card className="p-4">
        <p className="text-sm text-muted">স্টোরেজ ব্যবহার (ফ্রি সীমা ১ GB)</p>
        <p className="mt-1 font-serif text-2xl font-bold text-brand-900">{formatBytes(totalBytes)}</p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"
          role="meter"
          aria-label="স্টোরেজ ব্যবহার"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-valuetext={`${bn(pct.toFixed(1))}% ব্যবহৃত`}
        >
          <div className={`h-full ${tone}`} style={{ width: `${Math.max(pct, totalBytes > 0 ? 1 : 0)}%` }} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {bn(pct.toFixed(1))}% · {bn(objectCount)}টি ফাইল (থাম্বনেইলসহ)
        </p>
      </Card>
    </section>
  );
}
