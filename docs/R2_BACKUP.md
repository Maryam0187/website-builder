# Database Backup to R2

## Overview

Automated nightly database backups to Cloudflare R2 (S3-compatible storage).

## Setup

### Environment Variables

Add these to your `.env` or deployment environment:

```bash
# R2 Configuration
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=your-backup-bucket-name
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key

# Backup Protection
BACKUP_SECRET=your-random-secret-string-here
```

### R2 Bucket Setup

1. Log into Cloudflare Dashboard
2. Navigate to R2 Storage
3. Create a new bucket (e.g., `technonaire-backups`)
4. Generate R2 API credentials
5. Copy the endpoint URL, access key, and secret key

## Triggering Backups

### Manual Trigger

```bash
curl -X POST https://your-app.com/api/admin/backup \
  -H "Authorization: Bearer YOUR_BACKUP_SECRET"
```

### Automated Nightly Backups

#### Option 1: GitHub Actions

Create `.github/workflows/nightly-backup.yml`:

```yaml
name: Nightly Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/admin/backup \
            -H "Authorization: Bearer ${{ secrets.BACKUP_SECRET }}"
```

#### Option 2: Cron Job (Self-Hosted)

```bash
# Add to crontab
0 2 * * * curl -X POST https://your-app.com/api/admin/backup -H "Authorization: Bearer YOUR_BACKUP_SECRET"
```

#### Option 3: Cloudflare Workers Cron Trigger

Create a Cloudflare Worker with cron trigger:

```javascript
export default {
  async scheduled(event, env, ctx) {
    await fetch('https://your-app.com/api/admin/backup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.BACKUP_SECRET}`
      }
    });
  }
};
```

## Backup Retention

Backups are stored indefinitely in R2. To implement retention:

1. Use R2 Object Lifecycle rules (if available)
2. Or create a cleanup script:

```bash
# Delete backups older than 30 days
aws s3 ls s3://your-bucket/backups/ --endpoint-url YOUR_R2_ENDPOINT | \
  awk '{print $4}' | \
  while read filename; do
    # Parse date from filename and delete if > 30 days old
    # Implementation left as exercise
  done
```

## Restoring from Backup

### Download Backup

```bash
AWS_ACCESS_KEY_ID="your-key" \
AWS_SECRET_ACCESS_KEY="your-secret" \
aws s3 cp s3://your-bucket/backups/backup-2026-11-02T14-30-00.sql backup.sql \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

### Restore to Database

```bash
psql $DATABASE_URL < backup.sql
```

## Security Notes

- **BACKUP_SECRET** should be a strong random string
- Never commit secrets to git
- Use environment variable injection in CI/CD
- R2 credentials should have minimal permissions (write-only to backup bucket)
- Consider encrypting backups before upload for extra security

## Monitoring

Check backup logs in:
- Application logs (console output)
- GitHub Actions run history (if using GH Actions)
- R2 bucket contents (verify files are being created)

## Cost Estimate

R2 Pricing (as of 2024):
- Storage: $0.015/GB/month
- Operations: Free up to 10M requests/month

Example:
- 100 MB daily backup = 3 GB/month
- Cost: ~$0.05/month

Very cost-effective!
