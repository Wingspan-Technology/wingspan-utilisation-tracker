"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, Task } from "@/types";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#1e293b",
];

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSuccess: (task: Task) => void;
}

export function TaskForm({ open, onOpenChange, task, onSuccess }: TaskFormProps) {
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    projectId: task?.projectId ?? "",
    name: task?.name ?? "",
    description: task?.description ?? "",
    color: task?.color ?? "#6366f1",
    isActive: task?.isActive ?? true,
    isBillable: task?.isBillable ?? true,
  });

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  function reset() {
    setForm({
      projectId: task?.projectId ?? "",
      name: task?.name ?? "",
      description: task?.description ?? "",
      color: task?.color ?? "#6366f1",
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
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      toast.success(isEdit ? "Task updated" : "Task created");
      onSuccess(data);
      onOpenChange(false);
      reset();
    } finally {
      setLoading(false);
    }
  }

  const activeProjects = projects.filter((p) => p.isActive);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project…" />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="text-slate-500">{p.client.name} /</span> {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: form.color === c ? "black" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.projectId}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
