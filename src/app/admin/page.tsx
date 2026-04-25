import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalUsers, activeProjects, monthEntries, weekEntries] = await Promise.all([
    prisma.user.count({ where: { isActive: true, role: "USER" } }),
    prisma.task.count({ where: { isActive: true } }),
    prisma.timeEntry.aggregate({
      _sum: { hours: true },
      where: { date: { gte: startOfMonth } },
    }),
    prisma.timeEntry.aggregate({
      _sum: { hours: true },
      where: { date: { gte: startOfWeek } },
    }),
  ]);

  const billableThisMonth = await prisma.timeEntry.aggregate({
    _sum: { hours: true },
    where: {
      date: { gte: startOfMonth },
      task: { isBillable: true },
    },
  });

  return {
    totalUsers,
    activeProjects,
    hoursThisMonth: monthEntries._sum.hours ?? 0,
    hoursThisWeek: weekEntries._sum.hours ?? 0,
    billableThisMonth: billableThisMonth._sum.hours ?? 0,
  };
}

async function getRecentEntries() {
  return prisma.timeEntry.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      task: {
        select: { name: true, isBillable: true, project: { select: { name: true, client: { select: { name: true } } } } },
      },
    },
  });
}

export default async function AdminDashboardPage() {
  const [stats, recentEntries] = await Promise.all([getStats(), getRecentEntries()]);

  const billablePct =
    stats.hoursThisMonth > 0
      ? Math.round((stats.billableThisMonth / stats.hoursThisMonth) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of team utilisation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.hoursThisWeek.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.hoursThisMonth.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">{billablePct}% billable</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No time entries yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground/80">{entry.user.name}</span>
                    <span className="text-muted-foreground">
                      {entry.hours}h on{" "}
                      <span className="text-foreground/80">
                        {entry.task.project.client.name} / {entry.task.project.name} / {entry.task.name}
                      </span>
                      {!entry.task.isBillable && (
                        <span className="ml-1 text-xs text-muted-foreground/70">(non-billable)</span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {entry.date.toISOString().split("T")[0]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
