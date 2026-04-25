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
import type { Project, Task } from "@/types";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  onSuccess: (task: Task) => void;
}

export function TaskForm({ open, onOpenChange, task, defaultProjectId, onSuccess }: TaskFormProps) {
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    projectId: task?.projectId ?? defaultProjectId ?? "",
    name: task?.name ?? "",
    isActive: task?.isActive ?? true,
    isBillable: task?.isBillable ?? true,
  });

  useEffect(() => {
    if (!defaultProjectId) fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, [defaultProjectId]);

  useEffect(() => {
    if (open) setForm({
      projectId: task?.projectId ?? defaultProjectId ?? "",
      name: task?.name ?? "",
      isActive: task?.isActive ?? true,
      isBillable: task?.isBillable ?? true,
    });
  }, [open]); // eslint-disable-line

  function reset() {
    setForm({
      projectId: task?.projectId ?? defaultProjectId ?? "",
      name: task?.name ?? "",
      isActive: task?.isActive ?? true,
      isBillable: task?.isBillable ?? true,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/tasks/${task!.id}` : "/api/tasks",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      toast.success(isEdit ? "Task updated" : "Task created");
      onSuccess(data);
      onOpenChange(false);
      reset();
    } finally {
      setLoading(false);
    }
  }

  const projectItems = projects
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: `${p.client.name} / ${p.name}` }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="gap-0.5">
          <DialogTitle className="text-xl">{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {!defaultProjectId && (
            <div className="space-y-2">
              <Label>Project</Label>
              <ListPicker
                items={projectItems}
                value={form.projectId}
                onChange={(id) => setForm({ ...form, projectId: id })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Development, Design, Meetings"
              required
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch
                id="isBillable"
                checked={form.isBillable}
                onCheckedChange={(v) => setForm({ ...form, isBillable: v })}
              />
              <Label htmlFor="isBillable">Billable</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.projectId}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
