import { prisma } from "@/lib/prisma";
import { ReportChart } from "./ReportChart";
import type { ClientRow } from "./ReportChart";

export default async function ClientSummaryPage({
  searchParams,
}: {
  searchParams: { client?: string; year?: string; month?: string };
}) {
  const selectedClientSlug = searchParams.client ?? null;
  const selectedMonth = searchParams.month ?? null;
  const selectedYear = searchParams.year ?? null;

  const clients = await prisma.client.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });

  const selectedClientRecord = selectedClientSlug
    ? clients.find((c) => c.slug === selectedClientSlug) ?? null
    : null;

  const dateFilter = selectedClientRecord
    ? { task: { project: { clientId: selectedClientRecord.id } } }
    : undefined;

  const allDates = await prisma.timeEntry.findMany({
    where: dateFilter,
    select: { date: true },
    orderBy: { date: "asc" },
  });
  const months = [
    ...new Set(
      allDates.map((e) => {
        const d = new Date(e.date);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      })
    ),
  ].sort();

  let dateWhere: { gte: Date; lt: Date } | undefined;
  if (selectedMonth) {
    const [y, m] = selectedMonth.split("-").map(Number);
    dateWhere = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  } else if (selectedYear) {
    const y = Number(selectedYear);
    dateWhere = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
  }

  const where: {
    date?: { gte: Date; lt: Date };
    task?: { project: { clientId: string } };
  } = {};
  if (dateWhere) where.date = dateWhere;
  if (selectedClientRecord) where.task = { project: { clientId: selectedClientRecord.id } };

  const entries = await prisma.timeEntry.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      task: {
        include: {
          project: { include: { client: true } },
        },
      },
    },
  });

  type TaskAcc = { taskName: string; isBillable: boolean; days: number };
  type ProjAcc = { projectName: string; billableDays: number; nonBillableDays: number; tasks: Map<string, TaskAcc> };
  type ClientAcc = { clientName: string; billableDays: number; nonBillableDays: number; projects: Map<string, ProjAcc> };

  const clientMap = new Map<string, ClientAcc>();

  for (const entry of entries) {
    const { task } = entry;
    const { project } = task;
    const client = project.client;
    const days = entry.hours / 8;

    if (!clientMap.has(client.id)) {
      clientMap.set(client.id, { clientName: client.name, billableDays: 0, nonBillableDays: 0, projects: new Map() });
    }
    const clientAcc = clientMap.get(client.id)!;

    if (!clientAcc.projects.has(project.id)) {
      clientAcc.projects.set(project.id, { projectName: project.name, billableDays: 0, nonBillableDays: 0, tasks: new Map() });
    }
    const projAcc = clientAcc.projects.get(project.id)!;

    if (task.isBillable) {
      clientAcc.billableDays += days;
      projAcc.billableDays += days;
    } else {
      clientAcc.nonBillableDays += days;
      projAcc.nonBillableDays += days;
    }

    const taskAcc = projAcc.tasks.get(task.id) ?? { taskName: task.name, isBillable: task.isBillable, days: 0 };
    taskAcc.days += days;
    projAcc.tasks.set(task.id, taskAcc);
  }

  const rows: ClientRow[] = [...clientMap.values()].map((c) => ({
    clientName: c.clientName,
    billableDays: c.billableDays,
    nonBillableDays: c.nonBillableDays,
    projects: [...c.projects.values()].map((p) => ({
      projectName: p.projectName,
      billableDays: p.billableDays,
      nonBillableDays: p.nonBillableDays,
      tasks: [...p.tasks.values()],
    })),
  }));

  return (
    <ReportChart
      rows={rows}
      clients={clients}
      months={months}
      selectedClient={selectedClientSlug}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  );
}
