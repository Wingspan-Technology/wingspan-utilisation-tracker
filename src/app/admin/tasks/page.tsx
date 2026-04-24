"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskForm } from "@/components/admin/TaskForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Task } from "@/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSuccess(updated: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated];
    });
    setEditTask(null);
  }

  async function handleDelete() {
    if (!deleteTask) return;
    setDeleting(true);
    const res = await fetch(`/api/tasks/${deleteTask.id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
      toast.success("Task deleted");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete task");
    }
    setDeleting(false);
    setDeleteTask(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define billable and non-billable tasks within each project
          </p>
        </div>
        <Button onClick={() => { setEditTask(null); setFormOpen(true); }}>Add Task</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : tasks.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tasks yet. Add clients and projects first.</TableCell></TableRow>
            ) : tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="text-muted-foreground text-sm">{task.project.client.name}</TableCell>
                <TableCell className="text-muted-foreground/80 text-sm">{task.project.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.color }} />
                    <span className="font-medium">{task.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={task.isBillable ? "default" : "secondary"}>
                    {task.isBillable ? "Billable" : "Non-billable"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={task.isActive ? "outline" : "destructive"}>
                    {task.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditTask(task); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTask(task)}>Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TaskForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditTask(null); }}
        task={editTask}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!deleteTask}
        onOpenChange={(v) => !v && setDeleteTask(null)}
        title="Delete Task"
        description={`Delete "${deleteTask?.name}"? This will fail if it has time entries — deactivate instead.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
