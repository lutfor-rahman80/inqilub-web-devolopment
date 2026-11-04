"use client";

import { EnrolPanel } from "./enrol-panel";
import { confirmRequiredEnrolment, startRequiredEnrolment } from "./actions";

/** Required first-time set-up (super admins): on success the server redirects to the admin panel. */
export function RequiredEnrolment({ next }: { next: string }) {
  return (
    <EnrolPanel
      start={startRequiredEnrolment}
      confirm={(factorId, code) => confirmRequiredEnrolment(factorId, code, next)}
    />
  );
}
