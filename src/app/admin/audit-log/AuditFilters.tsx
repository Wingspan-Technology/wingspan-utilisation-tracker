"use client";

import { useRouter } from "next/navigation";
import { FilterSelect } from "@/components/ui/filter-select";

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
