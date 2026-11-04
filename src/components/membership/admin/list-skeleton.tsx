/** Placeholder while an admin list (applications / members) loads. */
export function AdminListSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">{label}</p>
      <div className="h-9 w-56 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
      <div className="mt-3 h-5 w-full max-w-md rounded bg-stone-100" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-11 w-28 animate-pulse rounded-xl bg-stone-200 motion-reduce:animate-none" />
        ))}
      </div>
      <ul className="mt-6 space-y-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="size-11 shrink-0 animate-pulse rounded-full bg-stone-200 motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-stone-200" />
              <div className="h-3 w-1/3 rounded bg-stone-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
