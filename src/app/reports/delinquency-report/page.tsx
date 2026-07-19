import { differenceInCalendarDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DELINQUENT_THRESHOLD_DAYS = 7;

export default async function DelinquencyReportPage() {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: "USER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const lastEntries = await prisma.timeEntry.groupBy({
    by: ["userId"],
    _max: { date: true },
  });
  const lastEntryByUser = new Map(lastEntries.map((e) => [e.userId, e._max.date]));

  const rows = users
    .map((user) => {
      const lastEntryDate = lastEntryByUser.get(user.id) ?? null;
      const daysSinceLastEntry =
        lastEntryDate != null ? differenceInCalendarDays(new Date(), lastEntryDate) : null;
      return { ...user, lastEntryDate, daysSinceLastEntry };
    })
    .sort((a, b) => {
      if (a.daysSinceLastEntry == null) return b.daysSinceLastEntry == null ? 0 : -1;
      if (b.daysSinceLastEntry == null) return 1;
      return b.daysSinceLastEntry - a.daysSinceLastEntry;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Delinquency Report</h1>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Last Entry</TableHead>
              <TableHead>Days Since Last Entry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No active users.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastEntryDate != null ? (
                      format(user.lastEntryDate, "d MMM yyyy")
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.daysSinceLastEntry == null ? (
                      <Badge variant="destructive">Never</Badge>
                    ) : user.daysSinceLastEntry >= DELINQUENT_THRESHOLD_DAYS ? (
                      <Badge variant="destructive">{user.daysSinceLastEntry}d</Badge>
                    ) : (
                      <Badge variant="outline">{user.daysSinceLastEntry}d</Badge>
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
