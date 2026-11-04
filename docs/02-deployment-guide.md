# Deployment & Maintenance Guide

ইনকিলাব যুব সংগঠন website — Next.js (Vercel) + Supabase (database, login, photo storage).
Everything below fits in the **free tiers** of GitHub, Supabase and Vercel. Optional: Resend (emails) and your own domain.

> Use an **organization email** (not a personal one) for every account, and store the passwords and keys in a password manager that at least two trusted people can access.

---

## 1. What you need

| Account | Cost | Used for |
|---|---|---|
| GitHub | Free | Holds the code; Vercel deploys from it |
| Supabase | Free | Database, admin logins, photo storage (1 GB) |
| Vercel | Free (Hobby) | Hosts the website, daily keep-alive job |
| Resend *(optional)* | Free up to 3,000 emails/month | Emails to applicants (needs a domain) |
| Domain *(optional)* | ≈ ৳1,000–1,500/year | e.g. `inqilabjubo.org` |

On your computer: Node.js 22+, Git. (Only needed for steps 3 and 9.)

---

## 2. Create the Supabase project

1. https://supabase.com → **New project**.
   - Name: `inqilab-jubo-sangathan`
   - Region: **Southeast Asia (Singapore)** — closest to Bangladesh.
   - Generate a strong database password and **save it**.
2. **Project Settings → API Keys**: copy
   - Project URL (`https://<ref>.supabase.co`)
   - **Publishable key** (`sb_publishable_…`) — safe for the browser
   - **Secret key** (`sb_secret_…`) — server only, **never share or commit**
3. **Authentication → Sign In / Providers**:
   - Turn **OFF** "Allow new users to sign up" (only admins create accounts).
   - Keep the **Email** provider enabled (admins log in with email + password).
4. **Authentication → URL Configuration**: Site URL = your website URL (update after step 5).

## 3. Create the database tables

From the project folder on your computer:

```bash
npm install
npx supabase login
npx supabase link --project-ref <your-project-ref>     # asks for the DB password
npx supabase db push                                    # applies supabase/migrations/*.sql in order
```

This creates all tables, security rules, the 13 activity categories, the 12 positions,
the organization's texts and the two storage buckets (`gallery`, `members`).

> **Never** run `supabase/seed.sql` against production — it contains test accounts.
> `db push` does not run it.

## 4. Create the first Super Admin

1. Supabase → **Authentication → Users → Add user → Create new user**
   - Email + a strong password, tick **Auto Confirm User**.
2. Supabase → **SQL Editor**, run (with your values):

```sql
select public.bootstrap_super_admin('president@example.org', 'পূর্ণ নাম');
```

This works only while no Super Admin exists. All further accounts are created inside
the website: **অ্যাডমিন প্যানেল → ব্যবহারকারী**.

## 5. Deploy on Vercel

1. Push the code to a GitHub repository (private is fine).
2. https://vercel.com → **Add New → Project** → import the repository (framework: Next.js, defaults are fine).
3. **Environment Variables** (Production):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` (or the `*.vercel.app` URL) |
| `RATE_LIMIT_SALT` | a long random string (e.g. `openssl rand -hex 32`) |
| `CRON_SECRET` | another long random string |
| `RESEND_API_KEY` *(optional)* | see step 7 |
| `EMAIL_FROM` *(optional)* | `ইনকিলাব যুব সংগঠন <no-reply@your-domain>` |

4. **Deploy**. Then **Settings → Functions → Function Region**: choose **Singapore (sin1)** (same region as the database = faster).
5. Put the final URL into Supabase **Authentication → URL Configuration → Site URL** and into `NEXT_PUBLIC_SITE_URL` (redeploy after changing env vars).

**Keep-alive:** free Supabase projects pause after 7 days without activity. `vercel.json` schedules
`/api/cron/keepalive` once a day; Vercel automatically sends `CRON_SECRET`. Check **Vercel → Project → Cron Jobs** after the first deploy.

## 6. Custom domain (optional)

Vercel → Project → **Settings → Domains** → add the domain and create the DNS records it shows at your registrar. HTTPS is automatic. Update `NEXT_PUBLIC_SITE_URL` and Supabase Site URL.

## 7. Applicant emails (optional)

1. https://resend.com → add and verify your domain (DNS records).
2. Create an API key → set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel → redeploy.

Without these, the site works normally: applicants check their status with tracking number + mobile on
`/membership/status`, and each skipped email is recorded in the application's notification log.

## 8. After the first deploy — checklist

- [ ] Log in at `/admin/login` with the Super Admin.
- [ ] **ওয়েবসাইট কনটেন্ট → যোগাযোগ**: add phone, email, office hours (the Facebook link is pre-filled).
- [ ] **ব্যবহারকারী**: create accounts for the General Secretary and other committee members with the right roles.
- [ ] **গ্যালারি**: upload the first activity photos; mark a few as "featured" for the homepage slider.
- [ ] **সদস্য → নতুন সদস্য**: enter existing (paper-form) committee members with their positions and photos.
- [ ] Submit a test membership application from a phone, approve it, check `/members`, then archive the test member.
- [ ] Scan the Facebook QR code on `/contact` with a phone.
- [ ] Replace the logo: put the original logo as `public/brand/logo.png` (square PNG, ≥512×512, transparent background), commit, push.

---

## 9. Backups (do this monthly, and before big changes)

The free Supabase plan has **no downloadable backups**, so keep your own:

```bash
# Database (structure + data). Uses the linked project; asks for the DB password.
npx supabase db dump --linked -f backups/$(date +%F)-schema.sql
npx supabase db dump --linked --data-only -f backups/$(date +%F)-data.sql

# Photos (gallery + member photos), preserving the activity folders
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_… \
  node scripts/backup-storage.mjs backups/$(date +%F)-storage
```

Store the `backups/` folder somewhere safe (e.g. an organization Google Drive). It contains personal
data of applicants — keep it private.

**Restore** (into a new/empty project): `npx supabase db push` (structure), then
`psql "<connection string>" -f <date>-data.sql`, then upload the storage folders back with the same
paths and press **ফোল্ডার সিঙ্ক** in the admin gallery.

## 10. Routine maintenance

| When | What |
|---|---|
| Weekly | Review new applications and contact messages |
| Monthly | Backups (section 9); check Supabase **Reports → Storage** (free limit 1 GB) |
| Every 3–6 months | Ask a developer to update dependencies (`npm outdated`, `npm audit`) and redeploy |
| When someone leaves the committee | Deactivate their admin account (**ব্যবহারকারী**) — never share accounts |
| If a key leaks | Supabase → API Keys → roll the secret key, update Vercel env, redeploy |

## 11. Local development

```bash
npm install
npm run db:start            # local Supabase in Docker (first run downloads images)
cp .env.example .env.local  # fill with values printed by `npx supabase status`
npm run db:reset            # migrations + test seed (test accounts, password Test@12345)
npm run dev                 # http://localhost:3000
```

Tests: `npm run test` (unit), `npm run test:db` (database security, pgTAP), `npm run test:e2e` (browser; needs the dev server).

## 12. Two-step login (authenticator app)

Admin accounts can be protected with a second step after the password: a 6-digit code from an
authenticator app on the phone (Google Authenticator, Microsoft Authenticator or any TOTP app).

| Who | Rule |
|---|---|
| **Super Admins** | **Required.** At the first sign-in after the password, the page **দুই ধাপের লগইন চালু করুন** asks them to scan a QR code and enter the first code. No admin page or action works before that. |
| Everyone else | Optional, recommended (**আমার অ্যাকাউন্ট → দুই ধাপের লগইন চালু করুন**). Once switched on, the code is asked at every sign-in. |

The rule is enforced in three places: the admin pages, every server action, and the database itself
(Row-Level Security refuses staff permissions to a password-only session of a Super Admin or of anyone
who has set up an authenticator app — so a stolen password is not enough, not even through the API).

**Supabase setting:** Authentication → **Multi-Factor** (or *Sign In / Providers → Multi-Factor
Authentication*): **TOTP (App Authenticator)** must be enabled (it is enabled by default on new projects;
locally it is set in `supabase/config.toml`).

**Good practice:** keep at least **two active Super Admins**, and/or let each Super Admin add a second
device (**আমার অ্যাকাউন্ট → আরেকটি অ্যাপ যুক্ত করুন**, e.g. a tablet) — then a lost phone never locks anyone out.

Notes: setting up an authenticator signs the person out on their other devices (a security measure of
Supabase Auth). Removing one's own authenticator needs a current code; a Super Admin must always keep at
least one. Every set-up, removal and reset is written to the audit log.

### If someone loses their phone (recovery)

**A. Another Super Admin is available (normal case).**

1. Make sure the request really comes from that person (talk to them in person or by phone).
2. Sign in → **আমার অ্যাকাউন্ট** → section **অন্য কর্মীর দুই ধাপের লগইন রিসেট** → choose the person →
   **দুই ধাপের লগইন রিসেট করুন** → confirm.
3. The person signs in with their password. A Super Admin is then asked to set up the authenticator again
   (new phone); other staff go straight in and may set it up again from **আমার অ্যাকাউন্ট**.

**B. No other Super Admin can sign in** (e.g. the only Super Admin lost the phone).

Someone with access to the Supabase dashboard (the project owner) does this:

1. Supabase → **SQL Editor** → **New query**.
2. Check the account (replace the email):

   ```sql
   select u.id, u.email, f.id as factor_id, f.status, f.created_at
   from auth.users u
   left join auth.mfa_factors f on f.user_id = u.id
   where u.email = 'president@example.org';
   ```

3. Remove that account's authenticator apps:

   ```sql
   delete from auth.mfa_factors
   where user_id = (select id from auth.users where email = 'president@example.org');
   ```

4. The person signs in with the password and sets up the authenticator on the new phone right away.
   (This SQL route is not recorded in the website's audit log — note the date and reason in the
   committee's records.)

If the password is also lost, a new one is needed first: Supabase → **Authentication → Users** → the user →
**Send password recovery** (needs working email delivery), or ask the developer to set a new password with
the Supabase admin API; then continue with step 4.
