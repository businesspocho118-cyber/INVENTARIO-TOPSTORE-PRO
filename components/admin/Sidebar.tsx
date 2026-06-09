"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  LayoutDashboard,
  Shirt,
  Package,
  Users,
  Star,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Ver stock", icon: Store },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Shirt },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/fidelidad", label: "Fidelidad", icon: Star },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="admin-sidebar fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-[#2A2A2A] bg-[#0F0F0F] text-[#F0F0EB]"
    >
      {/* Logo */}
      <div className="border-b border-[#2A2A2A] px-6 py-6">
        <Link href="/admin" className="block">
          <h1 className="text-xl font-bold text-admin-gold tracking-wider">
            TOPSTORE
          </h1>
          <p className="mt-1 text-xs text-[#B3B3B3]">Admin Panel</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "border-l-2 border-admin-gold bg-admin-gold/15 text-admin-gold"
                  : "text-[#D8D8D8] hover:bg-[#1E1E1E] hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-[#2A2A2A] px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#D8D8D8] transition-colors hover:bg-admin-danger/10 hover:text-admin-danger"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
