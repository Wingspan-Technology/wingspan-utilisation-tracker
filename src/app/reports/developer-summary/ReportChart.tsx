"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Banknote, ChevronDown, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const BILLABLE = "#378ADD";
const NON_BILLABLE = "#1D9E75";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const triggerClass =
  "h-8 w-full flex items-center gap-2 text-left rounded-lg border border-input bg-background text-foreground pl-2.5 pr-2.5 py-1 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:bg-muted/40";

type FilterSelectProps = {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function FilterSelect({ value, options, placeholder, disabled, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-44">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={triggerClass}
      >
        <span className={cn("flex-1", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-background shadow-lg overflow-y-auto max-h-60">
          <li
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
            className={cn(
              "px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50 text-muted-foreground",
              !value && "bg-muted/30"
            )}
          >
            {placeholder}
          </li>
          {options.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={cn(
                "px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50",
                value === opt.value && "bg-muted/30"
              )}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type ProjectRow = {
  clientName: string;
  projectName: string;
  billableDays: number;
  nonBillableDays: number;
};

type ClientGroup = {
  name: string;
  billableDays: number;
  nonBillableDays: number;
  projects: ProjectRow[];
};

type Props = {
  rows: ProjectRow[];
  developers: { id: string; name: string }[];
  months: string[];
  selectedDeveloper: string | null;
  selectedMonth: string | null;
  selectedYear: string | null;
};

function fmt(n: number): string {
  return n.toFixed(1) + "d";
}

export function ReportChart({ rows, developers, months, selectedDeveloper, selectedMonth, selectedYear }: Props) {
  const router = useRouter();

  const years = [...new Set(months.map((m) => m.split("-")[0]))].sort();
  const currentYear = selectedMonth ? selectedMonth.split("-")[0] : selectedYear;
  const yearMonths = currentYear ? months.filter((m) => m.startsWith(currentYear + "-")) : [];
  const currentMonth = selectedMonth ? selectedMonth.split("-")[1] : null;

  function buildUrl(params: { developer?: string; year?: string; month?: string }) {
    const p = new URLSearchParams();
    if (params.developer) p.set("developer", params.developer);
    if (params.year) p.set("year", params.year);
    if (params.month) p.set("month", params.month);
    const qs = p.toString();
    return `/reports/developer-summary${qs ? `?${qs}` : ""}`;
  }

  function handleDeveloperChange(id: string) {
    router.push(buildUrl({ developer: id || undefined }));
  }

  function handleYearChange(year: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, year: year || undefined }));
  }

  function handleMonthChange(month: string) {
    if (month) {
      router.push(buildUrl({ developer: selectedDeveloper || undefined, month: `${currentYear}-${month}` }));
    } else {
      router.push(buildUrl({ developer: selectedDeveloper || undefined, year: currentYear || undefined }));
    }
  }

  const developerOptions = developers.map((d) => ({ value: d.id, label: d.name }));
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
      projects: [],
    };
    g.billableDays += row.billableDays;
    g.nonBillableDays += row.nonBillableDays;
    g.projects.push(row);
    clientMap.set(row.clientName, g);
  }

  const clients = [...clientMap.values()].sort(
    (a, b) => b.billableDays + b.nonBillableDays - (a.billableDays + a.nonBillableDays)
  );
  for (const c of clients) {
    c.projects.sort((a, b) => b.billableDays + b.nonBillableDays - (a.billableDays + a.nonBillableDays));
  }

  const maxProjectDays = Math.max(...rows.map((r) => r.billableDays + r.nonBillableDays), 0.001);
  const totalBillable = rows.reduce((s, r) => s + r.billableDays, 0);
  const totalNonBillable = rows.reduce((s, r) => s + r.nonBillableDays, 0);
  const totalDays = totalBillable + totalNonBillable;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Developer Summary Report</h1>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FilterSelect
          value={selectedDeveloper ?? ""}
          options={developerOptions}
          placeholder="All developers"
          onChange={handleDeveloperChange}
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
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/40 rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Days</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{fmt(totalDays)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg border border-border p-4">
          <div className="flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 shrink-0" style={{ color: BILLABLE }} />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Billable Days</p>
          </div>
          <p className="text-3xl font-bold mt-1" style={{ color: BILLABLE }}>{fmt(totalBillable)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg border border-border p-4">
          <div className="flex items-center gap-1.5">
            <Leaf className="h-3.5 w-3.5 shrink-0" style={{ color: NON_BILLABLE }} />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Non-billable Days</p>
          </div>
          <p className="text-3xl font-bold mt-1" style={{ color: NON_BILLABLE }}>{fmt(totalNonBillable)}</p>
        </div>
      </div>

      {/* Client blocks */}
      {rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No time entries for this period.</p>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => {
            const clientTotal = client.billableDays + client.nonBillableDays;
            return (
              <div key={client.name} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <span className="font-semibold text-foreground">{client.name}</span>
                  <div className="flex items-center gap-5 text-sm">
                    <span className="flex items-center gap-1.5 font-medium tabular-nums" style={{ color: BILLABLE }}>
                      <Banknote className="h-3.5 w-3.5 shrink-0" /> {fmt(client.billableDays)}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium tabular-nums" style={{ color: NON_BILLABLE }}>
                      <Leaf className="h-3.5 w-3.5 shrink-0" /> {fmt(client.nonBillableDays)}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">{fmt(clientTotal)}</span>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {client.projects.map((proj) => {
                    const projTotal = proj.billableDays + proj.nonBillableDays;
                    const barWidthPct = (projTotal / maxProjectDays) * 100;
                    const billableFrac = projTotal > 0 ? proj.billableDays / projTotal : 0;
                    const nonBillableFrac = projTotal > 0 ? proj.nonBillableDays / projTotal : 0;
                    return (
                      <div key={proj.projectName} className="px-4 py-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{proj.projectName}</span>
                          <div className="flex items-center gap-5 text-xs">
                            <span className="flex items-center gap-1 tabular-nums" style={{ color: BILLABLE }}>
                              <Banknote className="h-3 w-3 shrink-0" /> {fmt(proj.billableDays)}
                            </span>
                            <span className="flex items-center gap-1 tabular-nums" style={{ color: NON_BILLABLE }}>
                              <Leaf className="h-3 w-3 shrink-0" /> {fmt(proj.nonBillableDays)}
                            </span>
                            <span className="text-muted-foreground tabular-nums">{fmt(projTotal)}</span>
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
