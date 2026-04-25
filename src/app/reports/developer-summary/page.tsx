import { prisma } from "@/lib/prisma";
import { ReportChart } from "./ReportChart";
import type { ProjectRow } from "./ReportChart";

export default async function DeveloperSummaryPage({
  searchParams,
}: {
  searchParams: { developer?: string; year?: string; month?: string };
}) {
  const selectedDeveloperId = searchParams.developer ?? null;
  const selectedMonth = searchParams.month ?? null;
  const selectedYear = searchParams.year ?? null;

  const developers = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allDates = await prisma.timeEntry.findMany({
    where: selectedDeveloperId ? { userId: selectedDeveloperId } : undefined,
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
  } = {};
  if (selectedDeveloperId) where.userId = selectedDeveloperId;
  if (dateWhere) where.date = dateWhere;

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

  const map = new Map<
    string,
    { clientName: string; projectName: string; billableHours: number; nonBillableHours: number }
  >();

  for (const entry of entries) {
    const { project } = entry.task;
    const key = `${project.client.id}::${project.id}`;
    const acc = map.get(key) ?? {
      clientName: project.client.name,
      projectName: project.name,
      billableHours: 0,
      nonBillableHours: 0,
    };
    if (entry.task.isBillable) {
      acc.billableHours += entry.hours;
    } else {
      acc.nonBillableHours += entry.hours;
    }
    map.set(key, acc);
  }

  const rows: ProjectRow[] = [...map.values()].map((r) => ({
    clientName: r.clientName,
    projectName: r.projectName,
    billableDays: r.billableHours / 8,
    nonBillableDays: r.nonBillableHours / 8,
  }));

  return (
    <ReportChart
      rows={rows}
      developers={developers}
      months={months}
      selectedDeveloper={selectedDeveloperId}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
    />
  );
}
