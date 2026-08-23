import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ADMIN_EMAIL } from "@/lib/admin-config";

export const dynamic = "force-dynamic";

// Server-side gate for the /admin page (defense in depth).
// - Logged-out visitors pass through: the client renders the sign-in screen.
// - Authenticated non-admins are redirected away (never see any admin UI).
// - The admin reaches the dashboard.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const email = session.user.email.toLowerCase().trim();
    if (email !== ADMIN_EMAIL.toLowerCase()) {
      redirect("/");
    }
  }

  return <>{children}</>;
}
