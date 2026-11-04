import { Badge } from "@/components/ui/badge";
import type { AuditView } from "@/lib/admin/audit";
import { bn } from "@/lib/format";

/** One audit-log entry as a readable Bengali line plus the changed fields. */
export function AuditEntry({ entry, compact = false }: { entry: AuditView; compact?: boolean }) {
  const fields = compact ? entry.fields.slice(0, 4) : entry.fields;
  const more = entry.fields.length - fields.length;
  return (
    <li className="px-4 py-3 sm:px-5" data-testid="audit-entry">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge tone={entry.actionTone}>{entry.action}</Badge>
        <span className="font-semibold text-ink">{entry.entity}</span>
        {entry.subject && <span className="min-w-0 break-words text-ink">— “{entry.subject}”</span>}
      </div>
      <p className="mt-1 text-sm text-muted">
        <span className={entry.isSystem ? "italic" : "font-medium text-ink/80"}>{entry.actor}</span>
        <span aria-hidden="true"> · </span>
        <time dateTime={entry.createdAt}>{entry.when}</time>
      </p>
      {fields.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="পরিবর্তিত তথ্য">
          {fields.map((f) => (
            <li key={f.key} className="max-w-full rounded-lg bg-stone-100 px-2 py-0.5 text-sm text-stone-700">
              <span className="font-medium">{f.label}</span>
              {f.value !== null && <span className="break-words">: {f.value}</span>}
            </li>
          ))}
          {more > 0 && <li className="px-1 text-sm text-muted">আরও {bn(more)}টি</li>}
        </ul>
      )}
    </li>
  );
}
