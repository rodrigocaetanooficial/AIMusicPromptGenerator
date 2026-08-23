import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const onlineUsers = await prisma.user.findMany({
      where: { lastActiveAt: { gte: dayAgo } },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastActiveAt: true,
      },
    });

    const anonVisitors = await prisma.anonVisitor.findMany({
      where: { lastSeenAt: { gte: fiveMinAgo } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, ipAddress: true, lastSeenAt: true },
    });

    const onlineNow = await prisma.user.count({
      where: { lastActiveAt: { gte: fiveMinAgo } },
    });

    return NextResponse.json({
      onlineUsers: onlineUsers.map((u) => ({
        ...u,
        lastActiveAt: u.lastActiveAt.toISOString(),
      })),
      anonVisitors: anonVisitors.map((v) => ({
        ...v,
        lastSeenAt: v.lastSeenAt.toISOString(),
      })),
      onlineNow,
    });
  } catch (error) {
    console.error("ADMIN_LIVE_ERROR", error);
    return NextResponse.json(
      { error: "Error fetching live data" },
      { status: 500 }
    );
  }
}
