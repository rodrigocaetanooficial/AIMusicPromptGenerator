import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getClientIP } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Throttle heartbeats: 30 / IP / min
const HB_RATE_LIMIT = 30;
const HB_WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`hb:${getClientIP(request)}`, HB_RATE_LIMIT, HB_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await prisma.user.update({
      where: { email: session.user.email.toLowerCase() },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
