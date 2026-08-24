import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const baseUrl = process.env.NEXTAUTH_URL || "https://ai-music.viaweb.pro";

  if (!token || !email) {
    return NextResponse.redirect(`${baseUrl}/?error=InvalidVerificationLink`);
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    // The pending registration IS the source of truth: it holds the
    // password hash and is only created after a successful signup.
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: cleanEmail },
    });

    if (!pending || pending.token !== token) {
      return NextResponse.redirect(`${baseUrl}/?error=VerificationTokenNotFound`);
    }

    if (pending.expires < new Date()) {
      // Expired: remove so the email can be registered again.
      await prisma.pendingRegistration.delete({ where: { id: pending.id } });
      return NextResponse.redirect(`${baseUrl}/?error=VerificationTokenExpired`);
    }

    // Race guard: a Google account may have claimed this email between
    // registration and verification. Never overwrite an existing user.
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } });
      return NextResponse.redirect(`${baseUrl}/?error=VerificationFailed`);
    }

    // The account is born HERE — only after the email is verified.
    await prisma.user.create({
      data: {
        email: cleanEmail,
        name: pending.name,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
      },
    });

    await prisma.pendingRegistration.delete({ where: { id: pending.id } });

    return NextResponse.redirect(`${baseUrl}/?verified=true`);
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(`${baseUrl}/?error=VerificationFailed`);
  }
}
