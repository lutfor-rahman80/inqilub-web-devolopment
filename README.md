# ইনকিলাব যুব সংগঠন — Website

Official website and admin platform of **ইনকিলাব যুব সংগঠন** (Inqilab Jubo Sangathan), a non-political social youth organization in কাশীপুর, ফতুল্লা, নারায়ণগঞ্জ.

- **Public site (Bengali):** home, about, activities (13 categories), photo gallery, member directory, announcements, contact (with Facebook QR), online membership application + status check, privacy policy.
- **Admin panel (`/admin`):** membership review & approval, members, folder-based activity gallery, activities, website content, announcements, messages, users/roles/permissions, audit log.

| Document | Purpose |
|---|---|
| [docs/01-requirements-and-plan.md](docs/01-requirements-and-plan.md) | Approved requirements, roles, data model, plan |
| [docs/02-deployment-guide.md](docs/02-deployment-guide.md) | Supabase + Vercel setup, first admin, backups, maintenance |
| [docs/03-admin-manual-bn.md](docs/03-admin-manual-bn.md) | অ্যাডমিন প্যানেল ব্যবহার নির্দেশিকা (বাংলা) |

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres with Row-Level Security, Auth, Storage) · Vercel. Optional: Resend for applicant emails.

Security model: every table has Row-Level Security; status changes go through permission-checked database functions; public pages use an anonymous client that can only see public data; personal data (NID, addresses, phone, parents' names) is never public; the audit log stores no personal values.

## Development

```bash
npm install
npm run db:start                 # local Supabase (Docker)
cp .env.example .env.local       # values from `npx supabase status`
npm run db:reset                 # migrations + local test seed
npm run dev                      # http://localhost:3000
```

Local test accounts (seed only, password `Test@12345`): `super@`, `admin@`, `secretary@`, `editor@`, `viewer@test.local`.

## Tests

```bash
npm run typecheck && npm run lint
npm run test        # unit (vitest)
npm run test:db     # database security & workflow tests (pgTAP, rolled back)
npm run test:e2e    # browser tests, desktop + mobile (needs dev server + local Supabase)
```

## Project layout

```
src/app/(site)/          public pages
src/app/admin/           login + admin panel ((panel)/…)
src/components/          ui/, site/, gallery/, membership/, admin/
src/lib/                 auth, settings, storage, email, rate limiting, per-module helpers
supabase/migrations/     schema, RLS, workflow functions, reference data (in order)
supabase/tests/          pgTAP database tests
tests/unit, tests/e2e    vitest and Playwright tests
```
