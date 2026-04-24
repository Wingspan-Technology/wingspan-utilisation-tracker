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
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSuccess(updated: Project) {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated];
    });
    setEditProject(null);
  }

  async function handleDelete() {
    if (!deleteProject) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${deleteProject.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== deleteProject.id));
      toast.success("Project deleted");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete project");
    }
    setDeleting(false);
    setDeleteProject(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage projects within client accounts</p>
        </div>
        <Button onClick={() => { setEditProject(null); setFormOpen(true); }}>Add Project</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : projects.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No projects yet. Add clients first, then create projects.</TableCell></TableRow>
            ) : projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="text-muted-foreground text-sm">{project.client.name}</TableCell>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <Badge variant={project.isActive ? "outline" : "destructive"}>
                    {project.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditProject(project); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteProject(project)}>Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProjectForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditProject(null); }}
        project={editProject}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!deleteProject}
        onOpenChange={(v) => !v && setDeleteProject(null)}
        title="Delete Project"
        description={`Delete "${deleteProject?.name}"? This will fail if it has tasks — deactivate instead.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
