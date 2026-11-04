import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bn, formatDate } from "@/lib/format";
import { galleryUrl, IMAGE_LIMITS } from "@/lib/storage";
import { fitWithin, isUuid } from "@/lib/gallery/paths";
import { HERO_SLIDES_LIMIT, heroPlacements, inHeroOrder } from "@/lib/gallery/hero";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Alert, Select } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pager } from "@/components/gallery/pager";
import { UploadPanel, type ProgramOption } from "@/components/gallery/admin/upload-panel";
import { SyncPanel } from "@/components/gallery/admin/sync-panel";
import { ImageManager, type AdminImage } from "@/components/gallery/admin/image-manager";
import { StorageUsage } from "@/components/gallery/admin/storage-usage";

export const metadata: Metadata = { title: "গ্যালারি" };
// Folder sync converts images with sharp; give its server action time (Vercel).
export const maxDuration = 60;

const PAGE_SIZE = 40;
const STATUSES = {
  all: "সব ছবি",
  published: "প্রকাশিত",
  unpublished: "অপ্রকাশিত",
  featured: "হিরো স্লাইডারে (হোমপেজের উপরে)",
} as const;
type Status = keyof typeof STATUSES;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requirePagePermission("gallery.manage");
  const sp = await searchParams;
  const categoryFilter = isUuid(one(sp.category)) ? one(sp.category) : "";
  const status: Status = one(sp.status) in STATUSES ? (one(sp.status) as Status) : "all";
  const pageRaw = Number(one(sp.page));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const supabase = await createClient();
  let query = supabase
    .from("gallery_images")
    .select(
      "id, category_id, program_id, storage_path, thumb_path, width, height, size_bytes, caption, event_date, is_published, is_featured, sort_order, source, created_at",
      { count: "exact" },
    );
  if (categoryFilter) query = query.eq("category_id", categoryFilter);
  if (status === "published") query = query.eq("is_published", true);
  if (status === "unpublished") query = query.eq("is_published", false);
  if (status === "featured") query = query.eq("is_featured", true);
  query = categoryFilter
    ? query.order("sort_order", { ascending: true }).order("created_at", { ascending: false })
    : query.order("created_at", { ascending: false });
  const from = (page - 1) * PAGE_SIZE;

  const [cats, stats, usage, images, programRows, heroRows] = await Promise.all([
    supabase.from("activity_categories").select("id, slug, name_bn, is_active, cover_image_id").order("sort_order").order("name_bn"),
    supabase.rpc("gallery_admin_stats"),
    supabase.rpc("gallery_storage_usage"),
    query.order("id").range(from, from + PAGE_SIZE - 1),
    // Programs a photo can be linked to (staff without content.manage see published ones).
    supabase.from("programs").select("id, title_bn, category_id, starts_on, is_published").order("starts_on", { ascending: false }).limit(500),
    // Every photo marked “হিরো স্লাইডার”, in the homepage's order: which of them the homepage shows.
    inHeroOrder(
      supabase
        .from("gallery_images")
        .select("id, is_published, category:activity_categories!gallery_images_category_id_fkey(is_active)")
        .eq("is_featured", true),
    ),
  ]);
  const programOptions: ProgramOption[] = (programRows.data ?? []).map((p) => ({
    id: p.id,
    categoryId: p.category_id,
    label: `${p.title_bn} — ${formatDate(p.starts_on)}${p.is_published ? "" : " (খসড়া)"}`,
  }));
  const programTitle = new Map((programRows.data ?? []).map((p) => [p.id, p.title_bn]));
  const hero = heroPlacements(
    (heroRows.data ?? []).map((r) => ({ id: r.id, isPublished: r.is_published, categoryActive: r.category?.is_active === true })),
  );
  if (heroRows.error) console.error("[admin gallery] hero placements:", heroRows.error.message);
  const heroShown = [...hero.values()].filter((p) => p.status === "shown").length;

  const loadError = cats.error || stats.error || (images.error && images.error.code !== "PGRST103");
  const categories = cats.data ?? [];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const totals = (stats.data ?? []).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total),
      published: acc.published + Number(r.published),
      featured: acc.featured + Number(r.featured),
    }),
    { total: 0, published: 0, featured: 0 },
  );
  const usageRow = usage.data?.[0];

  const rows: AdminImage[] = (images.data ?? []).map((r) => {
    const cat = catById.get(r.category_id);
    const w = r.width ?? 1600;
    const h = r.height ?? 1200;
    const t = fitWithin(w, h, IMAGE_LIMITS.thumbMaxDimension);
    return {
      id: r.id,
      categoryId: r.category_id,
      categoryName: cat?.name_bn ?? "—",
      categorySlug: cat?.slug ?? "",
      isCover: cat?.cover_image_id === r.id,
      storagePath: r.storage_path,
      src: galleryUrl(r.storage_path) ?? "",
      thumb: galleryUrl(r.thumb_path ?? r.storage_path) ?? "",
      width: w,
      height: h,
      thumbWidth: r.thumb_path ? t.width : w,
      thumbHeight: r.thumb_path ? t.height : h,
      sizeBytes: r.size_bytes,
      caption: r.caption,
      eventDate: r.event_date,
      isPublished: r.is_published,
      isFeatured: r.is_featured,
      hero: r.is_featured ? (hero.get(r.id) ?? null) : null,
      programId: r.program_id,
      programTitle: r.program_id ? (programTitle.get(r.program_id) ?? null) : null,
      sortOrder: r.sort_order,
      source: r.source === "sync" ? "sync" : "upload",
      createdAt: r.created_at,
    };
  });
  const total = images.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (p: number) => {
    const q = new URLSearchParams();
    if (categoryFilter) q.set("category", categoryFilter);
    if (status !== "all") q.set("status", status);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/admin/gallery?${s}` : "/admin/gallery";
  };

  const categoryOptions = categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name_bn, isActive: c.is_active }));

  return (
    <>
      <AdminPageHeader
        title="গ্যালারি"
        description="ছবি আপলোড, ক্যাপশন, প্রকাশ, হিরো স্লাইডার (হোমপেজের উপরে), কর্মসূচির সাথে সংযোগ, ক্রম ও ক্যাটাগরি ব্যবস্থাপনা।"
      />

      {loadError && (
        <div className="mb-6">
          <Alert>তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}

      <StorageUsage
        total={totals.total}
        published={totals.published}
        featured={totals.featured}
        objectCount={Number(usageRow?.object_count ?? 0)}
        totalBytes={Number(usageRow?.total_bytes ?? 0)}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <UploadPanel categories={categoryOptions} programs={programOptions} />
        <SyncPanel categories={categoryOptions} />
      </div>

      <section aria-labelledby="manage-heading" className="mt-10">
        <h2 id="manage-heading" className="text-xl font-bold sm:text-2xl">ছবি ব্যবস্থাপনা</h2>
        <Card className="mt-4 p-4 sm:p-5">
          <form method="get" action="/admin/gallery" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <label htmlFor="filter-category" className="block font-medium">ক্যাটাগরি</label>
              <Select id="filter-category" name="category" defaultValue={categoryFilter}>
                <option value="">সব ক্যাটাগরি</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_bn}
                    {c.is_active ? "" : " (নিষ্ক্রিয়)"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filter-status" className="block font-medium">অবস্থা</label>
              <Select id="filter-status" name="status" defaultValue={status}>
                {Object.entries(STATUSES).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass("primary", "md", "flex-1 sm:flex-none")}>ফিল্টার করুন</button>
              {(categoryFilter || status !== "all") && (
                <Link href="/admin/gallery" className={buttonClass("ghost", "md")}>রিসেট</Link>
              )}
            </div>
          </form>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            মোট {bn(total)}টি ছবি{totalPages > 1 ? ` · পৃষ্ঠা ${bn(page)} / ${bn(totalPages)}` : ""}
            {categoryFilter ? " · এই ক্যাটাগরির প্রদর্শন ক্রম অনুযায়ী সাজানো" : " · নতুন আপলোড আগে"}
          </p>
          {!heroRows.error && (
            <p className="mt-1 text-sm text-muted" data-testid="hero-summary">
              {heroShown > 0
                ? `হিরো স্লাইডারে চিহ্নিত ${bn(hero.size)}টি ছবি · হোমপেজে দেখাচ্ছে ${bn(heroShown)}টি (প্রদর্শন ক্রম অনুযায়ী প্রথম ${bn(HERO_SLIDES_LIMIT)}টি প্রকাশিত ছবি)`
                : `হিরো স্লাইডারে দেখানোর মতো কোনো ছবি চিহ্নিত নেই — হোমপেজে সর্বশেষ ${bn(HERO_SLIDES_LIMIT)}টি প্রকাশিত ছবি দেখাচ্ছে।`}
            </p>
          )}
        </Card>

        <div className="mt-4">
          <ImageManager
            images={rows}
            categories={categoryOptions}
            programs={programOptions}
            canDelete={staff.permissions.has("gallery.delete")}
            canSetCover={staff.permissions.has("content.manage")}
            reorderEnabled={Boolean(categoryFilter) && status === "all"}
            filtered={Boolean(categoryFilter) || status !== "all"}
            offset={from}
          />
        </div>
        <Pager page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </section>
    </>
  );
}
