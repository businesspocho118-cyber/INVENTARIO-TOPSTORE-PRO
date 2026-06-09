import Sidebar from "@/components/admin/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="admin-workspace flex-1 ml-60 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}
