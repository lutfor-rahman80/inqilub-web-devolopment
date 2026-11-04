import "server-only";
import { serverEnv } from "@/lib/server-env";

/**
 * True when automatic applicant emails (Resend) are configured, so public
 * copy only promises email updates when they will actually be sent.
 */
export function emailNotificationsEnabled(): boolean {
  return Boolean(serverEnv.resendApiKey && serverEnv.emailFrom);
}
