"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

const reportItems = [
  { href: "/reports/dynamic-utilisation", label: "Dynamic Utilisation" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const linkClass = (href: string, exact?: boolean) =>
    cn(
      "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
      (exact ? pathname === href : pathname.startsWith(href))
        ? "text-white"
        : "text-zinc-400 hover:bg-white/10 hover:text-white"
    );

  return (
    <aside className="w-64 bg-zinc-950 text-white min-h-screen flex flex-col border-r border-white/5">
      <div className="h-14 flex items-center px-6 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-white leading-none">Wingspan</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Utilisation Tracker</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href, item.exact)}>
            {item.label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Reports
          </p>
          {reportItems.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
