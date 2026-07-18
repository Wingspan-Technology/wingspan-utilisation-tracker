"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { Shield, User as UserIcon } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserForm } from "@/components/admin/UserForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types";

export default function UsersPage() {
  const searchParams = useSearchParams();
  const showInactive = searchParams.get("status") === "inactive";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleUsers = users
    .filter((u) => u.isActive !== showInactive)
    .sort((a, b) => {
      if (a.dayRate == null) return b.dayRate == null ? 0 : 1;
      if (b.dayRate == null) return -1;
      return b.dayRate - a.dayRate;
    });

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSuccess(updated: User) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [updated, ...prev];
    });
    setEditUser(null);
  }

  function handleDeleteRequest(user: User) {
    setFormOpen(false);
    setDeleteUser(user);
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success("User deleted");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete user");
    }
    setDeleting(false);
    setDeleteUser(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{showInactive ? "Inactive Users" : "Users"}</h1>
        </div>
        {!showInactive && (
          <Button className="w-full sm:w-auto" onClick={() => { setEditUser(null); setFormOpen(true); }}>Add User</Button>
        )}
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Day Rate</TableHead>
              <TableHead>Days Since Last Entry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : visibleUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {showInactive ? "No inactive users." : "No users yet."}
                </TableCell>
              </TableRow>
            ) : visibleUsers.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => { setEditUser(user); setFormOpen(true); }}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Tooltip.Provider delay={300}>
                      <Tooltip.Root>
                        <Tooltip.Trigger className="inline-flex text-muted-foreground">
                          {user.role === "ADMIN" ? <Shield className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              {user.role === "ADMIN" ? "Admin" : "Developer"}
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                    {user.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.dayRate != null ? `£${user.dayRate.toLocaleString()}` : <span className="text-muted-foreground/50">N/A</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.lastEntryDate != null
                    ? differenceInCalendarDays(new Date(), new Date(user.lastEntryDate))
                    : <span className="text-muted-foreground/50">Never</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="-mt-3">
        {showInactive ? (
          <Link
            href="/admin/users"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Back to active users
          </Link>
        ) : (
          <Link
            href="/admin/users?status=inactive"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View inactive users
          </Link>
        )}
      </div>

      <UserForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditUser(null); }}
        user={editUser}
        onSuccess={handleSuccess}
        onDelete={handleDeleteRequest}
      />
      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={(v) => !v && setDeleteUser(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUser?.name}? All their time entries will also be deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
