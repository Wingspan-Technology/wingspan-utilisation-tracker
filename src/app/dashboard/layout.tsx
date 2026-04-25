import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UserNav } from "@/components/layout/UserNav";

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
          <span className="text-white/20">|</span>
          <span className="text-sm text-zinc-500">Utilisation Tracker</span>
        </div>
        <UserNav name={session.name} email={session.email} role={session.role} />
      </header>
      <main className="flex-1 p-6 bg-background">{children}</main>
    </div>
  );
}
