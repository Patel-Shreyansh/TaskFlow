/**
 * Minimal in-memory fixed-window rate limiter (no extra dependency).
 * Good enough for a single-process app; swap for a Redis-backed
 * limiter if you ever run multiple instances behind a load balancer.
 */
function rateLimit({ windowMs = 60_000, max = 20, message } = {}) {
  const hits = new Map();

  // Periodically clear stale entries so the map doesn't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const record = hits.get(key) || { count: 0, start: now };

    if (now - record.start > windowMs) {
      record.count = 0;
      record.start = now;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.start + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: message || "Too many requests. Please try again shortly.",
      });
    }

    next();
  };
}

module.exports = rateLimit;
