# Sentry Error Monitoring Setup

## Installation

```bash
npm install @sentry/nextjs
```

## Configuration

### Environment Variables

Add to `.env` or deployment environment:

```bash
# Required
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional
SENTRY_ENABLED=true  # Force enable in dev (defaults to production-only)
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions sampled (default)
NODE_ENV=production  # Sentry auto-enables in production
```

### Get Your Sentry DSN

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project (Next.js)
3. Copy the DSN from project settings
4. Add to environment variables

## Usage in Code

### Automatic Error Capture

Most errors are automatically captured when Sentry is configured. No code changes needed.

### Manual Error Capture

```javascript
import { captureException, captureMessage, setUser } from "@/lib/sentry";

// Capture an exception
try {
  throw new Error("Something went wrong");
} catch (error) {
  captureException(error, {
    userId: user.id,
    action: "checkout",
  });
}

// Capture a message
captureMessage("User completed checkout", "info", {
  planId: "pro",
  amount: 2999,
});

// Set user context (for better error tracking)
setUser({
  id: user.id,
  email: user.email,
  name: user.name,
});
```

### Add Breadcrumbs

```javascript
import { addBreadcrumb } from "@/lib/sentry";

addBreadcrumb("User clicked subscribe button", "user-action", {
  planId: "starter",
});
```

## What Gets Captured

Sentry automatically captures:
- ✅ Unhandled exceptions
- ✅ API route errors
- ✅ React component errors
- ✅ Promise rejections
- ✅ Console errors (in production)

Sentry does NOT capture (filtered out):
- ❌ "Unauthorized" errors (expected auth failures)
- ❌ Rate limit errors (expected behavior)

## Conditional Initialization

Sentry only initializes if `SENTRY_DSN` is set. This means:
- ✅ No Sentry dependency in development (unless you want it)
- ✅ No crashes if Sentry is not configured
- ✅ Falls back to console logging

## Structured Logging Integration

For production-ready logging, combine with Winston or Pino:

```javascript
import { captureMessage } from "@/lib/sentry";
import logger from "@/lib/logger";

function logEvent(message, level, context) {
  // Log to structured logger (JSON)
  logger[level](message, context);
  
  // Also send to Sentry if important
  if (level === "error") {
    captureMessage(message, level, context);
  }
}
```

## Monitoring Best Practices

1. **Set up alerts** in Sentry for critical errors
2. **Review errors weekly** to catch patterns
3. **Tag releases** so you can track which version introduced a bug:
   ```bash
   export SENTRY_RELEASE=$(git rev-parse HEAD)
   ```
4. **Monitor performance** using Sentry's transaction sampling

## Cost

- **Free tier:** 5,000 errors/month
- **Paid tier:** $26/month for 50k errors
- Most small apps stay on free tier

## Alternatives

If you don't want to use Sentry:
- Cloudflare Workers Analytics
- Custom logging to CloudWatch/Datadog
- Simple file-based error logging

But Sentry is highly recommended for production SaaS!
