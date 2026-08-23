import { NextRequest } from "next/server";

// Extract the real client IP, respecting proxy/CDN headers.
// Priority: Cloudflare → X-Forwarded-For → X-Real-IP → fallback
export function getClientIP(request: NextRequest): string {
  // Cloudflare always sets this to the real visitor IP
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();

  // Standard proxy chain — first entry is the original client
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

// Cloudflare infrastructure IP ranges — not real visitors
const CLOUDFLARE_RANGES = [
  /^172\.(6[4-9]|7[0-1])\./,
  /^104\.1(6[0-9]|7[0-9]|8[0-7])\./,
];

export function isCloudflareInfraIP(ip: string): boolean {
  return CLOUDFLARE_RANGES.some((range) => range.test(ip));
}
