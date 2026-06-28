import { fail } from '@sunave/core';

class RateLimiterProvider {
  constructor({ limit, windowMs }) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
  
  async checkLimit(key) {
    throw new Error('Not implemented');
  }
}

class MemoryRateLimiter extends RateLimiterProvider {
  constructor(options) {
    super(options);
    this.buckets = new Map();
  }

  async checkLimit(key) {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { count: 0, resetAt: now + this.windowMs };

    if (bucket.resetAt < now) {
      bucket.count = 0;
      bucket.resetAt = now + this.windowMs;
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return bucket.count > this.limit;
  }
}

// FutureRedisRateLimiter goes here

export function createRateLimit({ limit, windowMs }) {
  // Can be conditionally initialized based on config
  const provider = new MemoryRateLimiter({ limit, windowMs });

  return async (req, res, next) => {
    // DO NOT use email for rate limiting key to avoid timing attacks
    const key = `${req.ip}:${req.path}`;
    
    try {
      const isLimited = await provider.checkLimit(key);
      if (isLimited) {
        return res.status(429).json(fail('RATE_LIMITED', 'Too many attempts. Please retry later.'));
      }
      return next();
    } catch (error) {
      // Fail open if rate limiter fails
      return next();
    }
  };
}
