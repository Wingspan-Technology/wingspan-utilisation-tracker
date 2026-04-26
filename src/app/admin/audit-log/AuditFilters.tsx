"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-8 w-full flex items-center gap-2 text-left rounded-lg border border-input bg-background text-foreground pl-2.5 pr-2.5 py-1 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:bg-muted/40";

type Option = { value: string; label: string };

type FilterSelectProps = {
  value: string;
  options: Option[];
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
        <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-background shadow-lg overflow-y-auto max-h-60">
          <li
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
            className={cn("px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50 text-muted-foreground", !value && "bg-muted/30")}
          >
            {placeholder}
          </li>
          {options.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={cn("px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50", value === opt.value && "bg-muted/30")}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = {
  developers: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  tasks: { id: string; name: string }[];
  selectedDeveloper: string | null;
  selectedClient: string | null;
  selectedProject: string | null;
  selectedTask: string | null;
};

export function AuditFilters({
  developers, clients, projects, tasks,
  selectedDeveloper, selectedClient, selectedProject, selectedTask,
}: Props) {
  const router = useRouter();

  function buildUrl(params: { developer?: string; client?: string; project?: string; task?: string }) {
    const p = new URLSearchParams();
    if (params.developer) p.set("developer", params.developer);
    if (params.client) p.set("client", params.client);
    if (params.project) p.set("project", params.project);
    if (params.task) p.set("task", params.task);
    const qs = p.toString();
    return `/admin/audit-log${qs ? `?${qs}` : ""}`;
  }

  function handleDeveloperChange(id: string) {
    router.push(buildUrl({ developer: id || undefined, client: selectedClient || undefined, project: selectedProject || undefined, task: selectedTask || undefined }));
  }

  function handleClientChange(id: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, client: id || undefined }));
  }

  function handleProjectChange(id: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, client: selectedClient || undefined, project: id || undefined }));
  }

  function handleTaskChange(id: string) {
    router.push(buildUrl({ developer: selectedDeveloper || undefined, client: selectedClient || undefined, project: selectedProject || undefined, task: id || undefined }));
  }

  return (
    <div className="flex items-center gap-3">
      <FilterSelect
        value={selectedDeveloper ?? ""}
        options={developers.map((d) => ({ value: d.id, label: d.name }))}
        placeholder="All developers"
        onChange={handleDeveloperChange}
      />
      <FilterSelect
        value={selectedClient ?? ""}
        options={clients.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="All clients"
        onChange={handleClientChange}
      />
      <FilterSelect
        value={selectedProject ?? ""}
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="All projects"
        disabled={!selectedClient}
        onChange={handleProjectChange}
      />
      <FilterSelect
        value={selectedTask ?? ""}
        options={tasks.map((t) => ({ value: t.id, label: t.name }))}
        placeholder="All tasks"
        disabled={!selectedProject}
        onChange={handleTaskChange}
      />
    </div>
  );
}
