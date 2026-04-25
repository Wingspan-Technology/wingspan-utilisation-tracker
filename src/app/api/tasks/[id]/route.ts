import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { projectId, name, isActive, isBillable } = await req.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });

  const newProjectId = projectId ?? task.projectId;
  const newName = name ?? task.name;

  if (newProjectId !== task.projectId || newName !== task.name) {
    const existing = await prisma.task.findUnique({
      where: { projectId_name: { projectId: newProjectId, name: newName } },
    });
    if (existing && existing.id !== id) {
      return Response.json({ error: "Task name already exists for this project" }, { status: 409 });
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      projectId: newProjectId,
      name: newName,
      isActive: isActive ?? task.isActive,
      isBillable: isBillable ?? task.isBillable,
    },
    include: { project: { include: { client: true } } },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const hasEntries = await prisma.timeEntry.count({ where: { taskId: id } });
  if (hasEntries > 0) {
    return Response.json(
      { error: "Cannot delete a task that has time entries. Deactivate it instead." },
      { status: 409 }
    );
  }

  await prisma.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
