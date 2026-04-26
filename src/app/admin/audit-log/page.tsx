import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuditFilters } from "./AuditFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";

const PAGE_SIZE = 50;

function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-AU", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
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
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No time entries found.
                </TableCell>
              </TableRow>
            ) : entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
                  {fmtDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{entry.user.name}</TableCell>
                <TableCell className="text-muted-foreground">{entry.task.project.client.name}</TableCell>
                <TableCell className="text-muted-foreground">{entry.task.project.name}</TableCell>
                <TableCell className="text-muted-foreground">{entry.task.name}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {fmtDate(entry.date)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{entry.hours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
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
