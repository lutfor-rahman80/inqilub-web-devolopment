"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Lock, Minus, Pencil, Plus, Trash2, Users } from "lucide-react";
import { createRole, deleteRole, updateRole } from "@/app/admin/(panel)/roles/actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminModal } from "@/components/admin/modal";
import { CheckField } from "@/components/admin/check-field";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PendingButton } from "@/components/admin/pending-button";
import { Alert, Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FieldErrors } from "@/lib/admin/schemas";
import { slugifyRoleKey } from "@/lib/admin/text";
import { bn } from "@/lib/format";

export type PermissionInfo = { key: string; name: string; description: string };
export type RoleInfo = {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isSuper: boolean;
  permissions: string[];
  userCount: number;
  activeUserCount: number;
};

type Dialog = { kind: "create" } | { kind: "edit"; role: RoleInfo } | { kind: "delete"; role: RoleInfo };

function PermissionChecklist({
  permissions,
  selected,
  onToggle,
  idPrefix,
}: {
  permissions: PermissionInfo[];
  selected: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  idPrefix: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">অনুমতি</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {permissions.map((p) => (
          <CheckField
            key={p.key}
            id={`${idPrefix}-${p.key.replace(".", "-")}`}
            label={p.name}
            hint={p.description}
            checked={selected.has(p.key)}
            onChange={(e) => onToggle(p.key, e.target.checked)}
            data-permission={p.key}
          />
        ))}
      </div>
      {selected.has("users.manage") && (
        <p className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          “ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা” অনুমতি থাকলে এই ভূমিকার ব্যক্তিরা নতুন অ্যাকাউন্ট তৈরি ও অন্যদের অনুমতি বদলাতে পারবেন। শুধু
          বিশ্বস্ত দায়িত্বশীলদের দিন।
        </p>
      )}
    </fieldset>
  );
}

function RoleForm({
  mode,
  role,
  permissions,
  onSaved,
  onBusy,
}: {
  mode: "create" | "edit";
  role?: RoleInfo;
  permissions: PermissionInfo[];
  onSaved: (message: string) => void;
  onBusy: (b: boolean) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [latin, setLatin] = useState("");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState(() => new Set(role?.permissions ?? []));
  const [fe, setFe] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const key = slugifyRoleKey(latin);

  useEffect(() => onBusy(pending), [pending, onBusy]);
  useEffect(() => {
    if (Object.keys(fe).length) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [fe]);

  function toggle(k: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  }

  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        // Keep the permissions in their canonical order.
        const perms = permissions.map((p) => p.key).filter((k) => selected.has(k));
        startTransition(async () => {
          try {
            const r =
              mode === "create"
                ? await createRole({ name_bn: name, key: latin, description, permissions: perms })
                : await updateRole(role!.id, { name_bn: name, description, permissions: perms });
            if (!r.ok) {
              setFe(r.fieldErrors ?? {});
              setError(r.error);
              return;
            }
            onSaved(mode === "create" ? `“${name.trim()}” ভূমিকা তৈরি হয়েছে।` : `“${name.trim()}” ভূমিকার পরিবর্তন সংরক্ষিত হয়েছে।`);
          } catch {
            setError("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
          }
        });
      }}
    >
      {error && <Alert>{error}</Alert>}
      {role?.isSystem && (
        <Alert tone="info">এটি সিস্টেম ভূমিকা: নাম, বিবরণ ও অনুমতি বদলানো যায়, তবে মুছে ফেলা যায় না।</Alert>
      )}
      <Field id="role-name" label="ভূমিকার নাম (বাংলায়)" required error={fe.name_bn} hint={mode === "create" ? "যেমন: সভাপতি" : undefined}>
        <Input
          id="role-name"
          data-autofocus
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={fe.name_bn ? true : undefined}
          aria-describedby={fe.name_bn ? "role-name-error" : mode === "create" ? "role-name-hint" : undefined}
        />
      </Field>
      {mode === "create" && (
        <Field
          id="role-key"
          label="সংক্ষিপ্ত নাম (ইংরেজিতে)"
          required
          error={fe.key}
          hint={
            <>
              সিস্টেমের ভেতরে ব্যবহৃত স্থায়ী নাম; পরে বদলানো যায় না। যেমন: <span dir="ltr">President</span>।{" "}
              {key ? (
                <>
                  তৈরি হবে: <code dir="ltr" className="rounded bg-cream px-1.5 py-0.5 text-brand-800" data-testid="role-key-preview">{key}</code>
                </>
              ) : null}
            </>
          }
        >
          <Input
            id="role-key"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            maxLength={60}
            value={latin}
            onChange={(e) => setLatin(e.target.value)}
            aria-invalid={fe.key ? true : undefined}
            aria-describedby={fe.key ? "role-key-error" : "role-key-hint"}
          />
        </Field>
      )}
      <Field id="role-desc" label="বিবরণ" error={fe.description}>
        <Input
          id="role-desc"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={fe.description ? true : undefined}
          aria-describedby={fe.description ? "role-desc-error" : undefined}
        />
      </Field>
      <PermissionChecklist permissions={permissions} selected={selected} onToggle={toggle} idPrefix={`perm-${mode}`} />
      {fe.permissions && <p role="alert" className="text-sm font-medium text-red-700">{fe.permissions}</p>}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <PendingButton type="submit" pending={pending}>
          {pending ? "সংরক্ষণ হচ্ছে…" : mode === "create" ? "ভূমিকা তৈরি করুন" : "সংরক্ষণ করুন"}
        </PendingButton>
      </div>
    </form>
  );
}

function Mark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-100 text-brand-800" title={label}>
      <Check className="size-4" aria-hidden="true" />
      <span className="sr-only">আছে</span>
    </span>
  ) : (
    <span className="inline-flex size-7 items-center justify-center text-stone-400">
      <Minus className="size-4" aria-hidden="true" />
      <span className="sr-only">নেই</span>
    </span>
  );
}

export function RolesManager({
  roles,
  permissions,
  myRoleKey,
}: {
  roles: RoleInfo[];
  permissions: PermissionInfo[];
  myRoleKey: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const permName = new Map(permissions.map((p) => [p.key, p.name]));

  const saved = (message: string) => {
    setBusy(false);
    setDialog(null);
    setNotice(message);
    router.refresh();
  };

  const actions = (r: RoleInfo, compact = false) =>
    r.isSuper ? (
      <span className="inline-flex items-center gap-1 text-sm text-muted">
        <Lock className="size-4" aria-hidden="true" /> পরিবর্তনযোগ্য নয়
      </span>
    ) : (
      <div className={`flex flex-wrap gap-1.5 ${compact ? "justify-center" : ""}`}>
        <Button variant="outline" size="sm" className="min-h-11" onClick={() => setDialog({ kind: "edit", role: r })} aria-label={`${r.name}: সম্পাদনা`}>
          <Pencil className="size-4" aria-hidden="true" /> {compact ? <span className="sr-only">সম্পাদনা</span> : "সম্পাদনা"}
        </Button>
        {!r.isSystem && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 text-red-700 hover:bg-red-50"
            onClick={() => setDialog({ kind: "delete", role: r })}
            aria-label={`${r.name}: মুছে ফেলুন`}
          >
            <Trash2 className="size-4" aria-hidden="true" /> {compact ? <span className="sr-only">মুছে ফেলুন</span> : "মুছুন"}
          </Button>
        )}
      </div>
    );

  return (
    <>
      <AdminPageHeader
        title="ভূমিকা ও অনুমতি"
        description="কোন ভূমিকার ব্যক্তি কী দেখতে ও করতে পারবেন তা এখানে নির্ধারিত হয়। অনুমতি ডেটাবেসেও যাচাই করা হয়।"
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="size-5" aria-hidden="true" /> নতুন ভূমিকা
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      {/* Matrix (large screens) */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] lg:block">
        <table className="w-full min-w-[48rem] text-start" data-testid="permission-matrix">
          <caption className="sr-only">ভূমিকা অনুযায়ী অনুমতির তালিকা</caption>
          <thead className="bg-cream align-bottom text-sm">
            <tr>
              <th scope="col" className="w-72 px-4 py-3 text-start font-semibold text-muted">অনুমতি</th>
              {roles.map((r) => (
                <th key={r.id} scope="col" className="px-2 py-3 text-center font-semibold text-brand-900" data-role-key={r.key}>
                  <span className="block">{r.name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">
                    {bn(r.userCount)} জন{r.isSuper ? " · সকল অনুমতি" : !r.isSystem ? " · নিজস্ব" : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {permissions.map((p) => (
              <tr key={p.key} className="hover:bg-brand-50/30">
                <th scope="row" className="px-4 py-2.5 text-start font-normal">
                  <span className="block font-medium text-ink">{p.name}</span>
                  <span className="block text-sm text-muted">{p.description}</span>
                </th>
                {roles.map((r) => (
                  <td key={r.id} className="px-2 py-2.5 text-center" data-role-key={r.key} data-permission={p.key}>
                    <Mark on={r.isSuper || r.permissions.includes(p.key)} label={`${r.name}: ${p.name}`} />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-cream/60">
              <th scope="row" className="px-4 py-3 text-start text-sm font-semibold text-muted">পরিবর্তন</th>
              {roles.map((r) => (
                <td key={r.id} className="px-2 py-3 text-center">{actions(r, true)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cards (phones / tablets) */}
      <ul className="grid gap-3 md:grid-cols-2 lg:hidden" data-testid="role-cards">
        {roles.map((r) => (
          <li key={r.id} data-role-key={r.key}>
            <Card className="h-full p-4">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-lg font-bold text-brand-900">{r.name}</span>
                {r.isSuper ? <Badge tone="amber">সকল অনুমতি</Badge> : r.isSystem ? <Badge>সিস্টেম</Badge> : <Badge tone="blue">নিজস্ব</Badge>}
              </p>
              {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Users className="size-4" aria-hidden="true" /> {bn(r.userCount)} জন ব্যবহারকারী
              </p>
              {r.isSuper ? (
                <p className="mt-3 text-sm">সব অনুমতি স্বয়ংক্রিয়ভাবে আছে।</p>
              ) : r.permissions.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${r.name}-এর অনুমতি`}>
                  {permissions
                    .filter((p) => r.permissions.includes(p.key))
                    .map((p) => (
                      <li key={p.key} className="rounded-lg bg-brand-50 px-2 py-0.5 text-sm text-brand-800">{permName.get(p.key)}</li>
                    ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">কোনো অনুমতি নেই।</p>
              )}
              <div className="mt-4">{actions(r)}</div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted">
        সুপার অ্যাডমিন ভূমিকার সব অনুমতি স্থায়ী। সিস্টেম ভূমিকা মুছে ফেলা যায় না; নিজস্ব ভূমিকা কেবল তখনই মুছে ফেলা যায় যখন কোনো ব্যবহারকারীকে
        সেই ভূমিকা দেওয়া নেই।
      </p>

      {dialog?.kind === "create" && (
        <AdminModal title="নতুন ভূমিকা" onClose={() => !busy && setDialog(null)} busy={busy} size="lg">
          <RoleForm mode="create" permissions={permissions} onSaved={saved} onBusy={setBusy} />
        </AdminModal>
      )}
      {dialog?.kind === "edit" && (
        <AdminModal title={`ভূমিকা: ${dialog.role.name}`} onClose={() => !busy && setDialog(null)} busy={busy} size="lg">
          {dialog.role.key === myRoleKey && (
            <div className="mb-4">
              <Alert tone="info">এটি আপনার নিজের ভূমিকা। এখানে অনুমতি বদলালে আপনার নিজের অনুমতিও বদলে যাবে।</Alert>
            </div>
          )}
          <RoleForm mode="edit" role={dialog.role} permissions={permissions} onSaved={saved} onBusy={setBusy} />
        </AdminModal>
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="ভূমিকাটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            const r = await deleteRole(dialog.role.id);
            if (!r.ok) return r.error;
            saved(`“${dialog.role.name}” ভূমিকা মুছে ফেলা হয়েছে।`);
            return null;
          }}
        >
          <p>
            “<strong>{dialog.role.name}</strong>” ভূমিকা স্থায়ীভাবে মুছে যাবে।
          </p>
          {dialog.role.userCount > 0 && (
            <p className="text-red-800">
              এই ভূমিকায় এখনো {bn(dialog.role.userCount)} জন ব্যবহারকারী আছেন — আগে “ব্যবহারকারী” পাতা থেকে তাঁদের অন্য ভূমিকা দিন।
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
