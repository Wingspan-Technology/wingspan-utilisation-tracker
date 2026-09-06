import { formatDuration, intervalToDuration, format } from "date-fns";
import { Banknote, Leaf } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BILLABLE = "#378ADD";
const NON_BILLABLE = "#1D9E75";

function fmtDays(n: number): string {
  return n.toFixed(1) + "d";
}

function fmtCost(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

function formatTenure(start: Date, end: Date): string {
  const { years, months, days } = intervalToDuration({ start, end });
  if ((years ?? 0) > 0) {
    return formatDuration({ years, months }, { format: ["years", "months"] });
  }
  if ((months ?? 0) > 0) {
    return formatDuration({ months, days }, { format: ["months", "days"] });
  }
  return formatDuration({ days: days ?? 0 }, { format: ["days"] }) || "Today";
}

export default async function DeveloperTenureReportPage() {
  const now = new Date();

  const [users, minDates, billableStats, nonBillableStats] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: "USER" },
      select: { id: true, name: true, dayRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      _min: { date: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { task: { isBillable: true } },
      _sum: { hours: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { task: { isBillable: false } },
      _sum: { hours: true },
    }),
  ]);
  const firstEntryByUser = new Map(minDates.map((s) => [s.userId, s._min.date]));
  const billableHoursByUser = new Map(billableStats.map((s) => [s.userId, s._sum.hours ?? 0]));
  const nonBillableHoursByUser = new Map(nonBillableStats.map((s) => [s.userId, s._sum.hours ?? 0]));

  const rows = users
    .map((user) => {
      const firstEntryDate = firstEntryByUser.get(user.id) ?? null;
      const billableDays = (billableHoursByUser.get(user.id) ?? 0) / 8;
      const nonBillableDays = (nonBillableHoursByUser.get(user.id) ?? 0) / 8;
      const billableCost = user.dayRate != null ? billableDays * user.dayRate : null;
      const nonBillableCost = user.dayRate != null ? nonBillableDays * user.dayRate : null;
      return {
        ...user,
        firstEntryDate,
        totalDays: billableDays + nonBillableDays,
        billableCost,
        nonBillableCost,
      };
    })
    .sort((a, b) => {
      if (a.firstEntryDate == null) return b.firstEntryDate == null ? 0 : 1;
      if (b.firstEntryDate == null) return -1;
      return a.firstEntryDate.getTime() - b.firstEntryDate.getTime();
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developer Tenure Report</h1>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">First Entry</TableHead>
              <TableHead>Time with Company</TableHead>
              <TableHead>Days Logged</TableHead>
              <TableHead>Billable Cost</TableHead>
              <TableHead>Non-Billable Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No active developers.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {user.firstEntryDate != null ? (
                      format(user.firstEntryDate, "d MMM yyyy")
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.firstEntryDate != null ? (
                      formatTenure(user.firstEntryDate, now)
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDays(user.totalDays)}</TableCell>
                  <TableCell>
                    {user.billableCost != null ? (
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums" style={{ color: BILLABLE }}>
                        <Banknote className="h-3.5 w-3.5 shrink-0" />
                        {fmtCost(user.billableCost)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.nonBillableCost != null ? (
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums" style={{ color: NON_BILLABLE }}>
                        <Leaf className="h-3.5 w-3.5 shrink-0" />
                        {fmtCost(user.nonBillableCost)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
