"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Banknote, ChevronDown, Leaf } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListPicker } from "@/components/ui/list-picker";
import { cn } from "@/lib/utils";
import type { TimeEntry, Task } from "@/types";

const selectBase =
  "h-8 w-full appearance-none rounded-lg border bg-background text-foreground pl-2.5 pr-2.5 py-1 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:bg-muted/40";
const selectNormal = "border-input focus:border-ring";
const selectError = "border-destructive focus:border-destructive";

function TaskIcon({ isBillable }: { isBillable: boolean }) {
  return isBillable
    ? <Banknote className="h-3.5 w-3.5 shrink-0 text-blue-900" />
    : <Leaf className="h-3.5 w-3.5 shrink-0 text-green-500" />;
}

function TaskPicker({
  tasks,
  value,
  disabled,
  hasError,
  onChange,
}: {
  tasks: Task[];
  value: string;
  disabled: boolean;
  hasError: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = tasks.find((t) => t.id === value) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          selectBase,
          hasError ? selectError : selectNormal,
          "flex items-center gap-2 text-left",
          !selected && "text-muted-foreground"
        )}
      >
        {selected ? (
          <>
            <TaskIcon isBillable={selected.isBillable} />
            <span className="flex-1">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1">Please select…</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-background shadow-lg overflow-y-auto max-h-60">
          {tasks.map((t) => (
            <li
              key={t.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(t.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2.5 text-sm cursor-pointer hover:bg-muted/50",
                t.id === value && "bg-muted/30"
              )}
            >
              {t.isBillable
                ? <Banknote className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                : <Leaf className="h-3.5 w-3.5 shrink-0 text-green-500" />
              }
              <span className="font-medium">{t.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TimeEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntry | null;
  defaultDate?: string;
  onSuccess: (entry: TimeEntry) => void;
  targetUserId?: string;
  targetUserName?: string;
  users?: { id: string; name: string }[];
}

export function TimeEntryForm({
  open,
  onOpenChange,
  entry,
  defaultDate,
  onSuccess,
  targetUserId,
  targetUserName,
  users,
}: TimeEntryFormProps) {
  const isEdit = !!entry;
  const showDeveloperPicker = !!users?.length && !targetUserId && !isEdit;
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [selectedDevUserId, setSelectedDevUserId] = useState("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(
    new Date((entry?.date ?? defaultDate ?? today) + "T00:00:00"),
    "EEEE, d MMMM yyyy",
  );

  const [selectedClientId, setSelectedClientId] = useState(
    entry?.task.project.client.id ?? "",
  );
  const [selectedProjectId, setSelectedProjectId] = useState(
    entry?.task.project.id ?? "",
  );
  const [form, setForm] = useState({
    taskId: entry?.taskId ?? "",
    date: entry?.date ?? defaultDate ?? today,
    hours: entry ? String(entry.hours) : "8",
    description: entry?.description ?? "",
  });

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.ok && r.json())
      .then(
        (d: { id: string; name: string; isActive: boolean }[] | false) =>
          d &&
          setClients(
            d
              .filter((c) => c.isActive)
              .map((c) => ({ id: c.id, name: c.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          ),
      );
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      return;
    }
    fetch(`/api/projects?clientId=${selectedClientId}`)
      .then((r) => r.ok && r.json())
      .then(
        (d: { id: string; name: string; isActive: boolean }[] | false) =>
          d &&
          setProjects(
            d
              .filter((p) => p.isActive)
              .map((p) => ({ id: p.id, name: p.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          ),
      );
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    fetch(`/api/tasks?projectId=${selectedProjectId}`)
      .then((r) => r.ok && r.json())
      .then((d) => d && setTasks(d));
  }, [selectedProjectId]);

  useEffect(() => {
    if (open) {
      setAttempted(false);
      setSelectedDevUserId("");
      setSelectedClientId(entry?.task.project.client.id ?? "");
      setSelectedProjectId(entry?.task.project.id ?? "");
      setForm({
        taskId: entry?.taskId ?? "",
        date: entry?.date ?? defaultDate ?? today,
        hours: entry ? String(entry.hours) : "8",
        description: entry?.description ?? "",
      });
    }
  }, [open]); // eslint-disable-line

  function reset() {
    setAttempted(false);
    setSelectedDevUserId("");
    setSelectedClientId(entry?.task.project.client.id ?? "");
    setSelectedProjectId(entry?.task.project.id ?? "");
    setForm({
      taskId: entry?.taskId ?? "",
      date: entry?.date ?? defaultDate ?? today,
      hours: entry ? String(entry.hours) : "8",
      description: entry?.description ?? "",
    });
  }

  const filteredTasks = tasks
    .filter((t) => t.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));

  const parsedHours = parseFloat(form.hours);
  const errors = {
    developer: showDeveloperPicker && !selectedDevUserId,
    client: !selectedClientId,
    project: !selectedProjectId,
    task: !form.taskId,
    hours: !form.hours || isNaN(parsedHours) || parsedHours <= 0,
    description: !form.description.trim(),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setAttempted(true);
    if (hasErrors) return;

    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/time-entries/${entry!.id}` : "/api/time-entries",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            hours: parsedHours,
            ...(!isEdit && (targetUserId || selectedDevUserId) ? { userId: targetUserId || selectedDevUserId } : {}),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save entry");
        return;
      }
      toast.success(isEdit ? "Entry updated" : "Time logged");
      onSuccess(data);
      onOpenChange(false);
      if (!isEdit) reset();
    } finally {
      setLoading(false);
    }
  }

  const FieldError = () => (
    <p className="text-xs text-destructive mt-1">This field is mandatory</p>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md flex flex-col max-h-[90dvh]">
        <DialogHeader className="gap-0.5 shrink-0">
          <DialogTitle className="text-xl">
            {isEdit ? "Edit Time Entry" : "Log Time"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground/70">
            {displayDate}{targetUserName && ` · ${targetUserName}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-3">
        <div className="flex-1 overflow-y-auto space-y-7 pr-1 scrollbar-thin">
          {/* Developer */}
          {showDeveloperPicker && (
            <div className="space-y-1.5">
              <Label>Developer *</Label>
              <ListPicker
                items={users!}
                value={selectedDevUserId}
                hasError={attempted && errors.developer}
                onChange={setSelectedDevUserId}
              />
              {attempted && errors.developer
                ? <FieldError />
                : <p className="text-xs text-muted-foreground">The developer this time is logged for</p>
              }
            </div>
          )}

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <ListPicker
              items={clients}
              value={selectedClientId}
              hasError={attempted && errors.client}
              onChange={(id) => {
                setSelectedClientId(id);
                setSelectedProjectId("");
                setForm((f) => ({ ...f, taskId: "" }));
              }}
            />
            {attempted && errors.client
              ? <FieldError />
              : <p className="text-xs text-muted-foreground">The client this work was billed to</p>
            }
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project *</Label>
            <ListPicker
              items={projects}
              value={selectedProjectId}
              disabled={!selectedClientId}
              hasError={attempted && errors.project}
              onChange={(id) => {
                setSelectedProjectId(id);
                setForm((f) => ({ ...f, taskId: "" }));
              }}
            />
            {attempted && errors.project
              ? <FieldError />
              : <p className="text-xs text-muted-foreground">The project this time belongs to</p>
            }
          </div>

          {/* Task */}
          <div className="space-y-1.5">
            <Label>Task *</Label>
            <TaskPicker
              tasks={filteredTasks}
              value={form.taskId}
              disabled={!selectedProjectId}
              hasError={attempted && errors.task}
              onChange={(id) => setForm((f) => ({ ...f, taskId: id }))}
            />
            {attempted && errors.task
              ? <FieldError />
              : <p className="text-xs text-muted-foreground">The type of work carried out</p>
            }
          </div>

          {/* Hours */}
          <div className="space-y-1.5">
            <Label htmlFor="hours">Hours *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              placeholder="e.g. 3.5"
              className={cn(attempted && errors.hours ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : "")}
            />
            {attempted && errors.hours
              ? <FieldError />
              : <p className="text-xs text-muted-foreground">Enter in 0.5 increments, up to 24h</p>
            }
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Notes *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={cn(attempted && errors.description ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20" : "")}
            />
            {attempted && errors.description
              ? <FieldError />
              : <p className="text-xs text-muted-foreground">Please be specific about the work you carried out — e.g. Refactored all API calls in line with new design.</p>
            }
          </div>

        </div>

          <div className="flex flex-col gap-1.5 shrink-0 pt-7">
            {attempted && hasErrors && (
              <p className="text-xs text-destructive text-right">
                Errors in form — please complete all required fields.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className={!isEdit ? "bg-green-600 hover:bg-green-500 text-white font-semibold px-6 shadow-sm shadow-green-900/40" : ""}
              >
                {loading ? "Saving…" : isEdit ? "Save Changes" : "Log Time"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
