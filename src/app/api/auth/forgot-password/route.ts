import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Please provide your email address." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Generic response either way — never reveal whether an email is registered.
    if (!user || !user.passwordHash) {
      return NextResponse.json({
        message: "If an account exists for this email, a password reset link has been sent.",
      });
    }

    // Remove previous tokens for this email, then issue a fresh one (1h expiry).
    await prisma.passwordResetToken.deleteMany({ where: { email: cleanEmail } });

    const token = uuidv4();
    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    const emailResult = await sendPasswordResetEmail(cleanEmail, token);

    return NextResponse.json({
      message: "If an account exists for this email, a password reset link has been sent.",
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 });
  }
}
