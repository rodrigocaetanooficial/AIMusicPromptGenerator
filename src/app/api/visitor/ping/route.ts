import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIP, isCloudflareInfraIP } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Throttle anonymous pings: 30 / IP / min (flood protection + DB write cap)
const PING_RATE_LIMIT = 30;
const PING_WINDOW_MS = 60 * 1000;
// Skip DB writes when the same IP pinged within the last 30s
const MIN_UPDATE_INTERVAL_MS = 30 * 1000;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Skip Cloudflare infrastructure IPs (SSR/prefetch requests without a real visitor header)
    if (ip === "0.0.0.0" || isCloudflareInfraIP(ip)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const rl = rateLimit(`ping:${ip}`, PING_RATE_LIMIT, PING_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Min-window: don't write if this IP pinged very recently
    const existing = await prisma.anonVisitor.findUnique({
      where: { ipAddress: ip },
      select: { lastSeenAt: true },
    });
    if (
      existing &&
      Date.now() - existing.lastSeenAt.getTime() < MIN_UPDATE_INTERVAL_MS
    ) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Upsert: insert or update lastSeenAt for this IP
    await prisma.anonVisitor.upsert({
      where: { ipAddress: ip },
      update: { lastSeenAt: new Date() },
      create: { ipAddress: ip, lastSeenAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
