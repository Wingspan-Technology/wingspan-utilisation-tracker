import { prisma } from "@/lib/prisma";
import { ReportChart } from "./ReportChart";
import type { ProjectRow, EntryDetail } from "./ReportChart";

export default async function DeveloperActivityPage({
  searchParams,
}: {
  searchParams: { developer?: string; client?: string; year?: string; month?: string };
}) {
  const selectedDeveloperId = searchParams.developer ?? null;
  const selectedClientId = searchParams.client ?? null;
  const selectedYear = searchParams.year ?? null;
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = searchParams.month ?? (selectedYear ? null : defaultMonth);

  const [developers, clients] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const allDatesWhere: {
    userId?: string;
    task?: { project: { clientId: string } };
  } = {};
  if (selectedDeveloperId) allDatesWhere.userId = selectedDeveloperId;
  if (selectedClientId) allDatesWhere.task = { project: { clientId: selectedClientId } };

  const allDates = await prisma.timeEntry.findMany({
    where: Object.keys(allDatesWhere).length > 0 ? allDatesWhere : undefined,
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
    userId?: string;
    date?: { gte: Date; lt: Date };
    task?: { project: { clientId: string } };
  } = {};
  if (selectedDeveloperId) where.userId = selectedDeveloperId;
  if (dateWhere) where.date = dateWhere;
  if (selectedClientId) where.task = { project: { clientId: selectedClientId } };

  const entries = await prisma.timeEntry.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      task: {
        include: {
          project: { include: { client: true } },
        },
      },
      user: { select: { name: true, dayRate: true } },
    },
  });

  const map = new Map<
    string,
    {
      developerName: string;
      clientName: string;
      projectName: string;
      billableHours: number;
      nonBillableHours: number;
      billableCost: number;
      nonBillableCost: number;
      tasks: Map<string, { taskName: string; isBillable: boolean; hours: number; cost: number }>;
    }
  >();

  for (const entry of entries) {
    const { project } = entry.task;
    const developerName = entry.user?.name ?? "Unknown";
    const key = `${entry.userId}::${project.id}`;
    if (!map.has(key)) {
      map.set(key, {
        developerName,
        clientName: project.client.name,
        projectName: project.name,
        billableHours: 0,
        nonBillableHours: 0,
        billableCost: 0,
        nonBillableCost: 0,
        tasks: new Map(),
      });
    }
    const acc = map.get(key)!;
    const dayRate = entry.user?.dayRate;
    const entryDays = entry.hours / 8;
    if (entry.task.isBillable) {
      acc.billableHours += entry.hours;
      if (dayRate != null) acc.billableCost += entryDays * dayRate;
    } else {
      acc.nonBillableHours += entry.hours;
      if (dayRate != null) acc.nonBillableCost += entryDays * dayRate;
    }
    const taskAcc = acc.tasks.get(entry.task.id) ?? {
      taskName: entry.task.name,
      isBillable: entry.task.isBillable,
      hours: 0,
      cost: 0,
    };
    taskAcc.hours += entry.hours;
    if (dayRate != null) taskAcc.cost += entryDays * dayRate;
    acc.tasks.set(entry.task.id, taskAcc);
  }

  const rows: ProjectRow[] = [...map.values()].map((r) => ({
    developerName: r.developerName,
    clientName: r.clientName,
    projectName: r.projectName,
    billableDays: r.billableHours / 8,
    nonBillableDays: r.nonBillableHours / 8,
    billableCost: r.billableCost,
    nonBillableCost: r.nonBillableCost,
    tasks: [...r.tasks.values()].map((t) => ({
      taskName: t.taskName,
      isBillable: t.isBillable,
      days: t.hours / 8,
      cost: t.cost,
    })),
  }));

  const entryDetails: EntryDetail[] = entries.map((entry) => {
    const dayRate = entry.user?.dayRate;
    const cost = dayRate != null ? (entry.hours / 8) * dayRate : null;
    return {
      developerName: entry.user?.name ?? "Unknown",
      clientName: entry.task.project.client.name,
      projectName: entry.task.project.name,
      taskName: entry.task.name,
      date: entry.date.toISOString(),
      hours: entry.hours,
      cost,
      isBillable: entry.task.isBillable,
    };
  });

  return (
    <ReportChart
      rows={rows}
      entries={entryDetails}
      developers={developers}
      clients={clients}
      months={months}
      selectedDeveloper={selectedDeveloperId}
      selectedClient={selectedClientId}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  );
}
