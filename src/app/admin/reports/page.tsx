"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { TimeEntry, User, Client, Project, Task } from "@/types";

export default function ReportsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const thisMonth = new Date();
  const [filters, setFilters] = useState({
    userId: "all",
    clientId: "all",
    projectId: "all",
    taskId: "all",
    from: `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}-01`,
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users"),
      fetch("/api/clients"),
      fetch("/api/projects"),
      fetch("/api/tasks"),
    ]).then(async ([ur, cr, pr, tr]) => {
      if (ur.ok) setUsers(await ur.json());
      if (cr.ok) setClients(await cr.json());
      if (pr.ok) setProjects(await pr.json());
      if (tr.ok) setTasks(await tr.json());
    });
  }, []);

  async function loadEntries() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.userId !== "all") params.set("userId", filters.userId);
    if (filters.taskId !== "all") params.set("taskId", filters.taskId);
    else if (filters.projectId !== "all") params.set("projectId", filters.projectId);
    else if (filters.clientId !== "all") params.set("clientId", filters.clientId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const res = await fetch(`/api/time-entries?${params}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadEntries(); }, []); // eslint-disable-line

  const filteredProjects = filters.clientId !== "all"
    ? projects.filter((p) => p.clientId === filters.clientId)
    : projects;

  const filteredTasks = filters.projectId !== "all"
    ? tasks.filter((t) => t.projectId === filters.projectId)
    : filters.clientId !== "all"
    ? tasks.filter((t) => t.project.clientId === filters.clientId)
    : tasks;

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.task.isBillable).reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Filter and view time entry data</p>
      </div>

      <div className="bg-card rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Developer</Label>
            <Select value={filters.userId} onValueChange={(v) => setFilters({ ...filters, userId: v ?? "all" })}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Developers</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select
              value={filters.clientId}
              onValueChange={(v) => setFilters({ ...filters, clientId: v ?? "all", projectId: "all", taskId: "all" })}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={filters.projectId}
              onValueChange={(v) => setFilters({ ...filters, projectId: v ?? "all", taskId: "all" })}
            >
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Task</Label>
            <Select value={filters.taskId} onValueChange={(v) => setFilters({ ...filters, taskId: v ?? "all" })}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                {filteredTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={loadEntries} disabled={loading}>
            {loading ? "Loading…" : "Apply Filters"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Billable Hours</p>
            <p className="text-2xl font-bold mt-1">{billableHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Billable %</p>
            <p className="text-2xl font-bold mt-1">
              {totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Client / Project / Task</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No entries found for the selected filters.</TableCell></TableRow>
            ) : entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(entry.date + "T00:00:00"), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>{entry.user.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.task.color }} />
                    <div className="text-sm">
                      <span className="text-slate-400 dark:text-zinc-500">{entry.task.project.client.name} / {entry.task.project.name} / </span>
                      <span className="font-medium text-slate-700">{entry.task.name}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{entry.hours}h</TableCell>
                <TableCell>
                  <Badge variant={entry.task.isBillable ? "default" : "secondary"}>
                    {entry.task.isBillable ? "Billable" : "Non-billable"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {entry.description ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
