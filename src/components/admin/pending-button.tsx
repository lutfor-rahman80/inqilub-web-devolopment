"use client";

import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Button that shows a spinner and is disabled while `pending`. The label
 * stays the same so its accessible name does not change mid-action;
 * `aria-busy` tells assistive technology that work is in progress.
 */
export function PendingButton({
  pending,
  icon,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean; icon?: ReactNode }) {
  return (
    <Button disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
      {children}
    </Button>
  );
}
