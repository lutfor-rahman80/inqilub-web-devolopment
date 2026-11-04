import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get rateLimitSalt() {
    return required("RATE_LIMIT_SALT");
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  // Email is optional: when either value is missing, emails are skipped.
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "";
  },
};
