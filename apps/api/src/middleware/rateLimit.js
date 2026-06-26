import { fail } from '@sunave/core';

const buckets = new Map();

function now() {
  return Date.now();
}

export function createRateLimit({ limit, windowMs }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}:${(req.body?.email || '').toLowerCase()}`;
    const bucket = buckets.get(key) || { count: 0, resetAt: now() + windowMs };

    if (bucket.resetAt < now()) {
      bucket.count = 0;
      bucket.resetAt = now() + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      return res.status(429).json(fail('RATE_LIMITED', 'Too many attempts. Please retry later.'));
    }

    return next();
  };
}
