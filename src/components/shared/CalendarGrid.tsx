"use client";

import { useMemo, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { Banknote, Leaf, Pencil, PlusCircle, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TimeEntryForm } from "@/components/dashboard/TimeEntryForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MiniPieChart } from "@/components/shared/MiniPieChart";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/types";

interface CalendarGridProps {
  currentMonth: Date;
  entries: TimeEntry[];
  onEntryUpsert: (entry: TimeEntry) => void;
  onEntryDelete: (id: string) => void;
  selectedUserName?: string;
  targetUserId?: string;
  targetUserName?: string;
  developerItems?: { id: string; name: string }[];
  showUserColumn?: boolean;
}

export function CalendarGrid({
  currentMonth,
  entries,
  onEntryUpsert,
  onEntryDelete,
  selectedUserName,
  targetUserId,
  targetUserName,
  developerItems,
  showUserColumn,
}: CalendarGridProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("hours");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [formDate, setFormDate] = useState<string | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const entriesByDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return map;
  }, [entries]);

  const startPadding = (startOfMonth(currentMonth).getDay() + 6) % 7;
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const totalCells = Math.ceil((startPadding + days.length) / 7) * 7;
  const gridCells: (Date | null)[] = [
    ...Array(startPadding).fill(null),
    ...days,
    ...Array(totalCells - startPadding - days.length).fill(null),
  ];

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

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleting(true);
    const res = await fetch(`/api/time-entries/${deleteEntry.id}`, { method: "DELETE" });
    if (res.ok) {
      const stillHasEntries = entries
        .filter((e) => e.id !== deleteEntry.id)
        .some((e) => e.date === deleteEntry.date);
      if (!stillHasEntries) setSelectedDay(null);
      onEntryDelete(deleteEntry.id);
      toast.success("Entry deleted");
    } else {
      toast.error("Failed to delete entry");
    }
    setDeleting(false);
    setDeleteEntry(null);
  }

  const selectedDayEntries = selectedDay ? (entriesByDate[selectedDay] ?? []) : [];
  const selectedDayTotal = selectedDayEntries.reduce((s, e) => s + e.hours, 0);

  const fetchAiSummary = useCallback(async () => {
    if (!selectedDay || !selectedDayEntries.length) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const res = await fetch("/api/time-entries/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(selectedDay + "T00:00:00"), "EEEE, d MMMM yyyy"),
          entries: selectedDayEntries.map((e) => ({
            developer: e.user.name,
            task: e.task.name,
            project: e.task.project.name,
            client: e.task.project.client.name,
            hours: e.hours,
            description: e.description,
            isBillable: e.task.isBillable,
          })),
        }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        setAiSummary(summary);
      } else {
        setAiSummary(null);
      }
    } catch {
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  }, [selectedDay, selectedDayEntries]);

  return (
    <>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

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
            const dayBillable = dayEntries.filter((e) => e.task.isBillable).reduce((s, e) => s + e.hours, 0);
            const hasEntries = dayEntries.length > 0;
            const today = isToday(day);
            const isWeekend = [0, 6].includes(day.getDay());

            return (
              <div
                key={dateStr}
                onClick={() => hasEntries ? setSelectedDay(dateStr) : openNewEntry(dateStr)}
                className={cn(
                  "relative min-h-28 border-r border-b border-border p-1.5 group cursor-pointer transition-colors",
                  !today && isWeekend && "bg-muted/20",
                  "hover:bg-muted/30"
                )}
              >
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

                {hasEntries && (
                  <div className="flex items-center justify-center mt-1">
                    <MiniPieChart billable={dayBillable} total={dayTotal} />
                  </div>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); openNewEntry(dateStr); }}
                  className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-950/80 rounded px-1.5 py-0.5 transition-all"
                >
                  <PlusCircle className="w-3 h-3" />
                  Log
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selectedDay}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedDay(null);
            setActiveTab("hours");
            setAiSummary(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="gap-0.5">
            <DialogTitle className="text-xl">Time Entries</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground/70">
              {selectedDay && format(new Date(selectedDay + "T00:00:00"), "EEEE, d MMMM yyyy")}
              {selectedUserName && ` · ${selectedUserName}`}
            </DialogDescription>
          </DialogHeader>

          <Tabs.Root
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v);
              if (v === "summary" && !aiSummary && !aiLoading) {
                fetchAiSummary();
              }
            }}
          >
            <Tabs.List className="relative flex gap-1 border-b border-border mb-4">
              <Tabs.Tab
                value="hours"
                className="px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground data-[selected]:text-foreground data-[selected]:font-bold"
              >
                Hours Breakdown
              </Tabs.Tab>
              <Tabs.Tab
                value="summary"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground data-[selected]:text-foreground data-[selected]:font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Summary
              </Tabs.Tab>
              <Tabs.Indicator
                className="absolute bottom-0 h-0.5 bg-indigo-500 transition-all duration-200 ease-in-out"
                style={{ left: "var(--active-tab-left)", width: "var(--active-tab-width)" }}
              />
            </Tabs.List>

            <Tabs.Panel value="hours">
              <table className="w-full text-sm">
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
                        <div className="text-sm font-semibold text-foreground">{entry.task.name}</div>
                        <div className="text-xs text-muted-foreground/60 mt-1.5">{entry.task.project.name}</div>
                        {showUserColumn && (
                          <div className="text-xs text-muted-foreground/50 mt-1">{entry.user.name}</div>
                        )}
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
                                onClick={() => { setSelectedDay(null); setActiveTab("hours"); setAiSummary(null); openEditEntry(entry); }}
                                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-6 w-6 sm:h-5 sm:w-5" />
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
                                <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
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
                <Button variant="ghost" onClick={() => { setSelectedDay(null); setActiveTab("hours"); setAiSummary(null); }}>Close</Button>
                <Button
                  className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 shadow-sm shadow-green-900/40"
                  onClick={() => { const d = selectedDay!; setSelectedDay(null); setActiveTab("hours"); setAiSummary(null); openNewEntry(d); }}
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Add Entry
                </Button>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="summary">
              <div className="min-h-40 py-2">
                {aiLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" />
                    Generating summary…
                  </div>
                )}
                {!aiLoading && aiSummary && (
                  <div className="space-y-3 text-sm text-foreground leading-relaxed">
                    {aiSummary.split(/\n\n+/).map((para, i) => (
                      <p key={i}>
                        {para.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
                          chunk.startsWith("**") && chunk.endsWith("**")
                            ? <strong key={j}>{chunk.slice(2, -2)}</strong>
                            : chunk
                        )}
                      </p>
                    ))}
                  </div>
                )}
                {!aiLoading && !aiSummary && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                    <p className="text-sm text-muted-foreground">Something went wrong generating the summary.</p>
                    <Button variant="ghost" size="sm" onClick={fetchAiSummary}>Try again</Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="ghost" onClick={() => { setSelectedDay(null); setActiveTab("hours"); setAiSummary(null); }}>Close</Button>
              </div>
            </Tabs.Panel>
          </Tabs.Root>
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
        onSuccess={onEntryUpsert}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        users={developerItems}
      />

      <ConfirmDialog
        open={!!deleteEntry}
        onOpenChange={(v) => !v && setDeleteEntry(null)}
        title="Delete Entry"
        description="Are you sure you want to delete this time entry?"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
