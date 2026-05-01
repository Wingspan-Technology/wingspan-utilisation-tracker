import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuditFilters } from "./AuditFilters";
import { AuditLogRows } from "./AuditLogRows";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 50;

function fmtDateTime(d: Date): string {
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = d.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} ${date}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { developer?: string; client?: string; project?: string; task?: string; page?: string };
}) {
  const selectedDeveloperId = searchParams.developer ?? null;
  const selectedClientId = searchParams.client ?? null;
  const selectedProjectId = searchParams.project ?? null;
  const selectedTaskId = searchParams.task ?? null;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [developers, clients, projects, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: selectedClientId ? { clientId: selectedClientId } : { id: "never" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: selectedProjectId ? { projectId: selectedProjectId } : { id: "never" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const where: {
    userId?: string;
    taskId?: string;
    task?: { projectId?: string; project?: { clientId: string } };
  } = {};
  if (selectedDeveloperId) where.userId = selectedDeveloperId;
  if (selectedTaskId) {
    where.taskId = selectedTaskId;
  } else if (selectedProjectId) {
    where.task = { projectId: selectedProjectId };
  } else if (selectedClientId) {
    where.task = { project: { clientId: selectedClientId } };
  }

  const [total, entries] = await Promise.all([
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true } },
        task: {
          include: {
            project: { include: { client: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const formattedEntries = entries.map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    createdAtFormatted: fmtDateTime(entry.createdAt),
    dateFormatted: fmtDate(entry.date),
    dateMonth: `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, "0")}`,
    hours: entry.hours,
    userName: entry.user.name,
    clientName: entry.task.project.client.name,
    projectName: entry.task.project.name,
    taskName: entry.task.name,
  }));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (selectedDeveloperId) params.set("developer", selectedDeveloperId);
    if (selectedClientId) params.set("client", selectedClientId);
    if (selectedProjectId) params.set("project", selectedProjectId);
    if (selectedTaskId) params.set("task", selectedTaskId);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/audit-log${qs ? `?${qs}` : ""}`;
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">All time entries logged by developers</p>
      </div>

      <AuditFilters
        developers={developers}
        clients={clients}
        projects={projects}
        tasks={tasks}
        selectedDeveloper={selectedDeveloperId}
        selectedClient={selectedClientId}
        selectedProject={selectedProjectId}
        selectedTask={selectedTaskId}
      />

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logged At</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Work Date</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <AuditLogRows entries={formattedEntries} />
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? "No entries" : `${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          {page > 1
            ? <Link href={pageUrl(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link>
            : <span className={buttonVariants({ variant: "outline", size: "sm" })} aria-disabled="true" style={{ opacity: 0.5, pointerEvents: "none" }}>Previous</span>}
          <span className="px-2 tabular-nums">{page} / {totalPages}</span>
          {page < totalPages
            ? <Link href={pageUrl(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link>
            : <span className={buttonVariants({ variant: "outline", size: "sm" })} aria-disabled="true" style={{ opacity: 0.5, pointerEvents: "none" }}>Next</span>}
        </div>
      </div>
    </div>
  );
}
