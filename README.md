# Technonaire Easy Website (Builder)

Concierge website product for non-tech owners.

## What it does

1. Visitor messages Technonaire (with optional design screenshots)
2. Admin replies in inbox and creates a first draft + owner login
3. Invite (link + credentials) is posted in the same chat
4. Owner logs in and click-to-edits text, images, and colors
5. UI change requests stay in Messages (text + screenshots)

## Stack

- Next.js app
- **Postgres** for users, sessions, conversations, messages, sites
- Disk/volume for uploaded images only (`/uploads`)

## Run locally

1. Run Postgres (Docker example):

```bash
docker run --name tn-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=website_builder -p 5432:5432 -d postgres:16
```

2. Configure env:

```bash
cp .env.example .env.local
# set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/website_builder
npm install
npm run dev
```

Tables are created automatically from `src/lib/schema.sql` on first request.

Open [http://localhost:3000](http://localhost:3000)

### Reset local DB (admin + one owner only)

Wipes all local data, then seeds only admin and one owner:

```bash
npm run db:reset-local
```

### Default credentials

- Admin: `admin@technonaire.com` / `changeme123` (or `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Owner: `owner@local.test` / `owner12345` (or `OWNER_EMAIL` / `OWNER_PASSWORD`)

### Typical flow

1. Home → Message us
2. Login as admin → `/admin/inbox`
3. Create draft + invite
4. Login as owner → `/edit`

## Related repo

Agency marketing site: `technonaire-next` (links to this app via `NEXT_PUBLIC_BUILDER_URL`).

## Deploy on Railway

Agency stays on **Netlify**. Builder on **Railway** with Postgres + uploads volume.

### 1. Create project
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub (`website-builder`)
2. **+ New** → **Database** → **PostgreSQL**
3. On the web service → Variables → add reference: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

### 2. Uploads volume
Add a volume mounted at:

```text
/data
```

Images are stored under `/data/uploads` (see `scripts/railway-start.sh`).

### 3. Variables

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NEXT_PUBLIC_APP_URL` | `https://your-service.up.railway.app` |
| `SITE_HOST_ROOT` | `technonaire.site` (customer live hosts) |
| `NEXT_PUBLIC_SITE_HOST_ROOT` | `technonaire.site` (same, for UI links) |
| `NEXT_PUBLIC_TECHNONAIRE_URL` | `https://technonaire.com` |
| `SESSION_SECRET` | long random string |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | strong password |
| `RESEND_API_KEY` | from Resend |
| `MAIL_FROM` | `Technonaire Easy Website <you@yourdomain.com>` |

Redeploy after setting variables.

### 4. Domain (optional)
Railway → Settings → Domains → `.up.railway.app` or `builder.technonaire.com`.

### 4b. Customer live hosts (`*.technonaire.site`)

#### Starter Plan (Random Subdomain)
Starter sites publish to a random address like `https://a1b2c3d4.technonaire.site`.

#### Custom Plan (Chosen Subdomain)
Custom plan users choose their subdomain like `https://mybusiness.technonaire.site`.

#### Domain Plan (Custom Domain)
Domain plan users bring their own domain like `https://mybusiness.com`.

**Railway Wildcard Setup:**
1. Own the domain `technonaire.site`
2. Railway → Domains → add `technonaire.site` and `*.technonaire.site` (wildcard)
3. DNS: CNAME/A for apex + wildcard as Railway instructs
4. Enable TLS / wildcard certificate for `*.technonaire.site`
5. Set `SITE_HOST_ROOT` and `NEXT_PUBLIC_SITE_HOST_ROOT` to `technonaire.site`

**Custom Domains:**
- Middleware routes custom domains to sites via `custom_domain` column
- DNS verification simulates propagation delay (30s for sandbox)
- SSL auto-provisioning via `ssl-manager.js` (stub for production Let's Encrypt)
- Domain health monitoring in `domain-health.js` (background job ready)

Locally, Preview still uses `/site/{slug}`. Live URLs show as:
- Starter: `https://{random}.technonaire.site`
- Custom: `https://{chosen}.technonaire.site`
- Domain: `https://{custom-domain}`

### 5. Point agency (Netlify)

```text
NEXT_PUBLIC_BUILDER_URL=https://YOUR-RAILWAY-URL
```

Redeploy Netlify.
