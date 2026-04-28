import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const taskInclude = {
  project: { include: { client: true } },
} as const;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const taskId = searchParams.get("taskId");
  const projectId = searchParams.get("projectId");
  const clientId = searchParams.get("clientId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};

  if (session.role === "ADMIN") {
    if (userId) where.userId = userId;
    if (taskId) where.taskId = taskId;
    if (projectId) where.task = { projectId };
    if (clientId) where.task = { project: { clientId } };
  } else {
    where.userId = session.sub;
  }

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from + "T00:00:00.000Z");
    if (to) (where.date as Record<string, Date>).lte = new Date(to + "T23:59:59.999Z");
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      task: { include: taskInclude },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return Response.json(
    entries.map((e) => ({ ...e, date: e.date.toISOString().split("T")[0] }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { taskId, date, hours, description, userId: bodyUserId } = await req.json();

  if (!taskId || !date || hours == null) {
    return Response.json({ error: "Task, date and hours are required" }, { status: 400 });
  }
  if (hours <= 0 || hours > 24) {
    return Response.json({ error: "Hours must be between 0 and 24" }, { status: 400 });
  }

  // Admins may post on behalf of another user by supplying userId in the body.
  const targetUserId =
    session.role === "ADMIN" && bodyUserId ? bodyUserId : session.sub;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.isActive) {
    return Response.json({ error: "Invalid or inactive task" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: targetUserId,
      taskId,
      date: new Date(date + "T00:00:00.000Z"),
      hours: parseFloat(hours),
      description: description || null,
    },
    include: {
      task: { include: taskInclude },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json(
    { ...entry, date: entry.date.toISOString().split("T")[0] },
    { status: 201 }
  );
}
