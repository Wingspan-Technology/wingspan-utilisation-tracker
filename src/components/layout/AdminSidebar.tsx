"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, BarChart2, Briefcase, Clock, KeyRound, MonitorSmartphone, ScrollText, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/clients", label: "Clients", icon: Briefcase },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/time-entries", label: "Time Entries", icon: Clock },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
];

const reportItems = [
  { href: "/reports/dynamic-utilisation", label: "Dynamic Utilisation", icon: BarChart2 },
  { href: "/reports/delinquency-report", label: "Delinquency Report", icon: AlertTriangle },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps = {}) {
  const pathname = usePathname();

  const linkClass = (href: string, exact?: boolean) =>
    cn(
      "flex items-center px-3 py-3.5 md:py-2 rounded-md text-sm font-medium transition-colors",
      (exact ? pathname === href : pathname.startsWith(href))
        ? "text-white"
        : "text-zinc-400 hover:bg-white/10 hover:text-white"
    );

  return (
    <aside className="w-64 bg-zinc-950 text-white h-full flex flex-col border-r border-white/15">
      <div className="px-6 pt-6 pb-4 shrink-0">
        {onClose && (
          <button
            onClick={onClose}
            className="float-right text-zinc-400 hover:text-white transition-colors p-1 rounded"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wingspan-logo.svg" alt="Wingspan" className="w-full h-auto" />
        <p className="text-sm text-white mt-1.5">Utilisation Tracker</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)} onClick={onClose}>
            <Icon className="h-4 w-4 shrink-0 mr-2" />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Reports
          </p>
          {reportItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)} onClick={onClose}>
              <Icon className="h-4 w-4 shrink-0 mr-2" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="p-4 border-t border-white/5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-3.5 md:py-2 rounded-md text-sm font-medium text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <MonitorSmartphone className="h-5 w-5 shrink-0" />
          Developer view
        </Link>
      </div>
    </aside>
  );
}
