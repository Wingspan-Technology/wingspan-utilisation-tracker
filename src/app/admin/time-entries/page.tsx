"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { User, Users } from "lucide-react";
import { ListPicker } from "@/components/ui/list-picker";
import { MonthNav } from "@/components/shared/MonthNav";
import { HoursSummaryCards } from "@/components/shared/HoursSummaryCards";
import { CalendarGrid } from "@/components/shared/CalendarGrid";
import type { TimeEntry, User as UserType } from "@/types";

export default function AdminTimeEntriesPage() {
  const searchParams = useSearchParams();
  const paramUserId = searchParams.get("userId") ?? "";
  const paramMonth = searchParams.get("month") ?? "";

  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(paramUserId);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (paramMonth && /^\d{4}-\d{2}$/.test(paramMonth)) {
      const [year, month] = paramMonth.split("-").map(Number);
      return startOfMonth(new Date(year, month - 1, 1));
    }
    return startOfMonth(new Date());
  });
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.ok && r.json())
      .then((d) => d && setUsers(d.filter((u: UserType) => u.isActive)));
  }, []);

  useEffect(() => {
    const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const url = selectedUserId
      ? `/api/time-entries?userId=${selectedUserId}&from=${from}&to=${to}`
      : `/api/time-entries?from=${from}&to=${to}`;
    fetch(url).then((r) => r.ok && r.json()).then((d) => d && setEntries(d));
  }, [selectedUserId, currentMonth]);

  const developerItems = users.map((u) => ({
    id: u.id,
    name: u.role === "ADMIN" ? `${u.name} (Admin)` : u.name,
  }));
  const userItems = [
    { id: "", name: "All Developers", icon: <Users className="h-3.5 w-3.5" /> },
    ...developerItems.map((u) => ({ ...u, icon: <User className="h-3.5 w-3.5" /> })),
  ];
  const selectedUser = users.find((u) => u.id === selectedUserId);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.task.isBillable).reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Entries</h1>
          <p className="text-sm text-muted-foreground mt-1">Log or edit time on behalf of a developer</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-56">
            <ListPicker
              items={userItems}
              value={selectedUserId}
              placeholder="Select developer…"
              onChange={(id) => {
                setSelectedUserId(id);
                setEntries([]);
              }}
            />
          </div>
        </div>
      </div>

      <MonthNav
        currentMonth={currentMonth}
        onPrev={() => setCurrentMonth((m) => subMonths(m, 1))}
        onNext={() => setCurrentMonth((m) => addMonths(m, 1))}
        onToday={() => setCurrentMonth(startOfMonth(new Date()))}
      />
      <HoursSummaryCards
        totalHours={totalHours}
        billableHours={billableHours}
        nonBillableHours={totalHours - billableHours}
      />
      <CalendarGrid
        currentMonth={currentMonth}
        entries={entries}
        onEntryUpsert={(updated) =>
          setEntries((prev) => {
            const idx = prev.findIndex((e) => e.id === updated.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
            return [...prev, updated];
          })
        }
        onEntryDelete={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
        selectedUserName={selectedUser?.name}
        targetUserId={selectedUserId || undefined}
        targetUserName={selectedUser?.name}
        developerItems={!selectedUserId ? developerItems : undefined}
        showUserColumn={!selectedUserId}
      />
    </div>
  );
}
