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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            // SQLite LIKE is case-insensitive for ASCII by default; Prisma's
            // `mode: "insensitive"` filter is NOT supported on SQLite.
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const usersRaw = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        accounts: { select: { provider: true } },
      },
    });

    const users = usersRaw.map((u) => {
      const hasGoogle = u.accounts.some((a) => a.provider === "google");
      const hasEmail = !!u.passwordHash;
      let provider: "google" | "email" | "none" = "none";
      if (hasGoogle) provider = "google";
      else if (hasEmail) provider = "email";

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.lastActiveAt.toISOString(),
        provider,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("ADMIN_USERS_ERROR", error);
    return NextResponse.json(
      { error: "Error fetching users" },
      { status: 500 }
    );
  }
}
