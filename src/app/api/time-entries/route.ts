import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createTimeEntry, TimeEntryValidationError, timeEntryInclude } from "@/lib/time-entries";

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
    include: timeEntryInclude,
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

  // Admins may post on behalf of another user by supplying userId in the body.
  const targetUserId =
    session.role === "ADMIN" && bodyUserId ? bodyUserId : session.sub;

  try {
    const entry = await createTimeEntry({ userId: targetUserId, taskId, date, hours, description });
    return Response.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof TimeEntryValidationError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
