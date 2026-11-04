import Link from "next/link";

/**
 * Filter "tabs" for the public lists. They are links (each filter has its own
 * URL), so they are marked up as navigation with aria-current — not as an
 * ARIA tablist. The few items wrap onto a second line on narrow phones
 * (every option stays visible; no hidden horizontal scrolling); 44px targets.
 */
export function FilterTabs({
  label,
  items,
  active,
}: {
  label: string;
  items: { key: string; label: string; href: string; count?: number | string }[];
  active: string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const current = item.key === active;
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={`press inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-5 font-semibold transition-colors ${
                  current
                    ? "border-forest-600 bg-forest-600 text-white shadow-sm"
                    : "border-line bg-white text-forest-800 hover:border-sage-300 hover:bg-sage-50"
                }`}
              >
                {item.label}
                {item.count !== undefined && (
                  <span className={`rounded-full px-2 text-sm ${current ? "bg-white/20 text-white" : "bg-sage-100 text-forest-800"}`}>
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
