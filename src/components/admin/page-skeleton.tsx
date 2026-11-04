/** Placeholder shown while an admin page loads. */
export function AdminPageSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">{label}</p>
      <div className="h-9 w-56 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none" />
      <div className="mt-3 h-5 w-full max-w-md rounded bg-stone-100" />
      <div className="mt-6 flex flex-wrap gap-2" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-11 w-28 animate-pulse rounded-xl bg-stone-200 motion-reduce:animate-none" />
        ))}
      </div>
      <ul className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="space-y-2 p-4">
            <div className="h-4 w-2/5 animate-pulse rounded bg-stone-200 motion-reduce:animate-none" />
            <div className="h-3 w-1/3 rounded bg-stone-100" />
          </li>
        ))}
      </ul>
    </div>
  );
}
