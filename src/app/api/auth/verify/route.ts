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
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: cleanEmail,
        token: token,
      },
    });

    if (!verificationRecord) {
      return NextResponse.redirect(`${baseUrl}/?error=VerificationTokenNotFound`);
    }

    if (verificationRecord.expires < new Date()) {
      return NextResponse.redirect(`${baseUrl}/?error=VerificationTokenExpired`);
    }

    await prisma.user.update({
      where: { email: cleanEmail },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    return NextResponse.redirect(`${baseUrl}/?verified=true`);
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(`${baseUrl}/?error=VerificationFailed`);
  }
}
