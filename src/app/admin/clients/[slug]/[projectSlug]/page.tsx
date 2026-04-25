"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Banknote, EyeOff, Leaf, Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
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
import type { Project, Task } from "@/types";

export default function ProjectDetailPage({ params }: { params: { slug: string; projectSlug: string } }) {
  const { slug, projectSlug } = params;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const projects = await fetch(`/api/projects?clientSlug=${slug}&slug=${projectSlug}`);
    if (!projects.ok) return;
    const list = await projects.json();
    if (!list.length) return;
    const proj: Project = list[0];
    setProject(proj);

    const tr = await fetch(`/api/tasks?projectId=${proj.id}`);
    if (tr.ok) setTasks(await tr.json());
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  function handleSuccess(updated: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {project ? `${project.name} - Tasks` : "…"}
            </h1>
            {project && !project.isActive && (
              <EyeOff className="h-5 w-5 text-muted-foreground/50" />
            )}
          </div>
          <Link
            href={`/admin/clients/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {project?.client.name ?? "…"}
          </Link>
        </div>
        <Button onClick={() => { setEditTask(null); setFormOpen(true); }}>
          Add Task
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No tasks yet.
                </TableCell>
              </TableRow>
            ) : tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.name}</span>
                    {!task.isActive && <EyeOff className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                  </div>
                </TableCell>
                <TableCell>
                  {task.isBillable ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/80 px-2 py-0.5 text-xs font-medium text-blue-300">
                      <Banknote className="h-3 w-3" /> Billable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-950/80 px-2 py-0.5 text-xs font-medium text-green-400">
                      <Leaf className="h-3 w-3" /> Non-billable
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip.Provider delay={300}>
                    <div className="flex gap-2 justify-end">
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => { setEditTask(task); setFormOpen(true); }}
                          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-5 w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              Edit task
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => setDeleteTask(task)}
                          className="cursor-pointer text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              Delete task
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                  </Tooltip.Provider>
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
        defaultProjectId={project?.id}
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
