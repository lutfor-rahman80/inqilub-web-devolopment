# সাইট লাইভ করার সংক্ষিপ্ত নির্দেশিকা

বিস্তারিত ধাপ ইংরেজিতে `docs/02-deployment-guide.md`-তে আছে। এখানে মূল কাজগুলো ক্রমানুসারে দেওয়া হলো।
সব অ্যাকাউন্ট খুলুন সংগঠনের ইমেইল দিয়ে। সব পাসওয়ার্ড ও কী (key) একটি পাসওয়ার্ড ম্যানেজারে রাখুন।
কোনো পাসওয়ার্ড বা গোপন কী কোডে, GitHub-এ বা চ্যাটে কখনো লিখবেন না।

## যা লাগবে (সবই বিনামূল্যে)

- **GitHub:** কোড রাখার জন্য। প্রাইভেট রিপোজিটরি হলেও চলবে।
- **Supabase:** ডাটাবেস, অ্যাডমিন লগইন ও ছবি রাখার জন্য। অঞ্চল (Region) দিন **Singapore**।
- **Vercel:** ওয়েবসাইট চালানোর জন্য।
- **কম্পিউটার:** Node.js 22 বা নতুন সংস্করণ আর Git।

## ধাপসমূহ

### ১. কোড GitHub-এ তুলুন

zip খুলে ফোল্ডারটি একটি নতুন GitHub রিপোজিটরিতে push করুন। `.env.local` নামে কোনো ফাইল GitHub-এ তুলবেন না।

### ২. Supabase প্রজেক্ট খুলুন

1. supabase.com → **New project** (Region: Singapore)।
2. **Authentication → Sign In / Providers**:
   - "Allow new users to sign up" **বন্ধ** করুন।
   - Email চালু রাখুন।
3. **Authentication → Multi-Factor**: TOTP চালু আছে কি না দেখুন।
4. **Project Settings → API Keys** থেকে তিনটি জিনিস কপি করুন:
   - Project URL
   - Publishable key
   - Secret key (এটি গোপন)

### ৩. ডাটাবেস তৈরি করুন

প্রজেক্ট ফোল্ডারে এই কমান্ডগুলো চালান:

```bash
npm install
npx supabase login
npx supabase link --project-ref <আপনার-project-ref>
npx supabase db push
```

`supabase/seed.sql` কখনো আসল ডাটাবেসে চালাবেন না। এতে শুধু পরীক্ষার অ্যাকাউন্ট আছে, আর `db push` এটি চালায় না।

### ৪. প্রথম সুপার অ্যাডমিন তৈরি করুন

1. Supabase → **Authentication → Users → Add user**: ইমেইল ও শক্ত পাসওয়ার্ড দিন, "Auto Confirm" টিক দিন।
2. **SQL Editor**-এ চালান:

```sql
select public.bootstrap_super_admin('আপনার-ইমেইল', 'পূর্ণ নাম');
```

### ৫. Vercel-এ ডিপ্লয় করুন

1. vercel.com → **Add New → Project** → GitHub রিপোজিটরি বেছে নিন।
2. **Environment Variables**-এ নিচের মানগুলো দিন। নামের তালিকা `.env.example`-এ আছে।

| নাম | মান |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ধাপ ২-এর Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |
| `NEXT_PUBLIC_SITE_URL` | সাইটের ঠিকানা, যেমন `https://….vercel.app` |
| `RATE_LIMIT_SALT` | একটি লম্বা এলোমেলো লেখা |
| `CRON_SECRET` | আরেকটি লম্বা এলোমেলো লেখা |

লম্বা এলোমেলো লেখা বানাতে `openssl rand -hex 32` চালাতে পারেন।

3. **Deploy** চাপুন।
4. এরপর **Settings → Functions → Region**: Singapore (sin1) দিন।
5. সাইটের চূড়ান্ত ঠিকানা দুই জায়গায় বসান, তারপর আবার Deploy করুন:
   - Supabase → **Authentication → URL Configuration → Site URL**
   - Vercel-এর `NEXT_PUBLIC_SITE_URL`

### ৬. প্রথম লগইন ও কাজ

`/admin/login`-এ ঢুকুন। সুপার অ্যাডমিনকে প্রথমবারেই ফোনে **Authenticator অ্যাপ** (যেমন Google Authenticator) দিয়ে দুই ধাপের লগইন চালু করতে হবে। এরপর:

- [ ] **ওয়েবসাইট কনটেন্ট:** যোগাযোগের তথ্য, সামাজিক মাধ্যমের লিংক ও ইংরেজি লেখা পূরণ করুন।
- [ ] **ব্যবহারকারী:** সাধারণ সম্পাদক ও অন্যদের অ্যাকাউন্ট খুলুন।
- [ ] **গ্যালারি:** ছবি আপলোড করুন। হোমপেজের উপরের স্লাইডারের জন্য কিছু ছবিতে "হিরো স্লাইডার" চালু করুন।
- [ ] **কর্মসূচি, Notice, প্রশ্নোত্তর, ঘোষণা:** তথ্য যোগ বা যাচাই করুন। ৮টি প্রশ্নোত্তর আগে থেকেই প্রকাশিত আছে, একবার পড়ে দেখুন।
- [ ] **পরীক্ষা:** মোবাইল থেকে একটি পরীক্ষামূলক সদস্য আবেদন করুন, অনুমোদন দিন, তারপর আর্কাইভ করুন।

### ৭. নিয়মিত ব্যাকআপ

মাসে একবার ব্যাকআপ নিন। কমান্ডগুলো `docs/02-deployment-guide.md`-এর ৯ নম্বর অংশে আছে।

## অন্য নির্দেশিকা

- অ্যাডমিন প্যানেল ব্যবহারের নিয়ম: `docs/03-admin-manual-bn.md`
- দুই ধাপের লগইনের ফোন হারালে কী করবেন: `docs/02-deployment-guide.md`-এর ১২ নম্বর অংশ
