import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import { verifySession, getSessionCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    redirect("/admin/login");
  }

  const session = await verifySession(token);
  if (!session.valid) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="admin-workspace flex-1 ml-60 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}
