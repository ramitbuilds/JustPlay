// A bounded, per-instance safety net for hosts without a native limiter binding.
// Cold starts and multiple instances have separate counters; this is not a global quota.
export function createInstanceRateLimiter({
  limit = 5,
  totalLimit = 30,
  maxKeys = 2048,
  windowMs = 60000,
  now = Date.now,
} = {}) {
  const buckets = new Map<string, { count: number; expires: number }>();
  let total = 0;
  let totalExpires = 0;
  return {
    async limit({ key }: { key: string }): Promise<{ success: boolean }> {
      const time = now();
      if (time >= totalExpires) {
        total = 0;
        totalExpires = time + windowMs;
        for (const [address, bucket] of buckets)
          if (time >= bucket.expires) buckets.delete(address);
      }
      if (total >= totalLimit) return { success: false };
      const bucket = buckets.get(key);
      if (bucket && time < bucket.expires) {
        if (bucket.count >= limit) return { success: false };
        bucket.count++;
      } else {
        if (!bucket && buckets.size >= maxKeys) return { success: false };
        buckets.set(key, { count: 1, expires: time + windowMs });
      }
      total++;
      return { success: true };
    },
  };
}
