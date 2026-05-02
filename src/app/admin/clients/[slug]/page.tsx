"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
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
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Client, Project } from "@/types";

export default function ClientDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { slug } = params;
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const cr = await fetch(`/api/clients/${slug}`);
    if (!cr.ok) return;
    const clientData: Client = await cr.json();
    setClient(clientData);

    const pr = await fetch(`/api/projects?clientId=${clientData.id}`);
    if (pr.ok) setProjects(await pr.json());
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  function handleSuccess(updated: Project) {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {client ? `${client.name} - Projects` : "…"}
            </h1>
            {client && !client.isActive && (
              <EyeOff className="h-5 w-5 text-muted-foreground/50" />
            )}
          </div>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Clients
          </Link>
        </div>
        <Button onClick={() => { setEditProject(null); setFormOpen(true); }}>
          Add Project
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No projects yet.
                </TableCell>
              </TableRow>
            ) : projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/clients/${slug}/${project.slug}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    {!project.isActive && <EyeOff className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip.Provider delay={300}>
                    <div className="flex gap-2 justify-end">
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => router.push(`/admin/clients/${slug}/${project.slug}`)}
                          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              View project
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => { setEditProject(project); setFormOpen(true); }}
                          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              Edit project
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => setDeleteProject(project)}
                          className="cursor-pointer text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              Delete project
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

      <ProjectForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditProject(null); }}
        project={editProject}
        defaultClientId={client?.id}
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
