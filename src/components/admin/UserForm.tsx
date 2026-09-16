"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Check, Plus, Trash2, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import { TIMEZONES } from "@/lib/timezones";
import { currentRate } from "@/lib/rates";
import type { DeveloperRate, Role, User } from "@/types";

const ROLE_ITEMS = [
  { id: "USER", name: "Developer" },
  { id: "ADMIN", name: "Admin" },
];

const TIMEZONE_ITEMS = TIMEZONES.map((tz) => ({ id: tz, name: tz }));

function todayInput(): string {
  return format(new Date(), "yyyy-MM-dd");
}

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserForm({ open, onOpenChange, user, onSuccess, onDelete }: UserFormProps) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "USER",
    isActive: user?.isActive ?? true,
    timezone: user?.timezone ?? "Europe/London",
  });

  // Only used when creating a new user — the initial rate entry.
  const [newUserRate, setNewUserRate] = useState({ dayRate: "", fixedPrice: false, startDate: todayInput() });

  const [rates, setRates] = useState<DeveloperRate[]>(user?.rates ?? []);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [draftRate, setDraftRate] = useState({ dayRate: "", fixedPrice: false, startDate: todayInput() });
  const [savingRate, setSavingRate] = useState(false);
  const [rateDatePickerOpen, setRateDatePickerOpen] = useState(false);
  const [deleteRate, setDeleteRate] = useState<DeveloperRate | null>(null);
  const [deletingRate, setDeletingRate] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("details");
      setForm({
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "USER",
        isActive: user?.isActive ?? true,
        timezone: user?.timezone ?? "Europe/London",
      });
      setNewUserRate({ dayRate: "", fixedPrice: false, startDate: todayInput() });
      setRates(user?.rates ?? []);
      setIsAddingRate(false);
      setDraftRate({ dayRate: "", fixedPrice: false, startDate: todayInput() });
    }
  }, [open]); // eslint-disable-line

  function reset() {
    setForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "USER",
      isActive: user?.isActive ?? true,
      timezone: user?.timezone ?? "Europe/London",
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
        timezone: form.timezone,
        ...(isEdit ? {} : {
          dayRate: newUserRate.fixedPrice ? null : (newUserRate.dayRate !== "" ? parseFloat(newUserRate.dayRate) : null),
          startDate: newUserRate.startDate,
        }),
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

  async function handleSaveRate() {
    if (!user) return;
    setSavingRate(true);
    try {
      const res = await fetch(`/api/users/${user.id}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayRate: draftRate.fixedPrice ? null : (draftRate.dayRate !== "" ? parseFloat(draftRate.dayRate) : null),
          startDate: draftRate.startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add rate");
        return;
      }
      setRates(data as DeveloperRate[]);
      onSuccess({ ...user, rates: data as DeveloperRate[] });
      setIsAddingRate(false);
      toast.success("Rate added");
    } finally {
      setSavingRate(false);
    }
  }

  async function handleDeleteRate() {
    if (!user || !deleteRate) return;
    setDeletingRate(true);
    try {
      const res = await fetch(`/api/users/${user.id}/rates/${deleteRate.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete rate");
        return;
      }
      setRates(data as DeveloperRate[]);
      onSuccess({ ...user, rates: data as DeveloperRate[] });
      toast.success("Rate deleted");
    } finally {
      setDeletingRate(false);
      setDeleteRate(null);
    }
  }

  const sortedRates = [...rates].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isAddingRate) return; // block closing while a new rate is unconfirmed
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className={cn("max-w-md", isEdit && "sm:max-w-lg")}>
        <DialogHeader className="gap-0.5">
          <DialogTitle className="text-xl">{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {isEdit ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="details" disabled={isAddingRate}>Details</TabsTrigger>
                <TabsTrigger value="rate" disabled={isAddingRate}>Day Rate</TabsTrigger>
                <TabsIndicator />
              </TabsList>

              <TabsContent value="details" className="space-y-4">
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
                  <Label>Timezone</Label>
                  <ListPicker
                    items={TIMEZONE_ITEMS}
                    value={form.timezone}
                    onChange={(id) => setForm({ ...form, timezone: id })}
                  />
                  <p className="text-xs text-muted-foreground">Used to send the 5pm timesheet reminder at their local time.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="rate" className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Current Day Rate</Label>
                  <span className="text-sm text-muted-foreground">
                    {currentRate(rates) != null ? `£${currentRate(rates)!.toLocaleString()} / day` : "Fixed price (N/A)"}
                  </span>
                </div>

                {(sortedRates.length > 0 || isAddingRate) && (
                  <div className="max-h-56 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isAddingRate && (
                          <TableRow>
                            <TableCell>
                              <Popover open={rateDatePickerOpen} onOpenChange={setRateDatePickerOpen}>
                                <PopoverTrigger className="flex h-8 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                                  {format(new Date(draftRate.startDate), "dd/MM/yyyy")}
                                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={new Date(draftRate.startDate)}
                                    onSelect={(d) => {
                                      if (d) {
                                        setDraftRate({ ...draftRate, startDate: format(d, "yyyy-MM-dd") });
                                        setRateDatePickerOpen(false);
                                      }
                                    }}
                                    autoFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="£"
                                  value={draftRate.fixedPrice ? "" : draftRate.dayRate}
                                  onChange={(e) => setDraftRate({ ...draftRate, dayRate: e.target.value })}
                                  disabled={draftRate.fixedPrice}
                                  className="h-8 w-20"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                  <Switch
                                    id="rateFixedPrice"
                                    size="sm"
                                    checked={draftRate.fixedPrice}
                                    onCheckedChange={(v) => setDraftRate({ ...draftRate, fixedPrice: v, dayRate: v ? "" : draftRate.dayRate })}
                                  />
                                  <Label htmlFor="rateFixedPrice" className="text-xs whitespace-nowrap text-muted-foreground">Fixed</Label>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleSaveRate}
                                  disabled={savingRate}
                                  className="cursor-pointer text-green-600 hover:text-green-500 transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-500 dark:hover:text-green-400"
                                  aria-label="Save rate"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingRate(false);
                                    setDraftRate({ dayRate: "", fixedPrice: false, startDate: todayInput() });
                                  }}
                                  disabled={savingRate}
                                  className="cursor-pointer text-red-600 hover:text-red-500 transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-500 dark:hover:text-red-400"
                                  aria-label="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {sortedRates.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(r.startDate), "d MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              {r.dayRate != null ? `£${r.dayRate.toLocaleString()}` : "Fixed price"}
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => setDeleteRate(r)}
                                disabled={isAddingRate}
                                className="cursor-pointer text-red-600 hover:text-red-500 transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-muted-foreground/40 dark:text-red-500 dark:hover:text-red-400 dark:disabled:text-muted-foreground/40"
                                aria-label="Delete rate"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!isAddingRate && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setDraftRate({ dayRate: "", fixedPrice: false, startDate: todayInput() });
                        setIsAddingRate(true);
                      }}
                      aria-label="Add rate"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <>
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
                <Label>Timezone</Label>
                <ListPicker
                  items={TIMEZONE_ITEMS}
                  value={form.timezone}
                  onChange={(id) => setForm({ ...form, timezone: id })}
                />
                <p className="text-xs text-muted-foreground">Used to send the 5pm timesheet reminder at their local time.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayRate">Starting Day Rate (£)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="dayRate"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 450"
                    value={newUserRate.fixedPrice ? "" : newUserRate.dayRate}
                    onChange={(e) => setNewUserRate({ ...newUserRate, dayRate: e.target.value })}
                    disabled={newUserRate.fixedPrice}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      id="fixedPrice"
                      checked={newUserRate.fixedPrice}
                      onCheckedChange={(v) => setNewUserRate({ ...newUserRate, fixedPrice: v, dayRate: v ? "" : newUserRate.dayRate })}
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
              <p className="text-xs text-muted-foreground">
                The user will sign in with their Google account using this email address.
              </p>
            </>
          )}

          {isAddingRate && (
            <p className="text-xs text-muted-foreground">
              Confirm (✓) or cancel (✕) the new rate above before saving.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 *:w-full sm:flex-row sm:items-center sm:*:w-auto">
            {user && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(user)}
                disabled={loading || isAddingRate}
                className="sm:mr-auto"
              >
                Delete User
              </Button>
            )}
            <div className="flex flex-col-reverse gap-2 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading || isAddingRate}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || isAddingRate}>
                {loading ? "Saving…" : isEdit ? "Save Changes" : "Add User"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={!!deleteRate}
      onOpenChange={(v) => !v && setDeleteRate(null)}
      title="Delete Rate"
      description={`Remove the rate starting ${deleteRate ? format(new Date(deleteRate.startDate), "d MMM yyyy") : ""}? Historical reports will no longer use it.`}
      onConfirm={handleDeleteRate}
      loading={deletingRate}
    />
    </>
  );
}
