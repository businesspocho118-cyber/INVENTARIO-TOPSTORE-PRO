import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, getSessionCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (token) {
    const session = await verifySession(token);
    if (session.valid) {
      redirect("/admin");
    }
  }

  return <>{children}</>;
}
