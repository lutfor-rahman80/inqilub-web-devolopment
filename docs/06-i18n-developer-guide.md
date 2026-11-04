# Bengali / English — developer guide

## URLs
- Bengali (default) at the root: `/about`. English under `/en`: `/en/about`.
- `src/proxy.ts` rewrites `/about` → internal route `/bn/about`; `/bn/…` redirects (308) to the root form.
- All public routes live in `src/app/[lang]/…`; `app/[lang]/layout.tsx` is the public root layout (`<html lang>`), `app/admin/layout.tsx` the admin root layout (Bengali only). Unmatched public URLs (`/no-such-page`, `/en/no-such-page`, `/about/extra`) are caught by `app/[lang]/(site)/[...rest]/page.tsx`, which calls `notFound()` and so shows the localized 404 (`app/[lang]/not-found.tsx`) inside the site header and footer; `app/global-not-found.tsx` only covers URLs outside both root layouts.

## Building links
`localePath(lang, "/programs")` → `/programs` or `/en/programs`. Never hard-code `/en`. Language switch: `switchLocalePath(pathname, target)`. Metadata: `alternates: alternatesFor(lang, "/programs")`.

## Getting the language
- Pages/layouts: `const lang = routeLocale((await params).lang)` (`src/i18n/server.ts`) — never `as Locale`. URLs ending in a file extension skip the proxy, and every segment renders on its own, so each page and layout must reject other values itself (`routeLocale` calls `notFound()`).
- Deep server components: `await currentLocale()` (`src/i18n/server.ts`).
- Client components and **server actions**: receive `lang` as a prop / hidden form field — never infer it.

## Interface text
One file per area in `src/i18n/messages/<area>.ts` exporting `{ bn, en }`; English is typed `Messages<typeof bn>`, so a missing or extra key fails `tsc`. Use `fmt(template, vars)` for placeholders. Pass only the needed message object to client components.

## Database text
Columns come in pairs `x_bn` (required) / `x_en` (optional). `pickText(lang, bn, en)` / `pickField(lang, row, "title")` return `{ text, lang, isFallback }`; render with `<Localized value=…/>`, which marks Bengali fallbacks with `lang="bn"`. Organization texts: `siteTexts(settings, lang)`.

## Numbers and dates
`num(lang, n)`, `formatDate(d, lang)`, `formatDateTime(d, lang)` — Bengali digits only on Bengali pages. Inputs accept both digit systems (`toAsciiDigits`).

## Rules
- No machine translation at runtime; English texts are written by people (drafts marked for review).
- The slogan “আনতে সুপ্রভাত, পথ দেখাবে ইনকিলাব” is shown in Bengali in both languages (with an English rendering beneath it on English pages).
- The admin panel stays Bengali; admin forms offer optional English fields.
