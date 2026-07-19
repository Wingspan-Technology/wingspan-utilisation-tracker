"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";
import { UserNav } from "./UserNav";
import { AppFooter } from "./AppFooter";

interface AdminShellProps {
  name: string;
  email: string;
  role: string;
  children: React.ReactNode;
}

export function AdminShell({ name, email, role, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-dvh shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <AdminSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-background flex items-center px-6 gap-4 shrink-0">
          <button
            className="md:hidden text-zinc-400 hover:text-white transition-colors p-1 rounded"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wingspan-logo.svg" alt="Wingspan" className="md:hidden h-5 w-auto" />
          <div className="flex-1" />
          <UserNav name={name} email={email} role={role} />
        </header>
        <main className="flex-1 p-6 bg-background">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
