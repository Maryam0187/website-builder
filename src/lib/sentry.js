/**
 * Sentry Error Tracking Integration
 * Only initializes if SENTRY_DSN environment variable is set
 */

let Sentry = null;

// Conditionally import Sentry only if DSN is configured
if (process.env.SENTRY_DSN) {
  try {
    const SentryModule = require("@sentry/nextjs");
    Sentry = SentryModule;

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE 
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) 
        : 0.1,
      
      // Don't send errors in development unless explicitly enabled
      enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true",
      
      beforeSend(event, hint) {
        // Filter out noisy errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Ignore authentication errors (expected)
          if (error && error.message && error.message.includes("Unauthorized")) {
            return null;
          }
          
          // Ignore rate limit errors (expected)
          if (error && error.message && error.message.includes("rate limit")) {
            return null;
          }
        }
        
        return event;
      },
    });

    console.log("✅ Sentry initialized");
  } catch (error) {
    console.warn("⚠️ Sentry initialization failed:", error.message);
    Sentry = null;
  }
} else {
  console.log("ℹ️ Sentry not configured (SENTRY_DSN not set)");
}

/**
 * Capture an exception in Sentry (if configured)
 */
export function captureException(error, context = {}) {
  if (Sentry) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    // Fallback to console logging
    console.error("Exception:", error, context);
  }
}

/**
 * Capture a message in Sentry (if configured)
 */
export function captureMessage(message, level = "info", context = {}) {
  if (Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user) {
  if (Sentry && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message, category = "default", data = {}) {
  if (Sentry) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }
}

export default Sentry;
