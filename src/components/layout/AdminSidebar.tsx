"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/clients", label: "Clients", icon: "🏢" },
  { href: "/admin/projects", label: "Projects", icon: "📁" },
  { href: "/admin/tasks", label: "Tasks", icon: "✅" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-950 text-white min-h-screen flex flex-col border-r border-white/5">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-lg font-bold text-white">Wingspan</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Utilisation Tracker</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
