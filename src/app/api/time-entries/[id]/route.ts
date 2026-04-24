import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const taskInclude = {
  project: { include: { client: true } },
} as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "ADMIN" && entry.userId !== session.sub) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId, date, hours, description } = await req.json();

  if (hours != null && (hours <= 0 || hours > 24)) {
    return Response.json({ error: "Hours must be between 0 and 24" }, { status: 400 });
  }

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      taskId: taskId ?? entry.taskId,
      date: date ? new Date(date + "T00:00:00.000Z") : entry.date,
      hours: hours != null ? parseFloat(hours) : entry.hours,
      description: description !== undefined ? description || null : entry.description,
    },
    include: {
      task: { include: taskInclude },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json({ ...updated, date: updated.date.toISOString().split("T")[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) return Response.json({ error: "Not found" }, { status: 404 });
  if (session.role !== "ADMIN" && entry.userId !== session.sub) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return Response.json({ ok: true });
}
