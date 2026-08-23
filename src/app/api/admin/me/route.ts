import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Server-side admin check for the client page.
// Returns only a boolean — never the admin email.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }
  return NextResponse.json({ isAdmin: true });
}
