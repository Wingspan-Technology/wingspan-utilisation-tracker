import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UserNav } from "@/components/layout/UserNav";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 bg-zinc-950 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">Wingspan</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline text-sm text-zinc-500">Utilisation Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          {session.role === "ADMIN" && (
            <Link href="/admin/clients" className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Admin view</span>
            </Link>
          )}
          <UserNav name={session.name} email={session.email} role={session.role} />
        </div>
      </header>
      <main className="flex-1 p-6 bg-background">{children}</main>
    </div>
  );
}
