import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Please provide a valid email and a password of at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 400 }
        );
      } else {
        // Resend email verification token
        const token = uuidv4();
        await prisma.verificationToken.deleteMany({
          where: { identifier: cleanEmail },
        });

        await prisma.verificationToken.create({
          data: {
            identifier: cleanEmail,
            token,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        });

        await sendVerificationEmail(cleanEmail, token);

        return NextResponse.json({
          message: "Registration pending. A new verification email has been sent to your inbox.",
          emailSent: true,
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name?.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        passwordHash,
        emailVerified: null,
      },
    });

    const token = uuidv4();
    await prisma.verificationToken.create({
      data: {
        identifier: cleanEmail,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    const emailResult = await sendVerificationEmail(cleanEmail, token);

    return NextResponse.json({
      message: "Registration successful! Please check your email to verify and activate your account.",
      user: { id: user.id, email: user.email, name: user.name },
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
