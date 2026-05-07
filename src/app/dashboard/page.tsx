"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { MonthNav } from "@/components/shared/MonthNav";
import { HoursSummaryCards } from "@/components/shared/HoursSummaryCards";
import { CalendarGrid } from "@/components/shared/CalendarGrid";
import type { TimeEntry } from "@/types";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  async function loadEntries(month: Date) {
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    const res = await fetch(`/api/time-entries?from=${from}&to=${to}`);
    if (res.ok) setEntries(await res.json());
  }

  useEffect(() => { loadEntries(currentMonth); }, [currentMonth]);

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.task.isBillable).reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
      />
    </div>
  );
}
