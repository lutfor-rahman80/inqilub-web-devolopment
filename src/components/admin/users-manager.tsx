"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, KeyRound, Pencil, ShieldCheck, UserPlus } from "lucide-react";
import { createStaffUser, resetStaffPassword, updateStaffUser } from "@/app/admin/(panel)/users/actions";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminModal } from "@/components/admin/modal";
import { CheckField } from "@/components/admin/check-field";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PasswordReveal } from "@/components/admin/password-reveal";
import { PendingButton } from "@/components/admin/pending-button";
import { Alert, Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PASSWORD_LIMITS, type FieldErrors } from "@/lib/admin/schemas";
import { bn, formatDate, formatDateTime } from "@/lib/format";

export type StaffRow = {
  id: string;
  fullName: string;
  email: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  isActive: boolean;
  roleId: string;
  roleKey: string;
  roleName: string;
};

export type RoleOption = { id: string; key: string; name: string; description: string };

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; row: StaffRow }
  | { kind: "reset"; row: StaffRow }
  | { kind: "password"; title: string; email: string | null; password: string | null; note?: string };

function useFocusFirstInvalid(errors: FieldErrors, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (Object.keys(errors).length) root.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [errors, root]);
}

function RoleSelect({
  id,
  roles,
  value,
  onChange,
  error,
  disabled,
  hint,
}: {
  id: string;
  roles: RoleOption[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  hint?: React.ReactNode;
}) {
  const selected = roles.find((r) => r.id === value);
  const hintText = hint ?? (selected?.description || undefined);
  return (
    <Field id={id} label="ভূমিকা" required error={error} hint={hintText}>
      <Select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hintText ? `${id}-hint` : undefined}
      >
        <option value="">— ভূমিকা নির্বাচন করুন —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </Select>
    </Field>
  );
}

function CreateUserForm({ roles, onDone, onBusy }: { roles: RoleOption[]; onDone: (d: Dialog) => void; onBusy: (b: boolean) => void }) {
  const [v, setV] = useState({ email: "", full_name: "", role_id: "", password_mode: "generate" as "generate" | "manual", password: "" });
  const [fe, setFe] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(fe, ref);
  useEffect(() => onBusy(pending), [pending, onBusy]);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((p) => ({ ...p, [k]: value }));

  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const r = await createStaffUser(v);
            if (!r.ok) {
              setFe(r.fieldErrors ?? {});
              setError(r.error);
              return;
            }
            onDone({
              kind: "password",
              title: "নতুন অ্যাকাউন্ট তৈরি হয়েছে",
              email: r.email,
              password: r.password,
              note: r.password ? undefined : "আপনার দেওয়া পাসওয়ার্ডটি নিরাপদ উপায়ে ব্যবহারকারীকে জানান এবং প্রথম লগইনের পর তা বদলে নিতে বলুন।",
            });
          } catch {
            setError("অ্যাকাউন্ট তৈরি করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
          }
        });
      }}
    >
      {error && <Alert>{error}</Alert>}
      <Field id="new-email" label="ইমেইল (লগইন আইডি)" required error={fe.email}>
        <Input
          id="new-email"
          data-autofocus
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="off"
          maxLength={254}
          value={v.email}
          onChange={(e) => set("email", e.target.value)}
          aria-invalid={fe.email ? true : undefined}
          aria-describedby={fe.email ? "new-email-error" : undefined}
        />
      </Field>
      <Field id="new-name" label="পূর্ণ নাম" required error={fe.full_name}>
        <Input
          id="new-name"
          autoComplete="off"
          maxLength={120}
          value={v.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          aria-invalid={fe.full_name ? true : undefined}
          aria-describedby={fe.full_name ? "new-name-error" : undefined}
        />
      </Field>
      <RoleSelect id="new-role" roles={roles} value={v.role_id} onChange={(x) => set("role_id", x)} error={fe.role_id} />

      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">প্রাথমিক পাসওয়ার্ড</legend>
        {(
          [
            { value: "generate", label: "স্বয়ংক্রিয়ভাবে শক্তিশালী পাসওয়ার্ড তৈরি করুন (প্রস্তাবিত)" },
            { value: "manual", label: "নিজে পাসওয়ার্ড লিখে দিন" },
          ] as const
        ).map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 hover:bg-brand-50/60">
            <input
              type="radio"
              name="password_mode"
              value={o.value}
              checked={v.password_mode === o.value}
              onChange={() => set("password_mode", o.value)}
              className="size-5 shrink-0 accent-brand-700"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>
      {v.password_mode === "manual" && (
        <Field id="new-password" label="পাসওয়ার্ড" required error={fe.password} hint={`কমপক্ষে ${bn(PASSWORD_LIMITS.min)} অক্ষর; অক্ষর, সংখ্যা ও চিহ্ন মিলিয়ে দিন।`}>
          <Input
            id="new-password"
            type="text"
            dir="ltr"
            autoComplete="new-password"
            spellCheck={false}
            maxLength={PASSWORD_LIMITS.max}
            value={v.password}
            onChange={(e) => set("password", e.target.value)}
            aria-invalid={fe.password ? true : undefined}
            aria-describedby={fe.password ? "new-password-error" : "new-password-hint"}
            className="font-mono"
          />
        </Field>
      )}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <PendingButton type="submit" pending={pending} icon={<UserPlus className="size-5" aria-hidden="true" />}>
          {pending ? "তৈরি হচ্ছে…" : "অ্যাকাউন্ট তৈরি করুন"}
        </PendingButton>
      </div>
    </form>
  );
}

function EditUserForm({
  row,
  roles,
  isSelf,
  meIsSuper,
  isLastSuper,
  onSaved,
  onBusy,
}: {
  row: StaffRow;
  roles: RoleOption[];
  isSelf: boolean;
  meIsSuper: boolean;
  isLastSuper: boolean;
  onSaved: (message: string) => void;
  onBusy: (b: boolean) => void;
}) {
  const [v, setV] = useState({ full_name: row.fullName, role_id: row.roleId, is_active: row.isActive });
  const [fe, setFe] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(fe, ref);
  useEffect(() => onBusy(pending), [pending, onBusy]);
  const lockedSuper = row.roleKey === "super_admin" && !meIsSuper;

  return (
    <form
      ref={ref}
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const r = await updateStaffUser(row.id, v);
            if (!r.ok) {
              setFe(r.fieldErrors ?? {});
              setError(r.error);
              return;
            }
            onSaved(r.warning ?? `${v.full_name}-এর তথ্য সংরক্ষিত হয়েছে।`);
          } catch {
            setError("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
          }
        });
      }}
    >
      {error && <Alert>{error}</Alert>}
      {lockedSuper && <Alert tone="info">সুপার অ্যাডমিনের অ্যাকাউন্ট শুধু আরেকজন সুপার অ্যাডমিন পরিবর্তন করতে পারেন।</Alert>}
      <p className="break-all text-muted" dir="ltr">{row.email ?? ""}</p>
      <Field id="edit-name" label="পূর্ণ নাম" required error={fe.full_name}>
        <Input
          id="edit-name"
          autoComplete="off"
          maxLength={120}
          value={v.full_name}
          disabled={lockedSuper}
          onChange={(e) => setV((p) => ({ ...p, full_name: e.target.value }))}
          aria-invalid={fe.full_name ? true : undefined}
          aria-describedby={fe.full_name ? "edit-name-error" : undefined}
        />
      </Field>
      <RoleSelect
        id="edit-role"
        roles={roles}
        value={v.role_id}
        onChange={(x) => setV((p) => ({ ...p, role_id: x }))}
        error={fe.role_id}
        disabled={isSelf || lockedSuper}
        hint={isSelf ? "নিজের ভূমিকা নিজে পরিবর্তন করা যায় না।" : undefined}
      />
      <CheckField
        id="edit-active"
        label="সক্রিয় অ্যাকাউন্ট"
        hint={
          isSelf
            ? isLastSuper
              ? "আপনি একমাত্র সক্রিয় সুপার অ্যাডমিন — কমপক্ষে একজন সক্রিয় সুপার অ্যাডমিন থাকতে হবে, তাই নিজেকে নিষ্ক্রিয় করা যায় না।"
              : "নিজের অ্যাকাউন্ট নিজে নিষ্ক্রিয় করা যায় না।"
            : "টিক তুলে দিলে এই ব্যক্তি আর লগইন করতে পারবেন না; তাঁর আগের সব কাজের রেকর্ড থেকে যাবে।"
        }
        checked={v.is_active}
        disabled={isSelf || lockedSuper}
        onChange={(e) => setV((p) => ({ ...p, is_active: e.target.checked }))}
      />
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <PendingButton type="submit" pending={pending} disabled={lockedSuper}>
          {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
        </PendingButton>
      </div>
    </form>
  );
}

export function UsersManager({
  rows,
  roles,
  meId,
  meIsSuper,
  activeSuperCount,
  approverRoles,
  openCreate,
  authError,
}: {
  rows: StaffRow[];
  roles: RoleOption[];
  meId: string;
  meIsSuper: boolean;
  activeSuperCount: number;
  approverRoles: string[];
  openCreate: boolean;
  authError: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(openCreate ? { kind: "create" } : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Only a super admin may grant the super admin role (the database enforces it too).
  const assignable = meIsSuper ? roles : roles.filter((r) => r.key !== "super_admin");

  function close() {
    if (busy) return;
    const wasPassword = dialog?.kind === "password";
    setDialog(null);
    // Drop "?new=1" (from the dashboard shortcut) so a reload does not reopen the form.
    if (openCreate) router.replace("/admin/users", { scroll: false });
    else if (wasPassword) router.refresh();
  }

  const canResetFor = (r: StaffRow) => r.id !== meId && (meIsSuper || r.roleKey !== "super_admin");

  return (
    <>
      <AdminPageHeader
        title="ব্যবহারকারী"
        description="অ্যাডমিন প্যানেলে প্রবেশের অ্যাকাউন্ট। প্রত্যেকের ভূমিকা অনুযায়ী অনুমতি নির্ধারিত হয়।"
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <UserPlus className="size-5" aria-hidden="true" /> নতুন ব্যবহারকারী
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      {authError && (
        <div className="mb-4">
          <Alert>অ্যাকাউন্টের ইমেইল ও লগইনের তথ্য লোড করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।</Alert>
        </div>
      )}

      <Card className="mb-6 p-4 sm:p-5" data-testid="approver-help">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Info className="size-5 text-gold-600" aria-hidden="true" /> নতুন আবেদন-অনুমোদনকারী যোগ করবেন কীভাবে?
        </h2>
        <ol className="mt-2 list-decimal space-y-1 ps-6 text-ink/90">
          <li>“নতুন ব্যবহারকারী” বোতামে চাপ দিয়ে অ্যাকাউন্ট তৈরি করুন।</li>
          <li>
            ভূমিকা হিসেবে <strong>“সাধারণ সম্পাদক”</strong> দিন, অথবা এমন যেকোনো ভূমিকা দিন যাতে{" "}
            <strong>“আবেদন অনুমোদন / প্রত্যাখ্যান”</strong> অনুমতি আছে।
          </li>
          <li>
            নতুন ভূমিকা (যেমন সভাপতি) তৈরি বা কোনো ভূমিকার অনুমতি বদলাতে{" "}
            <Link href="/admin/roles" className="font-semibold text-brand-700 underline underline-offset-4">ভূমিকা ও অনুমতি</Link> পাতায় যান।
          </li>
        </ol>
        {approverRoles.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            বর্তমানে আবেদন অনুমোদন করতে পারে এমন ভূমিকা: {approverRoles.join(", ")}।
          </p>
        )}
      </Card>

      <h2 className="sr-only">ব্যবহারকারীর তালিকা</h2>
      <ul className="grid gap-3 lg:hidden" data-testid="users-cards">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)]" data-testid="user-card" data-email={r.email ?? ""}>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-brand-900">{r.fullName}</span>
              {r.id === meId && <Badge tone="amber">আপনি</Badge>}
              <span data-testid="user-status">{r.isActive ? <Badge tone="green">সক্রিয়</Badge> : <Badge tone="red">নিষ্ক্রিয়</Badge>}</span>
            </p>
            <p className="break-all text-sm text-muted" dir="ltr">{r.email ?? "—"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="size-4 text-brand-700" aria-hidden="true" /> {r.roleName}
            </p>
            <p className="mt-1 text-sm text-muted" data-testid="user-created">তৈরি: {formatDate(r.createdAt)}</p>
            <p className="text-sm text-muted">
              সর্বশেষ লগইন: {r.lastSignInAt ? formatDateTime(r.lastSignInAt) : "কখনো নয়"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="min-h-11" onClick={() => setDialog({ kind: "edit", row: r })} aria-label={`${r.fullName}: সম্পাদনা`}>
                <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
              </Button>
              {canResetFor(r) && (
                <Button variant="ghost" size="sm" className="min-h-11 border border-line" onClick={() => setDialog({ kind: "reset", row: r })} aria-label={`${r.fullName}: পাসওয়ার্ড রিসেট`}>
                  <KeyRound className="size-4" aria-hidden="true" /> পাসওয়ার্ড রিসেট
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)] lg:block">
        <table className="w-full text-start" data-testid="users-table">
          <caption className="sr-only">ব্যবহারকারীর তালিকা</caption>
          <thead className="bg-cream text-sm text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">নাম ও ইমেইল</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">ভূমিকা</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">অবস্থা</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">তৈরি</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">সর্বশেষ লগইন</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">কাজ</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-brand-50/40" data-testid="user-row" data-email={r.email ?? ""}>
                <td className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-900">
                    {r.fullName}
                    {r.id === meId && <Badge tone="amber">আপনি</Badge>}
                  </p>
                  <p className="break-all text-sm text-muted" dir="ltr">{r.email ?? "—"}</p>
                </td>
                <td className="px-4 py-3">{r.roleName}</td>
                <td className="px-4 py-3" data-testid="user-status">{r.isActive ? <Badge tone="green">সক্রিয়</Badge> : <Badge tone="red">নিষ্ক্রিয়</Badge>}</td>
                <td className="px-4 py-3 text-sm">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3 text-sm">{r.lastSignInAt ? formatDateTime(r.lastSignInAt) : <span className="text-muted">কখনো নয়</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDialog({ kind: "edit", row: r })} aria-label={`${r.fullName}: সম্পাদনা`}>
                      <Pencil className="size-4" aria-hidden="true" /> সম্পাদনা
                    </Button>
                    {canResetFor(r) && (
                      <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setDialog({ kind: "reset", row: r })} aria-label={`${r.fullName}: পাসওয়ার্ড রিসেট`}>
                        <KeyRound className="size-4" aria-hidden="true" /> পাসওয়ার্ড রিসেট
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog?.kind === "create" && (
        <AdminModal title="নতুন ব্যবহারকারী" onClose={close} busy={busy}>
          <CreateUserForm roles={assignable} onBusy={setBusy} onDone={(d) => { setBusy(false); setDialog(d); }} />
        </AdminModal>
      )}

      {dialog?.kind === "edit" && (
        <AdminModal title={`${dialog.row.fullName}: সম্পাদনা`} onClose={close} busy={busy}>
          <EditUserForm
            row={dialog.row}
            roles={dialog.row.roleKey === "super_admin" || meIsSuper ? roles : assignable}
            isSelf={dialog.row.id === meId}
            meIsSuper={meIsSuper}
            isLastSuper={dialog.row.roleKey === "super_admin" && dialog.row.isActive && activeSuperCount <= 1}
            onBusy={setBusy}
            onSaved={(message) => {
              setBusy(false);
              setDialog(null);
              setNotice(message);
              router.refresh();
            }}
          />
        </AdminModal>
      )}

      {dialog?.kind === "reset" && (
        <ConfirmDialog
          title="পাসওয়ার্ড রিসেট করবেন?"
          confirmLabel="নতুন পাসওয়ার্ড তৈরি করুন"
          tone="primary"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            const row = dialog.row;
            const r = await resetStaffPassword(row.id);
            if (!r.ok) return r.error;
            setDialog({ kind: "password", title: `${row.fullName}-এর নতুন পাসওয়ার্ড`, email: r.email ?? row.email, password: r.password });
            return null;
          }}
        >
          <p>
            <strong>{dialog.row.fullName}</strong>-এর জন্য একটি নতুন অস্থায়ী পাসওয়ার্ড তৈরি হবে। পুরনো পাসওয়ার্ড দিয়ে আর লগইন করা যাবে না।
          </p>
        </ConfirmDialog>
      )}

      {dialog?.kind === "password" && (
        <AdminModal title={dialog.title} onClose={close}>
          {dialog.password ? (
            <PasswordReveal email={dialog.email} password={dialog.password} />
          ) : (
            <div className="space-y-3">
              <p className="break-all font-semibold" dir="ltr">{dialog.email}</p>
              {dialog.note && <p>{dialog.note}</p>}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={close}>ঠিক আছে, বন্ধ করুন</Button>
          </div>
        </AdminModal>
      )}
      <p className="sr-only" role="status" aria-live="polite">{rows.length ? `মোট ${bn(rows.length)} জন ব্যবহারকারী` : ""}</p>
    </>
  );
}
