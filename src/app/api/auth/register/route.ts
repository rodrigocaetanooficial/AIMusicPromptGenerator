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

    // If a VERIFIED account already exists, registration is not possible.
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 400 }
      );
    }

    // Clean up expired pending registrations for hygiene.
    await prisma.pendingRegistration.deleteMany({
      where: { expires: { lt: new Date() } },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const token = uuidv4();

    // Upsert the PENDING registration. No User row is created here —
    // the account is only born when the verification link is clicked.
    await prisma.pendingRegistration.upsert({
      where: { email: cleanEmail },
      update: { name: name?.trim() || cleanEmail.split("@")[0], passwordHash, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      create: {
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split("@")[0],
        passwordHash,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    const emailResult = await sendVerificationEmail(cleanEmail, token);

    return NextResponse.json({
      message: "Registration successful! Please check your email to verify and activate your account.",
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
