# Deployment guide: Hostinger Cloud

Target: a Hostinger **Cloud** plan (Startup or higher) running the app as a managed **Node.js web app**. Hostinger lists Next.js as a supported backend framework and supports Node 18, 20, 22 and 24. This app needs **Node 20.9 – 24**, and **Node 22 LTS** is recommended.

> Nothing in this guide has been run against the live Hostinger account yet. Do the whole process on a **staging** subdomain first.

---

## 1. Prerequisites

| Service | Needed for | Status |
|---|---|---|
| Hostinger Cloud plan + domain | hosting, SSL, MySQL | required |
| GitHub repository (private) | Hostinger auto-deploys from it | required |
| Hostinger MySQL 8 database | all data | required |
| Resend account + verified sending domain | order, account and marketing emails | required for launch |
| Cloudflare R2 bucket + public domain | product images and the media library | required for launch (images uploaded to local disk can be lost on redeploy) |
| Safepay merchant account (sandbox, then live) | card and wallet payments in PKR | optional; COD works without it |
| Cloudflare Turnstile | bot protection on forms | optional |

## 2. Create the database

1. hPanel → **Databases → MySQL Databases** → create a database and user. Note the host, which is often `localhost` for apps on the same plan.
2. Build the connection string: `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DBNAME`. URL-encode any special characters in the password.
3. To run migrations from your own machine instead of over SSH, enable **Remote MySQL** for your IP. Disable it again afterwards.

## 3. Environment variables

hPanel → **Websites → your web app → Settings → Environment variables**. Copy every key from `.env.example`. The minimum for production:

```
APP_ENV=production
APP_URL=https://www.nargisandshaz.com
NEXT_PUBLIC_SITE_URL=https://www.nargisandshaz.com
DATABASE_URL=mysql://…
CRON_SECRET=<64 random chars>
RESEND_API_KEY=re_…
EMAIL_FROM="Nargis & Shaz <orders@nargisandshaz.com>"
EMAIL_REPLY_TO=care@nargisandshaz.com
MEDIA_DRIVER=r2
R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… R2_PUBLIC_BASE_URL=https://media.nargisandshaz.com
```

Rules:

- Never put a secret in a `NEXT_PUBLIC_*` variable.
- `PAYMENTS_TEST_PROVIDER` is ignored when `APP_ENV=production`.
- Generate secrets with `openssl rand -hex 32`.

`NEXT_PUBLIC_*` values are compiled into the build. After changing one, **redeploy**; a restart is not enough.

## 4. Connect GitHub and build

hPanel → **Websites → Add website → Node.js web app → GitHub** → choose the repository and branch. Then set:

| Setting | Value |
|---|---|
| Framework | Next.js |
| Node version | 22.x |
| Install | `npm ci` |
| Build | `npm run build` |
| Start | `npm start` |
| Output directory | `.next` (default) |

Each push to the selected branch triggers a build. Use a `staging` branch for the staging site and `main` for production.

> `sharp` (image processing) installs a prebuilt Linux binary through npm. If the build log shows a sharp install error, set the Node version to 22 and redeploy. Uploads are the only feature that depends on sharp.

## 5. Migrate and seed

Run this from SSH on the plan (hPanel → **Advanced → SSH access**), or from your machine with Remote MySQL enabled and the production `DATABASE_URL` in a local, uncommitted `.env.production.local`:

```bash
npm ci
DATABASE_URL=… npm run db:migrate        # forward-only, safe to repeat
DATABASE_URL=… SEED_OWNER_EMAIL=you@… SEED_OWNER_PASSWORD='…' npm run db:seed
```

- The seed is idempotent. It only inserts rows that are missing, never overwrites existing data, and imports the launch catalogue only into an empty `products` table.
- **Take a backup (§9) before every migration on production.**
- After the first seed, remove `SEED_OWNER_PASSWORD` from wherever you stored it. Sign in at `/admin/login` and change the password.

## 6. Cron

hPanel → **Advanced → Cron jobs**, every 5 minutes:

```bash
curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://www.nargisandshaz.com/api/cron/maintenance > /dev/null
```

This job does three things:

- expires unpaid online orders and releases their reserved stock,
- retries failed emails, and
- prunes rate-limit rows and expired sessions.

Without it, unpaid online orders keep holding stock.

## 7. Domain, SSL, Cloudflare

1. Point the domain at Hostinger, or keep DNS on Cloudflare with the records Hostinger provides. Hostinger issues free SSL.
2. If you proxy through Cloudflare, set SSL mode to **Full (strict)** and do **not** cache `/api/*`, `/admin/*`, `/account/*` or `/checkout/*`. Next.js already sends the correct `Cache-Control` headers.
3. HSTS is sent automatically in production. Only submit to the HSTS preload list once every subdomain is on HTTPS.

## 8. Third-party services

### Resend (email)
1. Add the domain in Resend and publish the SPF, DKIM and (recommended) DMARC records.
2. Wait for the domain to show *Verified*.
3. Set `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_REPLY_TO`.
4. In Studio → **Messages → Templates**, use **Send test**. Check the result in **Messages → Email log**: it should say `sent` with a provider id. Rejections are shown as `failed` with Resend's error.

### Cloudflare R2 (media)
1. Create a bucket and connect a **custom domain**, for example `media.nargisandshaz.com`.
2. Create an API token with *Object Read & Write* scoped to that bucket.
3. Set the `R2_*` variables and `MEDIA_DRIVER=r2`.
4. Upload an image in Studio → **Media**. It should appear at `R2_PUBLIC_BASE_URL/…`.
5. `R2_PUBLIC_BASE_URL`'s host is allowed by the CSP automatically.

### Turnstile (optional)
Create a widget for the domain and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Contact and newsletter forms will then require it.

### Safepay — sandbox checklist (complete before enabling)
The integration follows Safepay's public documentation but **has not been tested against a sandbox account**.

1. Create a sandbox account. Copy the sandbox API key, secret key and webhook secret into `SAFEPAY_ENV=sandbox`, `SAFEPAY_API_KEY`, `SAFEPAY_SECRET_KEY` and `SAFEPAY_WEBHOOK_SECRET`.
2. In the Safepay dashboard, set the webhook URL to `https://STAGING_DOMAIN/api/webhooks/safepay`.
3. Studio → **Payments** → enable *Safepay (card / wallet)* for Pakistan.
4. Place a PKR order, pay with a Safepay sandbox test card, and confirm all of the following:
   - [ ] the redirect to Safepay's hosted checkout works and the amount is correct (PKR, major units)
   - [ ] a webhook arrives, shows in Studio → Payments → Webhooks as *processed*, and the signature passes
   - [ ] the order becomes **Paid / Confirmed** and the stock reservation is committed
   - [ ] a cancelled or failed payment leaves the order *failed*, releases the stock and keeps the bag
   - [ ] replaying the same webhook is reported as a duplicate and changes nothing
   - [ ] the return page shows the correct state even when the webhook arrives late
5. If any field names differ from what `src/server/payments/providers.ts` expects, adjust the provider there. It is the only file involved.
6. Repeat with live keys and `SAFEPAY_ENV=production` using a small real payment, then refund it from Safepay's dashboard and record the refund in Studio.

### Stripe
Only if a UK/EU entity has been approved by Stripe. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, point the webhook to `/api/webhooks/stripe` (event `checkout.session.completed`, plus `checkout.session.expired`), and enable the method for the UK/EU markets.

## 9. Backups

- Enable Hostinger's daily backups. Additionally, before each deploy that adds a migration:
  `mysqldump --single-transaction --routines --no-tablespaces -h HOST -u USER -p DBNAME | gzip > ns-$(date +%F).sql.gz`
- Keep off-site copies, for example in a private R2 bucket with lifecycle rules.
- Test a restore into a scratch database at least once before launch.
- R2 objects are not covered by Hostinger backups. Enable R2 object versioning or a periodic `rclone sync` of the bucket.

## 10. Launch checklist

- [ ] Staging deploy passes: home, shop, product, bag, COD checkout, account, Studio sign-in
- [ ] `APP_ENV=production` on production; Studio → Settings → **Service status** is all green except intentionally disabled services
- [ ] The test payment method does not appear at checkout
- [ ] Owner password changed; staff invited with least-privilege roles
- [ ] Policies reviewed by a lawyer; store details (address, phone, NTN) set in Settings
- [ ] Real product photography uploaded in place of the stock images
- [ ] Cron running (Studio shows recent maintenance activity, and expired test orders release stock)
- [ ] Backups verified
- [ ] `robots.txt` and `sitemap.xml` reachable; `/admin` returns `X-Robots-Tag: noindex`
- [ ] Search Console and analytics added (if wanted)

## 11. Rollback

- **Code:** hPanel → web app → **Deployments** → redeploy the previous successful build, or revert the commit on the branch.
- **Database:** migrations are forward-only. If a migration must be undone, restore the pre-deploy dump into a new database, point `DATABASE_URL` at it, and redeploy.

## Local development

```bash
cp .env.example .env      # then set DATABASE_URL to a local MySQL 8, APP_ENV=development, MEDIA_DRIVER=local, PAYMENTS_TEST_PROVIDER=1
npm install
npm run db:migrate && npm run db:seed
npm run dev
npm test                  # unit + integration (creates/drops a *_test database only)
npm run build && npm start & npm run test:e2e
```
