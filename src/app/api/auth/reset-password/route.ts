import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, password } = body;

    if (!token || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Please provide your email, the reset token, and a new password of at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { email: cleanEmail, token },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset link. Please request a new one." }, { status: 400 });
    }

    if (resetRecord.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "No account found for this email." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Single-use: consume the token.
    await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });

    return NextResponse.json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
