"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ListPicker } from "@/components/ui/list-picker";
import type { Role, User } from "@/types";

const ROLE_ITEMS = [
  { id: "USER", name: "Developer" },
  { id: "ADMIN", name: "Admin" },
];

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: (user: User) => void;
}

export function UserForm({ open, onOpenChange, user, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "USER",
    isActive: user?.isActive ?? true,
    dayRate: user?.dayRate?.toString() ?? "",
    fixedPrice: user?.dayRate == null && !!user,
  });

  useEffect(() => {
    if (open) setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "USER",
      isActive: user?.isActive ?? true,
      dayRate: user?.dayRate?.toString() ?? "",
      fixedPrice: user?.dayRate == null && !!user,
    });
  }, [open]); // eslint-disable-line

  function reset() {
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "USER",
      isActive: user?.isActive ?? true,
      dayRate: user?.dayRate?.toString() ?? "",
      fixedPrice: user?.dayRate == null && !!user,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
        dayRate: form.fixedPrice ? null : (form.dayRate !== "" ? parseFloat(form.dayRate) : null),
      };

      const res = await fetch(
        isEdit ? `/api/users/${user!.id}` : "/api/users",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      let data: Record<string, unknown> | null = null;
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) {
        toast.error((data?.error as string) || "Failed to save user");
        return;
      }

      toast.success(isEdit ? "User updated" : "User created");
      onSuccess(data as unknown as User);
      onOpenChange(false);
      reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="gap-0.5">
          <DialogTitle className="text-xl">{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <ListPicker
              items={ROLE_ITEMS}
              value={form.role}
              onChange={(id) => setForm({ ...form, role: id as Role })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dayRate">Day Rate (£)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="dayRate"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 450"
                value={form.fixedPrice ? "" : form.dayRate}
                onChange={(e) => setForm({ ...form, dayRate: e.target.value })}
                disabled={form.fixedPrice}
                className="flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id="fixedPrice"
                  checked={form.fixedPrice}
                  onCheckedChange={(v) => setForm({ ...form, fixedPrice: v, dayRate: v ? "" : form.dayRate })}
                />
                <Label htmlFor="fixedPrice" className="whitespace-nowrap text-muted-foreground">Fixed price (N/A)</Label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              The user will sign in with their Google account using this email address.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-2 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
