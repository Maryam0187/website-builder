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

### Default admin

- Email: `admin@technonaire.com` (or `ADMIN_EMAIL`)
- Password: `changeme123` (or `ADMIN_PASSWORD`)

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
| `NEXT_PUBLIC_TECHNONAIRE_URL` | `https://technonaire.com` |
| `SESSION_SECRET` | long random string |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | strong password |
| `RESEND_API_KEY` | from Resend |
| `MAIL_FROM` | `Technonaire Easy Website <you@yourdomain.com>` |

Redeploy after setting variables.

### 4. Domain (optional)
Railway → Settings → Domains → `.up.railway.app` or `builder.technonaire.com`.

### 5. Point agency (Netlify)

```text
NEXT_PUBLIC_BUILDER_URL=https://YOUR-RAILWAY-URL
```

Redeploy Netlify.
