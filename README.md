# Technonaire Easy Website (Builder)

Concierge website product for non-tech owners.

## What it does

1. Visitor messages Technonaire (with optional design screenshots)
2. Admin replies in inbox and creates a first draft + owner login
3. Invite (link + credentials) is posted in the same chat
4. Owner logs in and click-to-edits text, images, and colors
5. UI change requests stay in Messages (text + screenshots)

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

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
