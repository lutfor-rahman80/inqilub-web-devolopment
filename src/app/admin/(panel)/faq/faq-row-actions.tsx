"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteFaq, moveFaq, setFaqPublished } from "./actions";

const small = "min-h-11 min-w-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

/**
 * Per-row controls on the FAQ list: move up/down, publish/hide and delete
 * (with confirmation). Keyboard focus stays on the control that was used,
 * and the result is announced.
 */
export function FaqRowActions({
  id,
  question,
  position,
  isFirst,
  isLast,
  isPublished,
}: {
  id: string;
  question: string;
  position: string;
  isFirst: boolean;
  isLast: boolean;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"up" | "down" | "publish" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const publishRef = useRef<HTMLButtonElement>(null);

  // Control to focus again once the list has re-rendered with the new order/state.
  const restore = useRef<"up" | "down" | "publish" | null>(null);

  useEffect(() => {
    const kind = restore.current;
    if (!kind) return;
    restore.current = null;
    // A moved row may have been re-inserted in the DOM (which drops focus), and
    // its first/last position may have changed: focus the used control, or
    // the other arrow when the used one is now unavailable.
    const target = kind === "publish" ? publishRef.current : kind === "up" ? upRef.current : downRef.current;
    const fallback = kind === "up" ? downRef.current : upRef.current;
    const usable = (b: HTMLButtonElement | null) => b && b.getAttribute("aria-disabled") !== "true";
    (usable(target) ? target : fallback)?.focus();
  }, [position, isFirst, isLast, isPublished]);

  function run(kind: "up" | "down" | "publish", action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    // Buttons are never disabled while working (that would drop keyboard focus); repeated presses are ignored.
    if (pending) return;
    setBusy(kind);
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await action();
        if (!r.ok) {
          setMessage({ ok: false, text: r.error });
          return;
        }
        setMessage({ ok: true, text: done });
        restore.current = kind;
        router.refresh();
      } catch {
        setMessage({ ok: false, text: "সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" });
      } finally {
        setBusy(null);
      }
    });
  }

  const label = `প্রশ্ন ${position} (“${question.length > 40 ? `${question.slice(0, 40)}…` : question}”)`;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label}: ক্রম ও প্রকাশ`}>
        <Button
          ref={upRef}
          variant="outline"
          size="sm"
          className={small}
          aria-disabled={isFirst || pending || undefined}
          aria-label={`উপরে: ${label}`}
          onClick={() => !isFirst && run("up", () => moveFaq(id, "up"), "প্রশ্নটি এক ধাপ উপরে সরানো হয়েছে।")}
        >
          {busy === "up" ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
          <span className="max-sm:sr-only">উপরে</span>
        </Button>
        <Button
          ref={downRef}
          variant="outline"
          size="sm"
          className={small}
          aria-disabled={isLast || pending || undefined}
          aria-label={`নিচে: ${label}`}
          onClick={() => !isLast && run("down", () => moveFaq(id, "down"), "প্রশ্নটি এক ধাপ নিচে সরানো হয়েছে।")}
        >
          {busy === "down" ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
          <span className="max-sm:sr-only">নিচে</span>
        </Button>
        <Button
          ref={publishRef}
          variant={isPublished ? "primary" : "outline"}
          size="sm"
          className={small}
          aria-disabled={pending || undefined}
          aria-pressed={isPublished}
          aria-label={`প্রকাশিত: ${label}`}
          onClick={() =>
            run(
              "publish",
              () => setFaqPublished(id, !isPublished),
              isPublished ? "প্রশ্নটি ওয়েবসাইট থেকে লুকানো হয়েছে (খসড়া)।" : "প্রশ্নটি ওয়েবসাইটে প্রকাশিত হয়েছে।",
            )
          }
        >
          {busy === "publish" ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : isPublished ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
          প্রকাশিত
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`${small} text-red-700 hover:bg-red-50`}
          aria-disabled={pending || undefined}
          onClick={() => !pending && setConfirm(true)}
          aria-label={`মুছুন: ${label}`}
        >
          <Trash2 className="size-4" aria-hidden="true" /> মুছুন
        </Button>
      </div>
      <p aria-live="polite" className={`text-sm ${message?.ok === false ? "font-medium text-red-700" : "text-muted"}`}>
        {message?.text ?? ""}
      </p>
      {confirm && (
        <ConfirmDialog
          title="প্রশ্নটি মুছে ফেলবেন?"
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            const r = await deleteFaq(id);
            if (!r.ok) return r.error;
            setConfirm(false);
            router.replace("/admin/faq?deleted=1");
            router.refresh();
            return null;
          }}
        >
          <p>
            “<span className="font-semibold">{question}</span>” স্থায়ীভাবে মুছে যাবে এবং ওয়েবসাইট থেকেও সরে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
          </p>
          <p className="text-muted">শুধু লুকাতে চাইলে মুছে না ফেলে “প্রকাশিত” বোতাম চেপে প্রকাশ বন্ধ করুন।</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
