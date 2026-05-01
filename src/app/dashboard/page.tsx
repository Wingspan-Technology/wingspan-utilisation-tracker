"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { Banknote, Leaf, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
import { MonthNav } from "@/components/shared/MonthNav";
import { HoursSummaryCards } from "@/components/shared/HoursSummaryCards";
import { MiniPieChart } from "@/components/shared/MiniPieChart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeEntryForm } from "@/components/dashboard/TimeEntryForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/types";


export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [formDate, setFormDate] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  async function loadEntries(month: Date) {
    const from = format(startOfMonth(month), "yyyy-MM-dd");
    const to = format(endOfMonth(month), "yyyy-MM-dd");
    const res = await fetch(`/api/time-entries?from=${from}&to=${to}`);
    if (res.ok) setEntries(await res.json());
  }

  useEffect(() => { loadEntries(currentMonth); }, [currentMonth]);

  function goToPrevMonth() { setCurrentMonth((m) => subMonths(m, 1)); }
  function goToNextMonth() { setCurrentMonth((m) => addMonths(m, 1)); }
  function goToThisMonth() { setCurrentMonth(startOfMonth(new Date())); }

  function openNewEntry(dateStr: string) {
    setEditEntry(null);
    setFormDate(dateStr);
    setFormOpen(true);
  }

  function openEditEntry(entry: TimeEntry) {
    setEditEntry(entry);
    setFormDate(null);
    setFormOpen(true);
  }

  function handleSuccess(updated: TimeEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleting(true);
    const res = await fetch(`/api/time-entries/${deleteEntry.id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => {
        const updated = prev.filter((e) => e.id !== deleteEntry.id);
        if (selectedDay && !updated.some((e) => e.date === selectedDay)) {
          setSelectedDay(null);
        }
        return updated;
      });
      toast.success("Entry deleted");
    } else {
      toast.error("Failed to delete entry");
    }
    setDeleting(false);
    setDeleteEntry(null);
  }

  const entriesByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return map;
  }, [entries]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Monday-first grid: pad start so Mon=0 ... Sun=6
  const startPadding = (startOfMonth(currentMonth).getDay() + 6) % 7;
  const totalCells = Math.ceil((startPadding + days.length) / 7) * 7;
  const endPadding = totalCells - startPadding - days.length;
  const gridCells: (Date | null)[] = [
    ...Array(startPadding).fill(null),
    ...days,
    ...Array(endPadding).fill(null),
  ];

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.task.isBillable).reduce((s, e) => s + e.hours, 0);
  const nonBillableHours = totalHours - billableHours;

  const selectedDayEntries = selectedDay ? (entriesByDate[selectedDay] ?? []) : [];
  const selectedDayTotal = selectedDayEntries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Month navigation */}
      <MonthNav currentMonth={currentMonth} onPrev={goToPrevMonth} onNext={goToNextMonth} onToday={goToThisMonth} />

      {/* Summary cards */}
      <HoursSummaryCards totalHours={totalHours} billableHours={billableHours} nonBillableHours={nonBillableHours} />

      {/* Calendar grid */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <>
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {gridCells.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="min-h-28 border-r border-b border-border bg-muted/10"
                    />
                  );
                }

                const dateStr = format(day, "yyyy-MM-dd");
                const dayEntries = entriesByDate[dateStr] ?? [];
                const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
                const dayBillable = dayEntries
                  .filter((e) => e.task.isBillable)
                  .reduce((s, e) => s + e.hours, 0);
                const hasEntries = dayEntries.length > 0;
                const today = isToday(day);
                const isWeekend = [0, 6].includes(day.getDay());

                return (
                  <div
                    key={dateStr}
                    onClick={() =>
                      hasEntries ? setSelectedDay(dateStr) : openNewEntry(dateStr)
                    }
                    className={cn(
                      "relative min-h-28 border-r border-b border-border p-1.5 group cursor-pointer transition-colors",
                      today && "bg-indigo-950/40",
                      !today && isWeekend && "bg-muted/20",
                      "hover:bg-muted/30"
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                        today
                          ? "bg-indigo-600 text-white"
                          : isWeekend
                          ? "text-muted-foreground/50"
                          : "text-foreground/70"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Pie chart for days with entries */}
                    {hasEntries && (
                      <div className="flex items-center justify-center mt-1">
                        <MiniPieChart billable={dayBillable} total={dayTotal} />
                      </div>
                    )}

                    {/* Log time hover button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openNewEntry(dateStr);
                      }}
                      className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-950/80 rounded px-1.5 py-0.5 transition-all"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Log
                    </button>
                  </div>
                );
              })}
            </div>
          </>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(v) => !v && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="gap-0.5">
            <DialogTitle className="text-xl">Time Entries</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/70">
              {selectedDay &&
                format(new Date(selectedDay + "T00:00:00"), "EEEE, d MMMM yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-medium text-muted-foreground w-[40%]">Task</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground w-[30%]">Client</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground w-[15%]">Hours</th>
                  <th className="w-[15%]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedDayEntries.map((entry) => (
                  <tr key={entry.id} className="group/row">
                    <td className="py-3 pr-4">
                      <div className="text-sm font-semibold text-foreground">
                        {entry.task.name}
                      </div>
                      <div className="text-xs text-muted-foreground/60 mt-1.5">
                        {entry.task.project.name}
                      </div>
                      <div className="mt-1.5">
                        {entry.task.isBillable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/80 px-2 py-0.5 text-xs font-medium text-blue-300">
                            <Banknote className="h-3 w-3" /> Billable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-950/80 px-2 py-0.5 text-xs font-medium text-green-400">
                            <Leaf className="h-3 w-3" /> Non-billable
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="text-xs font-medium text-muted-foreground">
                        {entry.task.project.client.name}
                      </div>
                    </td>
                    <td className="py-3 text-center font-semibold tabular-nums text-foreground align-middle">
                      {entry.hours}h
                    </td>
                    <td className="py-3 pl-6 align-middle">
                      <Tooltip.Provider delay={300}>
                        <div className="flex gap-2 justify-end">
                          <Tooltip.Root>
                            <Tooltip.Trigger
                              onClick={() => { setSelectedDay(null); openEditEntry(entry); }}
                              className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-5 w-5" />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Positioner className="z-200" sideOffset={8}>
                                <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                                  Edit entry
                                </Tooltip.Popup>
                              </Tooltip.Positioner>
                            </Tooltip.Portal>
                          </Tooltip.Root>

                          <Tooltip.Root>
                            <Tooltip.Trigger
                              onClick={() => setDeleteEntry(entry)}
                              className="cursor-pointer text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Positioner className="z-200" sideOffset={8}>
                                <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                                  Delete entry
                                </Tooltip.Popup>
                              </Tooltip.Positioner>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                      </Tooltip.Provider>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-2.5 font-semibold text-foreground">Total</td>
                  <td />
                  <td className="pt-2.5 text-center font-bold tabular-nums text-foreground">
                    {selectedDayTotal % 1 === 0
                      ? `${selectedDayTotal}h`
                      : `${selectedDayTotal.toFixed(1)}h`}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <div className="flex flex-col-reverse gap-2 mt-8 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
              <Button variant="ghost" onClick={() => setSelectedDay(null)}>
                Close
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 shadow-sm shadow-green-900/40"
                onClick={() => {
                  const d = selectedDay!;
                  setSelectedDay(null);
                  openNewEntry(d);
                }}
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Add Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TimeEntryForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) {
            if (editEntry) setSelectedDay(editEntry.date);
            setEditEntry(null);
            setFormDate(null);
          }
        }}
        entry={editEntry}
        defaultDate={formDate ?? format(new Date(), "yyyy-MM-dd")}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(v) => !v && setDeleteEntry(null)}
        title="Delete Entry"
        description="Are you sure you want to delete this time entry?"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
