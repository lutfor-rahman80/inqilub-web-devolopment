"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BadgeCheck, CircleX, LoaderCircle, RotateCcw, SearchCheck, Trash2 } from "lucide-react";
import { Alert, Field, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { bn, type ApplicationStatus } from "@/lib/format";
import { CheckboxField } from "@/components/membership/checkbox-field";
import {
  approveApplication,
  deleteApplication,
  rejectApplication,
  reopenApplication,
  startReview,
} from "@/app/admin/(panel)/applications/actions";
import { Modal } from "./modal";

type Designation = { id: number; name_bn: string };
type Dialog = null | "approve" | "reject" | "reopen" | "delete";
type Done = { tone: "success" | "info"; text: string; memberId?: string; memberNo?: string };

export function ReviewActions({
  applicationId,
  applicationNo,
  fullName,
  status,
  directoryConsent,
  designations,
  defaultDesignationId,
  canReview,
  canDelete,
  emailWillBeSent,
  minorAge = null,
}: {
  applicationId: string;
  applicationNo: string;
  fullName: string;
  status: ApplicationStatus;
  directoryConsent: boolean;
  designations: Designation[];
  defaultDesignationId: number | null;
  canReview: boolean;
  canDelete: boolean;
  emailWillBeSent: boolean;
  /** Applicant's age when under 18 (from date_of_birth), else null. */
  minorAge?: number | null;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const doneRef = useRef<HTMLDivElement>(null);

  // After a decision the button that was used disappears (the status changed):
  // move focus to the result message instead of losing it to <body>.
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const open = status === "pending" || status === "under_review";

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await action();
        if (res.ok) {
          setDialog(null);
          onOk();
        } else {
          setError(res.error ?? "একটি সমস্যা হয়েছে।");
        }
      } catch {
        setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
      }
    });
  }

  function closeDialog() {
    if (pending) return;
    setDialog(null);
    setError(null);
  }

  return (
    <div className="space-y-4" data-testid="review-actions">
      {done && (
        <div ref={doneRef} tabIndex={-1} className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600" data-testid="review-done">
        <Alert tone={done.tone === "success" ? "success" : "info"}>
          <p className="font-semibold">{done.text}</p>
          {done.memberNo && (
            <p className="mt-1">
              সদস্য নম্বর: <strong dir="ltr" data-testid="new-member-no" className="tabular-nums">{done.memberNo}</strong>
              {done.memberId && (
                <>
                  {" · "}
                  <Link href={`/admin/members/${done.memberId}`} className="font-semibold underline underline-offset-4">
                    সদস্য রেকর্ড দেখুন
                  </Link>
                </>
              )}
            </p>
          )}
        </Alert>
        </div>
      )}
      {error && !dialog && <Alert>{error}</Alert>}

      {canReview && (
        <div className="flex flex-col gap-2">
          {status === "pending" && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => startReview(applicationId), () => setDone({ tone: "info", text: "যাচাই শুরু হয়েছে। আবেদনটি এখন “যাচাই চলছে” অবস্থায়।" }))}
            >
              {pending && dialog === null ? <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <SearchCheck className="size-5" aria-hidden="true" />}
              যাচাই শুরু করুন
            </Button>
          )}
          {open && (
            <>
              <Button disabled={pending} onClick={() => { setError(null); setDialog("approve"); }}>
                <BadgeCheck className="size-5" aria-hidden="true" />
                অনুমোদন করুন
              </Button>
              <Button variant="danger" disabled={pending} onClick={() => { setError(null); setDialog("reject"); }}>
                <CircleX className="size-5" aria-hidden="true" />
                প্রত্যাখ্যান করুন
              </Button>
            </>
          )}
          {status === "rejected" && (
            <Button variant="outline" disabled={pending} onClick={() => { setError(null); setDialog("reopen"); }}>
              <RotateCcw className="size-5" aria-hidden="true" />
              পুনর্বিবেচনা করুন
            </Button>
          )}
        </div>
      )}

      {canDelete && status !== "approved" && (
        <div className="border-t border-line pt-4">
          <Button variant="ghost" className="w-full text-red-700 hover:bg-red-50" disabled={pending} onClick={() => { setError(null); setDialog("delete"); }}>
            <Trash2 className="size-5" aria-hidden="true" />
            আবেদন স্থায়ীভাবে মুছে ফেলুন
          </Button>
        </div>
      )}

      {dialog === "approve" && (
        <ApproveDialog
          fullName={fullName}
          applicationNo={applicationNo}
          directoryConsent={directoryConsent}
          designations={designations}
          defaultDesignationId={defaultDesignationId}
          emailWillBeSent={emailWillBeSent}
          minorAge={minorAge}
          pending={pending}
          error={error}
          onClose={closeDialog}
          onConfirm={(input) => {
            setError(null);
            startTransition(async () => {
              try {
                const res = await approveApplication(applicationId, input);
                if (res.ok) {
                  setDialog(null);
                  setDone({ tone: "success", text: "আবেদন অনুমোদিত হয়েছে এবং সদস্য রেকর্ড তৈরি হয়েছে।", memberId: res.data.memberId, memberNo: res.data.memberNo });
                } else setError(res.error);
              } catch {
                setError("সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
              }
            });
          }}
        />
      )}

      {dialog === "reject" && (
        <NoteDialog
          title="আবেদন প্রত্যাখ্যান"
          intro={<>আপনি <strong>{fullName}</strong>-এর আবেদন (<span dir="ltr" className="whitespace-nowrap">{applicationNo}</span>) প্রত্যাখ্যান করতে যাচ্ছেন।</>}
          label="প্রত্যাখ্যানের কারণ"
          required
          hint={
            emailWillBeSent
              ? "কারণটি সিদ্ধান্তের রেকর্ডে সংরক্ষিত থাকবে এবং আবেদনকারীর ইমেইলেও পাঠানো হবে।"
              : "কারণটি সিদ্ধান্তের রেকর্ডে সংরক্ষিত থাকবে।"
          }
          confirmLabel="প্রত্যাখ্যান করুন"
          confirmVariant="danger"
          pending={pending}
          error={error}
          onClose={closeDialog}
          onConfirm={(text) => run(() => rejectApplication(applicationId, text), () => setDone({ tone: "info", text: "আবেদনটি প্রত্যাখ্যাত হয়েছে।" }))}
        />
      )}

      {dialog === "reopen" && (
        <NoteDialog
          title="আবেদন পুনর্বিবেচনা"
          intro="প্রত্যাখ্যাত আবেদনটি আবার “যাচাই চলছে” অবস্থায় ফিরবে, এরপর অনুমোদন বা প্রত্যাখ্যান করা যাবে।"
          label="মন্তব্য"
          hint="কেন পুনর্বিবেচনা করা হচ্ছে (ঐচ্ছিক)।"
          confirmLabel="পুনর্বিবেচনা করুন"
          confirmVariant="primary"
          pending={pending}
          error={error}
          onClose={closeDialog}
          onConfirm={(text) => run(() => reopenApplication(applicationId, text), () => setDone({ tone: "info", text: "আবেদনটি পুনর্বিবেচনার জন্য খোলা হয়েছে।" }))}
        />
      )}

      {dialog === "delete" && (
        <Modal title="আবেদন মুছে ফেলবেন?" onClose={closeDialog} busy={pending} size="sm">
          <p>
            <strong>{fullName}</strong>-এর আবেদন (<span dir="ltr" className="whitespace-nowrap">{applicationNo}</span>) এবং এর অবস্থার ইতিহাস স্থায়ীভাবে মুছে যাবে। এটি
            আর ফিরিয়ে আনা যাবে না।
          </p>
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog} disabled={pending} data-autofocus>বাতিল</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run(() => deleteApplication(applicationId), () => undefined)}
            >
              {pending && <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />}
              স্থায়ীভাবে মুছে ফেলুন
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ApproveDialog({
  fullName,
  applicationNo,
  directoryConsent,
  designations,
  defaultDesignationId,
  emailWillBeSent,
  minorAge,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  fullName: string;
  applicationNo: string;
  directoryConsent: boolean;
  designations: Designation[];
  defaultDesignationId: number | null;
  emailWillBeSent: boolean;
  minorAge: number | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (input: { designationId: number; note: string; showInDirectory: boolean }) => void;
}) {
  const [designationId, setDesignationId] = useState<string>(String(defaultDesignationId ?? designations[0]?.id ?? ""));
  const [show, setShow] = useState(directoryConsent);
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <Modal title="আবেদন অনুমোদন" onClose={onClose} busy={pending}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!designationId) {
            setLocalError("পদবী নির্বাচন করুন।");
            return;
          }
          setLocalError(null);
          onConfirm({ designationId: Number(designationId), note, showInDirectory: directoryConsent && show });
        }}
        className="space-y-5"
      >
        <p>
          <strong>{fullName}</strong>-এর আবেদন (<span dir="ltr" className="whitespace-nowrap">{applicationNo}</span>) অনুমোদন করলে একটি সদস্য রেকর্ড ও নতুন সদস্য নম্বর
          তৈরি হবে।{emailWillBeSent ? " আবেদনকারীকে ইমেইলে জানানো হবে।" : ""}
        </p>
        {error && <Alert>{error}</Alert>}
        {minorAge !== null && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" data-testid="approve-minor-note">
            আবেদনকারীর বয়স ১৮ বছরের কম ({bn(minorAge)} বছর)। সদস্য রেকর্ডে “অভিভাবকের সম্মতি আছে” চিহ্নিত না করা পর্যন্ত তিনি
            ওয়েবসাইটের সদস্য তালিকায় দেখা যাবেন না।
          </p>
        )}
        <Field id="approve-designation" label="পদবী" required error={localError ?? undefined}>
          <Select
            id="approve-designation"
            data-autofocus
            value={designationId}
            onChange={(e) => setDesignationId(e.target.value)}
            aria-invalid={localError ? true : undefined}
            aria-describedby={localError ? "approve-designation-error" : undefined}
          >
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{d.name_bn}</option>
            ))}
          </Select>
        </Field>
        <CheckboxField
          id="approve-show"
          checked={directoryConsent && show}
          disabled={!directoryConsent}
          onChange={setShow}
          tone="boxed"
          label="ওয়েবসাইটের সদস্য তালিকায় প্রকাশ করুন"
          hint={
            directoryConsent
              ? "আবেদনকারী সদস্য তালিকায় নাম প্রকাশে সম্মতি দিয়েছেন। প্রকাশ হবে: নাম, পদবী, সদস্য নম্বর (ও ছবি যুক্ত করলে)।"
              : "আবেদনকারী সদস্য তালিকায় নাম প্রকাশে সম্মতি দেননি, তাই প্রকাশ করা যাবে না।"
          }
        />
        <Field id="approve-note" label="মন্তব্য" hint="অভ্যন্তরীণ রেকর্ডের জন্য (ঐচ্ছিক)।">
          <Textarea
            id="approve-note"
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="approve-note-hint"
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={pending}>বাতিল</Button>
          <Button type="submit" disabled={pending} data-testid="confirm-approve">
            {pending ? <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <BadgeCheck className="size-5" aria-hidden="true" />}
            অনুমোদন নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NoteDialog({
  title,
  intro,
  label,
  hint,
  required,
  confirmLabel,
  confirmVariant,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  intro: React.ReactNode;
  label: string;
  hint: string;
  required?: boolean;
  confirmLabel: string;
  confirmVariant: "primary" | "danger";
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const fieldError = localError ?? undefined;
  return (
    <Modal title={title} onClose={onClose} busy={pending}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (required && value.length < 3) {
            setLocalError(`${label} লিখুন (কমপক্ষে ৩ অক্ষর)।`);
            document.getElementById("decision-note")?.focus();
            return;
          }
          setLocalError(null);
          onConfirm(value);
        }}
      >
        <p>{intro}</p>
        {error && <Alert>{error}</Alert>}
        <Field id="decision-note" label={label} required={required} hint={hint} error={fieldError}>
          <Textarea
            id="decision-note"
            rows={4}
            maxLength={1000}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (localError && e.target.value.trim().length >= 3) setLocalError(null);
            }}
            required={required}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "decision-note-error" : "decision-note-hint"}
            data-autofocus
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={pending}>বাতিল</Button>
          <Button type="submit" variant={confirmVariant} disabled={pending} data-testid="confirm-note">
            {pending && <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
