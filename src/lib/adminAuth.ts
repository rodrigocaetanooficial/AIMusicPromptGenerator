import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "eurodrigocaetano@gmail.com";

export async function getAdminUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const email = session.user.email.toLowerCase().trim();
  if (email !== ADMIN_EMAIL.toLowerCase()) return null;
  return { email, name: session.user.name, image: session.user.image };
}
