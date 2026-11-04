"use client";

import { Fragment, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Info, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUPS, MEMBER_STATUS, bn, type MemberStatus } from "@/lib/format";
import { MIN_MEMBER_DOB, type MemberField, type MemberFieldErrors } from "@/lib/membership/member-schema";
import { ageOn, normalizeDateInput } from "@/lib/membership/normalize";
import { DIRECTORY_ADULT_AGE } from "@/lib/membership/display";
import { CheckboxField } from "@/components/membership/checkbox-field";
import { createMember, updateMember, type MemberFormResult, type SavedMemberValues } from "@/app/admin/(panel)/members/actions";
import { Modal } from "./modal";
import { useMemberVersion } from "./member-version";

export type MemberFormValues = {
  member_no?: string;
  full_name: string;
  designation_id: number | null;
  status: MemberStatus;
  mobile: string;
  email: string;
  blood_group: string;
  joined_on: string;
  /** "" when not recorded. */
  date_of_birth: string;
  sort_order: number;
  notes: string;
  directory_consent: boolean;
  show_in_directory: boolean;
  public_phone_consent: boolean;
  public_phone: string;
  guardian_consent: boolean;
};

const FIELD_ORDER: MemberField[] = [
  "member_no", "full_name", "designation_id", "status", "joined_on", "sort_order", "date_of_birth", "mobile", "email", "blood_group",
  "directory_consent", "show_in_directory", "guardian_consent", "public_phone_consent", "public_phone", "notes",
];

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden="true" className="font-sans text-lg font-semibold text-brand-900">{title}</h2>
      {description && <p className="mt-1 text-[0.95rem] text-muted">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </fieldset>
  );
}

export function MemberForm({
  mode,
  memberId,
  updatedAt,
  initial,
  designations,
  maxDate,
}: {
  mode: "edit" | "create";
  memberId?: string;
  updatedAt?: string;
  initial: MemberFormValues;
  designations: { id: number; name_bn: string; is_active: boolean }[];
  maxDate: string;
}) {
  const router = useRouter();
  const version = useMemberVersion();
  const currentVersion = version?.value ?? updatedAt;
  // A photo upload/removal changes the record's version: wait for it before saving.
  const photoBusy = version?.photoBusy ?? false;
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<MemberFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<MemberStatus | null>(null);
  // What the inputs start from: the page's record, then whatever the server
  // stored after each save (normalised: "+880 1911-…" is shown as "01911…").
  // A new `generation` remounts the inputs so they show exactly that.
  const [current, setCurrent] = useState<{ values: MemberFormValues; generation: number }>({ values: initial, generation: 0 });
  const values = current.values;

  const [directoryConsent, setDirectoryConsent] = useState(initial.directory_consent);
  const [showInDirectory, setShowInDirectory] = useState(initial.show_in_directory);
  const [phoneConsent, setPhoneConsent] = useState(initial.public_phone_consent);
  const [dob, setDob] = useState(initial.date_of_birth);
  const [guardianConsent, setGuardianConsent] = useState(initial.guardian_consent);

  function applySaved(s: SavedMemberValues) {
    setCurrent((c) => ({ values: { ...c.values, ...s }, generation: c.generation + 1 }));
    setDirectoryConsent(s.directory_consent);
    setShowInDirectory(s.show_in_directory);
    setPhoneConsent(s.public_phone_consent);
    setDob(s.date_of_birth);
    setGuardianConsent(s.guardian_consent);
  }

  // Age from the date of birth as typed (Asia/Dhaka "today" = maxDate).
  const age = dob ? ageOn(normalizeDateInput(dob), maxDate) : null;
  const minor = age !== null && age < DIRECTORY_ADULT_AGE;

  const err = (f: MemberField) => errors[f];
  const aria = (f: MemberField, hint = false) => ({
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? `${f}-error` : hint ? `${f}-hint` : undefined,
  });

  function send(data: FormData) {
    setFormError(null);
    setSaved(false);
    setWarning(null);
    startTransition(async () => {
      let res: MemberFormResult;
      try {
        res = mode === "edit" && memberId ? await updateMember(memberId, data) : await createMember(data);
      } catch {
        res = { ok: false, error: "সার্ভারের সাথে সংযোগ করা যায়নি। আবার চেষ্টা করুন।" };
      }
      if (res.ok) {
        setErrors({});
        if (mode === "create") {
          router.push(`/admin/members/${res.id}?created=1`);
          return;
        }
        version?.set(res.updatedAt);
        if (res.saved) applySaved(res.saved);
        setSaved(true);
        setWarning(res.warning ?? null);
        alertRef.current?.focus();
        // Page header (name, badges) and photo panel follow the saved record.
        router.refresh();
        return;
      }
      setFormError(res.error);
      const fe = res.fieldErrors ?? {};
      setErrors(fe);
      const first = FIELD_ORDER.find((f) => fe[f]);
      requestAnimationFrame(() => {
        const el = first ? (document.getElementById(first) as HTMLElement | null) : null;
        if (el) {
          el.focus();
          el.scrollIntoView({ block: "center" });
        } else alertRef.current?.focus();
      });
    });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || photoBusy) return;
    const data = new FormData(e.currentTarget);
    const status = String(data.get("status") ?? values.status) as MemberStatus;
    if (mode === "edit" && status !== values.status && status !== "active") {
      setConfirmStatus(status);
      return;
    }
    send(data);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6" aria-busy={pending} data-testid="member-form">
      {currentVersion && <input type="hidden" name="updated_at" value={currentVersion} />}
      <div ref={alertRef} tabIndex={-1} className="focus:outline-none" aria-live="polite">
        {formError && <Alert>{formError}</Alert>}
        {saved && !formError && <Alert tone="success">পরিবর্তন সংরক্ষণ করা হয়েছে।</Alert>}
        {warning && !formError && <div className="mt-3"><Alert>{warning}</Alert></div>}
      </div>

      <Fragment key={current.generation}>
      <Section title="মূল তথ্য">
        {mode === "create" && (
          <Field
            id="member_no"
            label="সদস্য নম্বর"
            error={err("member_no")}
            hint="কাগজের ফরমে আগে থেকে সদস্য নম্বর থাকলে লিখুন (যেমন: IJS-2024-0015)। খালি রাখলে পরবর্তী নম্বর স্বয়ংক্রিয়ভাবে দেওয়া হবে।"
          >
            <Input id="member_no" name="member_no" defaultValue={values.member_no ?? ""} dir="ltr" className="text-start uppercase" maxLength={30} autoComplete="off" placeholder="IJS-2024-0015" {...aria("member_no", true)} />
          </Field>
        )}
        <Field id="full_name" label="পূর্ণ নাম" required error={err("full_name")}>
          <Input id="full_name" name="full_name" defaultValue={values.full_name} required maxLength={120} autoComplete="off" {...aria("full_name")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="designation_id" label="পদবী" required error={err("designation_id")}>
            <Select id="designation_id" name="designation_id" defaultValue={values.designation_id ?? ""} required {...aria("designation_id")}>
              {values.designation_id === null && <option value="">নির্বাচন করুন</option>}
              {designations.map((d) => (
                <option key={d.id} value={d.id} disabled={!d.is_active && d.id !== values.designation_id}>
                  {d.name_bn}{d.is_active ? "" : " (নিষ্ক্রিয়)"}
                </option>
              ))}
            </Select>
          </Field>
          {mode === "edit" ? (
            <Field id="status" label="অবস্থা" required error={err("status")} hint="নিষ্ক্রিয় বা আর্কাইভকৃত সদস্য পাবলিক তালিকায় দেখানো হয় না।">
              <Select id="status" name="status" defaultValue={values.status} required {...aria("status", true)}>
                {(Object.keys(MEMBER_STATUS) as MemberStatus[]).map((s) => (
                  <option key={s} value={s}>{MEMBER_STATUS[s].label}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="status" value="active" />
          )}
          <Field id="joined_on" label="যোগদানের তারিখ" required error={err("joined_on")}>
            <Input id="joined_on" name="joined_on" type="date" defaultValue={values.joined_on} max={maxDate} min="1950-01-01" required {...aria("joined_on")} />
          </Field>
          <Field id="sort_order" label="তালিকায় ক্রম" error={err("sort_order")} hint="একই পদবীর মধ্যে ছোট সংখ্যা আগে দেখাবে। সাধারণত ০।">
            <Input id="sort_order" name="sort_order" type="text" inputMode="numeric" maxLength={7} autoComplete="off" defaultValue={values.sort_order} {...aria("sort_order", true)} />
          </Field>
        </div>
      </Section>

      <Section title="ব্যক্তিগত তথ্য ও যোগাযোগ" description="শুধু অ্যাডমিন প্যানেলে অনুমতিপ্রাপ্তরা দেখতে পান; ওয়েবসাইটে কখনো দেখানো হয় না।">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="date_of_birth"
            label="জন্ম তারিখ"
            error={err("date_of_birth")}
            hint={
              <>
                {age !== null ? <strong className="text-ink" data-testid="member-age">বয়স: {bn(age)} বছর। </strong> : null}
                {mode === "create"
                  ? "কাগজের ফরমের সদস্যের জন্য ঐচ্ছিক; জানা থাকলে লিখুন। ১৮ বছরের কম বয়সীদের সদস্য তালিকায় দেখাতে অভিভাবকের সম্মতি লাগে।"
                  : "ঐচ্ছিক। অনলাইন আবেদনে অনুমোদিত সদস্যের জন্ম তারিখ আবেদন থেকে স্বয়ংক্রিয়ভাবে আসে। ১৮ বছরের কম বয়সীদের সদস্য তালিকায় দেখাতে অভিভাবকের সম্মতি লাগে।"}
              </>
            }
          >
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              min={MIN_MEMBER_DOB}
              max={maxDate}
              autoComplete="off"
              {...aria("date_of_birth", true)}
            />
          </Field>
          <Field id="mobile" label="মোবাইল নম্বর" error={err("mobile")}>
            <Input id="mobile" name="mobile" type="tel" inputMode="tel" defaultValue={values.mobile} maxLength={20} placeholder="01XXXXXXXXX" autoComplete="off" {...aria("mobile")} />
          </Field>
          <Field id="email" label="ইমেইল" error={err("email")}>
            <Input id="email" name="email" type="email" inputMode="email" defaultValue={values.email} maxLength={254} dir="ltr" className="text-start" autoComplete="off" {...aria("email")} />
          </Field>
          <Field id="blood_group" label="রক্তের গ্রুপ" error={err("blood_group")}>
            <Select id="blood_group" name="blood_group" defaultValue={values.blood_group} {...aria("blood_group")}>
              <option value="">জানা নেই / দেওয়া হয়নি</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section
        title="সদস্য তালিকায় প্রকাশ ও সম্মতি"
        description={
          <span className="flex gap-2">
            <Info className="mt-1 size-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span>
              সদস্যের সুস্পষ্ট সম্মতি ছাড়া ওয়েবসাইটের পাবলিক তালিকায় নাম বা ফোন নম্বর প্রকাশ করা যাবে না — ডাটাবেসও এটি আটকে দেয়।
              তালিকায় শুধু ছবি, নাম, পদবী, সদস্য নম্বর (এবং সম্মতি থাকলে ফোন) দেখা যায়।
            </span>
          </span>
        }
      >
        <CheckboxField
          id="directory_consent"
          checked={directoryConsent}
          onChange={(v) => {
            setDirectoryConsent(v);
            if (!v) setShowInDirectory(false);
          }}
          tone="boxed"
          label="সদস্য তালিকায় নাম প্রকাশে সদস্যের সম্মতি আছে"
          hint="আবেদনের সময় দেওয়া সম্মতি, অথবা পরে সদস্য নিজে লিখিত/মৌখিকভাবে জানালে চিহ্নিত করুন।"
          error={err("directory_consent")}
        />
        <CheckboxField
          id="show_in_directory"
          checked={directoryConsent && showInDirectory}
          disabled={!directoryConsent}
          onChange={setShowInDirectory}
          tone="boxed"
          label="ওয়েবসাইটের সদস্য তালিকায় দেখান"
          hint={directoryConsent ? "শুধু “সক্রিয়” সদস্যরা তালিকায় দেখা যায়।" : "আগে ওপরের সম্মতির ঘরটি চিহ্নিত করুন।"}
          error={err("show_in_directory")}
        />
        <CheckboxField
          id="guardian_consent"
          checked={guardianConsent}
          onChange={setGuardianConsent}
          tone="boxed"
          label="অভিভাবকের সম্মতি আছে"
          hint="১৮ বছরের কম বয়সী সদস্যের নাম সদস্য তালিকায় দেখাতে তার অভিভাবকের (পিতা/মাতা বা আইনগত অভিভাবক) সম্মতি লাগে। অভিভাবক সম্মতি দিলে চিহ্নিত করুন। জন্ম তারিখ না থাকলে বা বয়স ১৮ বা তার বেশি হলে এর প্রয়োজন নেই।"
          error={err("guardian_consent")}
        />
        {minor && !guardianConsent && (
          <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" role="status" data-testid="minor-hidden-hint">
            <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            <span>
              সদস্যের বয়স ১৮ বছরের কম ({bn(age)} বছর) এবং অভিভাবকের সম্মতি চিহ্নিত নেই — তাই তালিকায় প্রকাশ চালু থাকলেও ওয়েবসাইটের সদস্য
              তালিকায় তার নাম দেখানো হবে না।
            </span>
          </p>
        )}
        <CheckboxField
          id="public_phone_consent"
          checked={phoneConsent}
          onChange={setPhoneConsent}
          tone="boxed"
          label="তালিকায় ফোন নম্বর প্রকাশে সদস্যের সম্মতি আছে"
          error={err("public_phone_consent")}
        />
        <Field
          id="public_phone"
          label="প্রকাশযোগ্য ফোন নম্বর"
          error={err("public_phone")}
          hint={phoneConsent ? "এই নম্বরটি সদস্য তালিকায় দেখানো হবে।" : "সম্মতি না থাকলে কোনো ফোন নম্বর প্রকাশ করা হয় না; সংরক্ষণ করলে নম্বরটি মুছে যাবে।"}
        >
          <Input
            id="public_phone"
            name="public_phone"
            type="tel"
            inputMode="tel"
            defaultValue={values.public_phone}
            disabled={!phoneConsent}
            maxLength={20}
            placeholder="01XXXXXXXXX"
            autoComplete="off"
            {...aria("public_phone", true)}
          />
        </Field>
        {/* Checkbox values are sent explicitly (disabled inputs are not part of the form data). */}
        <input type="hidden" name="directory_consent" value={directoryConsent ? "on" : ""} />
        <input type="hidden" name="show_in_directory" value={directoryConsent && showInDirectory ? "on" : ""} />
        <input type="hidden" name="public_phone_consent" value={phoneConsent ? "on" : ""} />
        <input type="hidden" name="guardian_consent" value={guardianConsent ? "on" : ""} />
      </Section>

      <Section title="অভ্যন্তরীণ নোট">
        <Field id="notes" label="নোট" error={err("notes")} hint="শুধু কমিটির জন্য; সর্বোচ্চ ১০০০ অক্ষর।">
          <Textarea id="notes" name="notes" defaultValue={values.notes} rows={3} maxLength={1000} {...aria("notes", true)} />
        </Field>
      </Section>
      </Fragment>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-3 border-t border-line bg-stone-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" disabled={pending || photoBusy} className="w-full sm:w-auto" data-testid="member-save">
          {pending || photoBusy ? <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
          {pending ? "সংরক্ষণ হচ্ছে…" : photoBusy ? "ছবি সংরক্ষণ শেষ হচ্ছে…" : mode === "create" ? "সদস্য যোগ করুন" : "পরিবর্তন সংরক্ষণ করুন"}
        </Button>
      </div>

      {confirmStatus && (
        <Modal title="সদস্যের অবস্থা পরিবর্তন" onClose={() => setConfirmStatus(null)} size="sm">
          <p>
            সদস্যকে <strong>“{MEMBER_STATUS[confirmStatus].label}”</strong> করা হলে তিনি ওয়েবসাইটের সদস্য তালিকায় আর দেখাবেন না। পরে আবার
            “সক্রিয়” করা যাবে।
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmStatus(null)} data-autofocus>বাতিল</Button>
            <Button
              variant="danger"
              data-testid="confirm-status"
              disabled={photoBusy}
              onClick={() => {
                setConfirmStatus(null);
                if (formRef.current) send(new FormData(formRef.current));
              }}
            >
              নিশ্চিত করুন
            </Button>
          </div>
        </Modal>
      )}
    </form>
  );
}
