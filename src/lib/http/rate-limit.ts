import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true; remaining: number; resetAt: number } | { ok: false; remaining: 0; resetAt: number } {
  const now = Date.now();
  if (buckets.size > 2000) prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many PDF parse requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}
