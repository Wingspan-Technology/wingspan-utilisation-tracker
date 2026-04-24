import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { UserNav } from "@/components/layout/UserNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-card flex items-center justify-end px-6">
          <UserNav name={session.name} email={session.email} role={session.role} />
        </header>
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
