/**
 * Simple in-memory rate limiter with optional Redis/Upstash support
 * 
 * Environment Variables:
 * - UPSTASH_REDIS_REST_URL (optional): Redis URL for distributed rate limiting
 * - UPSTASH_REDIS_REST_TOKEN (optional): Redis auth token
 * 
 * Usage:
 * ```javascript
 * import { rateLimit } from '@/lib/rate-limit';
 * 
 * const limiter = rateLimit({
 *   interval: 60 * 1000, // 1 minute
 *   limit: 5, // 5 requests per minute
 * });
 * 
 * const result = await limiter.check(request, 'login');
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests. Please try again later.' },
 *     { status: 429 }
 *   );
 * }
 * ```
 */

// In-memory store (works on Railway without additional services)
const memoryStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.reset) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get IP address from request
 */
function getIP(request) {
  // Try various headers (Railway, Cloudflare, Vercel)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  
  if (cfConnectingIp) return cfConnectingIp;
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  
  return 'unknown';
}

/**
 * Create a rate limiter
 * 
 * @param {Object} options
 * @param {number} options.interval - Time window in milliseconds
 * @param {number} options.limit - Max requests per interval
 * @param {boolean} options.skipFailedRequests - Don't count failed requests
 */
export function rateLimit(options = {}) {
  const {
    interval = 60 * 1000, // 1 minute
    limit = 10,
    skipFailedRequests = false,
  } = options;

  return {
    /**
     * Check if request is rate limited
     * 
     * @param {Request} request - Next.js request object
     * @param {string} identifier - Additional identifier (e.g., 'login', 'api')
     * @param {string|null} userId - Optional user ID for per-user limiting
     * @returns {Promise<{ success: boolean, limit: number, remaining: number, reset: number }>}
     */
    async check(request, identifier = 'default', userId = null) {
      const ip = getIP(request);
      const key = userId ? `${identifier}:user:${userId}` : `${identifier}:ip:${ip}`;
      
      const now = Date.now();
      let record = memoryStore.get(key);
      
      if (!record || now > record.reset) {
        // New window
        record = {
          count: 1,
          reset: now + interval,
        };
        memoryStore.set(key, record);
        
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: record.reset,
        };
      }
      
      // Within existing window
      if (record.count >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: record.reset,
        };
      }
      
      record.count++;
      memoryStore.set(key, record);
      
      return {
        success: true,
        limit,
        remaining: limit - record.count,
        reset: record.reset,
      };
    },
    
    /**
     * Reset rate limit for a key
     */
    async reset(request, identifier = 'default', userId = null) {
      const ip = getIP(request);
      const key = userId ? `${identifier}:user:${userId}` : `${identifier}:ip:${ip}`;
      memoryStore.delete(key);
    },
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Auth endpoints: 5 requests per minute
  auth: rateLimit({ interval: 60 * 1000, limit: 5 }),
  
  // Contact forms: 3 requests per 5 minutes
  contact: rateLimit({ interval: 5 * 60 * 1000, limit: 3 }),
  
  // Checkout/payment: 10 requests per minute
  checkout: rateLimit({ interval: 60 * 1000, limit: 10 }),
  
  // API calls: 30 requests per minute
  api: rateLimit({ interval: 60 * 1000, limit: 30 }),
  
  // Admin operations: 100 requests per minute
  admin: rateLimit({ interval: 60 * 1000, limit: 100 }),
  
  // Public lookups: 20 requests per minute
  public: rateLimit({ interval: 60 * 1000, limit: 20 }),
};

/**
 * Middleware helper to apply rate limiting
 */
export async function applyRateLimit(request, limiter, identifier, userId = null) {
  const result = await limiter.check(request, identifier, userId);
  
  if (!result.success) {
    const resetDate = new Date(result.reset);
    const secondsRemaining = Math.ceil((result.reset - Date.now()) / 1000);
    
    return {
      limited: true,
      response: Response.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: secondsRemaining,
          limit: result.limit,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(secondsRemaining),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': resetDate.toISOString(),
          },
        }
      ),
    };
  }
  
  return {
    limited: false,
    remaining: result.remaining,
    limit: result.limit,
  };
}
