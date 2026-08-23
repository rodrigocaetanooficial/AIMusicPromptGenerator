import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay } from "date-fns";
import { ADMIN_EMAIL } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = subDays(now, 1);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fourteenDaysAgo = subDays(now, 13);

    const totalUsers = await prisma.user.count();

    const googleAccounts = await prisma.account.findMany({
      where: { provider: "google" },
      distinct: ["userId"],
      select: { userId: true },
    });
    const withGoogle = googleAccounts.length;

    const withEmail = await prisma.user.count({
      where: { passwordHash: { not: null } },
    });

    const registered24h = await prisma.user.count({
      where: { createdAt: { gte: dayAgo } },
    });

    const active24h = await prisma.user.count({
      where: { lastActiveAt: { gte: dayAgo }, email: { not: ADMIN_EMAIL } },
    });

    const onlineNow = await prisma.user.count({
      where: { lastActiveAt: { gte: fiveMinAgo }, email: { not: ADMIN_EMAIL } },
    });

    const anonVisitors24h = await prisma.anonVisitor.count({
      where: { lastSeenAt: { gte: dayAgo } },
    });

    const totalPrompts = await prisma.promptLog.count();
    const last24hPrompts = await prisma.promptLog.count({
      where: { createdAt: { gte: dayAgo } },
    });

    const promptsByProvider = await prisma.promptLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: dayAgo } },
      _count: { provider: true },
      orderBy: { _count: { provider: "desc" } },
    });

    const promptsByProviderFormatted = promptsByProvider.map((p) => ({
      provider: p.provider,
      count: p._count.provider,
    }));

    const last14DaysLogs = await prisma.promptLog.findMany({
      where: { createdAt: { gte: startOfDay(fourteenDaysAgo) } },
      select: { createdAt: true },
    });

    const dayMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      dayMap.set(d, 0);
    }

    for (const log of last14DaysLogs) {
      const d = format(log.createdAt, "yyyy-MM-dd");
      if (dayMap.has(d)) {
        dayMap.set(d, (dayMap.get(d) || 0) + 1);
      }
    }

    const promptsByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const onlineUsers = await prisma.user.findMany({
      where: { lastActiveAt: { gte: dayAgo }, email: { not: ADMIN_EMAIL } },
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
      where: { lastSeenAt: { gte: dayAgo } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, ipAddress: true, lastSeenAt: true },
    });

    const recentUsersRaw = await prisma.user.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        accounts: { where: { provider: "google" }, select: { provider: true } },
      },
    });

    const recentUsers = recentUsersRaw.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.lastActiveAt.toISOString(),
      hasGoogle: u.accounts.length > 0,
    }));

    const recentPromptsRaw = await prisma.promptLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const recentPrompts = recentPromptsRaw.map((p) => ({
      id: p.id,
      provider: p.provider,
      model: p.model,
      createdAt: p.createdAt.toISOString(),
      user: p.user ? { name: p.user.name, email: p.user.email } : null,
    }));

    return NextResponse.json({
      users: { total: totalUsers, withGoogle, withEmail },
      registered24h,
      active24h,
      onlineNow,
      anonVisitors24h,
      prompts: { total: totalPrompts, last24h: last24hPrompts },
      promptsByProvider: promptsByProviderFormatted,
      promptsByDay,
      onlineUsers: onlineUsers.map((u) => ({
        ...u,
        lastActiveAt: u.lastActiveAt.toISOString(),
      })),
      anonVisitors: anonVisitors.map((v) => ({
        ...v,
        lastSeenAt: v.lastSeenAt.toISOString(),
      })),
      recentUsers,
      recentPrompts,
    });
  } catch (error) {
    console.error("ADMIN_STATS_ERROR", error);
    return NextResponse.json(
      { error: "Error fetching statistics" },
      { status: 500 }
    );
  }
}
