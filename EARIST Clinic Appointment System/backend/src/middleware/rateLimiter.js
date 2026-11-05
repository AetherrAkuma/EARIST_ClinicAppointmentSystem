/**
 * Sliding-window in-memory rate limiter middleware for sensitive clinic endpoints
 */

function createRateLimiter({
  windowMs = 60000,
  max = 30,
  message = 'Too many requests. Please wait a moment before trying again.'
} = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const timestamps = hits.get(ip) || [];

    // Purge timestamps older than the window
    const windowStart = now - windowMs;
    const recent = timestamps.filter(t => t > windowStart);

    if (recent.length >= max) {
      const oldest = recent[0] || windowStart;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message,
        retry_after_seconds: retryAfterSec
      });
    }

    recent.push(now);
    hits.set(ip, recent);

    // Sweep clean every 2000 unique records
    if (hits.size > 2000) {
      for (const [key, times] of hits.entries()) {
        if (times.every(t => t <= windowStart)) {
          hits.delete(key);
        }
      }
    }

    next();
  };
}

module.exports = { createRateLimiter };

