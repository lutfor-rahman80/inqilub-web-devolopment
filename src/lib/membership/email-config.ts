import "server-only";
import { serverEnv } from "@/lib/server-env";

/** True when applicant emails (Resend) are configured, so pages only promise emails that will be sent. */
export function emailEnabled(): boolean {
  return Boolean(serverEnv.resendApiKey && serverEnv.emailFrom);
}
