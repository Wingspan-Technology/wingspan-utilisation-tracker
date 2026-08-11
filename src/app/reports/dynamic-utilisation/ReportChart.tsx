"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Banknote, ChevronDown, ChevronLeft, ChevronRight, Info, Leaf } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BILLABLE = "#378ADD";
const NON_BILLABLE = "#1D9E75";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type TaskRow = {
  taskName: string;
  isBillable: boolean;
  days: number;
  cost: number;
};

export type ProjectRow = {
  clientName: string;
  projectName: string;
  billableDays: number;
  nonBillableDays: number;
  billableCost: number;
  nonBillableCost: number;
  tasks: TaskRow[];
};

type ClientGroup = {
  name: string;
  billableDays: number;
  nonBillableDays: number;
  billableCost: number;
  nonBillableCost: number;
  projects: ProjectRow[];
};

export type EntryDetail = {
  developerName: string;
  clientName: string;
  projectName: string;
  taskName: string;
  date: string;
  hours: number;
  cost: number | null;
  isBillable: boolean;
};

type DetailFilter = {
  clientName: string;
  projectName?: string;
  taskName?: string;
};

type ViewMode = "days" | "cost";

type Props = {
  rows: ProjectRow[];
  entries: EntryDetail[];
  developers: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  months: string[];
  selectedDeveloper: string | null;
  selectedClient: string | null;
  selectedMonth: string | null;
  selectedYear: string | null;
};

function fmtDays(n: number): string {
  return n.toFixed(1) + "d";
}

function fmtCost(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

export function ReportChart({ rows, entries, developers, clients, months, selectedDeveloper, selectedClient, selectedMonth, selectedYear }: Props) {
  const router = useRouter();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [detailFilter, setDetailFilter] = useState<DetailFilter | null>(null);
  const [detailPage, setDetailPage] = useState(0);

  useEffect(() => {
    setDetailPage(0);
  }, [detailFilter]);

  const years = [...new Set(months.map((m) => m.split("-")[0]))].sort();
  const currentYear = selectedMonth ? selectedMonth.split("-")[0] : selectedYear;
  const yearMonths = currentYear ? months.filter((m) => m.startsWith(currentYear + "-")) : [];
  const currentMonth = selectedMonth ? selectedMonth.split("-")[1] : null;

  function buildUrl(params: { developer?: string; client?: string; year?: string; month?: string }) {
    const p = new URLSearchParams();
    if (params.developer) p.set("developer", params.developer);
    if (params.client) p.set("client", params.client);
    if (params.year) p.set("year", params.year);
    if (params.month) p.set("month", params.month);
    const qs = p.toString();
    return `/reports/dynamic-utilisation${qs ? `?${qs}` : ""}`;
  }

  function handleDeveloperChange(id: string) {
    router.push(buildUrl({ developer: id || undefined, client: selectedClient || undefined, year: selectedYear || undefined, month: selectedMonth || undefined }));
  }

  function handleClientChange(id: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, client: id || undefined, year: selectedYear || undefined, month: selectedMonth || undefined }));
  }

  function handleYearChange(year: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, client: selectedClient || undefined, year: year || undefined }));
  }

  function handleMonthChange(month: string) {
    if (month) {
      router.push(buildUrl({ developer: selectedDeveloper || undefined, client: selectedClient || undefined, month: `${currentYear}-${month}` }));
    } else {
      router.push(buildUrl({ developer: selectedDeveloper || undefined, client: selectedClient || undefined, year: currentYear || undefined }));
    }
  }

  function toggleProject(key: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function fmt(days: number, cost: number): string {
    return viewMode === "cost" ? fmtCost(cost) : fmtDays(days);
  }

  const detailEntries = detailFilter
    ? entries
        .filter(
          (e) =>
            e.clientName === detailFilter.clientName &&
            (!detailFilter.projectName || e.projectName === detailFilter.projectName) &&
            (!detailFilter.taskName || e.taskName === detailFilter.taskName)
        )
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const detailTitle = detailFilter
    ? [detailFilter.clientName, detailFilter.projectName, detailFilter.taskName].filter(Boolean).join(" · ")
    : "";
  const detailTotalHours = detailEntries.reduce((s, e) => s + e.hours, 0);
  const detailTotalCost = detailEntries.reduce((s, e) => s + (e.cost ?? 0), 0);
  const showProjectCol = !!detailFilter && !detailFilter.projectName;
  const showTaskCol = !!detailFilter && !detailFilter.taskName;
  const DETAIL_PAGE_SIZE = 20;
  const detailPageCount = Math.max(1, Math.ceil(detailEntries.length / DETAIL_PAGE_SIZE));
  const pagedDetailEntries = detailEntries.slice(
    detailPage * DETAIL_PAGE_SIZE,
    detailPage * DETAIL_PAGE_SIZE + DETAIL_PAGE_SIZE
  );

  const developerOptions = developers.map((d) => ({ value: d.id, label: d.name }));
  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const yearOptions = years.map((y) => ({ value: y, label: y }));
  const monthOptions = yearMonths.map((m) => {
    const mm = m.split("-")[1];
    return { value: mm, label: MONTH_NAMES[parseInt(mm, 10) - 1] };
  });

  const clientMap = new Map<string, ClientGroup>();
  for (const row of rows) {
    const g = clientMap.get(row.clientName) ?? {
      name: row.clientName,
      billableDays: 0,
      nonBillableDays: 0,
      billableCost: 0,
      nonBillableCost: 0,
      projects: [],
    };
    g.billableDays += row.billableDays;
    g.nonBillableDays += row.nonBillableDays;
    g.billableCost += row.billableCost;
    g.nonBillableCost += row.nonBillableCost;
    g.projects.push(row);
    clientMap.set(row.clientName, g);
  }

  const clientGroups = [...clientMap.values()].sort(
    (a, b) => b.billableDays + b.nonBillableDays - (a.billableDays + a.nonBillableDays)
  );
  for (const c of clientGroups) {
    c.projects.sort((a, b) => b.billableDays + b.nonBillableDays - (a.billableDays + a.nonBillableDays));
    for (const p of c.projects) {
      p.tasks.sort((a, b) => b.days - a.days);
    }
  }

  const allTasks = rows.flatMap((r) => r.tasks);

  const maxProjectDays = Math.max(...rows.map((r) => r.billableDays + r.nonBillableDays), 0.001);
  const maxProjectCost = Math.max(...rows.map((r) => r.billableCost + r.nonBillableCost), 0.001);
  const maxTaskDays = Math.max(...allTasks.map((t) => t.days), 0.001);
  const maxTaskCost = Math.max(...allTasks.map((t) => t.cost), 0.001);

  const totalBillable = rows.reduce((s, r) => s + r.billableDays, 0);
  const totalNonBillable = rows.reduce((s, r) => s + r.nonBillableDays, 0);
  const totalDays = totalBillable + totalNonBillable;
  const totalBillableCost = rows.reduce((s, r) => s + r.billableCost, 0);
  const totalNonBillableCost = rows.reduce((s, r) => s + r.nonBillableCost, 0);
  const totalCost = totalBillableCost + totalNonBillableCost;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Utilisation Report</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <FilterSelect
          value={selectedDeveloper ?? ""}
          options={developerOptions}
          placeholder="All developers"
          onChange={handleDeveloperChange}
        />
        <FilterSelect
          value={selectedClient ?? ""}
          options={clientOptions}
          placeholder="All clients"
          onChange={handleClientChange}
        />
        <FilterSelect
          value={currentYear ?? ""}
          options={yearOptions}
          placeholder="All years"
          onChange={handleYearChange}
        />
        <FilterSelect
          value={currentMonth ?? ""}
          options={monthOptions}
          placeholder="All months"
          disabled={!currentYear}
          onChange={handleMonthChange}
        />
        <div className="flex w-fit rounded-md border border-border overflow-hidden text-sm sm:ml-auto shrink-0">
          <button
            className={`px-3 py-1.5 transition-colors ${viewMode === "days" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
            onClick={() => setViewMode("days")}
          >
            Days
          </button>
          <button
            className={`px-3 py-1.5 border-l border-border transition-colors ${viewMode === "cost" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
            onClick={() => setViewMode("cost")}
          >
            Cost
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {viewMode === "cost" ? "Total Cost" : "Total Days"}
            </span>
            <span className="text-xl font-bold">
              {viewMode === "cost" ? fmtCost(totalCost) : fmtDays(totalDays)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: BILLABLE }}>
              <Banknote className="h-3.5 w-3.5 shrink-0" />
              {viewMode === "cost" ? "Billable Cost" : "Billable Days"}
            </span>
            <span className="text-xl font-bold" style={{ color: BILLABLE }}>
              {viewMode === "cost" ? fmtCost(totalBillableCost) : fmtDays(totalBillable)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: NON_BILLABLE }}>
              <Leaf className="h-3.5 w-3.5 shrink-0" />
              {viewMode === "cost" ? "Non-billable Cost" : "Non-billable Days"}
            </span>
            <span className="text-xl font-bold" style={{ color: NON_BILLABLE }}>
              {viewMode === "cost" ? fmtCost(totalNonBillableCost) : fmtDays(totalNonBillable)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Client blocks */}
      {rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No time entries for this period.</p>
      ) : (
        <div className="space-y-4">
          {clientGroups.map((client) => {
            const clientBillable = viewMode === "cost" ? client.billableCost : client.billableDays;
            const clientNonBillable = viewMode === "cost" ? client.nonBillableCost : client.nonBillableDays;
            const clientTotal = clientBillable + clientNonBillable;
            return (
              <div key={client.name} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    {client.name}
                    <button
                      type="button"
                      aria-label={`Show who worked on ${client.name}`}
                      onClick={() => setDetailFilter({ clientName: client.name })}
                      className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="flex items-center gap-1.5 font-medium tabular-nums" style={{ color: BILLABLE }}>
                      <Banknote className="h-3.5 w-3.5 shrink-0" /> {fmt(client.billableDays, client.billableCost)}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium tabular-nums" style={{ color: NON_BILLABLE }}>
                      <Leaf className="h-3.5 w-3.5 shrink-0" /> {fmt(client.nonBillableDays, client.nonBillableCost)}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {viewMode === "cost" ? fmtCost(clientTotal) : fmtDays(clientTotal)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {client.projects.map((proj) => {
                    const projKey = `${client.name}::${proj.projectName}`;
                    const expanded = expandedProjects.has(projKey);
                    const projBillable = viewMode === "cost" ? proj.billableCost : proj.billableDays;
                    const projNonBillable = viewMode === "cost" ? proj.nonBillableCost : proj.nonBillableDays;
                    const projTotal = projBillable + projNonBillable;
                    const maxProjValue = viewMode === "cost" ? maxProjectCost : maxProjectDays;
                    const barWidthPct = (projTotal / maxProjValue) * 100;
                    const billableFrac = projTotal > 0 ? projBillable / projTotal : 0;
                    const nonBillableFrac = projTotal > 0 ? projNonBillable / projTotal : 0;
                    return (
                      <div key={proj.projectName}>
                        <div
                          className="px-4 py-2 space-y-1.5 cursor-pointer hover:bg-muted/10"
                          onClick={() => toggleProject(projKey)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {expanded
                                ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                              {proj.projectName}
                              <button
                                type="button"
                                aria-label={`Show who worked on ${proj.projectName}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailFilter({ clientName: client.name, projectName: proj.projectName });
                                }}
                                className="hidden sm:inline-flex hover:text-foreground transition-colors"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </span>
                            <div className="flex items-center gap-5 text-xs">
                              <span className="flex items-center gap-1 tabular-nums" style={{ color: BILLABLE }}>
                                <Banknote className="h-3 w-3 shrink-0" /> {fmt(proj.billableDays, proj.billableCost)}
                              </span>
                              <span className="flex items-center gap-1 tabular-nums" style={{ color: NON_BILLABLE }}>
                                <Leaf className="h-3 w-3 shrink-0" /> {fmt(proj.nonBillableDays, proj.nonBillableCost)}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {viewMode === "cost" ? fmtCost(projTotal) : fmtDays(projTotal)}
                              </span>
                            </div>
                          </div>
                          <div
                            className="flex h-3 rounded-sm overflow-hidden"
                            style={{ width: `${barWidthPct}%`, minWidth: projTotal > 0 ? 2 : 0 }}
                          >
                            <div style={{ width: `${billableFrac * 100}%`, backgroundColor: BILLABLE }} />
                            <div style={{ width: `${nonBillableFrac * 100}%`, backgroundColor: NON_BILLABLE }} />
                          </div>
                        </div>

                        {expanded && (
                          <div className="divide-y divide-border/50 border-t border-border/50">
                            {proj.tasks.map((task) => {
                              const taskValue = viewMode === "cost" ? task.cost : task.days;
                              const maxTaskValue = viewMode === "cost" ? maxTaskCost : maxTaskDays;
                              const taskBarWidthPct = (taskValue / maxTaskValue) * 100;
                              return (
                                <div key={task.taskName} className="px-8 py-2 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      {task.taskName}
                                      <button
                                        type="button"
                                        aria-label={`Show who worked on ${task.taskName}`}
                                        onClick={() =>
                                          setDetailFilter({
                                            clientName: client.name,
                                            projectName: proj.projectName,
                                            taskName: task.taskName,
                                          })
                                        }
                                        className="hidden sm:inline-flex hover:text-foreground transition-colors"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </span>
                                    <span
                                      className="flex items-center gap-1 text-xs tabular-nums"
                                      style={{ color: task.isBillable ? BILLABLE : NON_BILLABLE }}
                                    >
                                      {task.isBillable
                                        ? <Banknote className="h-3 w-3 shrink-0" />
                                        : <Leaf className="h-3 w-3 shrink-0" />}
                                      {fmt(task.days, task.cost)}
                                    </span>
                                  </div>
                                  <div
                                    className="h-2 rounded-sm"
                                    style={{
                                      width: `${taskBarWidthPct}%`,
                                      minWidth: taskValue > 0 ? 2 : 0,
                                      backgroundColor: task.isBillable ? BILLABLE : NON_BILLABLE,
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!detailFilter} onOpenChange={(open) => !open && setDetailFilter(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
            <DialogDescription>
              {detailTotalHours}h total · {fmtCost(detailTotalCost)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin -mx-1 px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Developer</th>
                  {showProjectCol && <th className="py-2 pr-3 font-medium">Project</th>}
                  {showTaskCol && <th className="py-2 pr-3 font-medium">Task</th>}
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium text-right">Hours</th>
                  <th className="py-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pagedDetailEntries.map((e, i) => (
                  <tr key={detailPage * DETAIL_PAGE_SIZE + i}>
                    <td className="py-2 pr-3 font-medium text-foreground">{e.developerName}</td>
                    {showProjectCol && <td className="py-2 pr-3 text-muted-foreground">{e.projectName}</td>}
                    {showTaskCol && <td className="py-2 pr-3 text-muted-foreground">{e.taskName}</td>}
                    <td className="py-2 pr-3 text-muted-foreground tabular-nums">
                      {format(new Date(e.date), "d MMM yyyy")}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{e.hours}h</td>
                    <td className="py-2 text-right tabular-nums">{e.cost != null ? fmtCost(e.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detailEntries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No time entries found.</p>
            )}
          </div>
          {detailEntries.length > DETAIL_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
                disabled={detailPage === 0}
                className="flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span>
                Page {detailPage + 1} of {detailPageCount}
              </span>
              <button
                type="button"
                onClick={() => setDetailPage((p) => Math.min(detailPageCount - 1, p + 1))}
                disabled={detailPage >= detailPageCount - 1}
                className="flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:text-foreground transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
