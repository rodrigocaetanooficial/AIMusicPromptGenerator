// In-memory sliding-window rate limiter.
// Safe for single-instance deployments (PM2 fork, instances: 1).
// In dev, hot reload resets the counters — acceptable.

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();

  // Safety cap: never let the map grow unbounded (hostile IPs).
  if (buckets.size > 10_000) buckets.clear();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  return { ok: true };
}
